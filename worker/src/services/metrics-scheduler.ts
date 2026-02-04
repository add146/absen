
import { Bindings } from '../index'

/**
 * Process daily metrics for all tenants
 * Should be scheduled to run daily (e.g., at 00:00 UTC)
 */
export async function processDailyMetrics(env: Bindings): Promise<void> {
    const today = new Date().toISOString().split('T')[0]
    console.log(`Starting daily metrics processing for ${today}`)

    // Get all active tenants
    const tenants = await env.DB.prepare(`
        SELECT id, slug FROM tenants WHERE status = 'active'
    `).all()

    const results = tenants.results || []
    console.log(`Found ${results.length} active tenants`)

    for (const tenant of results) {
        try {
            await recordTenantMetrics(tenant.id as string, env)
        } catch (error) {
            console.error(`Failed to record metrics for tenant ${tenant.slug}:`, error)
        }
    }

    console.log('Daily metrics processing completed')
}

/**
 * Record metrics for a single tenant
 */
async function recordTenantMetrics(tenantId: string, env: Bindings): Promise<void> {
    // 1. Calculate Active Users (users who have checked in at least once in the last 30 days)
    const activeUsers = await env.DB.prepare(`
        SELECT COUNT(DISTINCT user_id) as count 
        FROM attendances 
        WHERE tenant_id = ? 
        AND created_at >= datetime('now', '-30 days')
    `).bind(tenantId).first()

    // 2. Calculate Total Users
    const totalUsers = await env.DB.prepare(`
        SELECT COUNT(*) as count FROM users WHERE tenant_id = ? AND status = 'active'
    `).bind(tenantId).first()

    // 3. Calculate Daily Attendances (for the "previous" day effectively, or just accumulated queries)
    // If running at 00:00, we want metrics for the previous day.
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

    const dailyCheckins = await env.DB.prepare(`
        SELECT COUNT(*) as count 
        FROM attendances 
        WHERE tenant_id = ? 
        AND date(created_at) = ?
    `).bind(tenantId, yesterday).first()

    // 4. Calculate Storage Usage (Approximate based on file uploads or just placeholder if R2 stats not available)
    // For now we set 0 or implement query if 'files' table exists. 
    // Assuming no 'files' table tracking size explicitly in sql yet, we'll placeholder.
    const storageUsage = 0

    // Insert into tenant_usage_metrics
    // Ensure table exists (migration should have handled this, but for safety in logic)
    const metricId = crypto.randomUUID()

    await env.DB.prepare(`
        INSERT INTO tenant_usage_metrics (
            id, tenant_id, metric_date, active_users, total_users, 
            daily_checkins, storage_usage_bytes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
        metricId,
        tenantId,
        yesterday,
        activeUsers?.count || 0,
        totalUsers?.count || 0,
        dailyCheckins?.count || 0,
        storageUsage
    ).run()

    console.log(`Recorded metrics for tenant ${tenantId}: ${dailyCheckins?.count} checkins, ${totalUsers?.count} users`)
}
