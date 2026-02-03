/**
 * Custom Domain Routes
 * Manage custom domains for white-labeling
 */

import { Hono } from 'hono'
import { adminOnly, ownerOnly } from '../middleware/tenant'
import {
    addCustomDomain,
    deleteDomain,
    getTenantDomains,
    verifyDomain
} from '../services/domain-service'

type Bindings = {
    DB: D1Database
    JWT_SECRET: string
}

const customDomains = new Hono<{ Bindings: Bindings }>()

/**
 * GET /custom-domains
 * List all domains for current tenant
 */
customDomains.get('/', ownerOnly, async (c) => {
    try {
        const tenantId = c.get('tenantId')
        const domains = await getTenantDomains(tenantId, c.env)
        return c.json({ domains })
    } catch (e: any) {
        return c.json({ error: 'Failed to fetch domains', details: e.message }, 500)
    }
})

/**
 * POST /custom-domains
 * Add a new custom domain
 */
customDomains.post('/', ownerOnly, async (c) => {
    try {
        const tenantId = c.get('tenantId')
        const { domain } = await c.req.json()

        if (!domain) {
            return c.json({ error: 'Domain is required' }, 400)
        }

        // Basic domain validation
        const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/
        if (!domainRegex.test(domain)) {
            return c.json({ error: 'Invalid domain format' }, 400)
        }

        const newDomain = await addCustomDomain(tenantId, domain, c.env)
        return c.json({
            message: 'Domain added successfully',
            domain: newDomain,
            instruction: 'Please add a CNAME record pointing to absen-api.khibroh.workers.dev'
        }, 201)

    } catch (e: any) {
        console.error('Add domain failed:', e)
        return c.json({ error: e.message }, 400)
    }
})

/**
 * POST /custom-domains/:id/verify
 * Trigger verification of domain ownership
 */
customDomains.post('/:id/verify', ownerOnly, async (c) => {
    try {
        const id = c.req.param('id')
        const domain = await verifyDomain(id, c.env) // This verifies specific ID ownership internally too usually, but services check DB

        if (domain.status === 'active') {
            return c.json({ message: 'Domain verified successfully', domain })
        } else {
            return c.json({ message: 'Verification failed or pending propagation', domain }, 400)
        }

    } catch (e: any) {
        return c.json({ error: 'Verification error', details: e.message }, 400)
    }
})

/**
 * DELETE /custom-domains/:id
 * Remove a custom domain
 */
customDomains.delete('/:id', ownerOnly, async (c) => {
    try {
        const tenantId = c.get('tenantId')
        const id = c.req.param('id')

        await deleteDomain(id, tenantId, c.env)
        return c.json({ message: 'Domain removed successfully' })

    } catch (e: any) {
        return c.json({ error: 'Failed to delete domain', details: e.message }, 400)
    }
})

export default customDomains
