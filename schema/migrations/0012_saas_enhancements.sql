-- Migration 0012: SAAS Enhancements
-- Add subscription and multi-tenant features to existing schema

-- Add SAAS-related columns to tenants table
ALTER TABLE tenants ADD COLUMN status TEXT DEFAULT 'active' CHECK(status IN ('active', 'suspended', 'trial', 'cancelled'));
ALTER TABLE tenants ADD COLUMN plan_type TEXT DEFAULT 'free' CHECK(plan_type IN ('free', 'basic', 'premium', 'enterprise'));
ALTER TABLE tenants ADD COLUMN max_users INTEGER DEFAULT 5;
ALTER TABLE tenants ADD COLUMN trial_ends_at DATETIME;
ALTER TABLE tenants ADD COLUMN subdomain TEXT;
ALTER TABLE tenants ADD COLUMN custom_branding JSON; -- {primaryColor, logo, etc}

-- Create tenant_settings table for extensible configuration
CREATE TABLE IF NOT EXISTS tenant_settings (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    setting_key TEXT NOT NULL,
    setting_value TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    UNIQUE(tenant_id, setting_key)
);

-- Create indexes for multi-tenant query performance
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_tenant_email ON users(tenant_id, email);
CREATE INDEX IF NOT EXISTS idx_locations_tenant_id ON locations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_attendances_user_id ON attendances(user_id);
CREATE INDEX IF NOT EXISTS idx_points_ledger_user_id ON points_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_discount_rules_tenant_id ON discount_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_point_rules_tenant_id ON point_rules(tenant_id);

-- Create index for tenant status queries
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_plan ON tenants(plan_type);
CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants(subdomain);

-- Create tenant_usage_metrics table for tracking usage
CREATE TABLE IF NOT EXISTS tenant_usage_metrics (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    metric_type TEXT NOT NULL, -- 'api_calls', 'storage_mb', 'active_users', 'check_ins'
    metric_value INTEGER NOT NULL,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    period TEXT NOT NULL, -- 'daily', 'monthly'
    period_start DATETIME NOT NULL,
    period_end DATETIME NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_usage_metrics_tenant_period ON tenant_usage_metrics(tenant_id, period, period_start);

-- Insert default settings for existing tenants
-- Update existing tenants to have proper defaults
UPDATE tenants 
SET 
    status = 'active',
    plan_type = 'free',
    max_users = 5
WHERE status IS NULL OR plan_type IS NULL;
