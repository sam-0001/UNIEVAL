/**
 * server/redis.ts
 * Single Redis connection shared across cache, queue, and rate limiter.
 * Falls back gracefully — if Redis is down, features degrade but server keeps running.
 */
import IORedis from 'ioredis';
import logger from './logger.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Main client — used for cache and rate limiting
export const redis = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
        if (times > 3) return null; // stop retrying after 3 attempts
        return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
});

// BullMQ requires maxRetriesPerRequest: null
export const queueConnection = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
    retryStrategy: (times) => {
        if (times > 10) return null;
        return Math.min(times * 500, 5000);
    },
    lazyConnect: true,
});

let redisAvailable = false;
let connectCalled = false;

export async function connectRedis(): Promise<void> {
    if (connectCalled) return;
    connectCalled = true;

    redis.on('error', (err) => {
        if (redisAvailable) logger.warn('[Redis] Connection error:', err.message);
        redisAvailable = false;
    });
    redis.on('connect', () => {
        redisAvailable = true;
    });

    try {
        if (redis.status === 'wait') await redis.connect();
        if (queueConnection.status === 'wait') await queueConnection.connect();
        redisAvailable = true;
        logger.info('[Redis] Connected');
    } catch (err: any) {
        logger.warn(`[Redis] Not available — caching and queues disabled. Error: ${err.message}`);
        logger.warn('[Redis] Server will continue without Redis (degraded mode)');
    }
}

export function isRedisAvailable(): boolean {
    return redisAvailable && redis.status === 'ready';
}