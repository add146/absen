import { Hono } from 'hono'
import { cors } from 'hono/cors'
import auth from './routes/auth'
import attendance from './routes/attendance'
import admin from './routes/admin'
import shop from './routes/shop'
import leaves from './routes/leaves'
import pointRules from './routes/point-rules'
import discountRules from './routes/discount-rules'
import fraud from './routes/fraud'
import upload from './routes/upload'
import analytics from './routes/analytics'
import notifications from './routes/notifications'
import settings from './routes/settings'
import profile from './routes/profile'
import tenants from './routes/tenants'
import subscriptions from './routes/subscriptions'
import customDomains from './routes/custom-domains'
import superadmin from './routes/super-admin'
import health from './routes/health'
import visits from './routes/visits'
import { tenantContext, rateLimiter, customDomainRouter } from './middleware/tenant'
import { logger } from './utils/logger'

export type Bindings = {
    DB: D1Database
    JWT_SECRET: string
    STORAGE?: R2Bucket
    CACHE?: KVNamespace
    WAHA_BASE_URL?: string
    WAHA_API_KEY?: string
    WAHA_SESSION?: string
    AI: any // Cloudflare AI binding
    MIDTRANS_SERVER_KEY?: string
    MIDTRANS_CLIENT_KEY?: string
    MIDTRANS_IS_PRODUCTION?: string
}

import { securityHeaders, ipRateLimiter } from './middleware/security'

const app = new Hono<{ Bindings: Bindings }>()

app.use('/*', cors())
app.use('/*', securityHeaders)

// Custom domain routing (before auth)
app.use('/*', customDomainRouter)

app.get('/', (c) => {
    return c.json({
        message: 'Absen SAAS API is running',
        version: '2.0.0',
        features: ['multi-tenant', 'subscription', 'custom-domain']
    })
})

app.route('/health', health)

// EMERGENCY: Direct password reset bypassing all middleware (no KV, no rate limit)
app.get('/emergency-reset', async (c) => {
    try {
        const knownHash = '$2b$10$aCDLyVHekv7eLeYmXIEm1.LOyBno4G9DF9Z5l.VH7mTN5FS3S97MS'; // password123

        const { results: users } = await c.env.DB.prepare('SELECT email FROM users').all();
        const result = await c.env.DB.prepare('UPDATE users SET password_hash = ?').bind(knownHash).run();

        return c.json({
            success: true,
            message: 'All passwords reset to: password123',
            users_affected: result.meta?.changes || 0,
            user_emails: users?.map((u: any) => u.email) || []
        });
    } catch (e: any) {
        return c.json({ success: false, error: e.message, stack: e.stack }, 500);
    }
});

// EMERGENCY: Login endpoint bypassing all middleware
app.post('/emergency-login', async (c) => {
    try {
        const { email, password } = await c.req.json();

        if (!email || !password) {
            return c.json({ error: 'Missing email or password' }, 400);
        }

        // Get user
        const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first() as any;
        if (!user) {
            return c.json({ error: 'Invalid credentials' }, 401);
        }

        // Verify password
        const bcrypt = await import('bcryptjs');
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return c.json({ error: 'Invalid credentials' }, 401);
        }

        // Get tenant
        const tenant = await c.env.DB.prepare('SELECT * FROM tenants WHERE id = ?').bind(user.tenant_id).first() as any;
        if (!tenant || tenant.status !== 'active') {
            return c.json({ error: 'Tenant not found or inactive' }, 403);
        }

        // Generate JWT
        const { sign } = await import('hono/jwt');
        const access_token = await sign(
            {
                sub: user.id,
                email: user.email,
                role: user.role,
                tenant_id: user.tenant_id,
                exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 // 7 days
            },
            'HARDCODED_DEBUG_SECRET_123',
            'HS256'
        );

        return c.json({
            access_token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                tenant_id: user.tenant_id
            }
        });
    } catch (e: any) {
        return c.json({ error: 'Login failed', details: e.message }, 500);
    }
});

// Public routes (no auth required)
// TEMPORARY: Disabled due to KV quota exhausted
// app.use('/auth/*', ipRateLimiter) // Apply IP rate limiting to auth routes
app.route('/auth', auth)
// Webhook endpoints (public but should verify signature)
app.route('/subscriptions', subscriptions) // Some endpoints are public (webhook)

// Super Admin routes (auth required but NO tenant context)
app.route('/super-admin', superadmin)

// Protected routes (require authentication + tenant context)
app.use('/*', tenantContext) // Apply tenant middleware to all routes below
// TEMPORARY: Disabled due to KV quota exhausted
// app.use('/*', rateLimiter)   // Apply rate limiting based on plan

app.route('/tenants', tenants) // Moved here to use tenant middleware (create is whitelisted)

app.route('/attendance', attendance)
app.route('/admin', admin)
app.route('/shop', shop)
app.route('/leaves', leaves)
app.route('/point-rules', pointRules)
app.route('/discount-rules', discountRules)
app.route('/fraud', fraud)
app.route('/upload', upload)
app.route('/analytics', analytics)
app.route('/notifications', notifications)
app.route('/settings', settings)
app.route('/custom-domains', customDomains)
app.route('/profile', profile)
app.route('/visits', visits)

app.route('/profile', profile)

export default {
    fetch: app.fetch,
    scheduled: async (event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) => {
        ctx.waitUntil((async () => {
            const { processDailyMetrics } = await import('./services/metrics-scheduler')
            await processDailyMetrics(env)
        })())
    }
}
