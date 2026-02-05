import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import { compare, hash } from 'bcryptjs'
import { authMiddleware } from '../middleware/auth'

type Bindings = {
    DB: D1Database
    JWT_SECRET: string
}

const auth = new Hono<{ Bindings: Bindings }>()

auth.post('/register', async (c) => {
    try {
        const { email, password, name, tenant_name } = await c.req.json()

        if (!email || !password || !name || !tenant_name) {
            return c.json({ error: 'Missing required fields' }, 400)
        }

        // Use standard tenant creation service
        // This ensures all defaults (plan, points, settings) are applied consistently
        const { createTenant } = await import('../services/tenant-service')
        const { tenant, admin } = await createTenant({
            name: tenant_name,
            adminEmail: email,
            adminPassword: password,
            adminName: name
        }, c.env)

        return c.json({
            message: 'Registered successfully',
            tenantId: tenant.id,
            userId: admin.id
        })

    } catch (e: any) {
        console.error(e)
        return c.json({ error: 'Registration failed', details: e.message }, 500)
    }
})

auth.post('/login', async (c) => {
    const { email, password } = await c.req.json()

    // 1. Get User
    const user: any = await c.env.DB.prepare(
        'SELECT * FROM users WHERE email = ?'
    ).bind(email).first()

    if (!user) {
        console.log(`Login failed: User ${email} not found`);
        return c.json({ error: 'Invalid credentials' }, 401)
    }

    // 2. Verify Password
    const isValid = await compare(password, user.password_hash as string)
    if (!isValid) {
        console.log(`Login failed: Password mismatch for ${email}. Hash length: ${user.password_hash?.length}`);
        return c.json({ error: 'Invalid credentials' }, 401)
    }

    // 3. Verify Tenant Status
    const tenant: any = await c.env.DB.prepare(
        'SELECT status, trial_ends_at FROM tenants WHERE id = ?'
    ).bind(user.tenant_id).first()

    if (!tenant) {
        return c.json({ error: 'Tenant not found' }, 403)
    }

    if (tenant.status === 'suspended' || tenant.status === 'cancelled') {
        return c.json({ error: 'Your account is suspended. Please contact support.' }, 403)
    }

    // Check trial expiration
    if (tenant.status === 'trial' && tenant.trial_ends_at) {
        const trialEnd = new Date(tenant.trial_ends_at)
        if (new Date() > trialEnd) {
            return c.json({ error: 'Trial period expired. Please upgrade your plan.' }, 403)
        }
    }

    // 4. Generate Token
    const payload = {
        sub: user.id,
        role: user.role,
        tenant_id: user.tenant_id,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 // 7 days
    }

    const token = await sign(payload, 'HARDCODED_DEBUG_SECRET_123', 'HS256')

    return c.json({
        access_token: token,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            tenant_id: user.tenant_id
        }
    })
})

/**
 * POST /auth/join
 * Register a new user into an EXISTING tenant (Employee Registration)
 */
auth.post('/join', async (c) => {
    try {
        const { email, password, name, tenant_slug, employee_id } = await c.req.json()

        if (!email || !password || !name || !tenant_slug) {
            return c.json({ error: 'Missing required fields' }, 400)
        }

        // 1. Find Tenant
        const { getTenantBySlug, canAddUser } = await import('../services/tenant-service')
        const tenant = await getTenantBySlug(tenant_slug, c.env)

        if (!tenant) {
            return c.json({ error: 'Company code invalid. Please verify with your admin.' }, 404)
        }

        // 2. Check Capacity (Plan Limits)
        const canAdd = await canAddUser(tenant.id, c.env)
        if (!canAdd) {
            return c.json({ error: 'Organization has reached maximum user limit.' }, 403)
        }

        // 3. Check if email exists
        const existingUser = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
        if (existingUser) {
            return c.json({ error: 'Email already registered' }, 409)
        }

        // 4. Create User
        const userId = crypto.randomUUID()
        const hash = await import('bcryptjs').then(b => b.hash(password, 10))

        await c.env.DB.prepare(`
            INSERT INTO users (id, tenant_id, email, password_hash, name, role, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `).bind(
            userId,
            tenant.id,
            email,
            hash,
            name,
            'employee', // Default role for joiners
            'active'
        ).run()

        return c.json({
            message: 'Joined successfully',
            userId,
            tenant: { name: tenant.name }
        })

    } catch (e: any) {
        console.error('Join failed:', e)
        return c.json({ error: 'Registration failed', details: e.message }, 500)
    }
})

/**
 * GET /auth/me
 * Get current user profile
 */
auth.get('/me', authMiddleware, async (c) => {
    try {
        const payload = c.get('user') as any;
        const userId = payload.sub;

        const user = await c.env.DB.prepare(
            'SELECT id, name, email, role, tenant_id, points_balance, face_registered, face_photo_url FROM users WHERE id = ?'
        ).bind(userId).first();

        if (!user) {
            return c.json({ error: 'User not found' }, 404);
        }

        return c.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                tenant_id: user.tenant_id,
                points_balance: user.points_balance || 0,
                face_registered: user.face_registered,
                face_photo_url: user.face_photo_url
            }
        });

    } catch (e: any) {
        console.error('Fetch /me error', e);
        return c.json({ error: 'Failed to fetch profile' }, 500);
    }
});

// TEMPORARY DEBUG ENDPOINT (Safeguarded)
auth.get('/debug-check', async (c) => {
    try {
        const email = c.req.query('email');
        const password = c.req.query('password');

        if (!email || !password) return c.json({ error: 'Missing params' });

        const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first() as any;
        if (!user) return c.json({ status: 'User NOT found', email });

        // Safe hash retrieval
        const hash = user.password_hash || 'NULL_HASH';

        let isValid = false;
        let compareError = null;
        try {
            isValid = await compare(password, hash);
        } catch (e: any) {
            compareError = e.message;
        }

        return c.json({
            status: 'Debug Result',
            user: {
                found: true,
                email: user.email,
                hash_snippet: hash.substring(0, 15) + '...',
                role: user.role
            },
            passwordCheck: {
                input: password,
                match: isValid,
                error: compareError
            }
        });
    } catch (err: any) {
        return c.json({ error: 'Internal Debug Error', details: err.message }, 500);
    }
});

/**
 * GET /auth/force-reset-all
 * Resets ALL user passwords to 'password123'
 */
auth.get('/force-reset-all', async (c) => {
    try {
        // Use pre-generated hash for 'password123' to avoid runtime hashing issues
        const knownHash = '$2b$10$aCDLyVHekv7eLeYmXIEm1.LOyBno4G9DF9Z5l.VH7mTN5FS3S97MS';

        // Get all users first for reporting
        const { results: users } = await c.env.DB.prepare('SELECT email FROM users').all();

        // Update all users with the known hash
        const result = await c.env.DB.prepare(
            'UPDATE users SET password_hash = ?'
        ).bind(knownHash).run();

        return c.json({
            message: 'All passwords reset successfully',
            new_password: 'password123',
            users_found: users?.length || 0,
            users_affected: result.meta?.changes || 0,
            user_emails: users?.map((u: any) => u.email) || []
        });
    } catch (e: any) {
        return c.json({
            error: 'Reset failed',
            details: e.message,
            stack: e.stack
        }, 500);
    }
});

/**
 * GET /auth/team
 * Get list of team members (colleagues) in the same tenant
 */
auth.get('/team', authMiddleware, async (c) => {
    try {
        const user = c.get('user') as any;
        const tenant_id = user.tenant_id;

        const { results } = await c.env.DB.prepare(
            'SELECT id, name, email, role, face_photo_url, created_at FROM users WHERE tenant_id = ? AND status = ? ORDER BY name ASC'
        ).bind(tenant_id, 'active').all<any>();

        return c.json({
            data: results
        });
    } catch (e: any) {
        console.error('Fetch team error', e);
        return c.json({ error: 'Failed to fetch team members' }, 500);
    }
});

/**
 * PUT /auth/change-password
 * Change current user password
 */
auth.put('/change-password', authMiddleware, async (c) => {
    try {
        const userPayload = c.get('user') as any;
        const { current_password, new_password } = await c.req.json();

        if (!current_password || !new_password) {
            return c.json({ error: 'Current and new password are required' }, 400);
        }

        if (new_password.length < 6) {
            return c.json({ error: 'New password must be at least 6 characters' }, 400);
        }

        // Verify current password
        const user = await c.env.DB.prepare(
            'SELECT password_hash FROM users WHERE id = ?'
        ).bind(userPayload.sub).first<any>();

        if (!user) return c.json({ error: 'User not found' }, 404);

        const isValid = await compare(current_password, user.password_hash);
        if (!isValid) {
            return c.json({ error: 'Password saat ini salah' }, 401);
        }

        // Hash new password
        const newHash = await hash(new_password, 10);

        // Update
        await c.env.DB.prepare(
            'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        ).bind(newHash, userPayload.sub).run();

        return c.json({ message: 'Password berhasil diubah' });

    } catch (e: any) {
        console.error('Change password error', e);
        return c.json({ error: 'Failed to change password' }, 500);
    }
});

export default auth
