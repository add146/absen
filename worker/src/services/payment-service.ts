/**
 * Payment Service - Midtrans Integration
 * Handles payment gateway operations
 */

type Bindings = {
    DB: D1Database
    MIDTRANS_SERVER_KEY?: string
    MIDTRANS_CLIENT_KEY?: string
    MIDTRANS_IS_PRODUCTION?: string
}

export interface PaymentTransaction {
    orderId: string
    amount: number
    customerDetails: {
        firstName: string
        email: string
        phone?: string
    }
    itemDetails: {
        id: string
        name: string
        price: number
        quantity: number
    }[]
}

/**
 * Get Midtrans API URL based on environment
 */
function getMidtransUrl(env: Bindings): string {
    const isProduction = env.MIDTRANS_IS_PRODUCTION === 'true'
    return isProduction
        ? 'https://api.midtrans.com/v2'
        : 'https://api.sandbox.midtrans.com/v2'
}

/**
 * Get Midtrans Snap URL
 */
function getSnapUrl(env: Bindings): string {
    const isProduction = env.MIDTRANS_IS_PRODUCTION === 'true'
    return isProduction
        ? 'https://app.midtrans.com/snap/v1/transactions'
        : 'https://app.sandbox.midtrans.com/snap/v1/transactions'
}

/**
 * Create payment transaction with Midtrans Snap
 */
export async function createPaymentTransaction(
    transaction: PaymentTransaction,
    env: Bindings
): Promise<{ token: string, redirectUrl: string }> {
    const serverKey = env.MIDTRANS_SERVER_KEY || ''
    const authHeader = `Basic ${btoa(serverKey + ':')}`

    const payload = {
        transaction_details: {
            order_id: transaction.orderId,
            gross_amount: transaction.amount
        },
        customer_details: {
            first_name: transaction.customerDetails.firstName,
            email: transaction.customerDetails.email,
            phone: transaction.customerDetails.phone || ''
        },
        item_details: transaction.itemDetails.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity
        })),
        callbacks: {
            finish: `${getAppUrl(env)}/subscription/success`,
            error: `${getAppUrl(env)}/subscription/failed`,
            pending: `${getAppUrl(env)}/subscription/pending`
        }
    }

    const response = await fetch(getSnapUrl(env), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
            'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
    })

    if (!response.ok) {
        const error = await response.text()
        throw new Error(`Midtrans API error: ${error}`)
    }

    const result = await response.json() as any

    return {
        token: result.token,
        redirectUrl: result.redirect_url
    }
}

/**
 * Verify payment notification signature from Midtrans
 */
export function verifySignature(
    orderId: string,
    statusCode: string,
    grossAmount: string,
    serverKey: string,
    signatureKey: string
): boolean {
    // Create signature: SHA512(order_id + status_code + gross_amount + server_key)
    const string = `${orderId}${statusCode}${grossAmount}${serverKey}`

    // Simple SHA512 implementation (in production, use crypto library)
    const expectedSignature = hashSHA512(string)

    return expectedSignature === signatureKey
}

/**
 * Get transaction status from Midtrans
 */
export async function getTransactionStatus(
    orderId: string,
    env: Bindings
): Promise<any> {
    const serverKey = env.MIDTRANS_SERVER_KEY || ''
    const authHeader = `Basic ${btoa(serverKey + ':')}`
    const url = `${getMidtransUrl(env)}/${orderId}/status`

    const response = await fetch(url, {
        headers: {
            'Authorization': authHeader,
            'Accept': 'application/json'
        }
    })

    if (!response.ok) {
        throw new Error('Failed to get transaction status')
    }

    return response.json()
}

/**
 * Cancel transaction
 */
export async function cancelTransaction(
    orderId: string,
    env: Bindings
): Promise<void> {
    const serverKey = env.MIDTRANS_SERVER_KEY || ''
    const authHeader = `Basic ${btoa(serverKey + ':')}`
    const url = `${getMidtransUrl(env)}/${orderId}/cancel`

    await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': authHeader,
            'Accept': 'application/json'
        }
    })
}

/**
 * Process refund
 */
export async function processRefund(
    orderId: string,
    amount: number,
    reason: string,
    env: Bindings
): Promise<any> {
    const serverKey = env.MIDTRANS_SERVER_KEY || ''
    const authHeader = `Basic ${btoa(serverKey + ':')}`
    const url = `${getMidtransUrl(env)}/${orderId}/refund`

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            refund_key: `refund-${orderId}-${Date.now()}`,
            amount: amount,
            reason: reason
        })
    })

    return response.json()
}

// Helper functions

function getAppUrl(env: Bindings): string {
    const isProduction = env.MIDTRANS_IS_PRODUCTION === 'true'
    return isProduction
        ? 'https://absen.pages.dev' // Update with your production URL
        : 'http://localhost:5173'
}

/**
 * Simple SHA512 hash (placeholder - use proper crypto in production)
 */
function hashSHA512(input: string): string {
    // Note: Cloudflare Workers support crypto.subtle.digest
    // This is a placeholder - implement proper SHA512
    return input // TODO: Implement proper SHA512 hashing
}

/**
 * Map Midtrans status to our payment status
 */
export function mapMidtransStatus(midtransStatus: string): string {
    const statusMap: Record<string, string> = {
        'capture': 'success',
        'settlement': 'success',
        'pending': 'pending',
        'deny': 'failed',
        'cancel': 'failed',
        'expire': 'expired',
        'refund': 'refunded'
    }

    return statusMap[midtransStatus] || 'pending'
}
