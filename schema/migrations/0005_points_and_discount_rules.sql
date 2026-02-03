-- Migration: Points Rules and Discount System Enhancements
-- Add indices and sample data for unused tables

-- Indices for point_rules
CREATE INDEX IF NOT EXISTS idx_point_rules_tenant ON point_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_point_rules_active ON point_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_point_rules_type ON point_rules(rule_type);

-- Indices for discount_rules
CREATE INDEX IF NOT EXISTS idx_discount_rules_tenant ON discount_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_discount_rules_active ON discount_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_discount_rules_points ON discount_rules(points_required);

-- Insert default point rules for existing tenants
INSERT INTO point_rules (id, tenant_id, name, rule_type, points_amount, conditions, is_active)
SELECT 
    'pr_base_' || t.id,
    t.id,
    'Base Check-in Points',
    'check_in',
    10,
    '{"description":"Base points for any check-in"}',
    1
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM point_rules WHERE tenant_id = t.id AND rule_type = 'check_in');

INSERT INTO point_rules (id, tenant_id, name, rule_type, points_amount, conditions, is_active)
SELECT 
    'pr_ontime_' || t.id,
    t.id,
    'On-Time Bonus',
    'on_time',
    5,
    '{"deadline":"09:00:00","description":"Bonus for checking in before 9 AM"}',
    1
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM point_rules WHERE tenant_id = t.id AND rule_type = 'on_time');

INSERT INTO point_rules (id, tenant_id, name, rule_type, points_amount, conditions, is_active)
SELECT 
    'pr_streak_' || t.id,
    t.id,
    'Weekly Streak Bonus',
    'streak',
    20,
    '{"days":5,"description":"Bonus for 5 consecutive check-ins"}',
    1
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM point_rules WHERE tenant_id = t.id AND rule_type = 'streak');

-- Insert default discount rules for existing tenants
INSERT INTO discount_rules (id, tenant_id, name, rule_type, points_required, discount_value, max_discount, min_purchase, is_active)
SELECT 
    'dr_basic_' || t.id,
    t.id,
    '10% Discount (500 points)',
    'percentage',
    500,
    10.0,
    50.0,
    100.0,
    1
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM discount_rules WHERE tenant_id = t.id AND points_required = 500);

INSERT INTO discount_rules (id, tenant_id, name, rule_type, points_required, discount_value, max_discount, min_purchase, is_active)
SELECT 
    'dr_vip_' || t.id,
    t.id,
    '20% VIP Discount (1000 points)',
    'percentage',
    1000,
    20.0,
    100.0,
    200.0,
    1
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM discount_rules WHERE tenant_id = t.id AND points_required = 1000);

-- Create indices for better performance
CREATE INDEX IF NOT EXISTS idx_attendances_user_date ON attendances(user_id, check_in_time);
CREATE INDEX IF NOT EXISTS idx_points_ledger_user ON points_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_points_ledger_type ON points_ledger(transaction_type);
