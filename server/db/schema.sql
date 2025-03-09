-- Create widgets table
create table widgets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('call2app', 'siptrunk', 'aibot', 'voicemail')),
  destination text not null,
  routing jsonb not null default '{
    "defaultRoute": "voicemail",
    "fallbackRoute": "voicemail",
    "businessHours": null
  }'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS on widgets
alter table widgets enable row level security;

-- Add RLS policies for widgets
create policy "Users can view their own widgets"
  on widgets for select
  using (auth.uid() = user_id);

create policy "Users can create their own widgets"
  on widgets for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own widgets"
  on widgets for update
  using (auth.uid() = user_id);

create policy "Users can delete their own widgets"
  on widgets for delete
  using (auth.uid() = user_id);

-- Create mobile devices table
create table mobile_devices (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  device_token text not null,
  device_name text,
  platform text not null check (platform in ('ios', 'android')),
  app_version text not null,
  last_active timestamp with time zone default now(),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(user_id, device_token)
);

-- Enable RLS on mobile_devices
alter table mobile_devices enable row level security;

-- Create widget_routes table to track active call routes
create table widget_routes (
  id uuid default uuid_generate_v4() primary key,
  widget_id uuid references widgets(id) on delete cascade,
  device_id uuid references mobile_devices(id) on delete cascade,
  status text not null check (status in ('active', 'inactive')),
  last_ping timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS on widget_routes
alter table widget_routes enable row level security;

-- RLS Policies

-- Mobile devices can only be accessed by their owner
create policy "Users can view their own devices"
  on mobile_devices for select
  using (auth.uid() = user_id);

create policy "Users can insert their own devices"
  on mobile_devices for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own devices"
  on mobile_devices for update
  using (auth.uid() = user_id);

-- Widget routes can be accessed by widget owners
create policy "Users can view routes for their widgets"
  on widget_routes for select
  using (
    exists (
      select 1 from widgets
      where widgets.id = widget_routes.widget_id
      and widgets.user_id = auth.uid()
    )
  );

create policy "Users can manage routes for their widgets"
  on widget_routes for all
  using (
    exists (
      select 1 from widgets
      where widgets.id = widget_routes.widget_id
      and widgets.user_id = auth.uid()
    )
  );

-- Add function to update last_active timestamp
create or replace function update_last_active()
returns trigger as $$
begin
  new.last_active = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger to update last_active on mobile_devices
create trigger update_mobile_device_last_active
  before update on mobile_devices
  for each row
  execute function update_last_active(); 