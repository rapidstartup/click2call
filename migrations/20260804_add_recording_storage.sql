-- Phase C: private recording storage, retention metadata, and dashboard stats.

insert into storage.buckets (id, name, public)
values ('call-recordings', 'call-recordings', false)
on conflict (id) do update set public = false;

do $$
begin
  if not exists (
    select 1
      from pg_policies
     where schemaname = 'storage'
       and tablename = 'objects'
       and policyname = 'authenticated_call_recordings_select'
  ) then
    create policy authenticated_call_recordings_select
      on storage.objects for select to authenticated
      using ((storage.foldername(name))[1]::uuid = auth.uid());
  end if;
end;
$$;

alter table public.plans
  add column if not exists recording_retention_days integer default 7;

update public.plans
   set recording_retention_days = case id
     when 'starter' then 7
     when 'pro' then 15
     when 'enterprise' then 30
     else recording_retention_days
   end,
       updated_at = now()
 where id in ('starter', 'pro', 'enterprise');

alter table public.calls
  add column if not exists recording_source_url text,
  add column if not exists recording_status text,
  add column if not exists recording_storage_path text;

update public.calls
   set recording_status = 'none'
 where recording_status is null;

alter table public.calls
  alter column recording_status set default 'none',
  alter column recording_status set not null;

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conrelid = 'public.calls'::regclass
       and conname = 'calls_recording_status_check'
  ) then
    alter table public.calls
      add constraint calls_recording_status_check
      check (recording_status in ('none', 'pending', 'copied', 'failed', 'expired'));
  end if;
end;
$$;

create or replace function public.upsert_call_from_vapi(p_call jsonb)
returns public.calls
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_call public.calls;
begin
  insert into public.calls (
    user_id,
    widget_id,
    vapi_call_id,
    status,
    outcome,
    duration_s,
    cost_usd,
    recording_source_url,
    recording_status,
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
    nullif(p_call->>'recording_source_url', ''),
    coalesce(nullif(p_call->>'recording_status', ''), 'none'),
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
      recording_source_url = coalesce(excluded.recording_source_url, calls.recording_source_url),
      recording_status = case
        when calls.recording_status in ('copied', 'expired') then calls.recording_status
        when p_call ? 'recording_status' then excluded.recording_status
        else calls.recording_status
      end,
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

revoke all on function public.upsert_call_from_vapi(jsonb) from public, anon, authenticated;
grant execute on function public.upsert_call_from_vapi(jsonb) to service_role;

create or replace function public.get_dashboard_stats(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_month_start timestamptz := date_trunc('month', timezone('utc', now()));
  v_summary jsonb;
  v_by_day jsonb;
  v_recent jsonb;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'total_calls', count(*),
    'completed_calls', count(*) filter (where c.status = 'completed'),
    'total_minutes', coalesce(round(sum(greatest(0, coalesce(c.duration_s, 0))) / 60.0, 2), 0),
    'avg_minutes', coalesce(round(avg(greatest(0, coalesce(c.duration_s, 0))) / 60.0, 2), 0),
    'total_cost', coalesce(sum(coalesce(c.cost_usd, 0)), 0),
    'leads', count(*) filter (where c.outcome in ('lead_captured', 'booked', 'qualified'))
  )
    into v_summary
    from public.calls c
   where c.user_id = p_user_id
     and c.started_at >= v_month_start
     and c.status not in ('failed', 'aborted');

  with days as (
    select generate_series(v_now::date - 29, v_now::date, interval '1 day')::date as day
  ), daily as (
    select days.day,
           count(c.id) as calls,
           coalesce(round(sum(greatest(0, coalesce(c.duration_s, 0))) / 60.0, 2), 0) as minutes
      from days
      left join public.calls c
        on c.user_id = p_user_id
       and timezone('utc', c.started_at)::date = days.day
       and c.status not in ('failed', 'aborted')
     group by days.day
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'day', to_char(daily.day, 'YYYY-MM-DD'),
      'calls', daily.calls,
      'minutes', daily.minutes
    )
    order by daily.day
  ), '[]'::jsonb)
    into v_by_day
    from daily;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', c.id,
      'started_at', c.started_at,
      'status', c.status,
      'outcome', c.outcome,
      'duration_s', c.duration_s,
      'cost_usd', c.cost_usd,
      'widget_id', c.widget_id,
      'widget_name', w.name,
      'recording_status', c.recording_status,
      'recording_storage_path', c.recording_storage_path
    )
    order by c.started_at desc
  ), '[]'::jsonb)
    into v_recent
    from (
      select c.*
        from public.calls c
       where c.user_id = p_user_id
       order by c.started_at desc
       limit 25
    ) c
    left join public.widgets w on w.id = c.widget_id;

  return jsonb_build_object(
    'summary', v_summary,
    'by_day', v_by_day,
    'recent', v_recent
  );
end;
$$;

revoke all on function public.get_dashboard_stats(uuid) from public, anon;
grant execute on function public.get_dashboard_stats(uuid) to authenticated;

drop function if exists public.get_billing_summary(uuid);

create or replace function public.get_billing_summary(p_user_id uuid)
returns table (
  plan_id text,
  plan_name text,
  minutes_allowance integer,
  recording_retention_days integer,
  subscription_status text,
  current_period_end timestamptz,
  used_seconds bigint,
  allowance_seconds bigint
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_plan_id text;
  v_plan_name text;
  v_minutes_allowance integer;
  v_recording_retention_days integer;
  v_subscription_status text;
  v_current_period_end timestamptz;
  v_used_seconds bigint;
  v_allowance_seconds bigint;
  v_month_start timestamptz := date_trunc('month', timezone('utc', now()));
begin
  select up.plan_id,
         p.name,
         p.minutes_allowance,
         p.recording_retention_days,
         up.subscription_status,
         up.current_period_end
    into v_plan_id,
         v_plan_name,
         v_minutes_allowance,
         v_recording_retention_days,
         v_subscription_status,
         v_current_period_end
    from public.user_plans up
    left join public.plans p on p.id = up.plan_id
   where up.user_id = p_user_id;

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
    from public.calls c
    left join public.widgets w on w.id = c.widget_id
   where c.user_id = p_user_id
     and c.started_at >= v_month_start
     and c.status not in ('failed', 'aborted');

  v_allowance_seconds := case
    when v_subscription_status in ('active', 'trialing')
      then coalesce(v_minutes_allowance, 30)::bigint * 60
    else 30 * 60
  end;

  return query select
    v_plan_id,
    v_plan_name,
    coalesce(v_minutes_allowance, 30),
    coalesce(v_recording_retention_days, 7),
    v_subscription_status,
    v_current_period_end,
    v_used_seconds,
    v_allowance_seconds;
end;
$$;

revoke all on function public.get_billing_summary(uuid) from public, anon, authenticated;
grant execute on function public.get_billing_summary(uuid) to service_role;
