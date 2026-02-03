/**
 * Type definitions for Hono Context Variables
 * This extends Hono's context to include our custom variables
 */

import { Tenant } from '../services/tenant-service'

declare module 'hono' {
    interface ContextVariableMap {
        // User context from JWT
        user: any
        userId: string
        userRole: 'owner' | 'admin' | 'employee'

        // Tenant context
        tenantId: string
        tenant: Tenant

        // Custom domain
        customDomain?: string
        customDomainTenantId?: string

        // JWT payload
        jwtPayload?: any

        // Legacy user flag (for backward compatibility)
        isLegacyUser?: boolean
    }
}
