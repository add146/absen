// Generate bcrypt hash untuk Super Admin password
// Jalankan: node generate-superadmin-hash.js

const bcrypt = require('bcryptjs');

async function generateHash() {
    const password = 'Admin123!';
    const hash = await bcrypt.hash(password, 10);

    console.log('\n==============================================');
    console.log('SUPER ADMIN PASSWORD HASH GENERATOR');
    console.log('==============================================\n');
    console.log('Password:', password);
    console.log('Bcrypt Hash:', hash);
    console.log('\n==============================================');
    console.log('SQL COMMAND untuk D1 Console:');
    console.log('==============================================\n');

    const sql = `-- Create GLOBAL tenant
INSERT OR IGNORE INTO tenants (id, name, slug, status, plan_type, max_users, created_at, updated_at)
VALUES ('GLOBAL', 'Platform Administration', 'global', 'active', 'enterprise', 999, datetime('now'), datetime('now'));

-- Create Super Admin with hashed password
INSERT INTO users (id, tenant_id, email, password_hash, name, role, is_super_admin, status, created_at, updated_at)
VALUES ('superadmin-temp-001', 'GLOBAL', 'admin@platform.com', '${hash}', 'Super Administrator', 'super_admin', 1, 'active', datetime('now'), datetime('now'));

-- Verify
SELECT id, email, name, role, is_super_admin FROM users WHERE is_super_admin = 1;`;

    console.log(sql);
    console.log('\n==============================================\n');
}

generateHash().catch(console.error);
