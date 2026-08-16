import express from 'express';
import { User, OTP, Course, Note } from '../models/index.js';
import { UserRole } from '../../types.js';
import { signToken } from '../middleware/auth.js';
import { sanitizeUser } from './auth.controller.js';
import logger from '../logger.js';
import { randomUUID } from 'crypto';
import { sendWhatsAppBroadcast } from '../services/whatsapp.service.js';

export async function superAdminLogin(req: express.Request, res: express.Response): Promise<void> {
    const { email, otp } = req.body;
    const SUPER_ADMIN_EMAIL = process.env.VITE_SUPER_ADMIN_EMAIL || 'buildinpublicengineers@gmail.com';

    if (!email || !otp) { res.status(400).json({ error: 'Email and OTP are required' }); return; }
    if (email.toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase()) {
        res.status(403).json({ error: 'Access restricted: Invalid Super Admin Email' });
        return;
    }

    try {
        const record = await OTP.findOne({ email: email.toLowerCase().trim() });
        if (!record || record.otp !== otp) {
            res.status(400).json({ error: 'Invalid or expired OTP' });
            return;
        }

        // Check if OTP is older than 10 mins
        const age = Date.now() - new Date(record.createdAt).getTime();
        if (age > 10 * 60 * 1000) {
            await OTP.deleteOne({ _id: record._id });
            res.status(400).json({ error: 'OTP has expired' });
            return;
        }

        await OTP.deleteOne({ _id: record._id });

        let user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            // Create super admin user if doesn't exist (using a placeholder password)
            user = await User.create({
                id: randomUUID(),
                name: 'Super Admin',
                email: email.toLowerCase().trim(),
                password: 'SUPER_ADMIN_LOGIN_ONLY',
                role: UserRole.SUPER_ADMIN,
                avatar: `https://ui-avatars.com/api/?name=Super+Admin&background=random`,
                purchasedNoteIds: [],
                purchasedCourseIds: []
            });
        } else if (user.role !== UserRole.SUPER_ADMIN) {
            // Upgrade to super admin if it's the authorized email
            user.role = UserRole.SUPER_ADMIN;
            await user.save();
        }

        const sessionToken = randomUUID();
        await User.updateOne({ id: user.id }, { sessionToken });
        const token = signToken({ userId: user.id, role: user.role as UserRole, sessionToken });
        
        res.json({ token, user: sanitizeUser(user) });
    } catch (err) {
        logger.error('[Admin] superAdminLogin:', err);
        res.status(500).json({ error: 'An internal error occurred' });
    }
}

export async function getUsers(req: express.Request, res: express.Response): Promise<void> {
    const search = req.query.search as string;
    const role = req.query.role as string;

    const query: any = {};
    if (search && search.trim()) {
        const searchRegex = { $regex: search.trim(), $options: 'i' };
        query.$or = [
            { name: searchRegex },
            { email: searchRegex },
            { phoneNumber: searchRegex }
        ];
    }
    
    if (role && role !== 'undefined' && role !== 'all') {
        query.role = { $regex: new RegExp(`^${role}$`, 'i') };
    }

    try {
        const users = await User.find(query, { password: 0, __v: 0 })
            .sort({ createdAt: -1 })
            .lean();

        logger.info(`[Admin] getUsers: found ${users.length} users. Role Filter: ${role}, Search: ${search}`);

        res.json({
            data: users,
            total: users.length,
            page: 1,
            totalPages: 1
        });
    } catch (err) {
        logger.error('[Admin] getUsers error:', err);
        res.status(500).json({ error: 'An internal error occurred' });
    }
}

export async function updateUserCredits(req: express.Request, res: express.Response): Promise<void> {
    const { userId } = req.params;
    const { credits } = req.body;

    if (typeof credits !== 'number') {
        res.status(400).json({ error: 'Credits must be a number' });
        return;
    }

    try {
        const user = await User.findOneAndUpdate(
            { id: userId },
            { $set: { credits } },
            { new: true, projection: { password: 0 } }
        );
        if (!user) { res.status(404).json({ error: 'User not found' }); return; }
        res.json(sanitizeUser(user));
    } catch (err) {
        logger.error('[Admin] updateUserCredits:', err);
        res.status(500).json({ error: 'An internal error occurred' });
    }
}

export async function grantAccess(req: express.Request, res: express.Response): Promise<void> {
    const { userId } = req.params;
    const { itemId, type } = req.body; // type: 'course' | 'note'

    if (!itemId || !type) {
        res.status(400).json({ error: 'itemId and type are required' });
        return;
    }

    try {
        const user = await User.findOne({ id: userId });
        if (!user) { res.status(404).json({ error: 'User not found' }); return; }

        if (type === 'course') {
            if (!user.purchasedCourseIds.includes(itemId)) {
                user.purchasedCourseIds.push(itemId);
            }
        } else if (type === 'note') {
            if (!user.purchasedNoteIds.includes(itemId)) {
                user.purchasedNoteIds.push(itemId);
            }
        } else {
            res.status(400).json({ error: 'Invalid access type' });
            return;
        }

        await user.save();
        res.json(sanitizeUser(user));
    } catch (err) {
        logger.error('[Admin] grantAccess:', err);
        res.status(500).json({ error: 'An internal error occurred' });
    }
}

export async function revokeAccess(req: express.Request, res: express.Response): Promise<void> {
    const { userId } = req.params;
    const { itemId, type } = req.body;

    if (!itemId || !type) {
        res.status(400).json({ error: 'itemId and type are required' });
        return;
    }

    try {
        const user = await User.findOne({ id: userId });
        if (!user) { res.status(404).json({ error: 'User not found' }); return; }

        if (type === 'course') {
            user.purchasedCourseIds = user.purchasedCourseIds.filter(id => id !== itemId);
        } else if (type === 'note') {
            user.purchasedNoteIds = user.purchasedNoteIds.filter(id => id !== itemId);
        } else {
            res.status(400).json({ error: 'Invalid access type' });
            return;
        }

        await user.save();
        res.json(sanitizeUser(user));
    } catch (err) {
        logger.error('[Admin] revokeAccess:', err);
        res.status(500).json({ error: 'An internal error occurred' });
    }
}

export async function revokeAllStudentAccess(req: express.Request, res: express.Response): Promise<void> {
    try {
        const students = await User.find({ role: 'STUDENT' });
        let modifiedCount = 0;
        
        for (const user of students) {
            let changed = false;
            
            if (user.purchasedCourseIds && user.purchasedCourseIds.length > 0) {
                user.archivedCourseIds = [...new Set([...(user.archivedCourseIds || []), ...user.purchasedCourseIds])];
                user.purchasedCourseIds = [];
                changed = true;
            }
            if (user.purchasedNoteIds && user.purchasedNoteIds.length > 0) {
                user.archivedNoteIds = [...new Set([...(user.archivedNoteIds || []), ...user.purchasedNoteIds])];
                user.purchasedNoteIds = [];
                changed = true;
            }
            
            if (changed) {
                await user.save();
                modifiedCount++;
            }
        }
        
        res.json({ success: true, message: `Revoked access for ${modifiedCount} students.` });
    } catch (err) {
        logger.error('[Admin] revokeAllStudentAccess:', err);
        res.status(500).json({ error: 'An internal error occurred' });
    }
}

export async function revertRevokeAllStudentAccess(req: express.Request, res: express.Response): Promise<void> {
    try {
        const students = await User.find({ role: 'STUDENT' });
        let modifiedCount = 0;
        
        for (const user of students) {
            let changed = false;
            
            if (user.archivedCourseIds && user.archivedCourseIds.length > 0) {
                user.purchasedCourseIds = [...new Set([...(user.purchasedCourseIds || []), ...user.archivedCourseIds])];
                user.archivedCourseIds = [];
                changed = true;
            }
            if (user.archivedNoteIds && user.archivedNoteIds.length > 0) {
                user.purchasedNoteIds = [...new Set([...(user.purchasedNoteIds || []), ...user.archivedNoteIds])];
                user.archivedNoteIds = [];
                changed = true;
            }
            
            if (changed) {
                await user.save();
                modifiedCount++;
            }
        }
        
        res.json({ success: true, message: `Reverted access for ${modifiedCount} students.` });
    } catch (err) {
        logger.error('[Admin] revertRevokeAllStudentAccess:', err);
        res.status(500).json({ error: 'An internal error occurred' });
    }
}

export async function clearCache(req: express.Request, res: express.Response): Promise<void> {
    try {
        const { cache } = await import('../services/cache.service.js');
        await cache.invalidate('*');
        res.json({ message: 'Global cache cleared successfully.' });
    } catch (err) {
        logger.error('[Admin] clearCache:', err);
        res.status(500).json({ error: 'Failed to clear cache' });
    }
}

export async function broadcastOffers(req: express.Request, res: express.Response): Promise<void> {
    const { target, campaignName, creditsToAdd } = req.body; // target: 'all' or array of user ids

    if (!campaignName) {
        res.status(400).json({ error: 'campaignName is required' });
        return;
    }

    try {
        let users: any[] = [];
        
        if (target === 'all') {
            users = await User.find({ role: 'STUDENT' });
        } else if (Array.isArray(target) && target.length > 0) {
            users = await User.find({ id: { $in: target } });
        } else {
            res.status(400).json({ error: 'Invalid target specified' });
            return;
        }

        const credits = typeof creditsToAdd === 'number' ? creditsToAdd : 50;

        // Run the heavy operations in the background so we don't block the HTTP request
        // The API returns immediately to the admin UI
        res.json({ message: `Broadcast started for ${users.length} users in the background.` });

        // Background worker loop
        setImmediate(async () => {
            for (const user of users) {
                try {
                    // Update credits safely
                    await User.updateOne({ id: user.id }, { $inc: { credits: credits } });
                    
                    // Call WhatsApp Service
                    // Wait, we need their phone number in international format, check if they have one
                    if (user.phoneNumber) {
                        const destination = user.phoneNumber.replace(/[^0-9]/g, ''); // Ensure numbers only
                        if (destination.length >= 10) {
                            await sendWhatsAppBroadcast({
                                campaignName,
                                destination,
                                userName: user.name || 'Student',
                                templateParams: [user.name || 'Student', credits.toString()] // example params
                            });
                        }
                    }
                } catch (innerErr) {
                    logger.error(`Failed to process broadcast for user ${user.id}:`, innerErr);
                }
                
                // Add a small delay (e.g. 100ms) between requests to prevent hitting rate limits
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            logger.info(`Completed background broadcast loop for ${users.length} users.`);
        });

    } catch (err) {
        logger.error('[Admin] broadcastOffers:', err);
        res.status(500).json({ error: 'Failed to start broadcast' });
    }
}
