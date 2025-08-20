-- Migration to add welcome and goodbye columns to groups table
-- This enables the new welcome and goodbye plugins

-- Add welcome and goodbye columns to groups table
ALTER TABLE groups ADD COLUMN IF NOT EXISTS welcome_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS goodbye_enabled BOOLEAN DEFAULT FALSE;

-- Add comments for clarity
COMMENT ON COLUMN groups.welcome_enabled IS 'Enable welcome messages for new members';
COMMENT ON COLUMN groups.goodbye_enabled IS 'Enable goodbye messages for leaving members';

-- Update existing groups to have these features disabled by default
UPDATE groups SET welcome_enabled = FALSE, goodbye_enabled = FALSE WHERE welcome_enabled IS NULL OR goodbye_enabled IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_groups_welcome ON groups(welcome_enabled);
CREATE INDEX IF NOT EXISTS idx_groups_goodbye ON groups(goodbye_enabled);

-- Log the migration
INSERT INTO group_analytics (group_jid, session_id, event_type, event_data, created_at)
VALUES ('migration', 'system', 'schema_update', '{"migration": "003_add_welcome_goodbye_columns", "changes": ["welcome_enabled", "goodbye_enabled"]}', NOW())
ON CONFLICT DO NOTHING;
