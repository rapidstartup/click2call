-- Seed the public homepage demo widget (VAPI assistant: Clicko).
-- Safe to re-run: upserts by fixed UUID.
--
-- Before running, replace:
--   __VAPI_PUBLIC_OR_WEB_KEY__  with your Vapi public key (preferred) or private key for demo only
--
-- The DB trigger requires:
--   - distinct vapi_api_key and vapi_public_key
--   - allowed_origins array of https?://host[/] origins
--   - vapi_assistant_name when vapi_assistant_id is set

INSERT INTO widgets (
  id,
  user_id,
  name,
  type,
  destination,
  routing,
  settings
) VALUES (
  '00000000-0000-4000-8000-000000000001',
  NULL,
  'Homepage Demo (Clicko)',
  'vapi',
  'vapi:dc6143be-269a-412a-acd0-47e15e41b5ea',
  '{}'::jsonb,
  jsonb_build_object(
    'vapi_api_key', 'server-private-placeholder-not-used-for-web',
    'vapi_public_key', '__VAPI_PUBLIC_OR_WEB_KEY__',
    'vapi_assistant_id', 'dc6143be-269a-412a-acd0-47e15e41b5ea',
    'vapi_assistant_name', 'Clicko',
    'allowed_origins', jsonb_build_array(
      'https://click2call.ai',
      'https://www.click2call.ai',
      'http://localhost:5173',
      'http://localhost:4173'
    )
  )
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  destination = EXCLUDED.destination,
  settings = EXCLUDED.settings,
  updated_at = timezone('utc'::text, now());
