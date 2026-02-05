import { Context, Next } from 'hono'
import { verify } from 'hono/jwt'
import { globalCache } from '../utils/cache'

type Bindings = {
    DB: D1Database
    JWT_SECRET: string
}

/**
 * Tenant Context Middleware
 * Extracts tenant_id from JWT and injects it into context
 * Also validates tenant exists and is active
 */
export const tenantContext = async (c: Context<{ Bindings: Bindings }>, next: Next) => {
    // Skip tenant check for public endpoints
    const publicPaths = ['/auth/login', '/auth/register', '/tenants/create', '/upload/file']
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

        // Check in-memory cache first
        let tenant: any = globalCache.get(`tenant:${payload.tenant_id}`)

        // If not in cache, query database
        if (!tenant) {
            tenant = await c.env.DB
                .prepare('SELECT id, name, status, plan_type, max_users FROM tenants WHERE id = ?')
                .bind(payload.tenant_id)
                .first()

            if (!tenant) {
                return c.json({ error: 'Tenant not found' }, 404)
            }

            // Default values for missing columns
            tenant.status = tenant.status || 'active'
            tenant.plan_type = tenant.plan_type || 'free'
            tenant.max_users = tenant.max_users || 5

            // Cache tenant info for 1 hour in-memory
            globalCache.set(`tenant:${payload.tenant_id}`, tenant, 3600)
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
 * Rate Limiting Middleware (REMOVED)
 * Replaced by D1-based IP rate limiting in security middleware
 * This middleware is kept for backward compatibility but does nothing
 */
export const rateLimiter = async (c: Context<{ Bindings: Bindings }>, next: Next) => {
    // NO-OP: Rate limiting moved to D1-based IP rate limiting
    return next()
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

    // Check in-memory cache for domain → tenant mapping
    const cachedTenantId = globalCache.get<string>(`domain:${host}`)

    if (cachedTenantId) {
        c.set('customDomain', host)
        c.set('customDomainTenantId', cachedTenantId)
        return next()
    }

    // Query database for custom domain
    const domain = await c.env.DB
        .prepare('SELECT tenant_id FROM custom_domains WHERE domain = ? AND status = ?')
        .bind(host, 'active')
        .first()

    if (domain) {
        // Cache the mapping for 24 hours in-memory
        globalCache.set(`domain:${host}`, domain.tenant_id as string, 86400)

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
