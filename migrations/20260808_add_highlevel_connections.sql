-- HighLevel (LeadConnector) marketplace app: one connection per click2call
-- account, carrying OAuth tokens plus the location/pipeline this account
-- pushes leads and transcripts into.
--
-- Token columns are more sensitive than user_plans/user_roles, so unlike
-- those tables this one grants `authenticated` no direct access at all.
-- Reads/writes only happen server-side (service_role), and the one
-- client-facing fact ("are we connected") is exposed through a boolean
-- function rather than a row/view select.

create table if not exists public.highlevel_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  highlevel_location_id text not null,
  highlevel_company_id text,
  access_token text not null,
  refresh_token text not null,
  token_expires_at timestamptz not null,
  scope text,
  pipeline_id text,
  installed_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.highlevel_connections enable row level security;
-- Deliberately no policy for `authenticated` — see comment above.

create or replace function public.is_highlevel_connected(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.highlevel_connections where user_id = p_user_id
  );
$$;

revoke all on function public.is_highlevel_connected(uuid) from public, anon;
grant execute on function public.is_highlevel_connected(uuid) to authenticated;

create or replace function public.upsert_highlevel_connection(
  p_user_id uuid,
  p_location_id text,
  p_company_id text,
  p_access_token text,
  p_refresh_token text,
  p_expires_at timestamptz,
  p_scope text,
  p_pipeline_id text default null
)
returns public.highlevel_connections
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_row public.highlevel_connections;
begin
  if p_user_id is null or nullif(btrim(p_location_id), '') is null then
    raise exception 'Invalid HighLevel connection request' using errcode = '22023';
  end if;

  insert into public.highlevel_connections (
    user_id,
    highlevel_location_id,
    highlevel_company_id,
    access_token,
    refresh_token,
    token_expires_at,
    scope,
    pipeline_id
  )
  values (
    p_user_id,
    p_location_id,
    p_company_id,
    p_access_token,
    p_refresh_token,
    p_expires_at,
    p_scope,
    p_pipeline_id
  )
  on conflict (user_id) do update
  set highlevel_location_id = excluded.highlevel_location_id,
      highlevel_company_id = excluded.highlevel_company_id,
      access_token = excluded.access_token,
      refresh_token = excluded.refresh_token,
      token_expires_at = excluded.token_expires_at,
      scope = excluded.scope,
      -- Only overwrite an existing pipeline_id if the caller actually passed
      -- one; token refreshes shouldn't clobber the pipeline created earlier
      -- by the lazy-create-on-first-push flow (see A3a).
      pipeline_id = coalesce(excluded.pipeline_id, public.highlevel_connections.pipeline_id),
      updated_at = timezone('utc', now())
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.upsert_highlevel_connection(
  uuid, text, text, text, text, timestamptz, text, text
) from public, anon, authenticated;
grant execute on function public.upsert_highlevel_connection(
  uuid, text, text, text, text, timestamptz, text, text
) to service_role;

create or replace function public.delete_highlevel_connection(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  delete from public.highlevel_connections where user_id = p_user_id;
  return found;
end;
$$;

revoke all on function public.delete_highlevel_connection(uuid) from public, anon, authenticated;
grant execute on function public.delete_highlevel_connection(uuid) to service_role;

alter table public.leads add column if not exists highlevel_delivered_at timestamptz;
