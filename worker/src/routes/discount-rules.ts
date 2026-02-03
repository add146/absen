// Discount Rules Admin Routes
// Manage discount rules CRUD

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

// Get All Discount Rules
app.get('/', authMiddleware, adminAuthMiddleware, async (c) => {
    const tenantId = c.get('user').tenant_id || 'default';

    try {
        const { results } = await c.env.DB.prepare(
            "SELECT * FROM discount_rules WHERE tenant_id = ? ORDER BY points_required ASC"
        ).bind(tenantId).all();

        return c.json({ success: true, data: results });
    } catch (error) {
        return c.json({ success: false, error: 'Failed to fetch discount rules' }, 500);
    }
});

// Create Discount Rule
app.post('/', authMiddleware, adminAuthMiddleware, async (c) => {
    const tenantId = c.get('user').tenant_id || 'default';
    const {
        name,
        rule_type,
        points_required,
        discount_value,
        max_discount,
        min_purchase,
        valid_from,
        valid_until
    } = await c.req.json();

    if (!name || !rule_type || !points_required || !discount_value) {
        return c.json({ error: 'Missing required fields' }, 400);
    }

    try {
        const id = crypto.randomUUID();
        await c.env.DB.prepare(`
            INSERT INTO discount_rules (
                id, tenant_id, name, rule_type, points_required, 
                discount_value, max_discount, min_purchase, valid_from, valid_until
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            id,
            tenantId,
            name,
            rule_type,
            points_required,
            discount_value,
            max_discount || null,
            min_purchase || null,
            valid_from || null,
            valid_until || null
        ).run();

        return c.json({ success: true, message: 'Discount rule created', id });
    } catch (error) {
        console.error('Create discount rule error:', error);
        return c.json({ success: false, error: 'Failed to create discount rule' }, 500);
    }
});

// Update Discount Rule
app.put('/:id', authMiddleware, adminAuthMiddleware, async (c) => {
    const { id } = c.req.param();
    const body = await c.req.json();

    const updates: string[] = [];
    const values: any[] = [];

    const fields = ['name', 'points_required', 'discount_value', 'max_discount', 'min_purchase', 'valid_from', 'valid_until'];

    for (const field of fields) {
        if (body[field] !== undefined) {
            updates.push(`${field} = ?`);
            values.push(body[field]);
        }
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
            `UPDATE discount_rules SET ${updates.join(', ')} WHERE id = ?`
        ).bind(...values).run();

        return c.json({ success: true, message: 'Discount rule updated' });
    } catch (error) {
        return c.json({ success: false, error: 'Failed to update discount rule' }, 500);
    }
});

// Delete Discount Rule
app.delete('/:id', authMiddleware, adminAuthMiddleware, async (c) => {
    const { id } = c.req.param();

    try {
        await c.env.DB.prepare(
            "UPDATE discount_rules SET is_active = 0 WHERE id = ?"
        ).bind(id).run();

        return c.json({ success: true, message: 'Discount rule deleted' });
    } catch (error) {
        return c.json({ success: false, error: 'Failed to delete discount rule' }, 500);
    }
});

export default app;
