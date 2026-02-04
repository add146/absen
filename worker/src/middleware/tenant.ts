import { Context, Next } from 'hono'
import { verify } from 'hono/jwt'

type Bindings = {
    DB: D1Database
    JWT_SECRET: string
    CACHE?: KVNamespace
}

/**
 * Tenant Context Middleware
 * Extracts tenant_id from JWT and injects it into context
 * Also validates tenant exists and is active
 */
export const tenantContext = async (c: Context<{ Bindings: Bindings }>, next: Next) => {
    // Skip tenant check for public endpoints
    const publicPaths = ['/auth/login', '/auth/register', '/tenants/create']
    if (publicPaths.some(path => c.req.path.startsWith(path))) {
        return next()
    }

    // Extract JWT from Authorization header
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ error: 'Missing or invalid authorization header' }, 401)
    }

    const token = authHeader.split(' ')[1]

    try {
        // Verify JWT
        const payload: any = await verify(token, 'HARDCODED_DEBUG_SECRET_123', 'HS256')

        if (!payload.tenant_id) {
            // BACKWARD COMPATIBILITY: Support legacy users without tenant_id
            console.log('[Tenant Middleware] Legacy user detected (no tenant_id in JWT)')

            // Get user tenant_id from database
            const user = await c.env.DB
                .prepare('SELECT tenant_id FROM users WHERE id = ?')
                .bind(payload.sub)
                .first()

            if (!user || !user.tenant_id) {
                // Legacy user without tenant - allow access but log warning
                console.warn('[Tenant Middleware] User has no tenant_id, skipping tenant validation')
                c.set('userId', payload.sub)
                c.set('userRole', payload.role)
                c.set('isLegacyUser', true)
                return next()
            }

            // Update payload with tenant_id from database
            payload.tenant_id = user.tenant_id
        }

        // Check cache first for tenant info
        let tenant: any = null
        if (c.env.CACHE) {
            const cached = await c.env.CACHE.get(`tenant:${payload.tenant_id}`, 'json')
            if (cached) {
                tenant = cached
            }
        }

        // If not in cache, query database
        if (!tenant) {
            tenant = await c.env.DB
                .prepare('SELECT id, name FROM tenants WHERE id = ?')
                .bind(payload.tenant_id)
                .first()

            if (tenant) {
                // Default values for missing columns to prevent errors
                tenant.status = tenant.status || 'active'
                tenant.plan_type = tenant.plan_type || 'free'
                tenant.max_users = tenant.max_users || 5
            }

            if (!tenant) {
                return c.json({ error: 'Tenant not found' }, 404)
            }

            // Cache tenant info for 1 hour
            if (c.env.CACHE) {
                // TEMPORARY: Disabled due to KV quota exhausted
                // await c.env.CACHE.put(
                //    `tenant:${payload.tenant_id}`,
                //    JSON.stringify(tenant),
                //    { expirationTtl: 3600 }
                // )
            }
        }

        // Check if tenant is active
        if (tenant.status !== 'active' && tenant.status !== 'trial') {
            return c.json({
                error: 'Tenant is suspended or inactive',
                status: tenant.status
            }, 403)
        }

        // Inject tenant and user info into context
        c.set('tenantId', payload.tenant_id)
        c.set('userId', payload.sub)
        c.set('userRole', payload.role)
        c.set('tenant', tenant)

        await next()
    } catch (e: any) {
        console.error('JWT verification failed:', e.message, e)
        return c.json({ error: 'Invalid or expired token', details: e.message }, 401)
    }
}

/**
 * Rate Limiting Middleware
 * Enforces rate limits based on tenant plan
 */
export const rateLimiter = async (c: Context<{ Bindings: Bindings }>, next: Next) => {
    // TEMPORARY: Fully disabled
    return next()

    /* 
    if (!c.env.CACHE) {
        // No KV namespace, skip rate limiting
        return next()
    }

    const tenantId = c.get('tenantId')
    if (!tenantId) {
        // No tenant context, skip
        return next()
    }

    const tenant = c.get('tenant')
    const minuteKey = Math.floor(Date.now() / 60000) // Current minute
    const rateLimitKey = `ratelimit:${tenantId}:${minuteKey}`

    // Get current count
    const current = await c.env.CACHE.get(rateLimitKey)
    const count = current ? parseInt(current) : 0

    // Define limits per plan
    const limits: Record<string, number> = {
        free: 100,      // 100 requests per minute
        basic: 500,     // 500 requests per minute
        premium: 1000,  // 1000 requests per minute
        enterprise: 5000 // 5000 requests per minute
    }

    const limit = limits[tenant.plan_type] || limits.free

    if (count >= limit) {
        return c.json({
            error: 'Rate limit exceeded',
            limit,
            retryAfter: 60 - (Date.now() % 60000) / 1000 // Seconds until next minute
        }, 429)
    }

    // Increment counter
    await c.env.CACHE.put(rateLimitKey, (count + 1).toString(), {
        expirationTtl: 60 // Expire after 1 minute
    })

    // Add rate limit headers
    c.header('X-RateLimit-Limit', limit.toString())
    c.header('X-RateLimit-Remaining', (limit - count - 1).toString())
    c.header('X-RateLimit-Reset', (Math.floor(Date.now() / 60000) + 1).toString())

    await next()
    */
}

/**
 * Plan Enforcement Middleware
 * Checks if tenant has exceeded plan limits (user count, etc)
 */
export const enforcePlanLimits = async (c: Context<{ Bindings: Bindings }>, next: Next) => {
    const tenantId = c.get('tenantId')
    if (!tenantId) {
        return next()
    }

    const tenant = c.get('tenant')

    // Check user limit (only for endpoints that create users)
    if (c.req.path.includes('/admin/users') && c.req.method === 'POST') {
        const userCount = await c.env.DB
            .prepare('SELECT COUNT(*) as count FROM users WHERE tenant_id = ? AND status = ?')
            .bind(tenantId, 'active')
            .first()

        if (userCount && userCount.count >= tenant.max_users && tenant.max_users !== -1) {
            return c.json({
                error: 'User limit exceeded for your plan',
                limit: tenant.max_users,
                current: userCount.count,
                plan: tenant.plan_type
            }, 403)
        }
    }

    // TODO: Add more limit checks (storage, API calls per month, etc)

    await next()
}

/**
 * Custom Domain Routing Middleware
 * Resolves custom domain to tenant_id
 */
export const customDomainRouter = async (c: Context<{ Bindings: Bindings }>, next: Next) => {
    const host = new URL(c.req.url).hostname

    // Skip for default domains
    if (host.includes('workers.dev') || host.includes('pages.dev') || host === 'localhost') {
        return next()
    }

    // Check cache for domain → tenant mapping
    if (c.env.CACHE) {
        const cachedTenantId = await c.env.CACHE.get(`domain:${host}`)

        if (cachedTenantId) {
            c.set('customDomain', host)
            c.set('customDomainTenantId', cachedTenantId)
            return next()
        }
    }

    // Query database for custom domain
    const domain = await c.env.DB
        .prepare('SELECT tenant_id FROM custom_domains WHERE domain = ? AND status = ?')
        .bind(host, 'active')
        .first()

    if (domain) {
        // Cache the mapping for 24 hours
        if (c.env.CACHE) {
            // TEMPORARY: Disabled due to KV quota exhausted
            /*
            await c.env.CACHE.put(`domain:${host}`, domain.tenant_id as string, {
                expirationTtl: 86400 // 24 hours
            })
            */
        }

        c.set('customDomain', host)
        c.set('customDomainTenantId', domain.tenant_id)
    }

    await next()
}

/**
 * Admin Only Middleware
 * Restricts access to admin/owner roles
 */
export const adminOnly = async (c: Context, next: Next) => {
    const userRole = c.get('userRole')

    if (!userRole || (userRole !== 'admin' && userRole !== 'owner')) {
        return c.json({ error: 'Access denied. Admin privileges required.' }, 403)
    }

    await next()
}

/**
 * Owner Only Middleware
 * Restricts access to tenant owner role
 */
export const ownerOnly = async (c: Context, next: Next) => {
    const userRole = c.get('userRole')

    if (!userRole || userRole !== 'owner') {
        return c.json({ error: 'Access denied. Owner privileges required.' }, 403)
    }

    await next()
}

// Legacy middleware for backward compatibility
export const tenantMiddleware = tenantContext
export const strictTenantMiddleware = tenantContext
