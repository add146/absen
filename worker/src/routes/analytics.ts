import { Hono } from 'hono'
import { authMiddleware, adminAuthMiddleware } from '../middleware/auth'

type Bindings = {
    DB: D1Database
}

const analytics = new Hono<{ Bindings: Bindings }>()

// Apply middleware to all analytics routes
analytics.use('/*', authMiddleware, adminAuthMiddleware)

// GET /attendance-trend - Last 30 days attendance count
analytics.get('/attendance-trend', async (c) => {
    const days = c.req.query('days') || '30'

    try {
        const { results } = await c.env.DB.prepare(`
            SELECT 
                date(check_in_time) as date, 
                COUNT(*) as count 
            FROM attendances 
            WHERE check_in_time >= date('now', '-' || ? || ' days')
            GROUP BY date(check_in_time) 
            ORDER BY date(check_in_time) ASC
        `).bind(days).all()

        return c.json({
            success: true,
            data: results
        })
    } catch (e: any) {
        console.error('Analytics trend error:', e)
        return c.json({ success: false, error: 'Failed to fetch attendance trend' }, 500)
    }
})

// GET /punctuality - On Time vs Late
analytics.get('/punctuality', async (c) => {
    try {
        // Assuming 09:00 is the cut-off
        // In a real app, this should come from Shift/Schedule settings
        const { results } = await c.env.DB.prepare(`
            SELECT 
                CASE 
                    WHEN strftime('%H:%M', check_in_time) > '09:00' THEN 'Late' 
                    ELSE 'On Time' 
                END as status,
                COUNT(*) as count
            FROM attendances
            FROM attendances
            WHERE check_in_time >= date('now', '-30 days')
            GROUP BY status
        `).all()

        return c.json({
            success: true,
            data: results
        })
    } catch (e: any) {
        console.error('Analytics punctuality error:', e)
        return c.json({ success: false, error: 'Failed to fetch punctuality stats' }, 500)
    }
})

// GET /points-distribution - Top Earners
analytics.get('/points-distribution', async (c) => {
    try {
        // Top 10 users by points
        const { results } = await c.env.DB.prepare(`
            SELECT name, points_balance as points 
            FROM users 
            WHERE role = 'employee' 
            ORDER BY points_balance DESC 
            LIMIT 10
        `).all()

        return c.json({
            success: true,
            data: results
        })
    } catch (e: any) {
        console.error('Analytics points error:', e)
        return c.json({ success: false, error: 'Failed to fetch points distribution' }, 500)
    }
})

export default analytics
