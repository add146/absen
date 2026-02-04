import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { FaceVerificationService } from '../services/face-verification'
import { PointsService } from '../services/points'
import { GeofenceService } from '../services/geofence'
import { FraudDetector } from '../services/fraud-detection'

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
    const { latitude, longitude, location_id, photo, photo_url, is_mock } = await c.req.json()

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
        // Resolve valid location_id
        let validLocationId = location_id || 'default';
        let locationValid = false;

        try {
            if (location_id && location_id !== 'default') {
                // Validate specific location
                const loc = await c.env.DB.prepare('SELECT * FROM locations WHERE id = ?').bind(location_id).first<any>();
                if (loc) {
                    if (loc.polygon_coords) {
                        // Polygon Validation
                        let polygon: any[] = [];
                        try {
                            polygon = typeof loc.polygon_coords === 'string' ? JSON.parse(loc.polygon_coords) : loc.polygon_coords;
                        } catch (e) { }

                        if (isPointInPolygon({ lat: latitude, lng: longitude }, polygon)) {
                            locationValid = true;
                        }
                    } else {
                        // Radius Validation
                        const distance = calculateDistance(latitude, longitude, loc.latitude, loc.longitude);
                        // Add 50m buffer
                        if (distance <= (loc.radius_meters || 100) + 50) {
                            locationValid = true;
                        }
                    }
                }
            } else {
                // Validate against ANY active location for this tenant
                const locations = await c.env.DB.prepare('SELECT * FROM locations WHERE is_active = 1 AND tenant_id = ?').bind(user.tenant_id).all<any>();
                for (const loc of locations.results) {
                    if (loc.polygon_coords) {
                        // Polygon Validation
                        let polygon: any[] = [];
                        try {
                            polygon = typeof loc.polygon_coords === 'string' ? JSON.parse(loc.polygon_coords) : loc.polygon_coords;
                        } catch (e) { }

                        if (isPointInPolygon({ lat: latitude, lng: longitude }, polygon)) {
                            locationValid = true;
                            validLocationId = loc.id;
                            break;
                        }
                    } else {
                        const distance = calculateDistance(latitude, longitude, loc.latitude, loc.longitude);
                        if (distance <= (loc.radius_meters || 100) + 50) {
                            locationValid = true;
                            validLocationId = loc.id;
                            break;
                        }
                    }
                }
            }

            if (!locationValid) {
                return c.json({ error: 'Location validation failed. You are outside the designated area.', point: { latitude, longitude } }, 400)
            }

        } catch (e) {
            console.error('Error resolving location:', e);
            // Fallback: If DB fails, we might technically block, but let's fail safe if critical
            return c.json({ error: 'System error during location check' }, 500);
        }

        // 3. Fraud Detection
        const fraudDetector = new FraudDetector(c.env.DB);
        const fraudAnalysis = await fraudDetector.analyzeCheckIn({
            id,
            user_id: user.sub,
            check_in_lat: latitude,
            check_in_lng: longitude,
            check_in_time: Math.floor(new Date(now).getTime() / 1000)
        }, is_mock);

        const fraudFlags = fraudDetector.serializeIndicators(fraudAnalysis);
        const fraudScore = fraudAnalysis.fraudScore;

        if (fraudScore > 50) {
            console.warn(`[FRAUD] High risk check-in detected for ${user.sub}: Score ${fraudScore}`);
        }

        // 4. Record attendance
        await c.env.DB.prepare(
            `INSERT INTO attendances (
                id, user_id, location_id, check_in_time, 
                check_in_lat, check_in_lng, 
                face_verified, face_confidence, face_photo_url,
                points_earned, fraud_flags, fraud_score
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
            id, user.sub, validLocationId, now,
            latitude, longitude,
            faceVerified, faceConfidence, facePhotoUrl,
            10, // 10 points for check-in
            fraudFlags, fraudScore
        ).run()

        // 5. Award Points
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

    // Check if any active locations exist
    // Get active locations for this tenant for client-side validation
    const locations = await c.env.DB.prepare(
        'SELECT * FROM locations WHERE is_active = 1 AND tenant_id = ?'
    ).bind(user.tenant_id).all();

    return c.json({
        data: result.results,
        meta: {
            has_locations: locations.results.length > 0,
            locations: locations.results // Send locations to frontend
        }
    })
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

attendance.get('/calendar', async (c) => {
    const user = c.get('user')
    const { month, year } = c.req.query()

    const now = new Date()
    const targetYear = year ? parseInt(year) : now.getFullYear()
    const targetMonth = month ? parseInt(month) : now.getMonth() + 1 // 1-12

    // Get all attendance for this month
    const startDate = `${targetYear}-${targetMonth.toString().padStart(2, '0')}-01`
    // Calculate end date (last day of month)
    const lastDay = new Date(targetYear, targetMonth, 0).getDate()
    const endDate = `${targetYear}-${targetMonth.toString().padStart(2, '0')}-${lastDay}`

    try {
        const result = await c.env.DB.prepare(
            `SELECT * FROM attendances 
             WHERE user_id = ? 
             AND check_in_time >= ? 
             AND check_in_time <= ?
             ORDER BY check_in_time ASC`
        ).bind(user.sub, startDate + ' 00:00:00', endDate + ' 23:59:59').all()

        return c.json({
            data: result.results,
            meta: {
                month: targetMonth,
                year: targetYear
            }
        })
    } catch (e: any) {
        return c.json({ success: false, error: 'Failed to fetch calendar' }, 500)
    }
})

// Helper Functions
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3 // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180
    const φ2 = lat2 * Math.PI / 180
    const Δφ = (lat2 - lat1) * Math.PI / 180
    const Δλ = (lon2 - lon1) * Math.PI / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
}

function isPointInPolygon(point: { lat: number, lng: number }, polygon: { lat: number, lng: number }[]) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].lng, yi = polygon[i].lat;
        const xj = polygon[j].lng, yj = polygon[j].lat;

        const intersect = ((yi > point.lat) !== (yj > point.lat))
            && (point.lng < (xj - xi) * (point.lat - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

export default attendance
