/**
 * User Profile API Routes
 * Handles user profile updates including face registration
 */

import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { Bindings } from '../index';

const app = new Hono<{ Bindings: Bindings, Variables: { user: any } }>();

app.use('/*', authMiddleware);

/**
 * POST /profile/face-register
 * Register user face photo
 */
app.post('/face-register', async (c) => {
    try {
        const user = c.get('user');
        const { photoUrl } = await c.req.json();

        if (!photoUrl) {
            return c.json({ error: 'Photo URL is required' }, 400);
        }

        // Update user profile with face photo
        await c.env.DB.prepare(`
            UPDATE users 
            SET face_photo_url = ?, 
                face_registered = 1,
                updated_at = unixepoch()
            WHERE id = ?
        `).bind(photoUrl, user.id).run();

        return c.json({
            success: true,
            message: 'Face registered successfully',
            photoUrl
        });
    } catch (error: any) {
        console.error('Face registration error:', error);
        return c.json({ error: error.message }, 500);
    }
});

/**
 * GET /profile/status
 * Get user face registration status
 */
app.get('/status', async (c) => {
    const user = c.get('user');

    const result = await c.env.DB.prepare(`
        SELECT face_registered, face_photo_url 
        FROM users 
        WHERE id = ?
    `).bind(user.id).first();

    return c.json({ success: true, data: result });
});

export default app;
