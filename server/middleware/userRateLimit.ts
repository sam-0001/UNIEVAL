import { Request, Response, NextFunction } from 'express';
import { redis, isRedisAvailable } from '../redis.js';

function userRateLimit(maxRequests: number, windowSeconds: number) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const user = (req as any).currentUser;
        if (!user || !isRedisAvailable()) { next(); return; }

        // Platform administrators are never throttled when managing educational materials
        const role = (user.role || '').toUpperCase();
        if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
            next();
            return;
        }

        const key = `rl:user:${user.id}:${req.path}`;
        try {
            const tx = redis.multi();
            tx.incr(key);
            tx.expire(key, windowSeconds);
            const results = await tx.exec();

            const count = (results?.[0]?.[1] as number) ?? 0;

            res.setHeader('X-RateLimit-Limit', maxRequests);
            res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - count));

            if (count > maxRequests) {
                const ttl = await redis.ttl(key);
                res.setHeader('Retry-After', String(ttl));
                res.status(429).json({
                    error: `Rate limit exceeded. Try again in ${ttl} seconds.`
                });
                return;
            }
        } catch {
            // Redis error → allow request through
        }
        next();
    };
}

export const aiRateLimit         = userRateLimit(20,  60);  // 20 AI calls/min per user
export const uploadRateLimit     = userRateLimit(10, 300);  // 10 video processing jobs per 5 min per user
export const noteUploadRateLimit = userRateLimit(150, 300); // 150 document/PDF uploads per 5 min per user
export const presignedUrlLimit   = userRateLimit(50,  60);  // 50 presigned URLs/min per user
export const quizRateLimit       = userRateLimit(30,  60);  // 30 quiz requests/min per user