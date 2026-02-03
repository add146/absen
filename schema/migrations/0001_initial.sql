-- Migration: 0001_initial.sql
-- Sistem Manajemen Kehadiran dengan Loyalitas Poin

-- Tabel Tenants (Multi-tenant Support)
CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    settings TEXT, -- JSON string
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Users
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'employee', -- 'admin', 'employee', 'owner'
    points_balance INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Tabel Locations (Geofence Areas)
CREATE TABLE IF NOT EXISTS locations (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    radius_meters INTEGER DEFAULT 100,
    polygon_coords TEXT, -- JSON string untuk complex geofence
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Tabel Attendances
CREATE TABLE IF NOT EXISTS attendances (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    location_id TEXT NOT NULL,
    check_in_time DATETIME NOT NULL,
    check_out_time DATETIME,
    check_in_lat REAL,
    check_in_lng REAL,
    check_out_lat REAL,
    check_out_lng REAL,
    ip_address TEXT,
    device_info TEXT,
    is_valid INTEGER DEFAULT 1,
    fraud_flags TEXT, -- JSON string
    points_earned INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (location_id) REFERENCES locations(id)
);

-- Tabel Points Ledger (Buku Besar Poin)
CREATE TABLE IF NOT EXISTS points_ledger (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    transaction_type TEXT NOT NULL, -- 'earn', 'redeem', 'adjust'
    amount INTEGER NOT NULL, -- Positif = tambah, Negatif = kurang
    reference_type TEXT, -- 'attendance', 'purchase', 'bonus'
    reference_id TEXT,
    description TEXT,
    balance_after INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tabel Discount Rules (Aturan Diskon per Tenant)
CREATE TABLE IF NOT EXISTS discount_rules (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    rule_type TEXT NOT NULL, -- 'percentage', 'fixed', 'tiered'
    points_required INTEGER NOT NULL,
    discount_value REAL NOT NULL,
    max_discount REAL,
    min_purchase REAL,
    valid_from DATETIME,
    valid_until DATETIME,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Tabel Point Rules (Aturan Earning Poin)
CREATE TABLE IF NOT EXISTS point_rules (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    rule_type TEXT NOT NULL, -- 'check_in', 'on_time', 'full_day', 'streak'
    points_amount INTEGER NOT NULL,
    conditions TEXT, -- JSON string untuk kondisi tambahan
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Indexes untuk performa query
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_locations_tenant ON locations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_attendances_user ON attendances(user_id);
CREATE INDEX IF NOT EXISTS idx_attendances_date ON attendances(check_in_time);
CREATE INDEX IF NOT EXISTS idx_points_ledger_user ON points_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_points_ledger_date ON points_ledger(created_at);
