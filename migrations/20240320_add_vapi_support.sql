-- Add VAPI type to widgets table type check constraint
ALTER TABLE widgets DROP CONSTRAINT widgets_type_check;
ALTER TABLE widgets ADD CONSTRAINT widgets_type_check 
  CHECK (type IN ('call2app', 'siptrunk', 'aibot', 'email', 'vapi'));

-- Add comment to document settings structure
COMMENT ON COLUMN widgets.settings IS E'JSON settings for the widget. Structure varies by type:\n'
  '- For VAPI widgets: { "vapi_api_key": string, "vapi_assistant_id": string, "vapi_assistant_name": string }\n'
  '- For SIP trunk widgets: { "twilio_account_sid": string, "twilio_auth_token": string, "twilio_domain_sid": string, "twilio_domain_name": string }';

-- Create a function to validate widget settings
CREATE OR REPLACE FUNCTION validate_widget_settings()
RETURNS trigger AS $$
BEGIN
  -- Validate VAPI settings
  IF NEW.type = 'vapi' THEN
    -- First step: Only API key required
    IF NOT (
      NEW.settings ? 'vapi_api_key' AND 
      jsonb_typeof(NEW.settings->'vapi_api_key') = 'string'
    ) THEN
      RAISE EXCEPTION 'VAPI widgets require vapi_api_key setting';
    END IF;
    
    -- Second step: If assistant ID is provided, name is also required
    IF NEW.settings ? 'vapi_assistant_id' AND NOT (
      NEW.settings ? 'vapi_assistant_name' AND
      jsonb_typeof(NEW.settings->'vapi_assistant_id') = 'string' AND
      jsonb_typeof(NEW.settings->'vapi_assistant_name') = 'string'
    ) THEN
      RAISE EXCEPTION 'When vapi_assistant_id is provided, vapi_assistant_name is also required';
    END IF;
  END IF;

  -- Validate SIP trunk settings
  IF NEW.type = 'siptrunk' THEN
    -- First step: Account SID and auth token required
    IF NOT (
      NEW.settings ? 'twilio_account_sid' AND 
      NEW.settings ? 'twilio_auth_token' AND
      jsonb_typeof(NEW.settings->'twilio_account_sid') = 'string' AND
      jsonb_typeof(NEW.settings->'twilio_auth_token') = 'string'
    ) THEN
      RAISE EXCEPTION 'SIP trunk widgets require twilio_account_sid and twilio_auth_token settings';
    END IF;
    
    -- Second step: If domain SID is provided, domain name is also required
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

-- Create trigger to validate settings
DROP TRIGGER IF EXISTS validate_widget_settings_trigger ON widgets;
CREATE TRIGGER validate_widget_settings_trigger
  BEFORE INSERT OR UPDATE ON widgets
  FOR EACH ROW
  EXECUTE FUNCTION validate_widget_settings();

-- Add rollback instructions in case of failure
-- To rollback, run:
/*
DROP TRIGGER IF EXISTS validate_widget_settings_trigger ON widgets;
DROP FUNCTION IF EXISTS validate_widget_settings();
ALTER TABLE widgets DROP CONSTRAINT widgets_type_check;
ALTER TABLE widgets ADD CONSTRAINT widgets_type_check 
  CHECK (type IN ('call2app', 'siptrunk', 'aibot', 'email'));
*/ 