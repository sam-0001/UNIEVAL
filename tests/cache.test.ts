/**
 * tests/cache.test.ts
 * Tests for cache service fallback behavior — mocks Redis to be unavailable.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the redis module so tests don't need a real Redis instance
vi.mock('../server/redis.js', () => ({
    redis: {
        get: vi.fn(),
        setex: vi.fn(),
        del: vi.fn(),
        keys: vi.fn(),
    },
    isRedisAvailable: vi.fn(),
}));

import { cache } from '../server/services/cache.service.js';
import { redis, isRedisAvailable } from '../server/redis.js';

const mockRedis = redis as any;
const mockIsAvailable = isRedisAvailable as any;

describe('cache.getOrSet', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('calls fetcher and caches result when Redis is available and cache is cold', async () => {
        mockIsAvailable.mockReturnValue(true);
        mockRedis.get.mockResolvedValue(null); // cache miss
        mockRedis.setex.mockResolvedValue('OK');

        const fetcher = vi.fn().mockResolvedValue({ data: 'fresh' });
        const result = await cache.getOrSet('test:key', fetcher, 300);

        expect(fetcher).toHaveBeenCalledOnce();
        expect(result).toEqual({ data: 'fresh' });
        expect(mockRedis.setex).toHaveBeenCalledWith('test:key', 300, JSON.stringify({ data: 'fresh' }));
    });

    it('returns cached value without calling fetcher on cache hit', async () => {
        mockIsAvailable.mockReturnValue(true);
        mockRedis.get.mockResolvedValue(JSON.stringify({ data: 'cached' }));

        const fetcher = vi.fn();
        const result = await cache.getOrSet('test:key', fetcher, 300);

        expect(fetcher).not.toHaveBeenCalled();
        expect(result).toEqual({ data: 'cached' });
    });

    it('falls through to fetcher when Redis is unavailable', async () => {
        mockIsAvailable.mockReturnValue(false);
        const fetcher = vi.fn().mockResolvedValue({ data: 'db-result' });

        const result = await cache.getOrSet('test:key', fetcher, 300);

        expect(fetcher).toHaveBeenCalledOnce();
        expect(result).toEqual({ data: 'db-result' });
        expect(mockRedis.get).not.toHaveBeenCalled();
    });

    it('falls through to fetcher when Redis throws an error', async () => {
        mockIsAvailable.mockReturnValue(true);
        mockRedis.get.mockRejectedValue(new Error('Redis connection lost'));
        const fetcher = vi.fn().mockResolvedValue({ data: 'fallback' });

        const result = await cache.getOrSet('test:key', fetcher, 300);

        expect(fetcher).toHaveBeenCalledOnce();
        expect(result).toEqual({ data: 'fallback' });
    });
});

describe('cache.invalidate', () => {
    beforeEach(() => vi.clearAllMocks());

    it('deletes a single key', async () => {
        mockIsAvailable.mockReturnValue(true);
        mockRedis.del.mockResolvedValue(1);

        await cache.invalidate('courses:all');
        expect(mockRedis.del).toHaveBeenCalledWith('courses:all');
    });

    it('uses keys() + del() for wildcard patterns', async () => {
        mockIsAvailable.mockReturnValue(true);
        mockRedis.keys.mockResolvedValue(['courses:all:1', 'courses:CSE:1']);
        mockRedis.del.mockResolvedValue(2);

        await cache.invalidate('courses:*');
        expect(mockRedis.keys).toHaveBeenCalledWith('courses:*');
        expect(mockRedis.del).toHaveBeenCalledWith('courses:all:1', 'courses:CSE:1');
    });

    it('does nothing when Redis is unavailable', async () => {
        mockIsAvailable.mockReturnValue(false);
        await cache.invalidate('courses:*');
        expect(mockRedis.keys).not.toHaveBeenCalled();
        expect(mockRedis.del).not.toHaveBeenCalled();
    });
});
