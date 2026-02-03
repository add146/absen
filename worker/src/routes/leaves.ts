import { Hono } from 'hono';
import { Bindings } from '../index';
import { authMiddleware, adminAuthMiddleware } from '../middleware/auth';

type Variables = {
    user: {
        id: string;
        role: string;
        // add other user properties if needed
    }
}

const app = new Hono<{ Bindings: Bindings, Variables: Variables }>();

// Get My Leaves
app.get('/', authMiddleware, async (c) => {
    const user = c.get('user');
    try {
        const { results } = await c.env.DB.prepare(
            "SELECT * FROM leaves WHERE user_id = ? ORDER BY created_at DESC"
        ).bind(user.id).all();

        return c.json({ success: true, data: results });
    } catch (error) {
        return c.json({ success: false, error: 'Failed to fetch leaves' }, 500);
    }
});

// Request Leave
app.post('/', authMiddleware, async (c) => {
    const user = c.get('user');
    const { type, start_date, end_date, reason } = await c.req.json();

    if (!type || !start_date || !end_date) {
        return c.json({ error: 'Missing required fields' }, 400);
    }

    try {
        const id = crypto.randomUUID();
        await c.env.DB.prepare(
            "INSERT INTO leaves (id, user_id, type, start_date, end_date, reason) VALUES (?, ?, ?, ?, ?, ?)"
        ).bind(id, user.id, type, start_date, end_date, reason).run();

        return c.json({ success: true, message: 'Leave request submitted', id });
    } catch (error) {
        return c.json({ success: false, error: 'Failed to submit leave' }, 500);
    }
});

// Admin: Get All Pending Leaves
app.get('/pending', authMiddleware, adminAuthMiddleware, async (c) => {
    try {
        const { results } = await c.env.DB.prepare(`
            SELECT l.*, u.name as user_name, u.role as user_role 
            FROM leaves l
            JOIN users u ON l.user_id = u.id
            WHERE l.status = 'pending'
            ORDER BY l.created_at ASC
        `).all();
        return c.json({ success: true, data: results });
    } catch (error) {
        return c.json({ success: false, error: 'Failed to fetch pending leaves' }, 500);
    }
});

// Admin: Update Status (Approve/Reject)
app.put('/:id/status', authMiddleware, adminAuthMiddleware, async (c) => {
    const { id } = c.req.param();
    const { status, rejection_reason } = await c.req.json();

    if (!['approved', 'rejected'].includes(status)) {
        return c.json({ error: 'Invalid status' }, 400);
    }

    try {
        await c.env.DB.prepare(
            "UPDATE leaves SET status = ?, rejection_reason = ?, updated_at = unixepoch() WHERE id = ?"
        ).bind(status, rejection_reason || null, id).run();

        return c.json({ success: true, message: `Leave ${status}` });
    } catch (error) {
        return c.json({ success: false, error: 'Failed to update leave status' }, 500);
    }
});

export default app;
