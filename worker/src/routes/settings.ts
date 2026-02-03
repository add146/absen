/**
 * System Settings API Routes
 * Endpoints for managing system-wide settings (super admin only)
 */

import { Hono } from 'hono';
import { authMiddleware, adminAuthMiddleware } from '../middleware/auth';
import { Bindings } from '../index';

type Variables = {
    user: {
        id: string;
        role: string;
        tenant_id?: string;
    }
}

const app = new Hono<{ Bindings: Bindings, Variables: Variables }>();

// All routes require admin authentication
app.use('/*', authMiddleware);
app.use('/*', adminAuthMiddleware);

/**
 * GET /settings
 * Get all system settings
 */
app.get('/', async (c) => {
    try {
        const { results } = await c.env.DB
            .prepare('SELECT * FROM system_settings ORDER BY key')
            .all();

        return c.json({ success: true, settings: results });
    } catch (error: any) {
        console.error('Error fetching settings:', error);
        return c.json({ error: error.message }, 500);
    }
});

/**
 * GET /settings/:key
 * Get specific setting by key
 */
app.get('/:key', async (c) => {
    try {
        const key = c.req.param('key');

        const setting = await c.env.DB
            .prepare('SELECT * FROM system_settings WHERE key = ?')
            .bind(key)
            .first();

        if (!setting) {
            return c.json({ error: 'Setting not found' }, 404);
        }

        return c.json({ success: true, setting });
    } catch (error: any) {
        console.error('Error fetching setting:', error);
        return c.json({ error: error.message }, 500);
    }
});

/**
 * PUT /settings/:key
 * Update setting value
 */
app.put('/:key', async (c) => {
    try {
        const key = c.req.param('key');
        const { value } = await c.req.json();

        await c.env.DB
            .prepare(`
                UPDATE system_settings 
                SET value = ?, updated_at = unixepoch()
                WHERE key = ?
            `)
            .bind(value, key)
            .run();

        return c.json({ success: true, message: 'Setting updated' });
    } catch (error: any) {
        console.error('Error updating setting:', error);
        return c.json({ error: error.message }, 500);
    }
});

/**
 * POST /settings/bulk
 * Update multiple settings at once
 */
app.post('/bulk', async (c) => {
    try {
        const { settings } = await c.req.json() as { settings: Record<string, string> };

        // Update each setting
        for (const [key, value] of Object.entries(settings)) {
            await c.env.DB
                .prepare(`
                    INSERT INTO system_settings (key, value)
                    VALUES (?, ?)
                    ON CONFLICT(key) DO UPDATE SET
                        value = excluded.value,
                        updated_at = unixepoch()
                `)
                .bind(key, value)
                .run();
        }

        return c.json({ success: true, message: 'Settings updated' });
    } catch (error: any) {
        console.error('Error bulk updating settings:', error);
        return c.json({ error: error.message }, 500);
    }
});

/**
 * GET /settings/waha/config
 * Get WAHA configuration (convenience endpoint)
 */
app.get('/waha/config', async (c) => {
    try {
        const { results } = await c.env.DB
            .prepare(`SELECT * FROM system_settings WHERE key LIKE 'waha_%'`)
            .all();

        const config: Record<string, any> = {};
        results.forEach((row: any) => {
            config[row.key] = row.value;
        });

        return c.json({ success: true, config });
    } catch (error: any) {
        console.error('Error fetching WAHA config:', error);
        return c.json({ error: error.message }, 500);
    }
});

export default app;
