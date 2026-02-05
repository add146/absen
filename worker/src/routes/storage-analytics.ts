import { Hono } from 'hono';
import { Bindings } from '../index';
import { authMiddleware, superAdminMiddleware } from '../middleware/auth';
import { getStorageAnalytics } from '../services/storage-lifecycle';

const storageAnalytics = new Hono<{ Bindings: Bindings }>();

// Protect all routes: Must be Super Admin
storageAnalytics.use('*', authMiddleware, superAdminMiddleware);

// GET /super-admin/storage/analytics/summary
storageAnalytics.get('/summary', async (c) => {
    try {
        const analytics = await getStorageAnalytics(c.env);
        return c.json({
            success: true,
            data: analytics
        });
    } catch (error: any) {
        return c.json({ error: 'Failed to fetch storage analytics', details: error.message }, 500);
    }
});

// GET /super-admin/storage/analytics/cleanup-history
storageAnalytics.get('/cleanup-history', async (c) => {
    // For now, we mock this as we haven't implemented a robust history table yet
    // In future, storage-lifecycle.ts should write to a 'cleanup_logs' table
    return c.json({
        success: true,
        data: []
    });
});

// POST /super-admin/storage/analytics/trigger-cleanup
storageAnalytics.post('/trigger-cleanup', async (c) => {
    try {
        const { cleanupOldFiles, cleanupRateLimits } = await import('../services/storage-lifecycle');

        // Manual trigger
        const fileCleanup = await cleanupOldFiles(c.env);
        const rateLimitCleanup = await cleanupRateLimits(c.env);

        return c.json({
            success: true,
            message: 'Cleanup executed successfully',
            result: {
                filesDeleted: fileCleanup.deleted,
                spaceFreed: fileCleanup.spaceFreed,
                rateLimitsCleaned: rateLimitCleanup
            }
        });
    } catch (error: any) {
        return c.json({ error: 'Failed to execute cleanup', details: error.message }, 500);
    }
});

export default storageAnalytics;
