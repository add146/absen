import { Hono } from 'hono'
import { Bindings } from '../index'

const app = new Hono<{ Bindings: Bindings }>()

app.get('/', async (c) => {
    const start = Date.now()
    let dbStatus = 'unknown'

    try {
        // Simple query to check DB connectivity
        const { user_count } = await c.env.DB.prepare('SELECT COUNT(*) as user_count FROM users').first() as any || { user_count: 0 }
        const { tenant_count } = await c.env.DB.prepare('SELECT COUNT(*) as tenant_count FROM tenants').first() as any || { tenant_count: 0 }

        dbStatus = `connected (Users: ${user_count}, Tenants: ${tenant_count})`

        // Also check specific user existence if needed
        // const testUser = await c.env.DB.prepare("SELECT email FROM users WHERE email='test@example.com'").first();
        // if (testUser) dbStatus += ` | Found test@example.com`
    } catch (e: any) {
        dbStatus = 'error: ' + e.message
    }

    return c.json({
        status: dbStatus === 'connected' ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        // uptime: process.uptime(), // Not available in Workers
        services: {
            database: dbStatus,
            kv: c.env.CACHE ? 'available' : 'missing',
            r2: c.env.STORAGE ? 'available' : 'missing'
        },
        latency: Date.now() - start
    }, dbStatus === 'connected' ? 200 : 503)
})

export default app
