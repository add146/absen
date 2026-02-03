/**
 * Tenant Management Routes
 * Endpoints for creating, managing, and monitoring tenants
 */

import { Hono } from 'hono'
import {
    createTenant,
    getTenantById,
    getTenantBySlug,
    updateTenant,
    suspendTenant,
    activateTenant,
    getTenantStats,
    listTenants
} from '../services/tenant-service'
import { ownerOnly, adminOnly } from '../middleware/tenant'

type Bindings = {
    DB: D1Database
    JWT_SECRET: string
    CACHE?: KVNamespace
}

const tenants = new Hono<{ Bindings: Bindings }>()

/**
 * POST /tenants/create
 * Public endpoint to create new tenant (self-service signup)
 */
tenants.post('/create', async (c) => {
    try {
        const { tenantName, adminEmail, adminPassword, adminName } = await c.req.json()

        // Validation
        if (!tenantName || !adminEmail || !adminPassword || !adminName) {
            return c.json({ error: 'Missing required fields' }, 400)
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(adminEmail)) {
            return c.json({ error: 'Invalid email format' }, 400)
        }

        // Password strength validation
        if (adminPassword.length < 8) {
            return c.json({ error: 'Password must be at least 8 characters' }, 400)
        }

        // Check if email already exists
        const existingUser = await c.env.DB
            .prepare('SELECT id FROM users WHERE email = ?')
            .bind(adminEmail)
            .first()

        if (existingUser) {
            return c.json({ error: 'Email already registered' }, 409)
        }

        // Create tenant
        const { tenant, admin } = await createTenant({
            name: tenantName,
            adminEmail,
            adminPassword,
            adminName
        }, c.env)

        return c.json({
            message: 'Tenant created successfully',
            tenant: {
                id: tenant.id,
                name: tenant.name,
                slug: tenant.slug,
                status: tenant.status,
                plan: tenant.plan_type,
                trial_ends_at: tenant.trial_ends_at
            },
            admin: {
                id: admin.id,
                email: admin.email,
                name: admin.name
            }
        }, 201)

    } catch (e: any) {
        console.error('Tenant creation failed:', e)
        return c.json({ error: 'Failed to create tenant', details: e.message }, 500)
    }
})

/**
 * GET /tenants/current
 * Get current tenant info (authenticated)
 */
tenants.get('/current', async (c) => {
    const tenantId = c.get('tenantId')

    if (!tenantId) {
        return c.json({ error: 'Tenant context not found' }, 400)
    }

    const tenant = await getTenantById(tenantId, c.env)

    if (!tenant) {
        return c.json({ error: 'Tenant not found' }, 404)
    }

    // Get statistics
    const stats = await getTenantStats(tenantId, c.env)

    // Get subscription info
    const subscription = await c.env.DB
        .prepare(`
            SELECT s.*, p.name as plan_name, p.features
            FROM subscriptions s
            JOIN subscription_plans p ON s.plan_id = p.id
            WHERE s.tenant_id = ? AND s.status = 'active'
            ORDER BY s.created_at DESC
            LIMIT 1
        `)
        .bind(tenantId)
        .first()

    return c.json({
        tenant: {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            logo_url: tenant.logo_url,
            status: tenant.status,
            plan_type: tenant.plan_type,
            max_users: tenant.max_users,
            trial_ends_at: tenant.trial_ends_at,
            subdomain: tenant.subdomain,
            custom_branding: tenant.custom_branding,
            created_at: tenant.created_at
        },
        stats,
        subscription: subscription ? {
            id: subscription.id,
            plan_name: subscription.plan_name,
            status: subscription.status,
            current_period_end: subscription.current_period_end,
            features: JSON.parse(subscription.features as string)
        } : null
    })
})

/**
 * PUT /tenants/current
 * Update current tenant (owner only)
 */
tenants.put('/current', ownerOnly, async (c) => {
    const tenantId = c.get('tenantId')
    const updates = await c.req.json()

    // Prevent updating certain fields
    delete updates.id
    delete updates.created_at
    delete updates.status // Use separate endpoints for status changes

    const tenant = await updateTenant(tenantId, updates, c.env)

    return c.json({
        message: 'Tenant updated successfully',
        tenant
    })
})

/**
 * GET /tenants/:id/stats
 * Get tenant statistics (owner only)
 */
tenants.get('/:id/stats', ownerOnly, async (c) => {
    const tenantId = c.req.param('id')

    // Verify user owns this tenant
    const userTenantId = c.get('tenantId')
    if (tenantId !== userTenantId) {
        return c.json({ error: 'Access denied' }, 403)
    }

    const stats = await getTenantStats(tenantId, c.env)

    // Get monthly trends
    const monthlyStats = await c.env.DB.prepare(`
        SELECT 
            date(check_in_time) as date,
            COUNT(DISTINCT user_id) as unique_users,
            COUNT(*) as total_checkins
        FROM attendances
        WHERE user_id IN (SELECT id FROM users WHERE tenant_id = ?)
        AND check_in_time >= date('now', '-30 days')
        GROUP BY date(check_in_time)
        ORDER BY date DESC
    `).bind(tenantId).all()

    return c.json({
        overview: stats,
        monthly_trends: monthlyStats.results
    })
})

/**
 * POST /tenants/:id/suspend
 * Suspend a tenant (super admin only - future feature)
 */
tenants.post('/:id/suspend', async (c) => {
    // TODO: Implement super admin role check
    const tenantId = c.req.param('id')

    await suspendTenant(tenantId, c.env)

    return c.json({ message: 'Tenant suspended successfully' })
})

/**
 * POST /tenants/:id/activate
 * Activate a tenant (super admin only - future feature)
 */
tenants.post('/:id/activate', async (c) => {
    // TODO: Implement super admin role check
    const tenantId = c.req.param('id')

    await activateTenant(tenantId, c.env)

    return c.json({ message: 'Tenant activated successfully' })
})

/**
 * GET /tenants
 * List all tenants (super admin only - future feature)
 */
tenants.get('/', async (c) => {
    // TODO: Implement super admin role check
    const status = c.req.query('status')
    const plan = c.req.query('plan')
    const limit = parseInt(c.req.query('limit') || '50')
    const offset = parseInt(c.req.query('offset') || '0')

    const tenantList = await listTenants({ status, plan, limit, offset }, c.env)

    return c.json({
        tenants: tenantList,
        pagination: {
            limit,
            offset
        }
    })
})

export default tenants
