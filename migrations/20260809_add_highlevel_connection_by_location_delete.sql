-- lc-webhooks.ts receives an uninstall event keyed by HighLevel's
-- locationId, not our own user_id — delete_highlevel_connection (from
-- 20260808_add_highlevel_connections.sql) can't be called from that
-- payload directly, so add a location-keyed variant.

create or replace function public.delete_highlevel_connection_by_location(p_location_id text)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  delete from public.highlevel_connections where highlevel_location_id = p_location_id;
  return found;
end;
$$;

revoke all on function public.delete_highlevel_connection_by_location(text) from public, anon, authenticated;
grant execute on function public.delete_highlevel_connection_by_location(text) to service_role;
