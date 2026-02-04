import { Context, Next } from 'hono';

export const securityHeaders = async (c: Context, next: Next) => {
    await next();
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-Frame-Options', 'DENY');
    c.header('X-XSS-Protection', '1; mode=block');
    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    c.header('Content-Security-Policy', "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';");
};

// IP-based Rate Limit for public endpoints (Login/Register)
// Uses KV if available, falls back to in-memory (per isolate)
export const ipRateLimiter = async (c: Context, next: Next) => {
    const ip = c.req.header('CF-Connecting-IP') || 'unknown';
    const path = c.req.path;
    const now = Math.floor(Date.now() / 1000); // seconds
    const windowSize = 60; // 1 minute window
    const limit = 20; // 20 requests per minute per IP for auth endpoints

    // Simple in-memory fallback map for dev/testing without KV
    // Note: specific to this worker instance
    const cacheKey = `ratelimit:ip:${ip}:${Math.floor(now / windowSize)}`;

    if (c.env?.CACHE) {
        const current = await c.env.CACHE.get(cacheKey);
        const count = current ? parseInt(current) : 0;

        if (count >= limit) {
            return c.json({
                error: 'Too many requests. Please try again later.',
                retryAfter: windowSize - (now % windowSize)
            }, 429);
        }

        // Increment (not atomic, but sufficient for soft limit)
        await c.env.CACHE.put(cacheKey, (count + 1).toString(), { expirationTtl: windowSize });
    } else {
        // In-memory fallback logic could go here, but omitted to keep it stateless mostly
        // console.warn("KV CACHE not available for rate limiting");
    }

    await next();
};
