import { Hono } from 'hono'
import { Bindings } from '../index'

const app = new Hono<{ Bindings: Bindings }>()

app.get('/', async (c) => {
    const start = Date.now()
    let dbStatus = 'unknown'

    try {
        // Simple query to check DB connectivity
        await c.env.DB.prepare('SELECT 1').first()
        dbStatus = 'connected'
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
