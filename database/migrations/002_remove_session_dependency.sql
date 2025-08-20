-- Migration to remove session_id dependency from groups and warnings tables
-- This makes anti-plugins work globally across all sessions for the same group

-- Drop existing constraints and indexes
DROP INDEX IF EXISTS idx_groups_jid_session;
DROP INDEX IF EXISTS idx_warnings_user_group;

-- Modify groups table to remove session_id dependency
ALTER TABLE groups DROP CONSTRAINT IF EXISTS groups_jid_session_key;
ALTER TABLE groups DROP COLUMN IF EXISTS session_id;

-- Add new unique constraint on jid only
ALTER TABLE groups ADD CONSTRAINT groups_jid_key UNIQUE (jid);

-- Modify warnings table to remove session_id dependency
ALTER TABLE warnings DROP CONSTRAINT IF EXISTS warnings_user_jid_group_jid_session_id_warning_type_key;
ALTER TABLE warnings DROP COLUMN IF EXISTS session_id;

-- Add new unique constraint on user_jid, group_jid, warning_type
ALTER TABLE warnings ADD CONSTRAINT warnings_user_group_type_key UNIQUE (user_jid, group_jid, warning_type);

-- Recreate indexes without session_id
CREATE INDEX IF NOT EXISTS idx_groups_jid ON groups(jid);
CREATE INDEX IF NOT EXISTS idx_warnings_user_group ON warnings(user_jid, group_jid);

-- Add some default group settings for common groups
INSERT INTO groups (jid, name, grouponly_enabled, antilink_enabled, updated_at)
VALUES 
  ('120363404342990477@g.us', 'Test Group 1', false, false, NOW()),
  ('120363401461519948@g.us', 'Test Group 2', false, false, NOW())
ON CONFLICT (jid) DO NOTHING;
