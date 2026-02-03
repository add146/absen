// Fraud Detection Admin Routes
// View and manage flagged attendances

import { Hono } from 'hono';
import { Bindings } from '../index';
import { authMiddleware, adminAuthMiddleware } from '../middleware/auth';

type Variables = {
    user: {
        id: string;
        role: string;
        tenant_id?: string;
    }
}

const app = new Hono<{ Bindings: Bindings, Variables: Variables }>();

// Get Flagged Attendances
app.get('/flagged', authMiddleware, adminAuthMiddleware, async (c) => {
    const minScore = parseInt(c.req.query('min_score') || '30');

    try {
        const { results } = await c.env.DB.prepare(`
            SELECT 
                a.*,
                u.name as user_name,
                u.email as user_email,
                l.name as location_name
            FROM attendances a
            JOIN users u ON a.user_id = u.id
            LEFT JOIN locations l ON a.location_id = l.id
            WHERE a.fraud_flags IS NOT NULL
            AND json_extract(a.fraud_flags, '$.score') >= ?
            ORDER BY a.check_in_time DESC
            LIMIT 100
        `).bind(minScore).all();

        return c.json({ success: true, data: results });
    } catch (error) {
        console.error('Get flagged error:', error);
        return c.json({ success: false, error: 'Failed to fetch flagged attendances' }, 500);
    }
});

// Get Fraud Statistics
app.get('/stats', authMiddleware, adminAuthMiddleware, async (c) => {
    try {
        const totalFlagged = await c.env.DB.prepare(
            "SELECT COUNT(*) as count FROM attendances WHERE fraud_flags IS NOT NULL"
        ).first() as any;

        const highRisk = await c.env.DB.prepare(
            "SELECT COUNT(*) as count FROM attendances WHERE json_extract(fraud_flags, '$.score') >= 50"
        ).first() as any;

        const mediumRisk = await c.env.DB.prepare(
            "SELECT COUNT(*) as count FROM attendances WHERE json_extract(fraud_flags, '$.score') >= 30 AND json_extract(fraud_flags, '$.score') < 50"
        ).first() as any;

        const mockLocationCount = await c.env.DB.prepare(
            "SELECT COUNT(*) as count FROM attendances WHERE json_extract(fraud_flags, '$.mock_location') = 1"
        ).first() as any;

        const impossibleTravelCount = await c.env.DB.prepare(
            "SELECT COUNT(*) as count FROM attendances WHERE json_extract(fraud_flags, '$.impossible_travel') = 1"
        ).first() as any;

        return c.json({
            success: true,
            data: {
                total_flagged: totalFlagged.count || 0,
                high_risk: highRisk.count || 0,
                medium_risk: mediumRisk.count || 0,
                mock_location_detected: mockLocationCount.count || 0,
                impossible_travel_detected: impossibleTravelCount.count || 0
            }
        });
    } catch (error) {
        console.error('Stats error:', error);
        return c.json({ success: false, error: 'Failed to fetch statistics' }, 500);
    }
});

// Override Fraud Flag (Manual Review)
app.put('/:id/override', authMiddleware, adminAuthMiddleware, async (c) => {
    const { id } = c.req.param();
    const { is_valid, notes } = await c.req.json();

    try {
        await c.env.DB.prepare(
            "UPDATE attendances SET is_valid = ?, device_info = ? WHERE id = ?"
        ).bind(is_valid ? 1 : 0, notes || null, id).run();

        return c.json({ success: true, message: 'Fraud flag overridden' });
    } catch (error) {
        return c.json({ success: false, error: 'Failed to override flag' }, 500);
    }
});

export default app;
