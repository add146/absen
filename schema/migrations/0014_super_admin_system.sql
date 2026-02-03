-- Migration 0014: Super Admin System
-- Add global settings, Super Admin role, and role restructuring

-- Create global_settings table for platform-wide configurations
CREATE TABLE IF NOT EXISTS global_settings (
    id TEXT PRIMARY KEY,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type TEXT DEFAULT 'string' CHECK(setting_type IN ('string', 'json', 'encrypted')),
    description TEXT,
    is_sensitive INTEGER DEFAULT 0,
    updated_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_global_settings_key ON global_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_global_settings_sensitive ON global_settings(is_sensitive);

-- Add is_super_admin flag to users table
ALTER TABLE users ADD COLUMN is_super_admin INTEGER DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_users_is_super_admin ON users(is_super_admin);

-- Migrate owner → admin role
UPDATE users SET role = 'admin' WHERE role = 'owner';

-- Insert default global settings (API keys placeholders)
INSERT INTO global_settings (id, setting_key, setting_value, setting_type, description, is_sensitive) VALUES
    -- WhatsApp Gateway (WAHA)
    ('gs_waha_url', 'waha_api_url', '', 'string', 'WAHA WhatsApp Gateway URL', 0),
    ('gs_waha_key', 'waha_api_key', '', 'encrypted', 'WAHA API Key', 1),
    
    -- Midtrans Payment Gateway
    ('gs_midtrans_server', 'midtrans_server_key', '', 'encrypted', 'Midtrans Server Key', 1),
    ('gs_midtrans_client', 'midtrans_client_key', '', 'encrypted', 'Midtrans Client Key', 1),
    ('gs_midtrans_mode', 'midtrans_mode', 'sandbox', 'string', 'Midtrans Environment (sandbox/production)', 0),
    
    -- Google Maps
    ('gs_gmaps', 'google_maps_api_key', '', 'encrypted', 'Google Maps API Key', 1),
    
    -- JWT Secret
    ('gs_jwt_secret', 'jwt_secret', 'HARDCODED_DEBUG_SECRET_123', 'encrypted', 'JWT Secret Key for token signing', 1),
    
    -- Platform Settings
    ('gs_platform_name', 'platform_name', 'Absen SaaS', 'string', 'Platform Name', 0),
    ('gs_support_email', 'support_email', 'support@absen.com', 'string', 'Support Email', 0);

-- Create super_admin_audit_log for tracking Super Admin actions
CREATE TABLE IF NOT EXISTS super_admin_audit_log (
    id TEXT PRIMARY KEY,
    admin_user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    details JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_audit_log_admin ON super_admin_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON super_admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON super_admin_audit_log(created_at);
