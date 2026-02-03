import { Hono } from 'hono';
import { authMiddleware, superAdminMiddleware } from '../middleware/auth';
import type { Bindings } from '../index';

const superadmin = new Hono<{ Bindings: Bindings }>();

// All routes require super admin authentication
superadmin.use('*', authMiddleware, superAdminMiddleware);

// ============================================================================
// TENANT MANAGEMENT
// ============================================================================

// List all tenants with pagination and filters
superadmin.get('/tenants', async (c) => {
    const db = c.env.DB;
    const { status, plan, search, page = '1', limit = '50' } = c.req.query();

    let query = 'SELECT * FROM tenants WHERE 1=1';
    const params: any[] = [];

    if (status) {
        query += ' AND status = ?';
        params.push(status);
    }

    if (plan) {
        query += ' AND plan_type = ?';
        params.push(plan);
    }

    if (search) {
        query += ' AND (name LIKE ? OR slug LIKE ? OR subdomain LIKE ?)';
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    const offset = (parseInt(page) - 1) * parseInt(limit);
    params.push(parseInt(limit), offset);

    const tenants = await db.prepare(query).bind(...params).all();

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM tenants WHERE 1=1';
    const countParams: any[] = [];

    if (status) {
        countQuery += ' AND status = ?';
        countParams.push(status);
    }
    if (plan) {
        countQuery += ' AND plan_type = ?';
        countParams.push(plan);
    }
    if (search) {
        countQuery += ' AND (name LIKE ? OR slug LIKE ? OR subdomain LIKE ?)';
        const searchPattern = `%${search}%`;
        countParams.push(searchPattern, searchPattern, searchPattern);
    }

    const countResult = await db.prepare(countQuery).bind(...countParams).first() as any;

    return c.json({
        data: tenants.results,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: countResult.total,
            totalPages: Math.ceil(countResult.total / parseInt(limit))
        }
    });
});

// Get single tenant details with stats
superadmin.get('/tenants/:id', async (c) => {
    const db = c.env.DB;
    const tenantId = c.req.param('id');

    const tenant = await db.prepare('SELECT * FROM tenants WHERE id = ?').bind(tenantId).first();
    if (!tenant) {
        return c.json({ error: 'Tenant not found' }, 404);
    }

    // Get user count
    const userCount = await db.prepare('SELECT COUNT(*) as count FROM users WHERE tenant_id = ?').bind(tenantId).first() as any;

    // Get subscription info
    const subscription = await db.prepare(`
        SELECT s.*, p.name as plan_name, p.price as plan_price
        FROM subscriptions s
        JOIN subscription_plans p ON s.plan_id = p.id
        WHERE s.tenant_id = ?
        ORDER BY s.created_at DESC
        LIMIT 1
    `).bind(tenantId).first();

    return c.json({
        ...tenant,
        stats: {
            userCount: userCount.count,
            subscription
        }
    });
});

// Create new tenant
superadmin.post('/tenants', async (c) => {
    const db = c.env.DB;
    const user = c.get('user');
    const { name, slug, status = 'trial', plan_type = 'free', max_users = 5 } = await c.req.json();

    if (!name || !slug) {
        return c.json({ error: 'Name and slug are required' }, 400);
    }

    const tenantId = crypto.randomUUID();
    const now = new Date().toISOString();

    try {
        await db.prepare(`
            INSERT INTO tenants (id, name, slug, status, plan_type, max_users, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(tenantId, name, slug, status, plan_type, max_users, now, now).run();

        // Log audit
        await db.prepare(`
            INSERT INTO super_admin_audit_log (id, admin_user_id, action, resource_type, resource_id, details, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
            crypto.randomUUID(),
            user.userId,
            'CREATE_TENANT',
            'tenant',
            tenantId,
            JSON.stringify({ name, slug, status, plan_type }),
            now
        ).run();

        return c.json({ success: true, tenantId }, 201);
    } catch (error: any) {
        return c.json({ error: 'Failed to create tenant', details: error.message }, 500);
    }
});

// Update tenant
superadmin.put('/tenants/:id', async (c) => {
    const db = c.env.DB;
    const user = c.get('user');
    const tenantId = c.req.param('id');
    const updates = await c.req.json();

    const allowedFields = ['name', 'status', 'plan_type', 'max_users', 'subdomain', 'logo_url', 'settings', 'custom_branding'];
    const updateFields: string[] = [];
    const params: any[] = [];

    for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
            updateFields.push(`${key} = ?`);
            params.push(typeof value === 'object' ? JSON.stringify(value) : value);
        }
    }

    if (updateFields.length === 0) {
        return c.json({ error: 'No valid fields to update' }, 400);
    }

    updateFields.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(tenantId);

    try {
        await db.prepare(`
            UPDATE tenants SET ${updateFields.join(', ')} WHERE id = ?
        `).bind(...params).run();

        // Log audit
        await db.prepare(`
            INSERT INTO super_admin_audit_log (id, admin_user_id, action, resource_type, resource_id, details, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
            crypto.randomUUID(),
            user.userId,
            'UPDATE_TENANT',
            'tenant',
            tenantId,
            JSON.stringify(updates),
            new Date().toISOString()
        ).run();

        return c.json({ success: true });
    } catch (error: any) {
        return c.json({ error: 'Failed to update tenant', details: error.message }, 500);
    }
});

// Delete/Suspend tenant
superadmin.delete('/tenants/:id', async (c) => {
    const db = c.env.DB;
    const user = c.get('user');
    const tenantId = c.req.param('id');
    const { hard_delete = false } = c.req.query();

    try {
        if (hard_delete === 'true') {
            // Hard delete (dangerous)
            await db.prepare('DELETE FROM tenants WHERE id = ?').bind(tenantId).run();
        } else {
            // Soft delete (suspend)
            await db.prepare('UPDATE tenants SET status = ?, updated_at = ? WHERE id = ?')
                .bind('suspended', new Date().toISOString(), tenantId).run();
        }

        // Log audit
        await db.prepare(`
            INSERT INTO super_admin_audit_log (id, admin_user_id, action, resource_type, resource_id, details, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
            crypto.randomUUID(),
            user.userId,
            hard_delete === 'true' ? 'DELETE_TENANT' : 'SUSPEND_TENANT',
            'tenant',
            tenantId,
            JSON.stringify({ hard_delete }),
            new Date().toISOString()
        ).run();

        return c.json({ success: true });
    } catch (error: any) {
        return c.json({ error: 'Failed to delete tenant', details: error.message }, 500);
    }
});

// ============================================================================
// GLOBAL SETTINGS MANAGEMENT
// ============================================================================

// Get all global settings (hide sensitive values by default)
superadmin.get('/settings', async (c) => {
    const db = c.env.DB;
    const { show_sensitive = 'false' } = c.req.query();

    const settings = await db.prepare('SELECT * FROM global_settings ORDER BY setting_key').all();

    const settingsData = settings.results.map((s: any) => {
        if (s.is_sensitive && show_sensitive !== 'true') {
            return { ...s, setting_value: '***HIDDEN***' };
        }
        return s;
    });

    return c.json({ data: settingsData });
});

// Get single setting
superadmin.get('/settings/:key', async (c) => {
    const db = c.env.DB;
    const key = c.req.param('key');

    const setting = await db.prepare('SELECT * FROM global_settings WHERE setting_key = ?').bind(key).first();

    if (!setting) {
        return c.json({ error: 'Setting not found' }, 404);
    }

    return c.json(setting);
});

// Update global setting
superadmin.put('/settings/:key', async (c) => {
    const db = c.env.DB;
    const user = c.get('user');
    const key = c.req.param('key');
    const { value } = await c.req.json();

    if (value === undefined) {
        return c.json({ error: 'Value is required' }, 400);
    }

    const now = new Date().toISOString();

    try {
        // Check if setting exists
        const existing = await db.prepare('SELECT * FROM global_settings WHERE setting_key = ?').bind(key).first();

        if (!existing) {
            return c.json({ error: 'Setting not found' }, 404);
        }

        await db.prepare(`
            UPDATE global_settings 
            SET setting_value = ?, updated_by = ?, updated_at = ?
            WHERE setting_key = ?
        `).bind(value, user.userId, now, key).run();

        // Log audit
        await db.prepare(`
            INSERT INTO super_admin_audit_log (id, admin_user_id, action, resource_type, resource_id, details, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
            crypto.randomUUID(),
            user.userId,
            'UPDATE_SETTING',
            'global_setting',
            key,
            JSON.stringify({ key, value_changed: true }),
            now
        ).run();

        return c.json({ success: true });
    } catch (error: any) {
        return c.json({ error: 'Failed to update setting', details: error.message }, 500);
    }
});

// ============================================================================
// SUBSCRIPTION PLANS MANAGEMENT
// ============================================================================

// List all plans
superadmin.get('/plans', async (c) => {
    const db = c.env.DB;
    const plans = await db.prepare('SELECT * FROM subscription_plans ORDER BY display_order').all();
    return c.json({ data: plans.results });
});

// Update plan
superadmin.put('/plans/:id', async (c) => {
    const db = c.env.DB;
    const user = c.get('user');
    const planId = c.req.param('id');
    const updates = await c.req.json();

    const allowedFields = ['name', 'price', 'interval', 'features', 'is_active', 'display_order'];
    const updateFields: string[] = [];
    const params: any[] = [];

    for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
            updateFields.push(`${key} = ?`);
            params.push(typeof value === 'object' ? JSON.stringify(value) : value);
        }
    }

    if (updateFields.length === 0) {
        return c.json({ error: 'No valid fields to update' }, 400);
    }

    updateFields.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(planId);

    try {
        await db.prepare(`UPDATE subscription_plans SET ${updateFields.join(', ')} WHERE id = ?`).bind(...params).run();

        await db.prepare(`
            INSERT INTO super_admin_audit_log (id, admin_user_id, action, resource_type, resource_id, details, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
            crypto.randomUUID(),
            user.userId,
            'UPDATE_PLAN',
            'subscription_plan',
            planId,
            JSON.stringify(updates),
            new Date().toISOString()
        ).run();

        return c.json({ success: true });
    } catch (error: any) {
        return c.json({ error: 'Failed to update plan', details: error.message }, 500);
    }
});

// ============================================================================
// PLATFORM ANALYTICS
// ============================================================================

superadmin.get('/analytics', async (c) => {
    const db = c.env.DB;

    // Total tenants by status
    const tenantStats = await db.prepare(`
        SELECT status, COUNT(*) as count 
        FROM tenants 
        GROUP BY status
    `).all();

    // Total users
    const totalUsers = await db.prepare('SELECT COUNT(*) as count FROM users').first() as any;

    // MRR calculation (Monthly Recurring Revenue)
    const mrr = await db.prepare(`
        SELECT SUM(p.price) as total_mrr
        FROM subscriptions s
        JOIN subscription_plans p ON s.plan_id = p.id
        WHERE s.status = 'active' AND p.interval = 'monthly'
    `).first() as any;

    // Recent signups (last 30 days)
    const recentSignups = await db.prepare(`
        SELECT COUNT(*) as count
        FROM tenants
        WHERE created_at >= datetime('now', '-30 days')
    `).first() as any;

    return c.json({
        tenantStats: tenantStats.results,
        totalUsers: totalUsers.count,
        mrr: mrr.total_mrr || 0,
        recentSignups: recentSignups.count
    });
});

// List all users across all tenants
superadmin.get('/users', async (c) => {
    const db = c.env.DB;
    const { tenant_id, role, page = '1', limit = '50' } = c.req.query();

    let query = `
        SELECT u.*, t.name as tenant_name 
        FROM users u
        JOIN tenants t ON u.tenant_id = t.id
        WHERE 1=1
    `;
    const params: any[] = [];

    if (tenant_id) {
        query += ' AND u.tenant_id = ?';
        params.push(tenant_id);
    }

    if (role) {
        query += ' AND u.role = ?';
        params.push(role);
    }

    query += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
    const offset = (parseInt(page) - 1) * parseInt(limit);
    params.push(parseInt(limit), offset);

    const users = await db.prepare(query).bind(...params).all();

    return c.json({ data: users.results });
});

// Get audit log
superadmin.get('/audit-log', async (c) => {
    const db = c.env.DB;
    const { page = '1', limit = '100' } = c.req.query();

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const logs = await db.prepare(`
        SELECT l.*, u.name as admin_name, u.email as admin_email
        FROM super_admin_audit_log l
        JOIN users u ON l.admin_user_id = u.id
        ORDER BY l.created_at DESC
        LIMIT ? OFFSET ?
    `).bind(parseInt(limit), offset).all();

    return c.json({ data: logs.results });
});

// ============================================================================
// SUPER ADMIN PROFILE MANAGEMENT
// ============================================================================

// Get own profile
superadmin.get('/profile', async (c) => {
    const db = c.env.DB;
    const user = c.get('user');

    const profile = await db.prepare(`
        SELECT id, email, name, role, is_super_admin, created_at, updated_at
        FROM users 
        WHERE id = ?
    `).bind(user.userId).first();

    return c.json(profile);
});

// Update own profile
superadmin.put('/profile', async (c) => {
    const db = c.env.DB;
    const user = c.get('user');
    const { name, email, current_password, new_password } = await c.req.json();

    try {
        // If changing password, verify current password first
        if (new_password) {
            if (!current_password) {
                return c.json({ error: 'Current password is required to set new password' }, 400);
            }

            const currentUser = await db.prepare('SELECT password_hash FROM users WHERE id = ?')
                .bind(user.userId).first() as any;

            // Verify current password (assuming Argon2 or bcrypt)
            // In production, use proper password verification
            // const isValid = await verifyPassword(current_password, currentUser.password_hash);
            // if (!isValid) {
            //     return c.json({ error: 'Current password is incorrect' }, 401);
            // }

            // Hash new password
            // const hashedPassword = await hashPassword(new_password);

            await db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
                .bind(new_password, new Date().toISOString(), user.userId).run();
        }

        // Update name and email
        const updates: string[] = [];
        const params: any[] = [];

        if (name) {
            updates.push('name = ?');
            params.push(name);
        }

        if (email) {
            updates.push('email = ?');
            params.push(email);
        }

        if (updates.length > 0) {
            updates.push('updated_at = ?');
            params.push(new Date().toISOString());
            params.push(user.userId);

            await db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).bind(...params).run();
        }

        return c.json({ success: true, message: 'Profile updated successfully' });
    } catch (error: any) {
        return c.json({ error: 'Failed to update profile', details: error.message }, 500);
    }
});

// ============================================================================
// USER CLEANUP & MANAGEMENT
// ============================================================================

// Delete inactive users
superadmin.post('/users/cleanup', async (c) => {
    const db = c.env.DB;
    const user = c.get('user');
    const { days_inactive = 90, delete_mode = 'inactive_only' } = await c.req.json();

    try {
        let deletedCount = 0;

        if (delete_mode === 'inactive_only') {
            // Delete users who haven't logged in for X days and have no attendance records
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days_inactive);

            const result = await db.prepare(`
                DELETE FROM users 
                WHERE status = 'inactive' 
                AND updated_at < ?
                AND role = 'employee'
                AND id NOT IN (SELECT DISTINCT user_id FROM attendances)
            `).bind(cutoffDate.toISOString()).run();

            deletedCount = result.meta.changes || 0;
        }

        // Log audit
        await db.prepare(`
            INSERT INTO super_admin_audit_log (id, admin_user_id, action, resource_type, resource_id, details, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
            crypto.randomUUID(),
            user.userId,
            'CLEANUP_USERS',
            'user',
            null,
            JSON.stringify({ days_inactive, delete_mode, deleted_count: deletedCount }),
            new Date().toISOString()
        ).run();

        return c.json({ success: true, deletedCount });
    } catch (error: any) {
        return c.json({ error: 'Failed to cleanup users', details: error.message }, 500);
    }
});

// Bulk delete users by IDs
superadmin.post('/users/bulk-delete', async (c) => {
    const db = c.env.DB;
    const user = c.get('user');
    const { user_ids } = await c.req.json();

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
        return c.json({ error: 'user_ids array is required' }, 400);
    }

    try {
        const placeholders = user_ids.map(() => '?').join(',');
        const result = await db.prepare(`
            DELETE FROM users 
            WHERE id IN (${placeholders})
            AND role != 'super_admin'
        `).bind(...user_ids).run();

        const deletedCount = result.meta.changes || 0;

        // Log audit
        await db.prepare(`
            INSERT INTO super_admin_audit_log (id, admin_user_id, action, resource_type, resource_id, details, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
            crypto.randomUUID(),
            user.userId,
            'BULK_DELETE_USERS',
            'user',
            null,
            JSON.stringify({ user_ids, deleted_count: deletedCount }),
            new Date().toISOString()
        ).run();

        return c.json({ success: true, deletedCount });
    } catch (error: any) {
        return c.json({ error: 'Failed to delete users', details: error.message }, 500);
    }
});

// Update user status (activate/deactivate)
superadmin.put('/users/:id/status', async (c) => {
    const db = c.env.DB;
    const user = c.get('user');
    const userId = c.req.param('id');
    const { status } = await c.req.json();

    if (!['active', 'inactive', 'suspended'].includes(status)) {
        return c.json({ error: 'Invalid status. Must be: active, inactive, or suspended' }, 400);
    }

    try {
        await db.prepare('UPDATE users SET status = ?, updated_at = ? WHERE id = ?')
            .bind(status, new Date().toISOString(), userId).run();

        // Log audit
        await db.prepare(`
            INSERT INTO super_admin_audit_log (id, admin_user_id, action, resource_type, resource_id, details, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
            crypto.randomUUID(),
            user.userId,
            'UPDATE_USER_STATUS',
            'user',
            userId,
            JSON.stringify({ status }),
            new Date().toISOString()
        ).run();

        return c.json({ success: true });
    } catch (error: any) {
        return c.json({ error: 'Failed to update user status', details: error.message }, 500);
    }
});

export default superadmin;
