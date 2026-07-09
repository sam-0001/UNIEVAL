import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { UserRole } from '../../types.js';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET environment variable is not set');
}

export interface JwtPayload {
    userId: string;
    role: UserRole;
    sessionToken?: string;
}

export function signToken(payload: JwtPayload): string {
    return jwt.sign(payload, JWT_SECRET!, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }

    const token = authHeader.slice(7);
    try {
        const decoded = jwt.verify(token, JWT_SECRET!) as JwtPayload;
        const user = await User.findOne({ id: decoded.userId });
        if (!user) {
            res.status(401).json({ error: 'Invalid session' });
            return;
        }
        (req as any).currentUser = user;
        (req as any).sessionToken = decoded.sessionToken ?? null;
        next();
    } catch (err) {
        if (err instanceof jwt.TokenExpiredError) {
            res.status(401).json({ error: 'Session expired, please log in again' });
        } else {
            res.status(401).json({ error: 'Invalid token' });
        }
    }
}

export function requireRole(...roles: UserRole[]) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        await requireAuth(req, res, () => {
            const user = (req as any).currentUser;
            if (!roles.includes(user.role)) {
                res.status(403).json({ error: 'Insufficient permissions' });
                return;
            }
            next();
        });
    };
}
