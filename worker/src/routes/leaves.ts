import { Hono } from 'hono';
import { Bindings } from '../index';
import { authMiddleware, adminAuthMiddleware } from '../middleware/auth';

type Variables = {
    user: {
        sub: string;
        role: string;
        tenant_id?: string;
    }
}

const app = new Hono<{ Bindings: Bindings, Variables: Variables }>();

// Helper: Calculate days between dates
function calculateDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end
}

// Helper: Check for overlapping leaves
async function checkOverlap(db: any, userId: string, startDate: string, endDate: string, excludeId?: string): Promise<boolean> {
    let query = `
        SELECT COUNT(*) as count FROM leaves 
        WHERE user_id = ? 
        AND status != 'rejected'
        AND (
            (start_date <= ? AND end_date >= ?)
            OR (start_date <= ? AND end_date >= ?)
            OR (start_date >= ? AND end_date <= ?)
        )
    `;
    const params = [userId, startDate, startDate, endDate, endDate, startDate, endDate];

    if (excludeId) {
        query += ' AND id != ?';
        params.push(excludeId);
    }

    const result = await db.prepare(query).bind(...params).first() as any;
    return result.count > 0;
}

// Get Leave Types
app.get('/types', authMiddleware, async (c) => {
    const user = c.get('user');
    try {
        const { results } = await c.env.DB.prepare(
            "SELECT * FROM leave_types WHERE tenant_id = ? AND is_active = 1 ORDER BY name"
        ).bind(user.tenant_id || 'default').all();

        return c.json({ success: true, data: results });
    } catch (error) {
        return c.json({ success: false, error: 'Failed to fetch leave types' }, 500);
    }
});

// Get My Leave Balance
app.get('/balance', authMiddleware, async (c) => {
    const user = c.get('user');
    const currentYear = new Date().getFullYear();

    try {
        const { results } = await c.env.DB.prepare(`
            SELECT 
                lb.*,
                lt.name as type_name,
                lt.code as type_code,
                lt.color as type_color
            FROM leave_balances lb
            JOIN leave_types lt ON lb.leave_type_id = lt.id
            WHERE lb.user_id = ? AND lb.year = ?
            ORDER BY lt.name
        `).bind(user.sub, currentYear).all();

        // If no balance exists, initialize from leave types
        if (!results || results.length === 0) {
            // Get leave types
            const { results: types } = await c.env.DB.prepare(
                "SELECT * FROM leave_types WHERE tenant_id = ? AND is_active = 1"
            ).bind(user.tenant_id || 'default').all() as any;

            // Create balances
            const balances = [];
            for (const type of types) {
                const balanceId = crypto.randomUUID();
                await c.env.DB.prepare(`
                    INSERT INTO leave_balances (id, user_id, leave_type_id, year, total_days, used_days, remaining_days)
                    VALUES (?, ?, ?, ?, ?, 0, ?)
                `).bind(balanceId, user.sub, type.id, currentYear, type.max_days_per_year, type.max_days_per_year).run();

                balances.push({
                    id: balanceId,
                    user_id: user.sub,
                    leave_type_id: type.id,
                    year: currentYear,
                    total_days: type.max_days_per_year,
                    used_days: 0,
                    remaining_days: type.max_days_per_year,
                    type_name: type.name,
                    type_code: type.code,
                    type_color: type.color
                });
            }
            return c.json({ success: true, data: balances });
        }

        return c.json({ success: true, data: results });
    } catch (error) {
        console.error('Get balance error:', error);
        return c.json({ success: false, error: 'Failed to fetch balance' }, 500);
    }
});

// Get My Leaves
app.get('/', authMiddleware, async (c) => {
    const user = c.get('user');
    try {
        const { results } = await c.env.DB.prepare(`
            SELECT 
                l.*,
                lt.name as type_name,
                lt.code as type_code,
                lt.color as type_color
            FROM leaves l
            LEFT JOIN leave_types lt ON l.leave_type_id = lt.id
            WHERE l.user_id = ? 
            ORDER BY l.created_at DESC
        `).bind(user.sub).all();

        return c.json({ success: true, data: results });
    } catch (error) {
        return c.json({ success: false, error: 'Failed to fetch leaves' }, 500);
    }
});

// Request Leave
app.post('/', authMiddleware, async (c) => {
    const user = c.get('user');
    const { leave_type_id, start_date, end_date, reason } = await c.req.json();

    if (!leave_type_id || !start_date || !end_date) {
        return c.json({ error: 'Missing required fields' }, 400);
    }

    try {
        // Calculate days
        const totalDays = calculateDays(start_date, end_date);

        // Check for overlapping leaves
        const hasOverlap = await checkOverlap(c.env.DB, user.sub, start_date, end_date);
        if (hasOverlap) {
            return c.json({
                success: false,
                error: 'Leave dates overlap with existing leave request',
                code: 'OVERLAP_ERROR'
            }, 400);
        }

        // Check balance
        const currentYear = new Date(start_date).getFullYear();
        let balance = await c.env.DB.prepare(`
            SELECT * FROM leave_balances 
            WHERE user_id = ? AND leave_type_id = ? AND year = ?
        `).bind(user.sub, leave_type_id, currentYear).first() as any;

        if (!balance) {
            // Try to initialize balance dynamically if not exists (lazy initialization)
            const typeInfo = await c.env.DB.prepare(
                "SELECT * FROM leave_types WHERE id = ?"
            ).bind(leave_type_id).first() as any;

            if (typeInfo) {
                const balanceId = crypto.randomUUID();
                await c.env.DB.prepare(`
                    INSERT INTO leave_balances (id, user_id, leave_type_id, year, total_days, used_days, remaining_days)
                    VALUES (?, ?, ?, ?, ?, 0, ?)
                `).bind(balanceId, user.sub, typeInfo.id, currentYear, typeInfo.max_days_per_year, typeInfo.max_days_per_year).run();

                // Re-fetch balance
                balance = {
                    id: balanceId,
                    remaining_days: typeInfo.max_days_per_year
                };
            } else {
                return c.json({
                    success: false,
                    error: 'Leave type not found or inactive.',
                    code: 'INVALID_TYPE'
                }, 400);
            }
        }

        if (balance.remaining_days < totalDays) {
            return c.json({
                success: false,
                error: `Insufficient leave balance. You have ${balance.remaining_days} days remaining but requested ${totalDays} days.`,
                code: 'INSUFFICIENT_BALANCE'
            }, 400);
        }

        // Get leave type code for 'type' column (backward compatibility/constraint)
        const leaveType = await c.env.DB.prepare(
            "SELECT code FROM leave_types WHERE id = ?"
        ).bind(leave_type_id).first() as any;

        const typeCode = leaveType ? leaveType.code.toLowerCase() : 'other';

        // Create leave request
        const id = crypto.randomUUID();
        await c.env.DB.prepare(
            "INSERT INTO leaves (id, user_id, leave_type_id, type, start_date, end_date, reason, total_days, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')"
        ).bind(id, user.sub, leave_type_id, typeCode, start_date, end_date, reason || null, totalDays).run();

        console.log(`[LEAVE] Created: ${id} for user ${user.sub}, ${totalDays} days`);

        return c.json({
            success: true,
            message: 'Leave request submitted successfully',
            id,
            total_days: totalDays
        });
    } catch (error: any) {
        console.error('Leave request error:', error);
        return c.json({
            success: false,
            error: `Failed to submit leave request: ${error.message || error.toString()}`
        }, 500);
    }
});

// Admin: Get All Leaves (with filters)
app.get('/admin/all', authMiddleware, adminAuthMiddleware, async (c) => {
    const status = c.req.query('status');
    const userId = c.req.query('user_id');

    try {
        let query = `
            SELECT 
                l.*,
                u.name as user_name,
                u.email as user_email,
                lt.name as type_name,
                lt.code as type_code,
                lt.color as type_color
            FROM leaves l
            JOIN users u ON l.user_id = u.id
            LEFT JOIN leave_types lt ON l.leave_type_id = lt.id
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            query += ' AND l.status = ?';
            params.push(status);
        }

        if (userId) {
            query += ' AND l.user_id = ?';
            params.push(userId);
        }

        query += ' ORDER BY l.created_at DESC';

        const { results } = await c.env.DB.prepare(query).bind(...params).all();
        return c.json({ success: true, data: results });
    } catch (error) {
        return c.json({ success: false, error: 'Failed to fetch leaves' }, 500);
    }
});

// Admin: Get Pending Leaves
app.get('/pending', authMiddleware, adminAuthMiddleware, async (c) => {
    try {
        const { results } = await c.env.DB.prepare(`
            SELECT 
                l.*, 
                u.name as user_name, 
                u.email as user_email,
                lt.name as type_name,
                lt.code as type_code,
                lt.color as type_color
            FROM leaves l
            JOIN users u ON l.user_id = u.id
            LEFT JOIN leave_types lt ON l.leave_type_id = lt.id
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
        // Get leave details with user and type info
        const leave = await c.env.DB.prepare(`
            SELECT 
                l.*,
                u.name as user_name,
                lt.name as type_name
            FROM leaves l
            JOIN users u ON l.user_id = u.id
            LEFT JOIN leave_types lt ON l.leave_type_id = lt.id
            WHERE l.id = ?
        `).bind(id).first() as any;

        if (!leave) {
            return c.json({ error: 'Leave request not found' }, 404);
        }

        // Update leave status
        await c.env.DB.prepare(
            "UPDATE leaves SET status = ?, rejection_reason = ?, updated_at = unixepoch() WHERE id = ?"
        ).bind(status, rejection_reason || null, id).run();

        // If approved, update balance
        if (status === 'approved' && leave.leave_type_id) {
            const year = new Date(leave.start_date).getFullYear();

            await c.env.DB.prepare(`
                UPDATE leave_balances 
                SET used_days = used_days + ?,
                    remaining_days = remaining_days - ?,
                    updated_at = unixepoch()
                WHERE user_id = ? AND leave_type_id = ? AND year = ?
            `).bind(leave.total_days || 1, leave.total_days || 1, leave.user_id, leave.leave_type_id, year).run();

            console.log(`[LEAVE] Approved: ${id}, deducted ${leave.total_days} days`);
        }

        // Send WhatsApp notification via WAHA
        try {
            const { NotificationService } = await import('../services/notification-service');
            const notificationService = new NotificationService(c.env);

            const notificationType = status === 'approved' ? 'leave_approved' : 'leave_rejected';

            await notificationService.send({
                userId: leave.user_id,
                type: notificationType,
                data: {
                    userName: leave.user_name,
                    dates: `${leave.start_date} - ${leave.end_date}`,
                    leaveType: leave.type_name,
                    days: leave.total_days,
                    reason: rejection_reason
                }
            });

            console.log(`[NOTIFICATION] Sent ${notificationType} to user ${leave.user_id}`);
        } catch (notifError) {
            console.error('[NOTIFICATION] Failed to send:', notifError);
            // Don't fail the request if notification fails
        }

        return c.json({ success: true, message: `Leave ${status}` });
    } catch (error) {
        console.error('Update status error:', error);
        return c.json({ success: false, error: 'Failed to update leave status' }, 500);
    }
});

// Admin: Leave Statistics
app.get('/admin/stats', authMiddleware, adminAuthMiddleware, async (c) => {
    try {
        const currentYear = new Date().getFullYear();

        const totalPending = await c.env.DB.prepare(
            "SELECT COUNT(*) as count FROM leaves WHERE status = 'pending'"
        ).first() as any;

        const totalApproved = await c.env.DB.prepare(
            "SELECT COUNT(*) as count FROM leaves WHERE status = 'approved' AND strftime('%Y', start_date) = ?"
        ).bind(currentYear.toString()).first() as any;

        const totalRejected = await c.env.DB.prepare(
            "SELECT COUNT(*) as count FROM leaves WHERE status = 'rejected' AND strftime('%Y', start_date) = ?"
        ).bind(currentYear.toString()).first() as any;

        const totalDaysUsed = await c.env.DB.prepare(
            "SELECT SUM(total_days) as total FROM leaves WHERE status = 'approved' AND strftime('%Y', start_date) = ?"
        ).bind(currentYear.toString()).first() as any;

        return c.json({
            success: true,
            data: {
                pending: totalPending.count || 0,
                approved: totalApproved.count || 0,
                rejected: totalRejected.count || 0,
                total_days_used: totalDaysUsed.total || 0
            }
        });
    } catch (error) {
        console.error('Stats error:', error);
        return c.json({ success: false, error: 'Failed to fetch statistics' }, 500);
    }
});

// Admin: Manage Leave Types
app.get('/admin/types', authMiddleware, adminAuthMiddleware, async (c) => {
    const tenantId = c.get('user').tenant_id || 'default';

    try {
        const { results } = await c.env.DB.prepare(
            "SELECT * FROM leave_types WHERE tenant_id = ? ORDER BY name"
        ).bind(tenantId).all();

        return c.json({ success: true, data: results });
    } catch (error) {
        return c.json({ success: false, error: 'Failed to fetch leave types' }, 500);
    }
});

app.post('/admin/types', authMiddleware, adminAuthMiddleware, async (c) => {
    const tenantId = c.get('user').tenant_id || 'default';
    const { name, code, max_days_per_year, requires_approval, color, description } = await c.req.json();

    if (!name || !code || !max_days_per_year) {
        return c.json({ error: 'Missing required fields' }, 400);
    }

    try {
        const id = crypto.randomUUID();
        await c.env.DB.prepare(`
            INSERT INTO leave_types (id, tenant_id, name, code, max_days_per_year, requires_approval, color, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            id,
            tenantId,
            name,
            code,
            max_days_per_year,
            requires_approval ? 1 : 0,
            color || '#3b82f6',
            description || null
        ).run();

        return c.json({ success: true, message: 'Leave type created', id });
    } catch (error) {
        console.error('Create leave type error:', error);
        return c.json({ success: false, error: 'Failed to create leave type' }, 500);
    }
});

app.put('/admin/types/:id', authMiddleware, adminAuthMiddleware, async (c) => {
    const { id } = c.req.param();
    const body = await c.req.json();

    const updates: string[] = [];
    const values: any[] = [];

    if (body.name !== undefined) {
        updates.push('name = ?');
        values.push(body.name);
    }
    if (body.max_days_per_year !== undefined) {
        updates.push('max_days_per_year = ?');
        values.push(body.max_days_per_year);
    }
    if (body.color !== undefined) {
        updates.push('color = ?');
        values.push(body.color);
    }
    if (body.description !== undefined) {
        updates.push('description = ?');
        values.push(body.description);
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
            `UPDATE leave_types SET ${updates.join(', ')} WHERE id = ?`
        ).bind(...values).run();

        return c.json({ success: true, message: 'Leave type updated' });
    } catch (error) {
        return c.json({ success: false, error: 'Failed to update leave type' }, 500);
    }
});

export default app;
