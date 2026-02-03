-- ============================================
-- TEMPORARY Super Admin User Creation
-- ============================================
-- Email: admin@platform.com
-- Password: Admin123!
-- 
-- ⚠️ PENTING: Segera ganti password setelah login pertama!
--    Login → Super Admin → Profile → Edit Profile → Change Password

-- Step 1: Create GLOBAL tenant (for platform-level users)
INSERT OR IGNORE INTO tenants (
    id,
    name,
    slug,
    status,
    plan_type,
    max_users,
    created_at,
    updated_at
)
VALUES (
    'GLOBAL',
    'Platform Administration',
    'global',
    'active',
    'enterprise',
    999,
    datetime('now'),
    datetime('now')
);

-- Step 2: Create Super Admin user
INSERT INTO users (
    id,
    tenant_id,
    email,
    password_hash, 
    name,
    role,
    is_super_admin,
    status,
    created_at,
    updated_at
)
VALUES (
    'superadmin-temp-001',
    'GLOBAL',
    'admin@platform.com',
    'Admin123!', -- Temporary plaintext password - GANTI SEGERA!
    'Super Administrator',
    'super_admin',
    1,
    'active',
    datetime('now'),
    datetime('now')
);

-- Verify the Super Admin was created
SELECT 
    '✓ Super Admin Created:' as status,
    id,
    email,
    name,
    role,
    is_super_admin,
    created_at
FROM users
WHERE is_super_admin = 1;
