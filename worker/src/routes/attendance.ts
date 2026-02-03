import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { FaceVerificationService } from '../services/face-verification'
import { PointsService } from '../services/points'

type Bindings = {
    DB: D1Database
    JWT_SECRET: string
    AI: any
}

type Variables = {
    user: any
}

const attendance = new Hono<{ Bindings: Bindings, Variables: Variables }>()

attendance.use('*', authMiddleware)

attendance.post('/check-in', async (c) => {
    const user = c.get('user')
    const { latitude, longitude, location_id, photo, photo_url } = await c.req.json()

    if (!latitude || !longitude) return c.json({ error: 'Location required' }, 400)

    const id = crypto.randomUUID()
    const now = new Date().toISOString()

    // Face Verification Logic
    let faceVerified = 0;
    let faceConfidence = 0;
    let facePhotoUrl = photo_url || null; // Prefer photo_url if uploaded via /upload

    try {
        // If a photo URL is provided (either direct from client or returned by upload),
        // we can attempt verification if the user has a registered face.

        // 1. Get user's registered face
        const userProfile = await c.env.DB.prepare(
            'SELECT face_registered, face_photo_url FROM users WHERE id = ?'
        ).bind(user.sub).first<{ face_registered: number, face_photo_url: string }>();

        if (userProfile?.face_registered && userProfile.face_photo_url && facePhotoUrl) {
            // 2. Run verification
            const faceService = new FaceVerificationService(c.env);
            const result = await faceService.compareFaces(
                userProfile.face_photo_url,
                facePhotoUrl
            );

            faceVerified = result.verified ? 1 : 0;
            faceConfidence = result.confidence;

            console.log(`Face verification for ${user.sub}: verified=${result.verified}, confidence=${result.confidence}`);
        }

        // Resolve valid location_id
        let validLocationId = location_id || 'default';

        try {
            // Check if the provided (or default) location exists
            const locationExists = await c.env.DB.prepare('SELECT id FROM locations WHERE id = ?').bind(validLocationId).first();

            if (!locationExists) {
                // If specific ID not found, try to find ANY active location
                const anyLocation = await c.env.DB.prepare('SELECT id FROM locations WHERE is_active = 1 LIMIT 1').first<{ id: string }>();

                if (anyLocation) {
                    validLocationId = anyLocation.id;
                } else {
                    // If NO locations exist at all, create a default one to satisfy FK
                    validLocationId = 'default';
                    await c.env.DB.prepare(
                        `INSERT INTO locations (id, tenant_id, name, latitude, longitude, radius_meters, is_active)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`
                    ).bind('default', 'default', 'Default Office', latitude, longitude, 100, 1).run();
                    console.log('Created default location for check-in');
                }
            }
        } catch (e) {
            console.error('Error resolving location:', e);
            // Continue and hope for the best (or fail at INSERT)
        }

        // 3. Record attendance
        await c.env.DB.prepare(
            `INSERT INTO attendances (
                id, user_id, location_id, check_in_time, 
                check_in_lat, check_in_lng, 
                face_verified, face_confidence, face_photo_url,
                points_earned
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
            id, user.sub, validLocationId, now,
            latitude, longitude,
            faceVerified, faceConfidence, facePhotoUrl,
            10 // 10 points for check-in
        ).run()

        // 4. Award Points
        try {
            const pointsService = new PointsService(c.env.DB);
            await pointsService.awardPoints(
                user.sub,
                10,
                'attendance',
                'Points for daily check-in',
                id
            );
        } catch (err) {
            console.error('Failed to award points:', err);
            // Don't fail check-in if points fail
        }

        return c.json({
            message: 'Check-in successful',
            id,
            time: now,
            face_verified: !!faceVerified,
            face_confidence: faceConfidence,
            points_earned: 10
        })
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

attendance.get('/history', async (c) => {
    const user = c.get('user')
    const { start_date, end_date } = c.req.query()

    let query = 'SELECT * FROM attendances WHERE user_id = ?'
    const params = [user.sub]

    if (start_date) {
        query += ' AND check_in_time >= ?'
        params.push(start_date)
    }
    if (end_date) {
        query += ' AND check_in_time <= ?'
        params.push(end_date + ' 23:59:59')
    }

    query += ' ORDER BY created_at DESC'

    try {
        const { results } = await c.env.DB.prepare(query).bind(...params).all()
        return c.json({ success: true, data: results })
    } catch (e: any) {
        return c.json({ success: false, error: 'Failed to fetch history' }, 500)
    }
})

export default attendance
