-- Fix: widgets_type_check still only allows the legacy 'email' value from
-- server/db/migrations/001_add_widget_settings.sql (an old, unapplied-to-
-- production rename). The current app — WidgetCreator.tsx, CallWidget.tsx,
-- WidgetList.tsx, CallRoutingPage.tsx, and server/routes/twilio.ts — writes
-- and expects 'voicemail' everywhere. Any attempt to create a
-- Voicemail-to-Email widget currently fails with a 500 (Postgres check
-- constraint violation) because 'voicemail' is not an allowed type value.

ALTER TABLE public.widgets DROP CONSTRAINT IF EXISTS widgets_type_check;
ALTER TABLE public.widgets ADD CONSTRAINT widgets_type_check
  CHECK (type IN ('call2app', 'siptrunk', 'aibot', 'voicemail', 'vapi'));

-- Backfill any rows written under the old 'email' value so they match the
-- type the app actually reads/writes.
UPDATE public.widgets SET type = 'voicemail' WHERE type = 'email';
