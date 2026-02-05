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
// Uses D1 database for persistent rate limiting
export const ipRateLimiter = async (c: Context, next: Next) => {
    const ip = c.req.header('CF-Connecting-IP') || 'unknown';
    const now = Math.floor(Date.now() / 1000); // seconds
    const windowSize = 60; // 1 minute window
    const limit = 20; // 20 requests per minute per IP for auth endpoints
    const currentWindow = Math.floor(now / windowSize);

    try {
        // Get current count from D1
        const result = await c.env.DB
            .prepare('SELECT request_count FROM rate_limits WHERE ip = ? AND endpoint = ? AND window_start = ?')
            .bind(ip, c.req.path, currentWindow)
            .first<{ request_count: number }>();

        const count = result?.request_count || 0;

        if (count >= limit) {
            return c.json({
                error: 'Too many requests. Please try again later.',
                retryAfter: windowSize - (now % windowSize)
            }, 429);
        }

        // Increment or insert
        if (result) {
            await c.env.DB
                .prepare('UPDATE rate_limits SET request_count = request_count + 1 WHERE ip = ? AND endpoint = ? AND window_start = ?')
                .bind(ip, c.req.path, currentWindow)
                .run();
        } else {
            await c.env.DB
                .prepare('INSERT INTO rate_limits (ip, endpoint, window_start, request_count) VALUES (?, ?, ?, 1)')
                .bind(ip, c.req.path, currentWindow)
                .run();
        }
    } catch (error) {
        // Don't block requests if rate limiting fails
        console.error('Rate limiting error:', error);
    }

    await next();
};
