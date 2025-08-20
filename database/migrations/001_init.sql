-- WhatsApp-Telegram Bot Platform Database Schema
-- Enhanced with violation logging and better indexes

-- Users table for Telegram authentication
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    username VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    phone_number VARCHAR(20),
    is_admin BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table for WhatsApp connections
CREATE TABLE IF NOT EXISTS sessions (
    id BIGSERIAL PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    telegram_id BIGINT NOT NULL,
    phone_number VARCHAR(20),
    is_connected BOOLEAN DEFAULT FALSE,
    pairing_code VARCHAR(10),
    pairing_expires_at TIMESTAMP,
    last_seen TIMESTAMP,
    connection_status VARCHAR(50) DEFAULT 'disconnected',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages table with EXACT Baileys JID format
CREATE TABLE IF NOT EXISTS messages (
    n_o BIGSERIAL PRIMARY KEY,
    id VARCHAR(255) NOT NULL,                    -- WhatsApp message ID
    from_jid VARCHAR(255) NOT NULL,              -- Chat/Group JID where message came from
    sender_jid VARCHAR(255) NOT NULL,            -- Actual sender's JID
    timestamp BIGINT NOT NULL,
    content TEXT,
    media TEXT,
    media_type VARCHAR(255),
    session_id VARCHAR(255),                     -- User session identifier
    user_id VARCHAR(255),                        -- User identifier
    is_view_once BOOLEAN DEFAULT FALSE,
    from_me BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(id, session_id)
);

-- Enhanced Group settings with all anti-command options
CREATE TABLE IF NOT EXISTS groups (
    id BIGSERIAL PRIMARY KEY,
    jid VARCHAR(255) NOT NULL,                   -- Group JID in format: numbers-numbers@g.us
    session_id VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    description TEXT,
    
    -- Bot behavior settings
    grouponly_enabled BOOLEAN DEFAULT FALSE,     -- Controls bot replies in groups
    public_mode BOOLEAN DEFAULT TRUE,
    
    -- Anti-command settings (expanded)
    antilink_enabled BOOLEAN DEFAULT FALSE,
    anticall_enabled BOOLEAN DEFAULT FALSE,
    antiimage_enabled BOOLEAN DEFAULT FALSE,
    antivideo_enabled BOOLEAN DEFAULT FALSE,
    antiaudio_enabled BOOLEAN DEFAULT FALSE,
    antidocument_enabled BOOLEAN DEFAULT FALSE,
    antisticker_enabled BOOLEAN DEFAULT FALSE,
    antigroupmention_enabled BOOLEAN DEFAULT FALSE,
    antidelete_enabled BOOLEAN DEFAULT FALSE,
    antiviewonce_enabled BOOLEAN DEFAULT FALSE,
    antibot_enabled BOOLEAN DEFAULT FALSE,
    antispam_enabled BOOLEAN DEFAULT FALSE,
    antiraid_enabled BOOLEAN DEFAULT FALSE,
    autowelcome_enabled BOOLEAN DEFAULT FALSE,
    autokick_enabled BOOLEAN DEFAULT FALSE,
    
    -- Group event settings
    welcome_enabled BOOLEAN DEFAULT FALSE,       -- Enable welcome messages for new members
    goodbye_enabled BOOLEAN DEFAULT FALSE,      -- Enable goodbye messages for leaving members
    
    -- Warning limits (configurable per group)
    warning_limit INTEGER DEFAULT 4,
    
    -- Group metadata
    participants_count INTEGER DEFAULT 0,
    is_bot_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(jid, session_id)
);

-- Enhanced Warning system with better tracking
CREATE TABLE IF NOT EXISTS warnings (
    id BIGSERIAL PRIMARY KEY,
    user_jid VARCHAR(255) NOT NULL,              -- User JID who received warning
    group_jid VARCHAR(255) NOT NULL,             -- Group JID where warning occurred
    session_id VARCHAR(255) NOT NULL,
    warning_type VARCHAR(50) NOT NULL,           -- 'antilink', 'anticall', 'antispam', etc.
    warning_count INTEGER DEFAULT 1,
    reason TEXT,                                 -- Optional reason for the warning
    last_warning_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_jid, group_jid, session_id, warning_type)
);

-- NEW: Violations table for detailed logging and analytics
CREATE TABLE IF NOT EXISTS violations (
    id BIGSERIAL PRIMARY KEY,
    user_jid VARCHAR(255) NOT NULL,              -- User who committed the violation
    group_jid VARCHAR(255) NOT NULL,             -- Group where violation occurred
    session_id VARCHAR(255) NOT NULL,
    violation_type VARCHAR(50) NOT NULL,         -- 'antilink', 'antispam', etc.
    message_content TEXT,                        -- Original message content (truncated)
    detected_content JSONB,                      -- What was detected (links, mentions, etc.)
    action_taken VARCHAR(50),                    -- 'warning', 'kick', 'ban', 'delete'
    warning_number INTEGER,                      -- Which warning number this was (1-4)
    message_id VARCHAR(255),                     -- Original WhatsApp message ID
    violated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key relationships
    CONSTRAINT fk_violation_warning 
        FOREIGN KEY (user_jid, group_jid, session_id, violation_type) 
        REFERENCES warnings(user_jid, group_jid, session_id, warning_type)
        ON DELETE CASCADE
);

-- User settings for personalization
CREATE TABLE IF NOT EXISTS settings (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(255),
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, session_id, setting_key)
);

-- NEW: Group analytics table for insights
CREATE TABLE IF NOT EXISTS group_analytics (
    id BIGSERIAL PRIMARY KEY,
    group_jid VARCHAR(255) NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    
    -- Message statistics
    total_messages INTEGER DEFAULT 0,
    total_media_messages INTEGER DEFAULT 0,
    total_violations INTEGER DEFAULT 0,
    
    -- Violation breakdown
    antilink_violations INTEGER DEFAULT 0,
    antispam_violations INTEGER DEFAULT 0,
    antiraid_violations INTEGER DEFAULT 0,
    
    -- User statistics
    active_users INTEGER DEFAULT 0,
    warned_users INTEGER DEFAULT 0,
    kicked_users INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_jid, session_id, date)
);

-- Comprehensive indexes for performance
-- Core message indexes
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_from_jid ON messages(from_jid);
CREATE INDEX IF NOT EXISTS idx_messages_sender_jid ON messages(sender_jid);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_messages_session_from ON messages(session_id, from_jid);

-- Group setting indexes
CREATE INDEX IF NOT EXISTS idx_groups_jid_session ON groups(jid, session_id);
CREATE INDEX IF NOT EXISTS idx_groups_antilink ON groups(antilink_enabled) WHERE antilink_enabled = true;
CREATE INDEX IF NOT EXISTS idx_groups_antispam ON groups(antispam_enabled) WHERE antispam_enabled = true;
CREATE INDEX IF NOT EXISTS idx_groups_welcome ON groups(welcome_enabled) WHERE welcome_enabled = true;
CREATE INDEX IF NOT EXISTS idx_groups_goodbye ON groups(goodbye_enabled) WHERE goodbye_enabled = true;

-- Warning system indexes
CREATE INDEX IF NOT EXISTS idx_warnings_user_group ON warnings(user_jid, group_jid);
CREATE INDEX IF NOT EXISTS idx_warnings_group_session ON warnings(group_jid, session_id);
CREATE INDEX IF NOT EXISTS idx_warnings_type ON warnings(warning_type);
CREATE INDEX IF NOT EXISTS idx_warnings_count ON warnings(warning_count);
CREATE INDEX IF NOT EXISTS idx_warnings_last_warning ON warnings(last_warning_at DESC);

-- Violation tracking indexes
CREATE INDEX IF NOT EXISTS idx_violations_user_group ON violations(user_jid, group_jid);
CREATE INDEX IF NOT EXISTS idx_violations_type ON violations(violation_type);
CREATE INDEX IF NOT EXISTS idx_violations_date ON violations(violated_at DESC);
CREATE INDEX IF NOT EXISTS idx_violations_session ON violations(session_id);

-- Session and user indexes
CREATE INDEX IF NOT EXISTS idx_sessions_telegram_id ON sessions(telegram_id);
CREATE INDEX IF NOT EXISTS idx_sessions_connected ON sessions(is_connected) WHERE is_connected = true;
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_admin ON users(is_admin) WHERE is_admin = true;

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_analytics_group_date ON group_analytics(group_jid, date DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_session_date ON group_analytics(session_id, date DESC);

-- Triggers for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to relevant tables
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_groups_updated_at ON groups;
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_warnings_updated_at ON warnings;
CREATE TRIGGER update_warnings_updated_at BEFORE UPDATE ON warnings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Cleanup function for old data (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_data(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete old violations
    DELETE FROM violations 
    WHERE violated_at < CURRENT_DATE - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Delete old analytics data (keep longer - 1 year)
    DELETE FROM group_analytics 
    WHERE date < CURRENT_DATE - INTERVAL '365 days';
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- DATABASE SCHEMA DOCUMENTATION
-- ==========================================

-- Groups Table - Group Event Features
-- The groups table now includes welcome and goodbye message functionality:
-- 
-- welcome_enabled: BOOLEAN DEFAULT FALSE
--   - Controls whether welcome messages are sent when new members join
--   - Managed through the groupevents plugin (.welcome on/off)
--   - Each group can have different settings
--
-- goodbye_enabled: BOOLEAN DEFAULT FALSE  
--   - Controls whether goodbye messages are sent when members leave
--   - Managed through the groupevents plugin (.goodbye on/off)
--   - Each group can have different settings
--
-- These features are automatically integrated with the group handler
-- and require no environment variable configuration.