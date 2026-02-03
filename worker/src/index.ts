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
import { tenantContext, rateLimiter, customDomainRouter } from './middleware/tenant'

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

const app = new Hono<{ Bindings: Bindings }>()

app.use('/*', cors())

// Custom domain routing (before auth)
app.use('/*', customDomainRouter)

app.get('/', (c) => {
    return c.json({
        message: 'Absen SAAS API is running',
        version: '2.0.0',
        features: ['multi-tenant', 'subscription', 'custom-domain']
    })
})

// Public routes (no auth required)
app.route('/auth', auth)
// Webhook endpoints (public but should verify signature)
app.route('/subscriptions', subscriptions) // Some endpoints are public (webhook)

// Super Admin routes (auth required but NO tenant context)
app.route('/super-admin', superadmin)

// Protected routes (require authentication + tenant context)
app.use('/*', tenantContext) // Apply tenant middleware to all routes below
app.use('/*', rateLimiter)   // Apply rate limiting based on plan

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

export default app
