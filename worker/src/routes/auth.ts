import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import { compare, hash } from 'bcryptjs'

type Bindings = {
    DB: D1Database
    JWT_SECRET: string
}

const auth = new Hono<{ Bindings: Bindings }>()

auth.post('/register', async (c) => {
    try {
        const { email, password, name, tenant_name } = await c.req.json()

        if (!email || !password || !name || !tenant_name) {
            return c.json({ error: 'Missing required fields' }, 400)
        }

        // Use standard tenant creation service
        // This ensures all defaults (plan, points, settings) are applied consistently
        const { createTenant } = await import('../services/tenant-service')
        const { tenant, admin } = await createTenant({
            name: tenant_name,
            adminEmail: email,
            adminPassword: password,
            adminName: name
        }, c.env)

        return c.json({
            message: 'Registered successfully',
            tenantId: tenant.id,
            userId: admin.id
        })

    } catch (e: any) {
        console.error(e)
        return c.json({ error: 'Registration failed', details: e.message }, 500)
    }
})

auth.post('/login', async (c) => {
    const { email, password } = await c.req.json()

    // 1. Get User
    const user: any = await c.env.DB.prepare(
        'SELECT * FROM users WHERE email = ?'
    ).bind(email).first()

    if (!user) {
        console.log(`Login failed: User ${email} not found`);
        return c.json({ error: 'Invalid credentials' }, 401)
    }

    // 2. Verify Password
    const isValid = await compare(password, user.password_hash as string)
    if (!isValid) {
        console.log(`Login failed: Password mismatch for ${email}. Hash length: ${user.password_hash?.length}`);
        return c.json({ error: 'Invalid credentials' }, 401)
    }

    // 3. Verify Tenant Status
    const tenant: any = await c.env.DB.prepare(
        'SELECT status, trial_ends_at FROM tenants WHERE id = ?'
    ).bind(user.tenant_id).first()

    if (!tenant) {
        return c.json({ error: 'Tenant not found' }, 403)
    }

    if (tenant.status === 'suspended' || tenant.status === 'cancelled') {
        return c.json({ error: 'Your account is suspended. Please contact support.' }, 403)
    }

    // Check trial expiration
    if (tenant.status === 'trial' && tenant.trial_ends_at) {
        const trialEnd = new Date(tenant.trial_ends_at)
        if (new Date() > trialEnd) {
            return c.json({ error: 'Trial period expired. Please upgrade your plan.' }, 403)
        }
    }

    // 4. Generate Token
    const payload = {
        sub: user.id,
        role: user.role,
        tenant_id: user.tenant_id,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 // 7 days
    }

    const token = await sign(payload, 'HARDCODED_DEBUG_SECRET_123', 'HS256')

    return c.json({
        access_token: token,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            tenant_id: user.tenant_id
        }
    })
})

/**
 * POST /auth/join
 * Register a new user into an EXISTING tenant (Employee Registration)
 */
auth.post('/join', async (c) => {
    try {
        const { email, password, name, tenant_slug, employee_id } = await c.req.json()

        if (!email || !password || !name || !tenant_slug) {
            return c.json({ error: 'Missing required fields' }, 400)
        }

        // 1. Find Tenant
        const { getTenantBySlug, canAddUser } = await import('../services/tenant-service')
        const tenant = await getTenantBySlug(tenant_slug, c.env)

        if (!tenant) {
            return c.json({ error: 'Company code invalid. Please verify with your admin.' }, 404)
        }

        // 2. Check Capacity (Plan Limits)
        const canAdd = await canAddUser(tenant.id, c.env)
        if (!canAdd) {
            return c.json({ error: 'Organization has reached maximum user limit.' }, 403)
        }

        // 3. Check if email exists
        const existingUser = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
        if (existingUser) {
            return c.json({ error: 'Email already registered' }, 409)
        }

        // 4. Create User
        const userId = crypto.randomUUID()
        const hash = await import('bcryptjs').then(b => b.hash(password, 10))

        await c.env.DB.prepare(`
            INSERT INTO users (id, tenant_id, email, password_hash, name, role, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `).bind(
            userId,
            tenant.id,
            email,
            hash,
            name,
            'employee', // Default role for joiners
            'active'
        ).run()

        return c.json({
            message: 'Joined successfully',
            userId,
            tenant: { name: tenant.name }
        })

    } catch (e: any) {
        console.error('Join failed:', e)
        return c.json({ error: 'Registration failed', details: e.message }, 500)
    }
})

export default auth
