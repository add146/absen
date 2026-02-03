import { Hono } from 'hono'
import { authMiddleware, adminAuthMiddleware } from '../middleware/auth'

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

// GET /users - List all users (with pagination and role filter)
admin.get('/users', async (c) => {
    const { page = '1', limit = '10', role } = c.req.query()
    const offset = (parseInt(page) - 1) * parseInt(limit)

    let query = 'SELECT id, email, name, role, status, created_at FROM users'
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
    const { email, name, password, role = 'employee' } = await c.req.json()
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

    // Hash password using Web Crypto API (SHA-256)
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const hash = await crypto.subtle.digest('SHA-256', data)
    const hashedPassword = Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')

    const id = crypto.randomUUID()
    const tenant_id = user.tenant_id // Inherit tenant from admin

    await c.env.DB.prepare(
        'INSERT INTO users (id, tenant_id, email, password_hash, name, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, tenant_id, email, hashedPassword, name, role, 'active').run()

    return c.json({
        message: 'Employee created successfully',
        id,
        user: { id, email, name, role, status: 'active', created_at: new Date().toISOString() }
    })
})

// GET /locations - List all office locations
admin.get('/locations', async (c) => {
    const { results } = await c.env.DB.prepare('SELECT * FROM locations ORDER BY created_at DESC').all()
    return c.json({ data: results })
})

// POST /locations - Create or Update Location
admin.post('/locations', async (c) => {
    const { name, latitude, longitude, radius_meters = 100 } = await c.req.json()
    const user = c.get('user')
    const tenant_id = user.tenant_id // Provide tenant_id from admin user

    if (!name || !latitude || !longitude) {
        return c.json({ error: 'Missing required fields' }, 400)
    }

    const id = crypto.randomUUID()
    await c.env.DB.prepare(
        'INSERT INTO locations (id, tenant_id, name, latitude, longitude, radius_meters) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(id, tenant_id, name, latitude, longitude, radius_meters).run()

    return c.json({ message: 'Location created', id })
})

// PUT /locations/:id - Update location
admin.put('/locations/:id', async (c) => {
    const id = c.req.param('id')
    const { name, latitude, longitude, radius_meters = 100 } = await c.req.json()

    if (!name || !latitude || !longitude) {
        return c.json({ error: 'Missing required fields' }, 400)
    }

    await c.env.DB.prepare(
        'UPDATE locations SET name = ?, latitude = ?, longitude = ?, radius_meters = ? WHERE id = ?'
    ).bind(name, latitude, longitude, radius_meters, id).run()

    return c.json({ message: 'Location updated' })
})

// DELETE /locations/:id - Delete location
admin.delete('/locations/:id', async (c) => {
    const id = c.req.param('id')

    await c.env.DB.prepare('DELETE FROM locations WHERE id = ?').bind(id).run()

    return c.json({ message: 'Location deleted' })
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
admin.get('/attendance', async (c) => {
    const { page = '1', limit = '10', user_id, start_date, end_date } = c.req.query()
    const offset = (parseInt(page) - 1) * parseInt(limit)

    let query = `
        SELECT a.*, u.name as user_name, l.name as location_name 
        FROM attendances a
        LEFT JOIN users u ON a.user_id = u.id
        LEFT JOIN locations l ON a.location_id = l.id
        WHERE 1=1
    `
    let params: any[] = []

    if (user_id) {
        query += ' AND a.user_id = ?'
        params.push(user_id)
    }

    if (start_date) {
        query += ' AND date(a.check_in_time) >= ?'
        params.push(start_date)
    }

    if (end_date) {
        query += ' AND date(a.check_in_time) <= ?'
        params.push(end_date)
    }

    query += ` ORDER BY a.check_in_time DESC LIMIT ? OFFSET ?`
    params.push(parseInt(limit), offset)

    const { results } = await c.env.DB.prepare(query).bind(...params).all()

    // Count query for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM attendances a WHERE 1=1'
    let countParams: any[] = []

    if (user_id) { countQuery += ' AND a.user_id = ?'; countParams.push(user_id) }
    if (start_date) { countQuery += ' AND date(a.check_in_time) >= ?'; countParams.push(start_date) }
    if (end_date) { countQuery += ' AND date(a.check_in_time) <= ?'; countParams.push(end_date) }

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



export default admin
