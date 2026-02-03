-- Migration 0013: Billing and Subscription System
-- Add tables for subscription management, payments, invoices, and custom domains

-- Subscription plans definition (can also be managed in code/KV)
CREATE TABLE IF NOT EXISTS subscription_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL, -- 'Free', 'Basic', 'Premium', 'Enterprise'
    slug TEXT UNIQUE NOT NULL, -- 'free', 'basic', 'premium', 'enterprise'
    price INTEGER NOT NULL, -- In cents (Rp 99.000 = 99000)
    interval TEXT NOT NULL CHECK(interval IN ('monthly', 'yearly', 'lifetime')),
    features JSON NOT NULL, -- {maxUsers: 25, geofencing: true, reports: true, etc}
    is_active INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Subscriptions (active subscription per tenant)
CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    plan_id TEXT NOT NULL,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'cancelled', 'expired', 'pending', 'past_due')),
    current_period_start DATETIME NOT NULL,
    current_period_end DATETIME NOT NULL,
    cancel_at_period_end INTEGER DEFAULT 0,
    cancelled_at DATETIME,
    trial_start DATETIME,
    trial_end DATETIME,
    metadata JSON, -- Additional subscription data
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end ON subscriptions(current_period_end);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    subscription_id TEXT,
    invoice_number TEXT UNIQUE NOT NULL, -- INV-2026-001
    amount_due INTEGER NOT NULL,
    amount_paid INTEGER DEFAULT 0,
    currency TEXT DEFAULT 'IDR',
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'failed', 'refunded')),
    due_date DATETIME,
    paid_at DATETIME,
    description TEXT,
    line_items JSON, -- [{description, amount, quantity}]
    metadata JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id)
);

CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);

-- Payments (transaction records from Midtrans)
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    invoice_id TEXT,
    subscription_id TEXT,
    payment_gateway TEXT DEFAULT 'midtrans',
    transaction_id TEXT UNIQUE, -- Midtrans transaction ID
    order_id TEXT UNIQUE, -- Our order ID
    amount INTEGER NOT NULL,
    currency TEXT DEFAULT 'IDR',
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'success', 'failed', 'expired', 'refunded')),
    payment_type TEXT, -- 'credit_card', 'bank_transfer', 'gopay', etc
    payment_details JSON, -- Raw payment data from gateway
    paid_at DATETIME,
    expired_at DATETIME,
    refunded_at DATETIME,
    metadata JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id),
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id)
);

CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_transaction ON payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Custom Domains
CREATE TABLE IF NOT EXISTS custom_domains (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    domain TEXT UNIQUE NOT NULL, -- 'attendance.acme.com'
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'verifying', 'active', 'failed', 'removed')),
    verification_method TEXT DEFAULT 'cname', -- 'cname' or 'txt'
    verification_token TEXT, -- Token for DNS verification
    verified_at DATETIME,
    ssl_status TEXT DEFAULT 'pending' CHECK(ssl_status IN ('pending', 'active', 'failed')),
    ssl_issued_at DATETIME,
    dns_records JSON, -- Expected DNS records
    last_checked_at DATETIME,
    error_message TEXT,
    is_primary INTEGER DEFAULT 0, -- Primary domain for tenant
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_custom_domains_tenant ON custom_domains(tenant_id);
CREATE INDEX IF NOT EXISTS idx_custom_domains_domain ON custom_domains(domain);
CREATE INDEX IF NOT EXISTS idx_custom_domains_status ON custom_domains(status);

-- Insert default subscription plans
INSERT INTO subscription_plans (id, name, slug, price, interval, features, display_order) VALUES
    ('plan_free', 'Free', 'free', 0, 'monthly', 
     '{"maxUsers":5,"geofencing":false,"reports":"basic","customBranding":false,"apiAccess":false,"customDomain":false,"pointsLimit":100,"support":"community"}', 
     1),
    ('plan_basic', 'Basic', 'basic', 99000, 'monthly', 
     '{"maxUsers":25,"geofencing":true,"reports":"advanced","customBranding":false,"apiAccess":false,"customDomain":false,"pointsLimit":500,"support":"email"}', 
     2),
    ('plan_premium', 'Premium', 'premium', 299000, 'monthly', 
     '{"maxUsers":100,"geofencing":true,"reports":"advanced","customBranding":true,"apiAccess":true,"customDomain":false,"pointsLimit":-1,"support":"priority"}', 
     3),
    ('plan_enterprise', 'Enterprise', 'enterprise', 999000, 'monthly', 
     '{"maxUsers":-1,"geofencing":true,"reports":"advanced","customBranding":true,"apiAccess":true,"customDomain":true,"pointsLimit":-1,"support":"dedicated","sla":true}', 
     4);

-- Create free subscriptions for existing tenants
INSERT INTO subscriptions (id, tenant_id, plan_id, status, current_period_start, current_period_end)
SELECT 
    'sub_' || t.id,
    t.id,
    'plan_free',
    'active',
    datetime('now'),
    datetime('now', '+1 year')
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM subscriptions WHERE tenant_id = t.id);
