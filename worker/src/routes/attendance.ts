import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'

type Bindings = {
    DB: D1Database
    JWT_SECRET: string
}

type Variables = {
    user: any
}

const attendance = new Hono<{ Bindings: Bindings, Variables: Variables }>()

attendance.use('*', authMiddleware)

attendance.post('/check-in', async (c) => {
    const user = c.get('user')
    const { latitude, longitude, location_id } = await c.req.json()

    if (!latitude || !longitude) return c.json({ error: 'Location required' }, 400)

    const id = crypto.randomUUID()
    const now = new Date().toISOString()

    try {
        await c.env.DB.prepare(
            'INSERT INTO attendances (id, user_id, location_id, check_in_time, check_in_lat, check_in_lng) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(id, user.sub, location_id || 'default', now, latitude, longitude).run()

        return c.json({ message: 'Check-in successful', id, time: now })
    } catch (e: any) {
        console.error(e)
        return c.json({ error: 'Check-in failed', details: e.message }, 500)
    }
})

attendance.post('/check-out', async (c) => {
    const user = c.get('user')
    const { attendance_id, latitude, longitude } = await c.req.json()
    const now = new Date().toISOString()

    try {
        let result: D1Result
        if (attendance_id) {
            result = await c.env.DB.prepare(
                'UPDATE attendances SET check_out_time = ?, check_out_lat = ?, check_out_lng = ? WHERE id = ? AND user_id = ?'
            ).bind(now, latitude, longitude, attendance_id, user.sub).run()
        } else {
            // Find latest active check-in
            result = await c.env.DB.prepare(
                'UPDATE attendances SET check_out_time = ?, check_out_lat = ?, check_out_lng = ? WHERE user_id = ? AND check_out_time IS NULL ORDER BY created_at DESC LIMIT 1'
            ).bind(now, latitude, longitude, user.sub).run()
        }

        if (result.meta.changes === 0) {
            return c.json({ error: 'No active check-in found' }, 404)
        }

        return c.json({ message: 'Check-out successful', time: now })

    } catch (e: any) {
        return c.json({ error: 'Check-out failed', details: e.message }, 500)
    }
})

attendance.get('/today', async (c) => {
    const user = c.get('user')
    const today = new Date().toISOString().split('T')[0]

    const result = await c.env.DB.prepare(
        'SELECT * FROM attendances WHERE user_id = ? AND check_in_time LIKE ? ORDER BY created_at DESC'
    ).bind(user.sub, `${today}%`).all()

    return c.json({ data: result.results })
})

export default attendance
