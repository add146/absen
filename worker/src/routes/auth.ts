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

        // 1. Create Tenant
        const tenantId = crypto.randomUUID()
        const tenantSlug = tenant_name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(Math.random() * 1000) // Ensure uniqueness

        await c.env.DB.prepare(
            'INSERT INTO tenants (id, name, slug) VALUES (?, ?, ?)'
        ).bind(tenantId, tenant_name, tenantSlug).run()

        // 2. Create User
        const userId = crypto.randomUUID()
        const passwordHash = await hash(password, 10)

        await c.env.DB.prepare(
            'INSERT INTO users (id, tenant_id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(userId, tenantId, email, passwordHash, name, 'admin').run()

        return c.json({ message: 'Registered successfully', tenantId, userId })

    } catch (e: any) {
        console.error(e)
        return c.json({ error: 'Registration failed', details: e.message }, 500)
    }
})

auth.post('/login', async (c) => {
    const { email, password } = await c.req.json()

    const user: any = await c.env.DB.prepare(
        'SELECT * FROM users WHERE email = ?'
    ).bind(email).first()

    if (!user) return c.json({ error: 'Invalid credentials' }, 401)

    const isValid = await compare(password, user.password_hash as string)
    if (!isValid) return c.json({ error: 'Invalid credentials' }, 401)

    const payload = {
        sub: user.id,
        role: user.role,
        tenant_id: user.tenant_id,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 // 7 days
    }

    const token = await sign(payload, c.env.JWT_SECRET || 'dev_secret')

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

export default auth
