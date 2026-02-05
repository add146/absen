// In-Memory Cache Utility
// Replaces Cloudflare KV for tenant and domain caching

interface CacheEntry<T> {
    value: T;
    expiresAt: number;
}

class InMemoryCache {
    private cache: Map<string, CacheEntry<any>> = new Map();
    private maxSize: number;

    constructor(maxSize: number = 1000) {
        this.maxSize = maxSize;
    }

    /**
     * Get value from cache
     * Returns null if expired or not found
     */
    get<T>(key: string): T | null {
        const entry = this.cache.get(key);

        if (!entry) {
            return null;
        }

        // Check if expired
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        return entry.value as T;
    }

    /**
     * Set value in cache with TTL in seconds
     */
    set<T>(key: string, value: T, ttlSeconds: number = 3600): void {
        // Simple LRU: if cache full, remove oldest entry
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey) {
                this.cache.delete(firstKey);
            }
        }

        this.cache.set(key, {
            value,
            expiresAt: Date.now() + (ttlSeconds * 1000)
        });
    }

    /**
     * Delete value from cache
     */
    delete(key: string): void {
        this.cache.delete(key);
    }

    /**
     * Clear all cache entries
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Get cache stats
     */
    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxSize
        };
    }

    /**
     * Cleanup expired entries
     * Should be called periodically
     */
    cleanup(): number {
        const now = Date.now();
        let removed = 0;

        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
                removed++;
            }
        }

        return removed;
    }
}

// Global cache instance (per worker instance)
// This will persist across requests in the same worker instance
const globalCache = new InMemoryCache(2000);

export { InMemoryCache, globalCache };
