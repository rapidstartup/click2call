-- Add settings column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'widgets' 
        AND column_name = 'settings'
    ) THEN
        ALTER TABLE widgets ADD COLUMN settings jsonb NOT NULL DEFAULT '{}';
    END IF;
END $$;

-- Update the type enum to include 'email' instead of 'voicemail'
ALTER TABLE widgets DROP CONSTRAINT IF EXISTS widgets_type_check;
ALTER TABLE widgets ADD CONSTRAINT widgets_type_check 
    CHECK (type IN ('call2app', 'siptrunk', 'aibot', 'email'));

-- Update existing voicemail types to email if any exist
UPDATE widgets SET type = 'email' WHERE type = 'voicemail';

-- Add UTC timezone to timestamps if not already using it
ALTER TABLE widgets 
    ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now()),
    ALTER COLUMN updated_at SET DEFAULT timezone('utc'::text, now());

-- Ensure timestamps are not null
ALTER TABLE widgets 
    ALTER COLUMN created_at SET NOT NULL,
    ALTER COLUMN updated_at SET NOT NULL;

-- Create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add the updated_at trigger if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_trigger 
        WHERE tgname = 'update_widgets_updated_at'
    ) THEN
        CREATE TRIGGER update_widgets_updated_at
            BEFORE UPDATE ON widgets
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$; 