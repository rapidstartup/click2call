-- Phase B: Stripe plan billing and plan-aware call allowances.

create table if not exists public.plans (
  id text primary key,
  name text not null,
  price_monthly_usd numeric not null,
  minutes_allowance integer not null,
  stripe_test_price_id text,
  stripe_live_price_id text,
  features jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.plans enable row level security;

do $$
begin
  if not exists (
    select 1
      from pg_policies
     where schemaname = 'public'
       and tablename = 'plans'
       and policyname = 'Authenticated users can view billing plans'
  ) then
    create policy "Authenticated users can view billing plans"
      on public.plans for select to authenticated using (true);
  end if;
end;
$$;

-- These monthly minute allowances are provisional and will be tuned after margin analysis.
insert into public.plans (
  id,
  name,
  price_monthly_usd,
  minutes_allowance,
  stripe_test_price_id,
  stripe_live_price_id
)
values
  ('starter', 'Starter', 9, 100, 'price_1U0M4TJgG26rrnpzWKwibHRY', null),
  ('pro', 'Professional', 97, 1000, 'price_1U0M4VJgG26rrnpzTRwE1404', null),
  ('enterprise', 'Enterprise', 297, 5000, 'price_1U0M4WJgG26rrnpzX16N318t', null)
on conflict (id) do update
set name = excluded.name,
    price_monthly_usd = excluded.price_monthly_usd,
    minutes_allowance = excluded.minutes_allowance,
    stripe_test_price_id = excluded.stripe_test_price_id,
    stripe_live_price_id = excluded.stripe_live_price_id,
    updated_at = now();

create table if not exists public.user_plans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_id text not null references public.plans(id),
  stripe_customer_id text,
  stripe_subscription_id text unique,
  subscription_status text not null check (subscription_status in (
    'trialing',
    'active',
    'past_due',
    'unpaid',
    'canceled',
    'incomplete',
    'incomplete_expired'
  )),
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.user_plans enable row level security;

do $$
begin
  if not exists (
    select 1
      from pg_policies
     where schemaname = 'public'
       and tablename = 'user_plans'
       and policyname = 'Users can view their own billing plan'
  ) then
    create policy "Users can view their own billing plan"
      on public.user_plans for select to authenticated
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
      from pg_policies
     where schemaname = 'public'
       and tablename = 'user_plans'
       and policyname = 'Users can update their own billing plan'
  ) then
    create policy "Users can update their own billing plan"
      on public.user_plans for update to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end;
$$;

create or replace function public.upsert_user_plan(
  p_user_id uuid,
  p_plan_id text,
  p_stripe_customer_id text,
  p_stripe_subscription_id text,
  p_status text,
  p_period_start timestamptz,
  p_period_end timestamptz
)
returns public.user_plans
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_existing_subscription_user uuid;
  v_existing_user_subscription text;
  v_existing_user_exists boolean := false;
  v_plan public.user_plans;
begin
  if p_user_id is null or nullif(btrim(p_plan_id), '') is null then
    raise exception 'Invalid user plan request' using errcode = '22023';
  end if;

  if p_status is not null and p_status not in (
    'trialing',
    'active',
    'past_due',
    'unpaid',
    'canceled',
    'incomplete',
    'incomplete_expired'
  ) then
    raise exception 'Invalid subscription status' using errcode = '22023';
  end if;

  if p_stripe_subscription_id is not null then
    select user_id
      into v_existing_subscription_user
      from public.user_plans
     where stripe_subscription_id = p_stripe_subscription_id;

    if v_existing_subscription_user is not null
      and v_existing_subscription_user is distinct from p_user_id then
      raise exception 'Stripe subscription already belongs to another user' using errcode = '23505';
    end if;
  end if;

  select stripe_subscription_id, true
    into v_existing_user_subscription, v_existing_user_exists
    from public.user_plans
   where user_id = p_user_id;

  if v_existing_user_exists
    and (
      p_stripe_subscription_id is null
      or v_existing_user_subscription is distinct from p_stripe_subscription_id
    ) then
    update public.user_plans
       set plan_id = p_plan_id,
           stripe_customer_id = p_stripe_customer_id,
           stripe_subscription_id = p_stripe_subscription_id,
           subscription_status = coalesce(p_status, subscription_status),
           current_period_start = p_period_start,
           current_period_end = p_period_end,
           updated_at = now()
     where user_id = p_user_id
     returning * into v_plan;
    return v_plan;
  end if;

  insert into public.user_plans (
    user_id,
    plan_id,
    stripe_customer_id,
    stripe_subscription_id,
    subscription_status,
    current_period_start,
    current_period_end
  )
  values (
    p_user_id,
    p_plan_id,
    p_stripe_customer_id,
    p_stripe_subscription_id,
    p_status,
    p_period_start,
    p_period_end
  )
  on conflict (stripe_subscription_id) do update
  set user_id = excluded.user_id,
      plan_id = excluded.plan_id,
      stripe_customer_id = excluded.stripe_customer_id,
      subscription_status = case
        when public.user_plans.subscription_status = 'canceled' then 'canceled'
        else coalesce(excluded.subscription_status, public.user_plans.subscription_status)
      end,
      current_period_start = excluded.current_period_start,
      current_period_end = excluded.current_period_end,
      updated_at = now()
  returning * into v_plan;

  return v_plan;
end;
$$;

revoke all on function public.upsert_user_plan(uuid, text, text, text, text, timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function public.upsert_user_plan(uuid, text, text, text, text, timestamptz, timestamptz)
  to service_role;

create or replace function public.get_billing_summary(p_user_id uuid)
returns table (
  plan_id text,
  plan_name text,
  minutes_allowance integer,
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
  v_subscription_status text;
  v_current_period_end timestamptz;
  v_used_seconds bigint;
  v_allowance_seconds bigint;
  v_month_start timestamptz := date_trunc('month', timezone('utc', now()));
begin
  select up.plan_id,
         p.name,
         p.minutes_allowance,
         up.subscription_status,
         up.current_period_end
    into v_plan_id,
         v_plan_name,
         v_minutes_allowance,
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
    v_subscription_status,
    v_current_period_end,
    v_used_seconds,
    v_allowance_seconds;
end;
$$;

revoke all on function public.get_billing_summary(uuid) from public, anon, authenticated;
grant execute on function public.get_billing_summary(uuid) to service_role;

create or replace function public.reserve_call(
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
  -- because the allowance is shared across all of that user's widgets.
  perform pg_advisory_xact_lock(hashtextextended('click2call:user:' || p_user_id::text, 0));
  perform pg_advisory_xact_lock(hashtextextended('click2call:widget:' || p_widget_id::text, 0));

  select w.user_id, w.settings
    into v_widget_user_id, v_widget_settings
    from public.widgets w
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

  select coalesce(p.minutes_allowance, 30)::bigint * 60 + v_widget_extra_seconds
    into v_allowance_seconds
    from public.user_plans up
    join public.plans p on p.id = up.plan_id
   where up.user_id = p_user_id
     and up.subscription_status in ('active', 'trialing');

  v_allowance_seconds := coalesce(v_allowance_seconds, 30 * 60 + v_widget_extra_seconds);

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

  if v_used_seconds + v_max_duration_seconds > v_allowance_seconds then
    return query select null::uuid, null::text, false, 'cap_reached';
    return;
  end if;

  insert into public.calls (user_id, widget_id, plan_id, vapi_call_id, status)
  values (p_user_id, p_widget_id, p_plan_id, v_reservation_vapi_id, 'started')
  returning calls.id into v_reservation_call_id;

  return query select v_reservation_call_id, v_reservation_vapi_id, true, null::text;
end;
$$;

revoke all on function public.reserve_call(uuid, uuid, uuid, text, integer) from public, anon, authenticated;
grant execute on function public.reserve_call(uuid, uuid, uuid, text, integer) to service_role;
