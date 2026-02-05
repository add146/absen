import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { FaceVerificationService } from '../services/face-verification'
import { PointsService } from '../services/points'
import { PointsEngine } from '../services/points-engine'
import { GeofenceService } from '../services/geofence'
import { FraudDetector } from '../services/fraud-detection'
import { LocationValidator } from '../services/location-validator'

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
        let validLocationId = location_id || 'default';

        try {
            const locationValidator = new LocationValidator(c.env.DB);
            const validation = await locationValidator.validate(latitude, longitude, user.tenant_id, location_id);

            if (!validation.isValid) {
                return c.json({ error: validation.error, point: { latitude, longitude } }, 400);
            }
            if (validation.validLocationId) {
                validLocationId = validation.validLocationId;
            }

        } catch (e) {
            console.error('Error resolving location:', e);
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

        // 5. Award Points (Dynamic Rules)
        let earnedPoints = 10;
        try {
            const pointsEngine = new PointsEngine(c.env.DB);
            const attendanceRecord = {
                id,
                user_id: user.sub,
                check_in_time: Math.floor(new Date(now).getTime() / 1000),
                location_id: validLocationId
            };

            earnedPoints = await pointsEngine.evaluateRules('check_in', attendanceRecord, {
                id: user.sub,
                tenant_id: user.tenant_id,
                points_balance: 0 // Not needed for check-in rules currently
            });

            const pointsService = new PointsService(c.env.DB);
            await pointsService.awardPoints(
                user.sub,
                earnedPoints,
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
            points_earned: earnedPoints
        })
    } catch (e: any) {
        console.error(e)
        return c.json({ error: 'Check-in failed', details: e.message }, 500)
    }
})

attendance.post('/check-out', async (c) => {
    const user = c.get('user')
    const { attendance_id, latitude, longitude, location_id } = await c.req.json()
    const now = new Date().toISOString()
    const checkOutTime = Math.floor(new Date(now).getTime() / 1000);

    // Fetch checkout location name if location_id provided
    // Fetch checkout location name if location_id provided
    // Validate Location for Checkout (New Requirement)
    let validatedCheckoutLocationId = location_id || null;
    try {
        const locationValidator = new LocationValidator(c.env.DB);
        const validation = await locationValidator.validate(latitude, longitude, user.tenant_id, location_id);

        if (!validation.isValid) {
            return c.json({ error: 'Checkout failed: ' + (validation.error || 'You must be at an office location to check out.'), point: { latitude, longitude } }, 400);
        }
        if (validation.validLocationId) {
            validatedCheckoutLocationId = validation.validLocationId;
        }
    } catch (e) {
        console.error('Validation error check-out:', e);
        return c.json({ error: 'Location validation error' }, 500);
    }

    let checkoutLocationName = null;
    if (validatedCheckoutLocationId) {
        const loc = await c.env.DB.prepare('SELECT name FROM locations WHERE id = ?').bind(validatedCheckoutLocationId).first<{ name: string }>();
        checkoutLocationName = loc?.name || null;
    }

    try {
        let result: D1Result
        let targetAttendanceId = attendance_id;

        if (attendance_id) {
            result = await c.env.DB.prepare(
                'UPDATE attendances SET check_out_time = ?, check_out_lat = ?, check_out_lng = ?, checkout_location_id = ?, checkout_location_name = ? WHERE id = ? AND user_id = ?'
            ).bind(now, latitude, longitude, validatedCheckoutLocationId, checkoutLocationName, attendance_id, user.sub).run()
        } else {
            // Find latest active check-in
            const active = await c.env.DB.prepare(
                'SELECT id FROM attendances WHERE user_id = ? AND check_out_time IS NULL ORDER BY created_at DESC LIMIT 1'
            ).bind(user.sub).first<{ id: string }>();

            if (!active) {
                return c.json({ error: 'No active check-in found' }, 404)
            }
            targetAttendanceId = active.id;

            result = await c.env.DB.prepare(
                'UPDATE attendances SET check_out_time = ?, check_out_lat = ?, check_out_lng = ?, checkout_location_id = ?, checkout_location_name = ? WHERE id = ?'
            ).bind(now, latitude, longitude, validatedCheckoutLocationId, checkoutLocationName, targetAttendanceId).run()
        }

        if (result.meta.changes === 0) {
            return c.json({ error: 'Failed to update attendance' }, 500)
        }

        // Evaluate Check-out Rules (Full Day Bonus, etc.)
        let extraPoints = 0;
        try {
            // Fetch complete attendance record for evaluation
            const att = await c.env.DB.prepare(
                'SELECT * FROM attendances WHERE id = ?'
            ).bind(targetAttendanceId).first<any>();

            if (att) {
                const pointsEngine = new PointsEngine(c.env.DB);
                const attendanceRecord = {
                    id: att.id,
                    user_id: att.user_id,
                    check_in_time: Math.floor(new Date(att.check_in_time).getTime() / 1000),
                    check_out_time: checkOutTime,
                    location_id: att.location_id
                };

                extraPoints = await pointsEngine.evaluateRules('check_out', attendanceRecord, {
                    id: user.sub,
                    tenant_id: user.tenant_id,
                    points_balance: 0
                });

                if (extraPoints > 0) {
                    const pointsService = new PointsService(c.env.DB);
                    await pointsService.awardPoints(
                        user.sub,
                        extraPoints,
                        'bonus',
                        'Bonus points for full day work',
                        targetAttendanceId
                    );

                    // Update valid/points flag in attendance if needed? 
                    // Usually we track total points in attendance table too?
                    // Currently `attendances` table has `points_earned`. We should probably update it.
                    await c.env.DB.prepare(
                        'UPDATE attendances SET points_earned = points_earned + ? WHERE id = ?'
                    ).bind(extraPoints, targetAttendanceId).run();
                }
            }
        } catch (e) {
            console.error('Points evaluation failed on check-out', e);
        }

        return c.json({
            message: 'Check-out successful',
            time: now,
            points_earned: extraPoints,
            is_full_day: extraPoints > 0
        })

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

    // Fetch tenant settings for frontend validation (e.g. camera requirement)
    const tenant = await c.env.DB.prepare('SELECT settings FROM tenants WHERE id = ?').bind(user.tenant_id).first<{ settings: string }>();
    let settings: any = {};
    if (tenant?.settings) {
        try { settings = JSON.parse(tenant.settings); } catch (e) { }
    }

    return c.json({
        data: result.results,
        meta: {
            has_locations: locations.results.length > 0,
            locations: locations.results, // Send locations to frontend
            settings: settings // Send tenant settings
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



export default attendance
