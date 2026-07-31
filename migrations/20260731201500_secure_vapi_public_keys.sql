-- Require a distinct browser-safe VAPI public key for all future VAPI writes.
-- Existing private keys cannot be converted safely, so legacy rows are flagged
-- for an explicit owner update through the widget settings UI.

UPDATE widgets
SET settings = jsonb_set(settings, '{vapi_public_key_required}', 'true'::jsonb, true)
WHERE type = 'vapi'
  AND (
    NOT (settings ? 'vapi_public_key')
    OR NULLIF(BTRIM(settings->>'vapi_public_key'), '') IS NULL
    OR BTRIM(settings->>'vapi_public_key') = BTRIM(settings->>'vapi_api_key')
  );

CREATE OR REPLACE FUNCTION validate_widget_settings()
RETURNS trigger AS $$
BEGIN
  IF NEW.type = 'vapi' THEN
    IF NOT (
      NEW.settings ? 'vapi_api_key' AND
      NEW.settings ? 'vapi_public_key' AND
      jsonb_typeof(NEW.settings->'vapi_api_key') = 'string' AND
      jsonb_typeof(NEW.settings->'vapi_public_key') = 'string' AND
      NULLIF(BTRIM(NEW.settings->>'vapi_api_key'), '') IS NOT NULL AND
      NULLIF(BTRIM(NEW.settings->>'vapi_public_key'), '') IS NOT NULL AND
      BTRIM(NEW.settings->>'vapi_api_key') <> BTRIM(NEW.settings->>'vapi_public_key')
    ) THEN
      RAISE EXCEPTION 'VAPI widgets require distinct private and public keys';
    END IF;

    NEW.settings = NEW.settings - 'vapi_public_key_required';

    IF NEW.settings ? 'vapi_assistant_id' AND NOT (
      NEW.settings ? 'vapi_assistant_name' AND
      jsonb_typeof(NEW.settings->'vapi_assistant_id') = 'string' AND
      jsonb_typeof(NEW.settings->'vapi_assistant_name') = 'string'
    ) THEN
      RAISE EXCEPTION 'When vapi_assistant_id is provided, vapi_assistant_name is also required';
    END IF;
  END IF;

  IF NEW.type = 'siptrunk' THEN
    IF NOT (
      NEW.settings ? 'twilio_account_sid' AND
      NEW.settings ? 'twilio_auth_token' AND
      jsonb_typeof(NEW.settings->'twilio_account_sid') = 'string' AND
      jsonb_typeof(NEW.settings->'twilio_auth_token') = 'string'
    ) THEN
      RAISE EXCEPTION 'SIP trunk widgets require twilio_account_sid and twilio_auth_token settings';
    END IF;

    IF NEW.settings ? 'twilio_domain_sid' AND NOT (
      NEW.settings ? 'twilio_domain_name' AND
      jsonb_typeof(NEW.settings->'twilio_domain_sid') = 'string' AND
      jsonb_typeof(NEW.settings->'twilio_domain_name') = 'string'
    ) THEN
      RAISE EXCEPTION 'When twilio_domain_sid is provided, twilio_domain_name is also required';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
