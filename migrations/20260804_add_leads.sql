create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  widget_id uuid not null references public.widgets(id) on delete cascade,
  call_id uuid references public.calls(id) on delete set null,
  name text,
  email text,
  phone text,
  message text,
  intent_score numeric,
  outcome text,
  source text not null default 'vapi',
  email_delivered_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.leads enable row level security;

do $$
begin
  if not exists (
    select 1
      from pg_policies
     where schemaname = 'public'
       and tablename = 'leads'
       and policyname = 'leads_owner_select'
  ) then
    create policy leads_owner_select
      on public.leads for select to authenticated
      using (user_id = auth.uid());
  end if;
end;
$$;

create index if not exists leads_user_created_idx
  on public.leads (user_id, created_at desc);
