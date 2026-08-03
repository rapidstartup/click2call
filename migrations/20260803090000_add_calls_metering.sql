-- Phase A: authoritative Vapi call metering.
-- Reservations use a temporary vapi_call_id until POST /call/web returns the
-- provider id. They remain status=started so active reservations count against
-- the start gate, then finalize_call_reservation swaps in the real id.

create table calls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  widget_id uuid references widgets(id) on delete cascade,
  plan_id text,
  vapi_call_id text not null unique,
  status text not null check (status in ('started', 'connected', 'completed', 'failed', 'aborted', 'capped')),
  outcome text check (outcome in ('lead_captured', 'booked', 'qualified', 'unqualified', 'no_contact')) default null,
  duration_s integer default 0,
  cost_usd numeric(12,6) default 0,
  recording_url text,
  transcript_ref text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table calls enable row level security;

create policy "Users can view their own calls"
  on calls for select
  using (auth.uid() = user_id);

create policy "Users can create their own calls"
  on calls for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own calls"
  on calls for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own calls"
  on calls for delete
  using (auth.uid() = user_id);

create index calls_user_started_at_idx on calls (user_id, started_at desc);

drop trigger if exists update_calls_updated_at on calls;
create trigger update_calls_updated_at
  before update on calls
  for each row
  execute function update_updated_at_column();

-- The baseline is 30 minutes per user per UTC calendar month. A widget may
-- add monthly_cap_seconds (or monthly_cap_minutes) in settings. Active calls
-- reserve their configured maximum duration; completed calls use authoritative
-- duration_s from the Vapi webhook. Failed and aborted calls are retained but
-- do not consume the allowance.
create or replace function reserve_call(
  p_user_id uuid,
  p_widget_id uuid,
  p_reservation_id uuid,
  p_plan_id text default null,
  p_max_duration_seconds integer default 1800
)
returns table (
  call_id uuid,
  vapi_call_id text,
  allowed boolean,
  error_code text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_widget_user_id uuid;
  v_widget_settings jsonb;
  v_widget_extra_seconds bigint := 0;
  v_max_duration_seconds integer;
  v_allowance_seconds bigint;
  v_used_seconds bigint;
  v_month_start timestamptz := date_trunc('month', timezone('utc', now()));
  v_reservation_call_id uuid;
  v_reservation_vapi_id text := 'reservation:' || p_reservation_id::text;
begin
  if p_user_id is null or p_widget_id is null or p_reservation_id is null then
    return query select null::uuid, null::text, false, 'invalid_request';
    return;
  end if;

  -- Lock account and widget in a stable order. The account lock is needed
  -- because the baseline allowance is shared across all of that user's widgets.
  perform pg_advisory_xact_lock(hashtextextended('click2call:user:' || p_user_id::text, 0));
  perform pg_advisory_xact_lock(hashtextextended('click2call:widget:' || p_widget_id::text, 0));

  select w.user_id, w.settings
    into v_widget_user_id, v_widget_settings
    from widgets w
   where w.id = p_widget_id
     and w.type = 'vapi';

  if v_widget_user_id is null or v_widget_user_id is distinct from p_user_id then
    return query select null::uuid, null::text, false, 'widget_not_found';
    return;
  end if;

  if jsonb_typeof(coalesce(v_widget_settings, '{}'::jsonb)->'monthly_cap_seconds') = 'number' then
    v_widget_extra_seconds := greatest(0, (v_widget_settings->>'monthly_cap_seconds')::bigint);
  elsif jsonb_typeof(coalesce(v_widget_settings, '{}'::jsonb)->'monthly_cap_minutes') = 'number' then
    v_widget_extra_seconds := greatest(0, (v_widget_settings->>'monthly_cap_minutes')::bigint) * 60;
  end if;

  v_max_duration_seconds := greatest(10, least(coalesce(p_max_duration_seconds, 1800), 43200));
  v_allowance_seconds := 30 * 60 + v_widget_extra_seconds;

  select coalesce(sum(
    case
      when c.status in ('started', 'connected') then
        greatest(10, least(coalesce(
          case
            when jsonb_typeof(coalesce(w.settings, '{}'::jsonb)->'max_duration_seconds') = 'number'
            then (w.settings->>'max_duration_seconds')::integer
            else null
          end,
          1800
        ), 43200))::bigint
      else greatest(0, coalesce(c.duration_s, 0))::bigint
    end
  ), 0)
    into v_used_seconds
    from calls c
    left join widgets w on w.id = c.widget_id
   where c.user_id = p_user_id
     and c.started_at >= v_month_start
     and c.status not in ('failed', 'aborted');

  if v_used_seconds + v_max_duration_seconds > v_allowance_seconds then
    return query select null::uuid, null::text, false, 'cap_reached';
    return;
  end if;

  insert into calls (user_id, widget_id, plan_id, vapi_call_id, status)
  values (p_user_id, p_widget_id, p_plan_id, v_reservation_vapi_id, 'started')
  returning calls.id into v_reservation_call_id;

  return query select v_reservation_call_id, v_reservation_vapi_id, true, null::text;
end;
$$;

create or replace function finalize_call_reservation(
  p_reservation_id uuid,
  p_vapi_call_id text
)
returns calls
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_call calls;
begin
  if p_reservation_id is null or nullif(btrim(p_vapi_call_id), '') is null then
    raise exception 'Invalid call reservation' using errcode = '22023';
  end if;

  update calls
     set vapi_call_id = p_vapi_call_id,
         updated_at = now()
   where vapi_call_id = 'reservation:' || p_reservation_id::text
     and status = 'started'
   returning * into v_call;

  if not found then
    raise exception 'Call reservation not found' using errcode = 'P0002';
  end if;

  return v_call;
exception
  when unique_violation then
    raise exception 'Vapi call already exists' using errcode = '23505';
end;
$$;

create or replace function release_call_reservation(
  p_reservation_id uuid,
  p_status text default 'failed'
)
returns calls
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_call calls;
begin
  if p_status not in ('failed', 'aborted') then
    raise exception 'Invalid reservation release status' using errcode = '22023';
  end if;

  update calls
     set status = p_status,
         updated_at = now()
   where vapi_call_id = 'reservation:' || p_reservation_id::text
     and status = 'started'
   returning * into v_call;

  return v_call;
end;
$$;

revoke all on function reserve_call(uuid, uuid, uuid, text, integer) from public, anon, authenticated;
revoke all on function finalize_call_reservation(uuid, text) from public, anon, authenticated;
revoke all on function release_call_reservation(uuid, text) from public, anon, authenticated;
grant execute on function reserve_call(uuid, uuid, uuid, text, integer) to service_role;
grant execute on function finalize_call_reservation(uuid, text) to service_role;
grant execute on function release_call_reservation(uuid, text) to service_role;

create or replace function upsert_call_from_vapi(p_call jsonb)
returns calls
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_call calls;
begin
  insert into calls (
    user_id,
    widget_id,
    vapi_call_id,
    status,
    outcome,
    duration_s,
    cost_usd,
    recording_url,
    transcript_ref,
    utm_source,
    utm_medium,
    utm_campaign,
    started_at
  )
  values (
    nullif(p_call->>'user_id', '')::uuid,
    nullif(p_call->>'widget_id', '')::uuid,
    nullif(p_call->>'vapi_call_id', ''),
    p_call->>'status',
    nullif(p_call->>'outcome', ''),
    case when p_call ? 'duration_s' then (p_call->>'duration_s')::integer else 0 end,
    case when p_call ? 'cost_usd' then (p_call->>'cost_usd')::numeric else 0 end,
    nullif(p_call->>'recording_url', ''),
    nullif(p_call->>'transcript_ref', ''),
    nullif(p_call->>'utm_source', ''),
    nullif(p_call->>'utm_medium', ''),
    nullif(p_call->>'utm_campaign', ''),
    coalesce((p_call->>'started_at')::timestamptz, now())
  )
  on conflict (vapi_call_id) do update
  set status = case
        when calls.status in ('completed', 'failed', 'aborted', 'capped')
          and excluded.status in ('started', 'connected')
        then calls.status
        else excluded.status
      end,
      outcome = coalesce(excluded.outcome, calls.outcome),
      duration_s = case when p_call ? 'duration_s' then excluded.duration_s else calls.duration_s end,
      cost_usd = case when p_call ? 'cost_usd' then excluded.cost_usd else calls.cost_usd end,
      recording_url = coalesce(excluded.recording_url, calls.recording_url),
      transcript_ref = coalesce(excluded.transcript_ref, calls.transcript_ref),
      utm_source = coalesce(excluded.utm_source, calls.utm_source),
      utm_medium = coalesce(excluded.utm_medium, calls.utm_medium),
      utm_campaign = coalesce(excluded.utm_campaign, calls.utm_campaign),
      started_at = least(calls.started_at, excluded.started_at),
      updated_at = now()
  returning * into v_call;

  return v_call;
end;
$$;

revoke all on function upsert_call_from_vapi(jsonb) from public, anon, authenticated;
grant execute on function upsert_call_from_vapi(jsonb) to service_role;

