/**
 * Subscription Routes
 * API endpoints for subscription management and billing
 */

import { Hono } from 'hono'
import {
    getSubscriptionPlans,
    getCurrentSubscription,
    createCheckoutSession,
    processPaymentWebhook,
    cancelSubscription,
    getInvoices
} from '../services/billing-service'
import { ownerOnly } from '../middleware/tenant'

type Bindings = {
    DB: D1Database
    JWT_SECRET: string
    CACHE?: KVNamespace
    MIDTRANS_SERVER_KEY?: string
    MIDTRANS_CLIENT_KEY?: string
    MIDTRANS_IS_PRODUCTION?: string
}

const subscriptions = new Hono<{ Bindings: Bindings }>()

/**
 * GET /subscriptions/plans
 * Get all available subscription plans
 */
subscriptions.get('/plans', async (c) => {
    const plans = await getSubscriptionPlans(c.env)

    return c.json({
        plans: plans.map(plan => ({
            id: plan.id,
            name: plan.name,
            slug: plan.slug,
            price: plan.price,
            interval: plan.interval,
            features: plan.features,
            recommended: plan.slug === 'premium' // Mark Premium as recommended
        }))
    })
})

/**
 * GET /subscriptions/current
 * Get current subscription for logged-in tenant
 */
subscriptions.get('/current', async (c) => {
    const tenantId = c.get('tenantId')

    const subscription = await getCurrentSubscription(tenantId, c.env)

    if (!subscription) {
        return c.json({ message: 'No active subscription found' }, 404)
    }

    return c.json({ subscription })
})

/**
 * POST /subscriptions/checkout
 * Create checkout session for plan purchase
 */
subscriptions.post('/checkout', ownerOnly, async (c) => {
    const tenantId = c.get('tenantId')
    const { planSlug } = await c.req.json()

    if (!planSlug) {
        return c.json({ error: 'Plan slug is required' }, 400)
    }

    try {
        const { token, redirectUrl, invoiceId } = await createCheckoutSession(
            tenantId,
            planSlug,
            c.env
        )

        return c.json({
            message: 'Checkout session created',
            token,
            redirectUrl,
            invoiceId,
            clientKey: c.env.MIDTRANS_CLIENT_KEY
        })
    } catch (e: any) {
        console.error('Checkout error:', e)
        return c.json({ error: 'Failed to create checkout', details: e.message }, 500)
    }
})

/**
 * POST /subscriptions/webhook
 * Handle payment webhook from Midtrans (public endpoint)
 */
subscriptions.post('/webhook', async (c) => {
    try {
        const notification = await c.req.json()

        console.log('Payment webhook received:', notification)

        // TODO: Verify signature from Midtrans
        // const serverKey = c.env.MIDTRANS_SERVER_KEY || ''
        // const isValid = verifySignature(...)
        // if (!isValid) return c.json({ error: 'Invalid signature' }, 401)

        await processPaymentWebhook(notification, c.env)

        return c.json({ message: 'Webhook processed successfully' })
    } catch (e: any) {
        console.error('Webhook error:', e)
        return c.json({ error: 'Webhook processing failed', details: e.message }, 500)
    }
})

/**
 * POST /subscriptions/cancel
 * Cancel subscription (at end of period)
 */
subscriptions.post('/cancel', ownerOnly, async (c) => {
    const tenantId = c.get('tenantId')

    try {
        await cancelSubscription(tenantId, c.env)

        return c.json({ message: 'Subscription will be cancelled at the end of billing period' })
    } catch (e: any) {
        return c.json({ error: 'Failed to cancel subscription', details: e.message }, 500)
    }
})

/**
 * GET /subscriptions/invoices
 * Get invoice history
 */
subscriptions.get('/invoices', async (c) => {
    const tenantId = c.get('tenantId')
    const limit = parseInt(c.req.query('limit') || '10')

    const invoices = await getInvoices(tenantId, limit, c.env)

    return c.json({ invoices })
})

/**
 * GET /subscriptions/invoice/:id
 * Get specific invoice detail
 */
subscriptions.get('/invoice/:id', async (c) => {
    const tenantId = c.get('tenantId')
    const invoiceId = c.req.param('id')

    const invoice = await c.env.DB
        .prepare('SELECT * FROM invoices WHERE id = ? AND tenant_id = ?')
        .bind(invoiceId, tenantId)
        .first()

    if (!invoice) {
        return c.json({ error: 'Invoice not found' }, 404)
    }

    // Get payment details
    const payment = await c.env.DB
        .prepare('SELECT * FROM payments WHERE invoice_id = ?')
        .bind(invoiceId)
        .first()

    return c.json({
        invoice: {
            ...invoice,
            line_items: JSON.parse(invoice.line_items as string)
        },
        payment: payment ? {
            ...payment,
            payment_details: payment.payment_details ? JSON.parse(payment.payment_details as string) : null
        } : null
    })
})

/**
 * POST /subscriptions/upgrade
 * Quick upgrade to specific plan
 */
subscriptions.post('/upgrade', ownerOnly, async (c) => {
    const tenantId = c.get('tenantId')
    const { planSlug } = await c.req.json()

    if (!planSlug) {
        return c.json({ error: 'Plan slug is required' }, 400)
    }

    try {
        const { token, redirectUrl } = await createCheckoutSession(
            tenantId,
            planSlug,
            c.env
        )

        return c.json({
            message: 'Upgrade initiated',
            token,
            redirectUrl,
            clientKey: c.env.MIDTRANS_CLIENT_KEY
        })
    } catch (e: any) {
        return c.json({ error: 'Failed to initiate upgrade', details: e.message }, 500)
    }
})

export default subscriptions
