// Point Rules Admin Routes
// Manage point rules CRUD

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

// Get All Point Rules
app.get('/', authMiddleware, adminAuthMiddleware, async (c) => {
    const tenantId = c.get('user').tenant_id || 'default';

    try {
        const { results } = await c.env.DB.prepare(
            "SELECT * FROM point_rules WHERE tenant_id = ? ORDER BY rule_type, name"
        ).bind(tenantId).all();

        return c.json({ success: true, data: results });
    } catch (error) {
        return c.json({ success: false, error: 'Failed to fetch point rules' }, 500);
    }
});

// Create Point Rule
app.post('/', authMiddleware, adminAuthMiddleware, async (c) => {
    const tenantId = c.get('user').tenant_id || 'default';
    const { name, rule_type, points_amount, conditions } = await c.req.json();

    if (!name || !rule_type || !points_amount) {
        return c.json({ error: 'Missing required fields' }, 400);
    }

    try {
        const id = crypto.randomUUID();
        await c.env.DB.prepare(`
            INSERT INTO point_rules (id, tenant_id, name, rule_type, points_amount, conditions)
            VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
            id,
            tenantId,
            name,
            rule_type,
            points_amount,
            JSON.stringify(conditions || {})
        ).run();

        return c.json({ success: true, message: 'Point rule created', id });
    } catch (error) {
        console.error('Create point rule error:', error);
        return c.json({ success: false, error: 'Failed to create point rule' }, 500);
    }
});

// Update Point Rule
app.put('/:id', authMiddleware, adminAuthMiddleware, async (c) => {
    const { id } = c.req.param();
    const body = await c.req.json();

    const updates: string[] = [];
    const values: any[] = [];

    if (body.name !== undefined) {
        updates.push('name = ?');
        values.push(body.name);
    }
    if (body.points_amount !== undefined) {
        updates.push('points_amount = ?');
        values.push(body.points_amount);
    }
    if (body.conditions !== undefined) {
        updates.push('conditions = ?');
        values.push(JSON.stringify(body.conditions));
    }
    if (body.is_active !== undefined) {
        updates.push('is_active = ?');
        values.push(body.is_active ? 1 : 0);
    }

    if (updates.length === 0) {
        return c.json({ error: 'No fields to update' }, 400);
    }

    values.push(id);

    try {
        await c.env.DB.prepare(
            `UPDATE point_rules SET ${updates.join(', ')} WHERE id = ?`
        ).bind(...values).run();

        return c.json({ success: true, message: 'Point rule updated' });
    } catch (error) {
        return c.json({ success: false, error: 'Failed to update point rule' }, 500);
    }
});

// Delete Point Rule
app.delete('/:id', authMiddleware, adminAuthMiddleware, async (c) => {
    const { id } = c.req.param();

    try {
        // Soft delete by setting is_active = 0
        await c.env.DB.prepare(
            "UPDATE point_rules SET is_active = 0 WHERE id = ?"
        ).bind(id).run();

        return c.json({ success: true, message: 'Point rule deleted' });
    } catch (error) {
        return c.json({ success: false, error: 'Failed to delete point rule' }, 500);
    }
});

export default app;
