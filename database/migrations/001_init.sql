-- WhatsApp-Telegram Bot Platform Database Schema
-- Simple, migration-safe version

-- Users table
CREATE TABLE users (
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

-- Sessions table
CREATE TABLE sessions (
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

-- Groups table with proper unique constraint
CREATE TABLE groups (
    id BIGSERIAL PRIMARY KEY,
    jid VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    description TEXT,
    grouponly_enabled BOOLEAN DEFAULT FALSE,
    public_mode BOOLEAN DEFAULT TRUE,
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
    welcome_enabled BOOLEAN DEFAULT FALSE,
    goodbye_enabled BOOLEAN DEFAULT FALSE,
    warning_limit INTEGER DEFAULT 4,
    participants_count INTEGER DEFAULT 0,
    is_bot_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add unique constraint separately to avoid naming issues
ALTER TABLE groups ADD CONSTRAINT groups_jid_unique UNIQUE (jid);

-- Messages table
CREATE TABLE messages (
    n_o BIGSERIAL PRIMARY KEY,
    id VARCHAR(255) NOT NULL,
    from_jid VARCHAR(255) NOT NULL,
    sender_jid VARCHAR(255) NOT NULL,
    timestamp BIGINT NOT NULL,
    content TEXT,
    media TEXT,
    media_type VARCHAR(255),
    session_id VARCHAR(255),
    user_id VARCHAR(255),
    is_view_once BOOLEAN DEFAULT FALSE,
    from_me BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add unique constraint for messages
ALTER TABLE messages ADD CONSTRAINT messages_id_session_unique UNIQUE(id, session_id);

-- Warnings table
CREATE TABLE warnings (
    id BIGSERIAL PRIMARY KEY,
    user_jid VARCHAR(255) NOT NULL,
    group_jid VARCHAR(255) NOT NULL,
    warning_type VARCHAR(50) NOT NULL,
    warning_count INTEGER DEFAULT 1,
    reason TEXT,
    last_warning_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add unique constraint for warnings
ALTER TABLE warnings ADD CONSTRAINT warnings_user_group_type_unique UNIQUE(user_jid, group_jid, warning_type);

-- Violations table
CREATE TABLE violations (
    id BIGSERIAL PRIMARY KEY,
    user_jid VARCHAR(255) NOT NULL,
    group_jid VARCHAR(255) NOT NULL,
    violation_type VARCHAR(50) NOT NULL,
    message_content TEXT,
    detected_content JSONB,
    action_taken VARCHAR(50),
    warning_number INTEGER,
    message_id VARCHAR(255),
    violated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Settings table
CREATE TABLE settings (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(255),
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add unique constraint for settings
ALTER TABLE settings ADD CONSTRAINT settings_user_session_key_unique UNIQUE(user_id, session_id, setting_key);

-- Group analytics table
CREATE TABLE group_analytics (
    id BIGSERIAL PRIMARY KEY,
    group_jid VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    total_messages INTEGER DEFAULT 0,
    total_media_messages INTEGER DEFAULT 0,
    total_violations INTEGER DEFAULT 0,
    antilink_violations INTEGER DEFAULT 0,
    antispam_violations INTEGER DEFAULT 0,
    antiraid_violations INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    warned_users INTEGER DEFAULT 0,
    kicked_users INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add unique constraint for analytics
ALTER TABLE group_analytics ADD CONSTRAINT analytics_group_date_unique UNIQUE(group_jid, date);

-- Create indexes
CREATE INDEX idx_messages_session_id ON messages(session_id);
CREATE INDEX idx_messages_from_jid ON messages(from_jid);
CREATE INDEX idx_messages_sender_jid ON messages(sender_jid);
CREATE INDEX idx_messages_timestamp ON messages(timestamp DESC);
CREATE INDEX idx_groups_jid ON groups(jid);
CREATE INDEX idx_warnings_user_group ON warnings(user_jid, group_jid);
CREATE INDEX idx_violations_user_group ON violations(user_jid, group_jid);
CREATE INDEX idx_violations_date ON violations(violated_at DESC);
CREATE INDEX idx_sessions_telegram_id ON sessions(telegram_id);
CREATE INDEX idx_users_telegram_id ON users(telegram_id);

-- Create trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at 
    BEFORE UPDATE ON sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_groups_updated_at 
    BEFORE UPDATE ON groups 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_warnings_updated_at 
    BEFORE UPDATE ON warnings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at 
    BEFORE UPDATE ON settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Cleanup function
CREATE OR REPLACE FUNCTION cleanup_old_data(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM violations 
    WHERE violated_at < CURRENT_DATE - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    DELETE FROM group_analytics 
    WHERE date < CURRENT_DATE - INTERVAL '365 days';
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Final message
SELECT 'Database schema created successfully!' as status;