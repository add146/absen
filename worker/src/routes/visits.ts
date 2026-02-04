import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'

type Bindings = {
    DB: D1Database
    STORAGE: R2Bucket
}

type Variables = {
    user: {
        sub: string
        role: string
        tenant_id: string
        exp: number
        is_field_worker?: number
    }
}

const visits = new Hono<{ Bindings: Bindings, Variables: Variables }>()

// Apply auth middleware to all routes
visits.use('/*', authMiddleware)

// POST /visits/log - Log a field worker visit
visits.post('/log', async (c) => {
    const user = c.get('user')

    // Check if user is a field worker
    const userRecord = await c.env.DB.prepare('SELECT is_field_worker FROM users WHERE id = ?')
        .bind(user.sub)
        .first<{ is_field_worker: number }>()

    if (!userRecord || userRecord.is_field_worker !== 1) {
        return c.json({ error: 'Field worker mode not enabled for this user' }, 403)
    }

    const { latitude, longitude, location_name, notes, photo } = await c.req.json()

    if (!latitude || !longitude) {
        return c.json({ error: 'GPS coordinates required' }, 400)
    }

    const id = crypto.randomUUID()
    let photoUrl = null

    // Upload photo to R2 if provided
    if (photo) {
        try {
            // Assuming photo is base64 encoded
            const base64Data = photo.replace(/^data:image\/\w+;base64,/, '')
            const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))

            const photoKey = `visits/${user.sub}/${id}.jpg`
            await c.env.STORAGE.put(photoKey, buffer, {
                httpMetadata: {
                    contentType: 'image/jpeg'
                }
            })
            photoUrl = photoKey
        } catch (e) {
            console.error('Photo upload failed', e)
            // Continue without photo if upload fails
        }
    }

    await c.env.DB.prepare(
        'INSERT INTO visit_logs (id, user_id, visit_time, latitude, longitude, location_name, notes, photo_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, user.sub, new Date().toISOString(), latitude, longitude, location_name, notes, photoUrl).run()

    return c.json({
        message: 'Visit logged successfully',
        id,
        visit: {
            id,
            visit_time: new Date().toISOString(),
            latitude,
            longitude,
            location_name,
            notes,
            photo_url: photoUrl
        }
    })
})

// GET /visits - Get user's own visits
visits.get('/', async (c) => {
    const user = c.get('user')
    const { start_date, end_date } = c.req.query()

    let query = 'SELECT * FROM visit_logs WHERE user_id = ?'
    let params: any[] = [user.sub]

    if (start_date) {
        query += ' AND date(visit_time) >= ?'
        params.push(start_date)
    }

    if (end_date) {
        query += ' AND date(visit_time) <= ?'
        params.push(end_date)
    }

    query += ' ORDER BY visit_time DESC'

    const { results } = await c.env.DB.prepare(query).bind(...params).all()

    return c.json({ data: results })
})

export default visits
