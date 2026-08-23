-- Make the mobile API's upsert target authoritative and allow Expo web previews.

alter table public.mobile_devices
  drop constraint if exists mobile_devices_platform_check;

alter table public.mobile_devices
  add constraint mobile_devices_platform_check
  check (platform in ('ios', 'android', 'web'));

with ranked_routes as (
  select
    id,
    row_number() over (
      partition by widget_id, device_id
      order by updated_at desc nulls last, created_at desc nulls last, id desc
    ) as duplicate_number
  from public.widget_routes
)
delete from public.widget_routes
using ranked_routes
where public.widget_routes.id = ranked_routes.id
  and ranked_routes.duplicate_number > 1;

create unique index if not exists widget_routes_widget_device_idx
  on public.widget_routes (widget_id, device_id);
