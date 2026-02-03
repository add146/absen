-- Add system settings table for storing WAHA and other configurations
CREATE TABLE IF NOT EXISTS system_settings (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    key TEXT NOT NULL UNIQUE,
    value TEXT,
    description TEXT,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
);

-- Create index on key for fast lookup
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);

-- Insert default WAHA settings
INSERT INTO system_settings (key, value, description) VALUES 
('waha_enabled', 'false', 'Enable/disable WhatsApp notifications via WAHA'),
('waha_base_url', 'https://waha.khibroh.com/', 'WAHA API base URL'),
('waha_api_key', '060731d7987a4c7ebd23a173a8fdb158', 'WAHA API key for authentication'),
('waha_session', 'default', 'WAHA session name')
ON CONFLICT(key) DO NOTHING;
