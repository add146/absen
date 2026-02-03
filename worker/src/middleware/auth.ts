import { Context, Next } from 'hono'
import { verify } from 'hono/jwt'

export const authMiddleware = async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)

    const token = authHeader.split(' ')[1]
    if (!token) return c.json({ error: 'Unauthorized' }, 401)

    try {
        const payload = await verify(token, c.env.JWT_SECRET, 'HS256')
        c.set('user', payload)
        await next()
    } catch (e) {
        return c.json({ error: 'Invalid token' }, 401)
    }
}
