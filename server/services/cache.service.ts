/**
 * server/services/cache.service.ts
 * Redis-backed cache. If Redis is unavailable, falls through to DB automatically.
 *
 * Usage:
 *   const data = await cache.getOrSet('courses:CSE', () => Course.find(...).lean(), 300);
 *   await cache.invalidate('courses:*');   // call after create/update/delete
 */
import { redis, isRedisAvailable } from '../redis.js';

export const cache = {
    async getOrSet<T>(key: string, fetcher: () => Promise<T>, ttlSeconds = 300): Promise<T> {
        if (!isRedisAvailable()) return fetcher();

        try {
            const cached = await redis.get(key);
            if (cached) return JSON.parse(cached) as T;

            const data = await fetcher();
            await redis.setex(key, ttlSeconds, JSON.stringify(data));
            return data;
        } catch {
            return fetcher(); // Redis error → fall through to DB, never crash
        }
    },

    async invalidate(pattern: string): Promise<void> {
        if (!isRedisAvailable()) return;
        try {
            if (pattern.includes('*')) {
                const keys = await redis.keys(pattern);
                if (keys.length > 0) await redis.del(...keys);
            } else {
                await redis.del(pattern);
            }
        } catch { /* ignore */ }
    },

    async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
        if (!isRedisAvailable()) return;
        try {
            await redis.setex(key, ttlSeconds, JSON.stringify(value));
        } catch { /* ignore */ }
    },

    async get<T>(key: string): Promise<T | null> {
        if (!isRedisAvailable()) return null;
        try {
            const val = await redis.get(key);
            return val ? JSON.parse(val) as T : null;
        } catch { return null; }
    },
};
