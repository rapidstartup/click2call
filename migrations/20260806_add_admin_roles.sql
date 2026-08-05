-- Grant admin access from the SQL console.
-- INSERT INTO public.user_roles (user_id, role) VALUES ('<auth-user-uuid>', 'admin');

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin')),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.user_roles enable row level security;

do $$
begin
  if not exists (
    select 1
      from pg_policies
     where schemaname = 'public'
       and tablename = 'user_roles'
       and policyname = 'Users can view their own role'
  ) then
    create policy "Users can view their own role"
      on public.user_roles for select to authenticated
      using (user_id = auth.uid());
  end if;
end;
$$;

create or replace function public.get_platform_stats()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_summary jsonb;
  v_users jsonb;
begin
  if not exists (
    select 1
      from public.user_roles
     where user_id = auth.uid()
       and role = 'admin'
  ) then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'total_users', (select count(*) from auth.users),
    'active_subscriptions', (
      select count(*)
        from public.user_plans
       where subscription_status in ('active', 'trialing')
    ),
    'mrr_usd', (
      select coalesce(sum(p.price_monthly_usd), 0::numeric)
        from public.user_plans up
        join public.plans p on p.id = up.plan_id
       where up.subscription_status in ('active', 'trialing')
    ),
    'total_calls', (select count(*) from public.calls),
    'total_minutes', (
      select coalesce(round(sum(greatest(0, coalesce(c.duration_s, 0))) / 60.0, 2), 0::numeric)
        from public.calls c
    ),
    'total_cost_usd', (
      select coalesce(sum(coalesce(c.cost_usd, 0::numeric)), 0::numeric)
        from public.calls c
    )
  )
    into v_summary;

  with call_totals as (
    select c.user_id,
           count(*) as total_calls,
           coalesce(round(sum(greatest(0, coalesce(c.duration_s, 0))) / 60.0, 2), 0::numeric) as total_minutes,
           coalesce(sum(coalesce(c.cost_usd, 0::numeric)), 0::numeric) as total_cost_usd
      from public.calls c
     where c.user_id is not null
     group by c.user_id
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'user_id', u.id,
      'email', u.email,
      'plan_id', up.plan_id,
      'subscription_status', up.subscription_status,
      'total_calls', coalesce(ct.total_calls, 0::bigint),
      'total_minutes', coalesce(ct.total_minutes, 0::numeric),
      'total_cost_usd', coalesce(ct.total_cost_usd, 0::numeric)
    )
    order by coalesce(ct.total_minutes, 0::numeric) desc, u.email nulls last, u.id
  ), '[]'::jsonb)
    into v_users
    from auth.users u
    left join public.user_plans up on up.user_id = u.id
    left join call_totals ct on ct.user_id = u.id;

  return jsonb_build_object('summary', v_summary, 'users', v_users);
end;
$$;

revoke all on function public.get_platform_stats() from public, anon;
grant execute on function public.get_platform_stats() to authenticated;
