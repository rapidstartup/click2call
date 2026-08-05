-- Fix: aibot and vapi widget types do not need a destination value.
-- Make destination nullable so widget creation does not fail with a NOT NULL
-- constraint violation for those types.

alter table public.widgets
  alter column destination drop not null;