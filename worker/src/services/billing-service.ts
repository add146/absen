/**
 * Billing Service
 * Business logic for subscriptions, invoices, and billing operations
 */

import { createPaymentTransaction, mapMidtransStatus } from './payment-service'

type Bindings = {
    DB: D1Database
    MIDTRANS_SERVER_KEY?: string
    MIDTRANS_CLIENT_KEY?: string
    MIDTRANS_IS_PRODUCTION?: string
}

export interface SubscriptionPlan {
    id: string
    name: string
    slug: string
    price: number
    interval: 'monthly' | 'yearly' | 'lifetime'
    features: any
    is_active: number
}

/**
 * Get all available subscription plans
 */
export async function getSubscriptionPlans(env: Bindings): Promise<SubscriptionPlan[]> {
    const plans = await env.DB
        .prepare('SELECT * FROM subscription_plans WHERE is_active = 1 ORDER BY display_order ASC')
        .all()

    return plans.results.map(plan => ({
        ...plan,
        features: JSON.parse(plan.features as string)
    })) as SubscriptionPlan[]
}

/**
 * Get plan by slug
 */
export async function getPlanBySlug(slug: string, env: Bindings): Promise<SubscriptionPlan | null> {
    const plan = await env.DB
        .prepare('SELECT * FROM subscription_plans WHERE slug = ? AND is_active = 1')
        .bind(slug)
        .first()

    if (!plan) return null

    return {
        ...plan,
        features: JSON.parse(plan.features as string)
    } as SubscriptionPlan
}

/**
 * Get current subscription for tenant
 */
export async function getCurrentSubscription(tenantId: string, env: Bindings): Promise<any> {
    const subscription = await env.DB
        .prepare(`
            SELECT s.*, p.name as plan_name, p.slug as plan_slug, p.price, p.features
            FROM subscriptions s
            JOIN subscription_plans p ON s.plan_id = p.id
            WHERE s.tenant_id = ? AND s.status IN ('active', 'past_due')
            ORDER BY s.created_at DESC
            LIMIT 1
        `)
        .bind(tenantId)
        .first()

    if (!subscription) return null

    return {
        ...subscription,
        features: JSON.parse(subscription.features as string)
    }
}

/**
 * Create checkout session for plan upgrade
 */
export async function createCheckoutSession(
    tenantId: string,
    planSlug: string,
    env: Bindings
): Promise<{ token: string, redirectUrl: string, invoiceId: string }> {
    // Get plan details
    const plan = await getPlanBySlug(planSlug, env)
    if (!plan) {
        throw new Error('Plan not found')
    }

    // Get tenant details
    const tenant = await env.DB
        .prepare('SELECT * FROM tenants WHERE id = ?')
        .bind(tenantId)
        .first()

    if (!tenant) {
        throw new Error('Tenant not found')
    }

    // Get admin user for customer details
    const admin = await env.DB
        .prepare('SELECT * FROM users WHERE tenant_id = ? AND role = ? LIMIT 1')
        .bind(tenantId, 'owner')
        .first()

    // Generate order ID
    const orderId = `SUB-${tenantId.slice(0, 8)}-${Date.now()}`

    // Create invoice
    const invoiceId = crypto.randomUUID()
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`

    await env.DB.prepare(`
        INSERT INTO invoices (
            id, tenant_id, invoice_number, amount_due, currency, status, 
            description, line_items, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).bind(
        invoiceId,
        tenantId,
        invoiceNumber,
        plan.price,
        'IDR',
        'pending',
        `Subscription: ${plan.name} - ${plan.interval}`,
        JSON.stringify([{
            description: `${plan.name} Plan`,
            amount: plan.price,
            quantity: 1
        }])
    ).run()

    // Create payment record
    const paymentId = crypto.randomUUID()
    await env.DB.prepare(`
        INSERT INTO payments (
            id, tenant_id, invoice_id, order_id, amount, currency, status, 
            payment_gateway, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).bind(
        paymentId,
        tenantId,
        invoiceId,
        orderId,
        plan.price,
        'IDR',
        'pending',
        'midtrans'
    ).run()

    // Create Midtrans transaction
    const { token, redirectUrl } = await createPaymentTransaction({
        orderId,
        amount: plan.price,
        customerDetails: {
            firstName: admin?.name as string || tenant.name as string,
            email: admin?.email as string || 'admin@' + tenant.slug,
            phone: admin?.phone as string
        },
        itemDetails: [{
            id: plan.id,
            name: `${plan.name} Plan - ${plan.interval}`,
            price: plan.price,
            quantity: 1
        }]
    }, env)

    return {
        token,
        redirectUrl,
        invoiceId
    }
}

/**
 * Process payment webhook from Midtrans
 */
export async function processPaymentWebhook(notification: any, env: Bindings): Promise<void> {
    const orderId = notification.order_id
    const transactionStatus = notification.transaction_status
    const fraudStatus = notification.fraud_status

    // Get payment record
    const payment = await env.DB
        .prepare('SELECT * FROM payments WHERE order_id = ?')
        .bind(orderId)
        .first()

    if (!payment) {
        console.error('Payment not found for order:', orderId)
        return
    }

    // Map status
    let paymentStatus = mapMidtransStatus(transactionStatus)

    // Handle fraud
    if (fraudStatus === 'deny') {
        paymentStatus = 'failed'
    }

    // Update payment
    await env.DB.prepare(`
        UPDATE payments 
        SET status = ?, transaction_id = ?, payment_type = ?, 
            payment_details = ?, paid_at = CASE WHEN ? = 'success' THEN datetime('now') ELSE NULL END,
            updated_at = datetime('now')
        WHERE id = ?
    `).bind(
        paymentStatus,
        notification.transaction_id,
        notification.payment_type,
        JSON.stringify(notification),
        paymentStatus,
        payment.id
    ).run()

    // Update invoice
    if (paymentStatus === 'success') {
        await env.DB.prepare(`
            UPDATE invoices 
            SET status = 'paid', amount_paid = amount_due, paid_at = datetime('now'), updated_at = datetime('now')
            WHERE id = ?
        `).bind(payment.invoice_id).run()

        // Activate subscription
        await activateSubscription(payment.tenant_id as string, payment.invoice_id as string, env)
    } else if (paymentStatus === 'failed') {
        await env.DB.prepare(`
            UPDATE invoices SET status = 'failed', updated_at = datetime('now') WHERE id = ?
        `).bind(payment.invoice_id).run()
    }
}

/**
 * Activate subscription after successful payment
 */
async function activateSubscription(tenantId: string, invoiceId: string, env: Bindings): Promise<void> {
    // Get invoice to determine plan
    const invoice = await env.DB
        .prepare('SELECT * FROM invoices WHERE id = ?')
        .bind(invoiceId)
        .first()

    if (!invoice) return

    // Parse line items to get plan
    const lineItems = JSON.parse(invoice.line_items as string)
    const planDescription = lineItems[0]?.description || ''

    // Determine plan based on description
    let planId = 'plan_free'
    if (planDescription.includes('Basic')) planId = 'plan_basic'
    else if (planDescription.includes('Premium')) planId = 'plan_premium'
    else if (planDescription.includes('Enterprise')) planId = 'plan_enterprise'

    // Get plan details
    const plan = await env.DB
        .prepare('SELECT * FROM subscription_plans WHERE id = ?')
        .bind(planId)
        .first()

    if (!plan) return

    // Calculate period
    const interval = plan.interval as string
    const periodEnd = interval === 'monthly'
        ? "datetime('now', '+1 month')"
        : interval === 'yearly'
            ? "datetime('now', '+1 year')"
            : "datetime('now', '+100 years')" // lifetime

    // Cancel existing subscriptions
    await env.DB.prepare(`
        UPDATE subscriptions 
        SET status = 'cancelled', cancel_at_period_end = 1, cancelled_at = datetime('now'), updated_at = datetime('now')
        WHERE tenant_id = ? AND status = 'active'
    `).bind(tenantId).run()

    // Create new subscription
    const subscriptionId = crypto.randomUUID()
    await env.DB.prepare(`
        INSERT INTO subscriptions (
            id, tenant_id, plan_id, status, current_period_start, current_period_end, 
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, datetime('now'), ${periodEnd}, datetime('now'), datetime('now'))
    `).bind(
        subscriptionId,
        tenantId,
        planId,
        'active'
    ).run()

    // Update tenant plan
    const features = JSON.parse(plan.features as string)
    await env.DB.prepare(`
        UPDATE tenants 
        SET plan_type = ?, max_users = ?, status = 'active', updated_at = datetime('now')
        WHERE id = ?
    `).bind(
        plan.slug,
        features.maxUsers || -1,
        tenantId
    ).run()
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(tenantId: string, env: Bindings): Promise<void> {
    await env.DB.prepare(`
        UPDATE subscriptions 
        SET cancel_at_period_end = 1, updated_at = datetime('now')
        WHERE tenant_id = ? AND status = 'active'
    `).bind(tenantId).run()
}

/**
 * Get invoices for tenant
 */
export async function getInvoices(
    tenantId: string,
    limit: number = 10,
    env: Bindings
): Promise<any[]> {
    const invoices = await env.DB
        .prepare(`
            SELECT * FROM invoices 
            WHERE tenant_id = ? 
            ORDER BY created_at DESC 
            LIMIT ?
        `)
        .bind(tenantId, limit)
        .all()

    return invoices.results.map(inv => ({
        ...inv,
        line_items: JSON.parse(inv.line_items as string)
    }))
}
