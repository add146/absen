/**
 * Tenant Service
 * Business logic for tenant operations and multi-tenant isolation
 */

type Bindings = {
    DB: D1Database
    CACHE?: KVNamespace
}

export interface Tenant {
    id: string
    name: string
    slug: string
    logo_url?: string
    status: 'active' | 'suspended' | 'trial' | 'cancelled'
    plan_type: 'free' | 'basic' | 'premium' | 'enterprise'
    max_users: number
    trial_ends_at?: string
    subdomain?: string
    custom_branding?: any
    settings?: any
    created_at: string
    updated_at: string
}

export interface CreateTenantInput {
    name: string
    adminEmail: string
    adminPassword: string
    adminName: string
}

/**
 * Create new tenant with default setup
 */
export async function createTenant(input: CreateTenantInput, env: Bindings): Promise<{ tenant: Tenant, admin: any }> {
    const { name, adminEmail, adminPassword, adminName } = input

    // Generate IDs
    const tenantId = crypto.randomUUID()
    const adminId = crypto.randomUUID()

    // Generate unique slug from tenant name
    const baseSlug = name.toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')

    // Add random suffix to ensure uniqueness
    const slug = `${baseSlug}-${Math.floor(Math.random() * 10000)}`

    // Create tenant
    await env.DB.prepare(`
        INSERT INTO tenants (id, name, slug, status, plan_type, max_users, trial_ends_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now', '+14 days'), datetime('now'), datetime('now'))
    `).bind(
        tenantId,
        name,
        slug,
        'trial', // Start with trial
        'free',
        5, // Free plan limit
    ).run()

    // Hash password
    const bcrypt = await import('bcryptjs')
    const passwordHash = await bcrypt.hash(adminPassword, 10)

    // Create admin user
    await env.DB.prepare(`
        INSERT INTO users (id, tenant_id, email, password_hash, name, role, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).bind(
        adminId,
        tenantId,
        adminEmail,
        passwordHash,
        adminName,
        'owner', // First user is owner
        'active'
    ).run()

    // Create default subscription (free plan)
    const subscriptionId = crypto.randomUUID()
    await env.DB.prepare(`
        INSERT INTO subscriptions (id, tenant_id, plan_id, status, current_period_start, current_period_end, created_at, updated_at)
        VALUES (?, ?, ?, ?, datetime('now'), datetime('now', '+1 year'), datetime('now'), datetime('now'))
    `).bind(
        subscriptionId,
        tenantId,
        'plan_free',
        'active'
    ).run()

    // Create default location (optional)
    const locationId = crypto.randomUUID()
    await env.DB.prepare(`
        INSERT INTO locations (id, tenant_id, name, latitude, longitude, radius_meters, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
        locationId,
        tenantId,
        'Kantor Pusat',
        -6.2088, // Default Jakarta coordinates
        106.8456,
        100, // 100 meters radius
        1
    ).run()

    // Create default point rules
    const pointRules = [
        { id: crypto.randomUUID(), name: 'Check-in', type: 'check_in', points: 10 },
        { id: crypto.randomUUID(), name: 'On Time Bonus', type: 'on_time', points: 5 },
    ]

    for (const rule of pointRules) {
        await env.DB.prepare(`
            INSERT INTO point_rules (id, tenant_id, name, rule_type, points_amount, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        `).bind(
            rule.id,
            tenantId,
            rule.name,
            rule.type,
            rule.points,
            1
        ).run()
    }

    const tenant = await getTenantById(tenantId, env)
    const admin = await env.DB.prepare('SELECT id, email, name, role FROM users WHERE id = ?')
        .bind(adminId)
        .first()

    return { tenant: tenant!, admin }
}

/**
 * Get tenant by ID
 */
export async function getTenantById(tenantId: string, env: Bindings): Promise<Tenant | null> {
    // Check cache first
    if (env.CACHE) {
        const cached = await env.CACHE.get(`tenant:${tenantId}`, 'json')
        if (cached) {
            return cached as Tenant
        }
    }

    const tenant = await env.DB
        .prepare('SELECT * FROM tenants WHERE id = ?')
        .bind(tenantId)
        .first()

    if (tenant) {
        // Cache for 1 hour
        if (env.CACHE) {
            await env.CACHE.put(`tenant:${tenantId}`, JSON.stringify(tenant), {
                expirationTtl: 3600
            })
        }
    }

    return tenant as Tenant | null
}

/**
 * Get tenant by slug
 */
export async function getTenantBySlug(slug: string, env: Bindings): Promise<Tenant | null> {
    const tenant = await env.DB
        .prepare('SELECT * FROM tenants WHERE slug = ?')
        .bind(slug)
        .first()

    return tenant as Tenant | null
}

/**
 * Update tenant
 */
export async function updateTenant(
    tenantId: string,
    updates: Partial<Tenant>,
    env: Bindings
): Promise<Tenant | null> {
    const fields: string[] = []
    const values: any[] = []

    // Build update query dynamically
    const allowedFields = ['name', 'logo_url', 'status', 'plan_type', 'max_users', 'subdomain', 'custom_branding', 'settings']

    for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
            fields.push(`${key} = ?`)
            values.push(typeof value === 'object' ? JSON.stringify(value) : value)
        }
    }

    if (fields.length === 0) {
        return getTenantById(tenantId, env)
    }

    fields.push('updated_at = datetime("now")')
    values.push(tenantId)

    const query = `UPDATE tenants SET ${fields.join(', ')} WHERE id = ?`
    await env.DB.prepare(query).bind(...values).run()

    // Invalidate cache
    if (env.CACHE) {
        await env.CACHE.delete(`tenant:${tenantId}`)
    }

    return getTenantById(tenantId, env)
}

/**
 * Suspend tenant
 */
export async function suspendTenant(tenantId: string, env: Bindings): Promise<void> {
    await env.DB.prepare('UPDATE tenants SET status = ?, updated_at = datetime("now") WHERE id = ?')
        .bind('suspended', tenantId)
        .run()

    // Invalidate cache
    if (env.CACHE) {
        await env.CACHE.delete(`tenant:${tenantId}`)
    }
}

/**
 * Activate tenant
 */
export async function activateTenant(tenantId: string, env: Bindings): Promise<void> {
    await env.DB.prepare('UPDATE tenants SET status = ?, updated_at = datetime("now") WHERE id = ?')
        .bind('active', tenantId)
        .run()

    // Invalidate cache
    if (env.CACHE) {
        await env.CACHE.delete(`tenant:${tenantId}`)
    }
}

/**
 * Get tenant statistics
 */
export async function getTenantStats(tenantId: string, env: Bindings): Promise<any> {
    const stats = await env.DB.prepare(`
        SELECT 
            (SELECT COUNT(*) FROM users WHERE tenant_id = ? AND status = 'active') as active_users,
            (SELECT COUNT(*) FROM attendances WHERE user_id IN (SELECT id FROM users WHERE tenant_id = ?)) as total_checkins,
            (SELECT SUM(points_balance) FROM users WHERE tenant_id = ?) as total_points
    `).bind(tenantId, tenantId, tenantId).first()

    return stats
}

/**
 * Check if tenant can add more users
 */
export async function canAddUser(tenantId: string, env: Bindings): Promise<boolean> {
    const tenant = await getTenantById(tenantId, env)
    if (!tenant) return false

    // Unlimited users for enterprise
    if (tenant.max_users === -1) return true

    const userCount = await env.DB
        .prepare('SELECT COUNT(*) as count FROM users WHERE tenant_id = ? AND status = ?')
        .bind(tenantId, 'active')
        .first()

    return (userCount?.count as number) < tenant.max_users
}

/**
 * List all tenants (admin only)
 */
export async function listTenants(
    filters: { status?: string, plan?: string, limit?: number, offset?: number },
    env: Bindings
): Promise<Tenant[]> {
    let query = 'SELECT * FROM tenants WHERE 1=1'
    const params: any[] = []

    if (filters.status) {
        query += ' AND status = ?'
        params.push(filters.status)
    }

    if (filters.plan) {
        query += ' AND plan_type = ?'
        params.push(filters.plan)
    }

    query += ' ORDER BY created_at DESC'

    if (filters.limit) {
        query += ' LIMIT ?'
        params.push(filters.limit)
    }

    if (filters.offset) {
        query += ' OFFSET ?'
        params.push(filters.offset)
    }

    const result = await env.DB.prepare(query).bind(...params).all()
    return result.results as Tenant[]
}
