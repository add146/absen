import { Hono } from 'hono'
import { authMiddleware, adminAuthMiddleware } from '../middleware/auth'
import { hash } from 'bcryptjs'

type Bindings = {
    DB: D1Database
}

type Variables = {
    user: {
        sub: string
        role: string
        tenant_id: string
        exp: number
    }
}

const admin = new Hono<{ Bindings: Bindings, Variables: Variables }>()

// Apply middleware to all admin routes
admin.use('/*', authMiddleware, adminAuthMiddleware)

// GET /maps-config - Get Google Maps API Key
admin.get('/maps-config', async (c) => {
    // Fetch from Global Settings
    const key = await c.env.DB.prepare("SELECT setting_value FROM global_settings WHERE setting_key = 'google_maps_api_key'").first<{ setting_value: string }>();
    return c.json({ apiKey: key?.setting_value || '' });
})

// GET /users - List all users (with pagination and role filter)
admin.get('/users', async (c) => {
    const { page = '1', limit = '10', role } = c.req.query()
    const offset = (parseInt(page) - 1) * parseInt(limit)

    let query = 'SELECT id, email, name, role, status, is_field_worker, created_at FROM users'
    let params: any[] = []

    if (role) {
        query += ' WHERE role = ?'
        params.push(role)
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`
    params.push(parseInt(limit), offset)

    const { results } = await c.env.DB.prepare(query).bind(...params).all()

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM users'
    let countParams: any[] = []
    if (role) {
        countQuery += ' WHERE role = ?'
        countParams.push(role)
    }
    const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first()

    return c.json({
        data: results,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: countResult?.total || 0
        }
    })
})

// POST /users - Create new employee manually
admin.post('/users', async (c) => {
    const { email, name, password, role = 'employee', is_field_worker = 0 } = await c.req.json()
    const user = c.get('user')

    if (!email || !name || !password) {
        return c.json({ error: 'Missing required fields: email, name, password' }, 400)
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
        return c.json({ error: 'Invalid email format' }, 400)
    }

    // Check if email already exists
    const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
    if (existing) {
        return c.json({ error: 'Email already registered' }, 400)
    }

    // Hash password using bcrypt
    const hashedPassword = await hash(password, 10)

    const id = crypto.randomUUID()
    const tenant_id = user.tenant_id // Inherit tenant from admin

    await c.env.DB.prepare(
        'INSERT INTO users (id, tenant_id, email, password_hash, name, role, status, is_field_worker) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, tenant_id, email, hashedPassword, name, role, 'active', is_field_worker ? 1 : 0).run()

    return c.json({
        message: 'Employee created successfully',
        id,
        user: { id, email, name, role, status: 'active', created_at: new Date().toISOString() }
    })
})

// PUT /users/:id - Update user
admin.put('/users/:id', async (c) => {
    const id = c.req.param('id')
    const { email, name, password, role, status, is_field_worker } = await c.req.json()

    if (!email || !name) {
        return c.json({ error: 'Missing required fields' }, 400)
    }

    // Build update query
    let query = 'UPDATE users SET email = ?, name = ?, role = ?, status = ?, updated_at = CURRENT_TIMESTAMP'
    let params: any[] = [email, name, role || 'employee', status || 'active']

    // Update is_field_worker if provided
    if (is_field_worker !== undefined) {
        query += ', is_field_worker = ?'
        params.push(is_field_worker ? 1 : 0)
    }

    // Update password if provided
    if (password) {
        const hashedPassword = await hash(password, 10)
        query += ', password_hash = ?'
        params.push(hashedPassword)
    }

    query += ' WHERE id = ?'
    params.push(id)

    try {
        await c.env.DB.prepare(query).bind(...params).run()
        return c.json({ message: 'User updated successfully' })
    } catch (e: any) {
        return c.json({ error: 'Failed to update user', details: e.message }, 500)
    }
})

// DELETE /users/:id - Delete user
admin.delete('/users/:id', async (c) => {
    const id = c.req.param('id')
    try {
        await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run()
        return c.json({ message: 'User deleted successfully' })
    } catch (e: any) {
        console.error("Delete user error", e);
        // Constraint violation likely
        return c.json({ error: 'Failed to delete user. User might have attendance records.', details: e.message }, 500)
    }
})

// GET /locations - List all office locations
admin.get('/locations', async (c) => {
    const { results } = await c.env.DB.prepare('SELECT * FROM locations ORDER BY created_at DESC').all()
    return c.json({ data: results })
})

// POST /locations - Create or Update Location
admin.post('/locations', async (c) => {
    const { name, latitude, longitude, radius_meters = 100, polygon_coords, work_days = '[1,2,3,4,5]', start_time = '09:00', end_time = '17:00' } = await c.req.json()
    const user = c.get('user')
    const tenant_id = user.tenant_id // Provide tenant_id from admin user

    if (!name || !latitude || !longitude) {
        return c.json({ error: 'Missing required fields' }, 400)
    }

    const id = crypto.randomUUID()
    const polygonJson = polygon_coords ? JSON.stringify(polygon_coords) : null;
    const workDaysJson = typeof work_days === 'string' ? work_days : JSON.stringify(work_days);

    await c.env.DB.prepare(
        'INSERT INTO locations (id, tenant_id, name, latitude, longitude, radius_meters, polygon_coords, work_days, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, tenant_id, name, latitude, longitude, radius_meters, polygonJson, workDaysJson, start_time, end_time).run()

    return c.json({ message: 'Location created', id })
})

// PUT /locations/:id - Update location
admin.put('/locations/:id', async (c) => {
    const id = c.req.param('id')
    const { name, latitude, longitude, radius_meters = 100, polygon_coords, work_days, start_time, end_time, use_custom_points, custom_points } = await c.req.json()

    if (!name || !latitude || !longitude) {
        return c.json({ error: 'Missing required fields' }, 400)
    }

    const polygonJson = polygon_coords ? JSON.stringify(polygon_coords) : null;

    // Build update query dynamically to only update provided fields
    let query = 'UPDATE locations SET name = ?, latitude = ?, longitude = ?, radius_meters = ?, polygon_coords = ?'
    let params: any[] = [name, latitude, longitude, radius_meters, polygonJson]

    if (work_days !== undefined) {
        query += ', work_days = ?'
        params.push(typeof work_days === 'string' ? work_days : JSON.stringify(work_days))
    }

    if (start_time !== undefined) {
        query += ', start_time = ?'
        params.push(start_time)
    }

    if (end_time !== undefined) {
        query += ', end_time = ?'
        params.push(end_time)
    }

    if (use_custom_points !== undefined) {
        query += ', use_custom_points = ?'
        params.push(use_custom_points ? 1 : 0)
    }

    if (custom_points !== undefined) {
        query += ', custom_points = ?'
        params.push(custom_points)
    }

    query += ' WHERE id = ?'
    params.push(id)

    await c.env.DB.prepare(query).bind(...params).run()

    return c.json({ message: 'Location updated' })
})

// DELETE /locations/:id - Delete location
admin.delete('/locations/:id', async (c) => {
    const id = c.req.param('id')

    await c.env.DB.prepare('DELETE FROM locations WHERE id = ?').bind(id).run()

    return c.json({ message: 'Location deleted' })
})

// Route removed (consolidated with the main attendance handler below)



// GET /tenant-settings - Get current tenant settings
admin.get('/tenant-settings', async (c) => {
    const user = c.get('user')
    // Fetch settings from tenants table
    const tenant = await c.env.DB.prepare('SELECT settings FROM tenants WHERE id = ?').bind(user.tenant_id).first<{ settings: string }>()

    let settings = {}
    if (tenant?.settings) {
        try {
            settings = JSON.parse(tenant.settings)
        } catch (e) {
            console.error('Failed to parse settings', e)
        }
    }

    return c.json({ data: settings })
})

// PUT /tenant-settings - Update tenant settings
admin.put('/tenant-settings', async (c) => {
    const user = c.get('user')
    const newSettings = await c.req.json()

    // Fetch existing settings first to merge (optional, but good practice)
    const tenant = await c.env.DB.prepare('SELECT settings FROM tenants WHERE id = ?').bind(user.tenant_id).first<{ settings: string }>()
    let currentSettings = {}
    if (tenant?.settings) {
        try {
            currentSettings = JSON.parse(tenant.settings)
        } catch (e) { }
    }

    const updatedSettings = { ...currentSettings, ...newSettings }

    await c.env.DB.prepare('UPDATE tenants SET settings = ? WHERE id = ?')
        .bind(JSON.stringify(updatedSettings), user.tenant_id)
        .run()

    return c.json({ message: 'Settings updated successfully', data: updatedSettings })
})


// GET /stats - Dashboard Analytics
admin.get('/stats', async (c) => {
    // 1. Total Employees
    const totalUsers = await c.env.DB.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').bind('employee').first()

    // 2. Present Today
    const today = new Date().toISOString().split('T')[0]
    const presentToday = await c.env.DB.prepare(
        "SELECT COUNT(DISTINCT user_id) as count FROM attendances WHERE date(check_in_time) = ?"
    ).bind(today).first()

    // 3. Late Today (Assuming 9 AM is start time for now, or dynamic rule later)
    // Simple placeholder logic for late
    const lateToday = await c.env.DB.prepare(
        "SELECT COUNT(DISTINCT user_id) as count FROM attendances WHERE date(check_in_time) = ? AND strftime('%H:%M', check_in_time) > '09:00'"
    ).bind(today).first()

    return c.json({
        total_employees: totalUsers?.count || 0,
        present_today: presentToday?.count || 0,
        late_today: lateToday?.count || 0
    })
})

// GET /attendance - All attendance logs (Reports)
// GET /attendance - All attendance logs (Reports)
admin.get('/attendance', async (c) => {
    const { page = '1', limit = '10', user_id, start_date, end_date, format } = c.req.query()
    const user = c.get('user');

    // Base Check for CSV export
    const isCsv = format === 'csv';

    let query = `
        SELECT 
            id, 
            user_id, 
            location_id, 
            check_in_time, 
            check_out_time, 
            is_valid, 
            points_earned, 
            checkout_location_name,
            face_photo_url,
            'presence' as type,
            NULL as leave_type
        FROM attendances
        WHERE 1=1
    `
    let leaveQuery = `
        SELECT 
            id, 
            user_id, 
            NULL as location_id, 
            start_date || 'T00:00:00Z' as check_in_time, 
            end_date || 'T23:59:59Z' as check_out_time, 
            1 as is_valid, 
            0 as points_earned, 
            NULL as checkout_location_name,
            NULL as face_photo_url,
            'leave' as type,
            type as leave_type
        FROM leaves
        WHERE status = 'approved'
    `

    let params: any[] = []
    let leaveParams: any[] = []

    if (user_id) {
        query += ' AND user_id = ?'
        params.push(user_id)
        leaveQuery += ' AND user_id = ?'
        leaveParams.push(user_id)
    }

    if (start_date) {
        query += ' AND date(check_in_time) >= ?'
        params.push(start_date)
        leaveQuery += ' AND date(start_date) >= ?'
        leaveParams.push(start_date)
    }

    if (end_date) {
        query += ' AND date(check_in_time) <= ?'
        params.push(end_date)
        leaveQuery += ' AND date(end_date) <= ?'
        leaveParams.push(end_date)
    }

    // Combine queries - include location start_time for dynamic late calculation
    let fullQuery = `
        SELECT 
            combined_results.*, 
            u.name as user_name, 
            u.email as user_email, 
            l.name as location_name,
            l.start_time as location_start_time
        FROM (
            ${query}
            UNION ALL
            ${leaveQuery}
        ) combined_results
        LEFT JOIN users u ON combined_results.user_id = u.id
        LEFT JOIN locations l ON combined_results.location_id = l.id
        WHERE u.tenant_id = ?
        ORDER BY check_in_time DESC
    `

    // Combined params: normal params + leave params + tenant_id
    const allParams = [...params, ...leaveParams, user.tenant_id]

    if (!isCsv) {
        const offset = (parseInt(page) - 1) * parseInt(limit)
        fullQuery += ` LIMIT ? OFFSET ?`
        allParams.push(parseInt(limit), offset)
    }

    const { results } = await c.env.DB.prepare(fullQuery).bind(...allParams).all()

    // Post-process results to add is_late flag using location-specific start times
    const processedResults = results.map((row: any) => {
        let isLate = false;
        if (row.type === 'presence' && row.check_in_time) {
            try {
                // Get location-specific start time or default to 09:00
                const locationStartTime = row.location_start_time || '09:00';
                const [startHourStr, startMinuteStr] = locationStartTime.split(':');
                const startHour = parseInt(startHourStr);
                const startMinute = parseInt(startMinuteStr);

                // Ensure date string ends with Z if it doesn't already, to treat as UTC if SQL returns raw string
                let dateStr = row.check_in_time;
                if (!dateStr.endsWith('Z') && !dateStr.includes('+')) {
                    dateStr += 'Z';
                }
                const checkInDate = new Date(dateStr);

                // Convert to Asia/Jakarta time (WIB)
                const fmt = new Intl.DateTimeFormat('en-US', {
                    timeZone: 'Asia/Jakarta',
                    hour: 'numeric',
                    minute: 'numeric',
                    hour12: false
                });
                const parts = fmt.formatToParts(checkInDate);
                const hourPart = parts.find(p => p.type === 'hour');
                const minutePart = parts.find(p => p.type === 'minute');

                if (hourPart && minutePart) {
                    const h = parseInt(hourPart.value);
                    const m = parseInt(minutePart.value);
                    // Use location-specific start time
                    if (h > startHour || (h === startHour && m > startMinute)) {
                        isLate = true;
                    }
                }
            } catch (e) {
                console.error("Error calculating late status", e);
            }
        }
        return { ...row, is_late: isLate };
    });

    if (isCsv) {
        // Generate CSV string
        const headers = ['Type', 'User Name', 'Date', 'Time In', 'Time Out', 'Location/Type', 'Status'];
        const rows = processedResults.map((row: any) => {
            const date = new Date(row.check_in_time).toLocaleDateString();
            const timeIn = row.type === 'presence'
                ? new Date(row.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '-';
            const timeOut = row.type === 'presence' && row.check_out_time
                ? new Date(row.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '-';

            let status = 'Hadir';
            if (row.type === 'leave') status = `Cuti (${row.leave_type})`;
            else if (row.is_late) status = 'Terlambat';
            else if (!row.is_valid) status = 'Invalid';

            const location = row.type === 'presence' ? (row.location_name || 'Unknown') : row.leave_type;
            const checkoutLoc = row.checkout_location_name ? ` -> ${row.checkout_location_name}` : '';

            return [
                row.type === 'presence' ? 'Hadir' : 'Cuti',
                `"${row.user_name || 'N/A'}"`,
                date,
                timeIn,
                timeOut,
                `"${location}${checkoutLoc}"`,
                status
            ].join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\n');

        return new Response(csvContent, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="attendance_report_${new Date().toISOString().split('T')[0]}.csv"`
            }
        });
    }

    // JSON Response for UI

    // Count query requires similar union structure for accurate pagination
    let countQuery = `
        SELECT COUNT(*) as total FROM (
            ${query}
            UNION ALL
            ${leaveQuery}
        )
    `
    // Reuse params excluding limit/offset
    const countParams = [...params, ...leaveParams]

    const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first()

    return c.json({
        data: processedResults,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: countResult?.total || 0
        }
    })
})

// GET /admin/visits - Get all visit logs (admin only)
admin.get('/visits', async (c) => {
    const { page = '1', limit = '20', user_id, start_date, end_date, format } = c.req.query()
    const offset = (parseInt(page) - 1) * parseInt(limit)
    const user = c.get('user')

    let query = `
        SELECT v.*, u.name as user_name, u.email as user_email
        FROM visit_logs v
        JOIN users u ON v.user_id = u.id
        WHERE u.tenant_id = ?
    `
    let params: any[] = [user.tenant_id]

    if (user_id) {
        query += ' AND v.user_id = ?'
        params.push(user_id)
    }

    if (start_date) {
        query += ' AND date(v.visit_time) >= ?'
        params.push(start_date)
    }

    if (end_date) {
        query += ' AND date(v.visit_time) <= ?'
        params.push(end_date)
    }

    // CSV Export
    if (format === 'csv') {
        const { results } = await c.env.DB.prepare(query + ' ORDER BY v.visit_time DESC')
            .bind(...params)
            .all<any>()

        let csv = 'Employee Name,Email,Location,Visit Time,Notes\n'
        results.forEach((row: any) => {
            csv += `"${row.user_name}","${row.user_email}","${row.location_name || '-'}","${row.visit_time}","${row.notes || '-'}"\n`
        })

        return new Response(csv, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="field-worker-visits-${new Date().toISOString().split('T')[0]}.csv"`
            }
        })
    }

    query += ' ORDER BY v.visit_time DESC LIMIT ? OFFSET ?'
    params.push(parseInt(limit), offset)

    const { results } = await c.env.DB.prepare(query).bind(...params).all()

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM visit_logs v JOIN users u ON v.user_id = u.id WHERE u.tenant_id = ?'
    let countParams: any[] = [user.tenant_id]

    if (user_id) {
        countQuery += ' AND v.user_id = ?'
        countParams.push(user_id)
    }

    if (start_date) {
        countQuery += ' AND date(v.visit_time) >= ?'
        countParams.push(start_date)
    }

    if (end_date) {
        countQuery += ' AND date(v.visit_time) <= ?'
        countParams.push(end_date)
    }

    const count = await c.env.DB.prepare(countQuery).bind(...countParams).first<{ total: number }>()

    return c.json({
        data: results,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count?.total || 0
        }
    })
})

// GET /admin/reports/points-export - Export points ledger to CSV
admin.get('/reports/points-export', async (c) => {
    const { start_date, end_date, user_id } = c.req.query()
    const user = c.get('user')

    let query = `
        SELECT 
            pl.*,
            u.name as user_name,
            u.email as user_email
        FROM points_ledger pl
        JOIN users u ON pl.user_id = u.id
        WHERE u.tenant_id = ?
    `
    let params: any[] = [user.tenant_id]

    if (user_id) {
        query += ' AND pl.user_id = ?'
        params.push(user_id)
    }

    if (start_date) {
        query += ' AND date(pl.created_at) >= ?'
        params.push(start_date)
    }

    if (end_date) {
        query += ' AND date(pl.created_at) <= ?'
        params.push(end_date)
    }

    query += ' ORDER BY pl.created_at DESC'

    const { results } = await c.env.DB.prepare(query).bind(...params).all<any>()

    // Generate CSV
    let csv = 'User Name,Email,Transaction Type,Amount,Description,Balance After,Date\n'
    results.forEach((row: any) => {
        const date = new Date(row.created_at).toLocaleString()
        const amount = row.transaction_type === 'redeem' ? `-${row.amount}` : `+${row.amount}`
        csv += `"${row.user_name}","${row.user_email}","${row.transaction_type}","${amount}","${row.description || '-'}","${row.balance_after}","${date}"\n`
    })

    return new Response(csv, {
        headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="points_ledger_${new Date().toISOString().split('T')[0]}.csv"`
        }
    })
})

// GET /subscriptions/invoices - Get tenant invoice history
admin.get('/subscriptions/invoices', async (c) => {
    const user = c.get('user')
    const { format } = c.req.query()

    const { results } = await c.env.DB.prepare(
        'SELECT * FROM invoices WHERE tenant_id = ? ORDER BY created_at DESC'
    ).bind(user.tenant_id).all<any>()

    // CSV Export
    if (format === 'csv') {
        let csv = 'Invoice ID,Invoice Number,Amount Due,Amount Paid,Status,Due Date,Paid At,Created At\n'
        results.forEach((row: any) => {
            const invoiceNum = row.invoice_number || row.id.substring(0, 8).toUpperCase()
            const dueDate = row.due_date ? new Date(row.due_date).toLocaleDateString() : '-'
            const paidAt = row.paid_at ? new Date(row.paid_at).toLocaleDateString() : '-'
            const createdAt = new Date(row.created_at).toLocaleDateString()

            csv += `"${row.id}","${invoiceNum}","${row.amount_due}","${row.amount_paid}","${row.status}","${dueDate}","${paidAt}","${createdAt}"\n`
        })

        return new Response(csv, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="invoices_${new Date().toISOString().split('T')[0]}.csv"`
            }
        })
    }

    return c.json({ invoices: results })
})


export default admin
