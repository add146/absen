// Admin endpoint for viewing field worker visits - add to admin.ts after other admin routes

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
