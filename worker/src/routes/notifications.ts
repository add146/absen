/**
 * Notifications API Routes
 * Endpoints for managing user notifications
 */

import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { NotificationService } from '../services/notification-service';

const app = new Hono();

// All routes require authentication
app.use('/*', authMiddleware);

/**
 * GET /notifications
 * Get user notifications
 */
app.get('/', async (c) => {
    try {
        const user = c.get('user');
        const limit = parseInt(c.req.query('limit') || '50');

        const notificationService = new NotificationService(c.env);
        const notifications = await notificationService.getUserNotifications(user.id, limit);

        return c.json({ notifications });
    } catch (error: any) {
        console.error('Error fetching notifications:', error);
        return c.json({ error: error.message }, 500);
    }
});

/**
 * GET /notifications/unread-count
 * Get count of unread notifications
 */
app.get('/unread-count', async (c) => {
    try {
        const user = c.get('user');

        const notificationService = new NotificationService(c.env);
        const count = await notificationService.getUnreadCount(user.id);

        return c.json({ count });
    } catch (error: any) {
        console.error('Error fetching unread count:', error);
        return c.json({ error: error.message }, 500);
    }
});

/**
 * POST /notifications/:id/read
 * Mark notification as read
 */
app.post('/:id/read', async (c) => {
    try {
        const user = c.get('user');
        const notificationId = c.req.param('id');

        const notificationService = new NotificationService(c.env);
        await notificationService.markAsRead(notificationId, user.id);

        return c.json({ success: true });
    } catch (error: any) {
        console.error('Error marking notification as read:', error);
        return c.json({ error: error.message }, 500);
    }
});

/**
 * POST /notifications/mark-all-read
 * Mark all notifications as read
 */
app.post('/mark-all-read', async (c) => {
    try {
        const user = c.get('user');

        await c.env.DB
            .prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?')
            .bind(user.id)
            .run();

        return c.json({ success: true });
    } catch (error: any) {
        console.error('Error marking all as read:', error);
        return c.json({ error: error.message }, 500);
    }
});

/**
 * POST /notifications/test
 * Send test notification (for development)
 */
app.post('/test', async (c) => {
    try {
        const user = c.get('user');
        const body = await c.req.json();

        const notificationService = new NotificationService(c.env);
        const notificationId = await notificationService.send({
            userId: user.id,
            type: body.type || 'generic',
            data: body.data || { userName: user.name, activity: 'Test notification' },
        });

        return c.json({ success: true, notificationId });
    } catch (error: any) {
        console.error('Error sending test notification:', error);
        return c.json({ error: error.message }, 500);
    }
});

export default app;
