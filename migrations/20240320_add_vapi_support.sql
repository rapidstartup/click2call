-- Add VAPI type to widgets table type check constraint
ALTER TABLE widgets DROP CONSTRAINT widgets_type_check;
ALTER TABLE widgets ADD CONSTRAINT widgets_type_check 
  CHECK (type IN ('call2app', 'siptrunk', 'aibot', 'email', 'vapi'));

-- Add comment to document VAPI settings structure
COMMENT ON COLUMN widgets.settings IS 'For VAPI widgets, expects: { "vapi_api_key": string, "vapi_assistant_id": string }';

-- Create a function to validate VAPI settings
CREATE OR REPLACE FUNCTION validate_vapi_settings()
RETURNS trigger AS $$
BEGIN
  -- Only validate for VAPI type widgets
  IF NEW.type = 'vapi' THEN
    -- Check if required VAPI settings are present and of correct type
    IF NOT (
      NEW.settings ? 'vapi_api_key' AND 
      NEW.settings ? 'vapi_assistant_id' AND
      jsonb_typeof(NEW.settings->'vapi_api_key') = 'string' AND
      jsonb_typeof(NEW.settings->'vapi_assistant_id') = 'string'
    ) THEN
      RAISE EXCEPTION 'VAPI widgets require vapi_api_key and vapi_assistant_id settings';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate VAPI settings
DROP TRIGGER IF EXISTS validate_vapi_settings_trigger ON widgets;
CREATE TRIGGER validate_vapi_settings_trigger
  BEFORE INSERT OR UPDATE ON widgets
  FOR EACH ROW
  EXECUTE FUNCTION validate_vapi_settings();

-- Add rollback instructions in case of failure
-- To rollback, run:
/*
DROP TRIGGER IF EXISTS validate_vapi_settings_trigger ON widgets;
DROP FUNCTION IF EXISTS validate_vapi_settings();
ALTER TABLE widgets DROP CONSTRAINT widgets_type_check;
ALTER TABLE widgets ADD CONSTRAINT widgets_type_check 
  CHECK (type IN ('call2app', 'siptrunk', 'aibot', 'email'));
*/ 