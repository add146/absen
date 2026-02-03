-- Migration: Leave Management Enhancements
-- Add leave types, balances, and quota tracking

-- Create leave types table
CREATE TABLE IF NOT EXISTS leave_types (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    max_days_per_year INTEGER NOT NULL DEFAULT 12,
    requires_approval INTEGER DEFAULT 1,
    color TEXT DEFAULT '#3b82f6',
    description TEXT,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Create leave balances table
CREATE TABLE IF NOT EXISTS leave_balances (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    leave_type_id TEXT NOT NULL,
    year INTEGER NOT NULL,
    total_days INTEGER NOT NULL,
    used_days INTEGER DEFAULT 0,
    remaining_days INTEGER NOT NULL,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (leave_type_id) REFERENCES leave_types(id),
    UNIQUE(user_id, leave_type_id, year)
);

-- Add columns to existing leaves table (if not exists)
-- Note: SQLite doesn't support conditional ALTER TABLE, so we'll create indices instead

-- Create indices for better performance
CREATE INDEX IF NOT EXISTS idx_leave_types_tenant ON leave_types(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leave_balances_user ON leave_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_balances_year ON leave_balances(year);
CREATE INDEX IF NOT EXISTS idx_leaves_user ON leaves(user_id);
CREATE INDEX IF NOT EXISTS idx_leaves_status ON leaves(status);

-- Insert default leave types for existing tenants
INSERT INTO leave_types (id, tenant_id, name, code, max_days_per_year, color, description)
SELECT 
    'lt_annual_' || t.id,
    t.id,
    'Annual Leave',
    'ANNUAL',
    12,
    '#22c55e',
    'Annual paid leave'
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM leave_types WHERE tenant_id = t.id AND code = 'ANNUAL');

INSERT INTO leave_types (id, tenant_id, name, code, max_days_per_year, color, description)
SELECT 
    'lt_sick_' || t.id,
    t.id,
    'Sick Leave',
    'SICK',
    10,
    '#ef4444',
    'Sick leave with medical certificate'
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM leave_types WHERE tenant_id = t.id AND code = 'SICK');

INSERT INTO leave_types (id, tenant_id, name, code, max_days_per_year, color, description, requires_approval)
SELECT 
    'lt_emergency_' || t.id,
    t.id,
    'Emergency Leave',
    'EMERGENCY',
    3,
    '#f59e0b',
    'Emergency family matters',
    0
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM leave_types WHERE tenant_id = t.id AND code = 'EMERGENCY');
