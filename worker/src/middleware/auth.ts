import { Context, Next } from 'hono'
import { verify } from 'hono/jwt'

export const authMiddleware = async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)

    const token = authHeader.split(' ')[1]
    if (!token) return c.json({ error: 'Unauthorized' }, 401)

    try {
        const payload = await verify(token, 'HARDCODED_DEBUG_SECRET_123', 'HS256')
        c.set('user', payload)
        await next()
    } catch (e: any) {
        console.error('Auth Middleware Verify Failed:', e.message, e)
        return c.json({ error: 'Invalid token', details: e.message }, 401)
    }
}

export const adminAuthMiddleware = async (c: Context, next: Next) => {
    const user = c.get('user')
    if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
        // Strict check: Must be authenticated AND have 'admin' or 'owner' role
        return c.json({ error: 'Forbidden: Admin access required' }, 403)
    }
    await next()
}

export const superAdminMiddleware = async (c: Context, next: Next) => {
    const user = c.get('user')
    if (!user || user.role !== 'super_admin') {
        return c.json({ error: 'Forbidden: Super Admin access required' }, 403)
    }
    await next()
}
