import express from 'express';
import mongoose from 'mongoose';
import { randomUUID } from 'crypto';
import { User, Course, Note, Subject, Purchase, VideoKey, Coupon, Combo } from '../models/index.js';
import { UserRole } from '../../types.js';
import { sanitizeUser, generateId, findUserByEmail } from './auth.controller.js';
import { applyDiscount, incrementCouponUsage } from './coupon.controller.js';
import { cache } from '../services/cache.service.js';
import logger from '../logger.js';
import { calculateItemExpiryDate, isPurchaseExpired, syncUserExpiredPurchases } from '../services/validity.service.js';
import { getCashfreeKeys, createCashfreeOrder, verifyCashfreePayment } from '../services/cashfree.service.js';

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getTeachers(req: express.Request, res: express.Response): Promise<void> {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
    try {
        const [teachers, total] = await Promise.all([
            User.find({ role: UserRole.TEACHER }, { password: 0, __v: 0 }).skip((page - 1) * limit).limit(limit).lean(),
            User.countDocuments({ role: UserRole.TEACHER })
        ]);
        res.json({ data: teachers, page, limit, total, totalPages: Math.ceil(total / limit) });
    } catch (err) {
        logger.error('[Users] getTeachers:', err);
        res.status(500).json({ error: 'An internal error occurred' });
    }
}

export async function updateUser(req: express.Request, res: express.Response): Promise<void> {
    const id = req.params.id as string;
    const currentUser = (req as any).currentUser;

    const canEdit = currentUser.id === id
        || currentUser.role === UserRole.ADMIN
        || currentUser.role === UserRole.SUPER_ADMIN;
    if (!canEdit) { res.status(403).json({ error: 'You can only update your own profile' }); return; }

    const updates = { ...req.body };
    // Strip sensitive fields that must never be updated via this user profile endpoint
    [
        'password', 'role', 'id', '_id',
        'purchasedCourseIds', 'purchasedNoteIds', 'purchasedComboIds',
        'archivedCourseIds', 'archivedNoteIds',
        'credits', 'unlimitedPlan',
        'freeQuizUsedToday', 'lastReset',
        'sessionToken'
    ].forEach(k => delete updates[k]);

    try {
        const user = await User.findOneAndUpdate({ id }, updates, { new: true, projection: { password: 0, __v: 0 } });
        if (!user) { res.status(404).json({ error: 'User not found' }); return; }
        res.json(sanitizeUser(user));
    } catch (err) {
        logger.error('[Users] updateUser:', err);
        res.status(500).json({ error: 'An internal error occurred' });
    }
}

export async function getTeacherStats(req: express.Request, res: express.Response): Promise<void> {
    const { id } = req.params;
    try {
        const [courses, notes, quizzes, vivas] = await Promise.all([
            Course.find({ teacherId: id }, { id: 1, title: 1 }).lean(),
            Note.find({ teacherId: id }, { id: 1, title: 1 }).lean(),
            // Imported from content models — keep imports lean
            (await import('../models/index.js')).Quiz.find({ teacherId: id }, { id: 1, title: 1 }).lean(),
            (await import('../models/index.js')).Viva.find({ teacherId: id }, { id: 1, title: 1 }).lean(),
        ]);

        const revenueAgg = await Purchase.aggregate([
            { $match: { teacherId: id } },
            { $group: { _id: null, total: { $sum: '$amountPaid' }, count: { $sum: 1 } } }
        ]);
        const totalRevenue = revenueAgg[0]?.total || 0;
        const totalUnitsSold = revenueAgg[0]?.count || 0;

        const productAgg = await Purchase.aggregate([
            { $match: { teacherId: id } },
            { $group: { _id: '$productId', unitsSold: { $sum: 1 }, grossRevenue: { $sum: '$amountPaid' }, productType: { $first: '$productType' } } }
        ]);

        const titleMap = new Map<string, { title: string; type: string }>();
        [...courses, ...notes].forEach((p: any) => titleMap.set(p.id, { title: p.title, type: 'COURSE' }));
        (quizzes as any[]).forEach((p: any) => titleMap.set(p.id, { title: p.title, type: 'QUIZ' }));
        (vivas as any[]).forEach((p: any) => titleMap.set(p.id, { title: p.title, type: 'VIVA' }));

        const products = productAgg.map((row: any) => ({
            productId: row._id,
            title: titleMap.get(row._id)?.title || 'Unknown Product',
            type: titleMap.get(row._id)?.type || row.productType?.toUpperCase() || 'NOTE',
            unitsSold: row.unitsSold,
            grossRevenue: row.grossRevenue,
        })).sort((a: any, b: any) => b.grossRevenue - a.grossRevenue);

        res.json({
            totalProducts: courses.length + notes.length + (quizzes as any[]).length + (vivas as any[]).length,
            totalRevenue, totalUnitsSold, products,
        });
    } catch (err) {
        logger.error('[Users] getTeacherStats:', err);
        res.status(500).json({ error: 'An internal error occurred' });
    }
}

// ─── Subjects (Re-exported from subject.controller.js) ────────────────────────
export { getSubjects, createSubject } from './subject.controller.js';

// ─── Note Purchases ───────────────────────────────────────────────────────────

function assertString(val: string | undefined, name: string): string {
    if (!val) throw new Error(`${name} is not set`);
    return val;
}

async function resolveNoteCoupon(noteId: string, couponId?: string): Promise<{
    couponId: string | null;
    discountedPrice: number;
    discountAmount: number;
}> {
    const note = await Note.findOne({ id: noteId }).lean() as any;
    if (!note) throw new Error('Note not found');

    const originalPrice = Math.max(0, Number(note.price) || 0);
    if (!couponId) {
        return { couponId: null, discountedPrice: originalPrice, discountAmount: 0 };
    }

    const coupon = await Coupon.findOne({ id: couponId, productId: noteId, productType: 'note', isActive: true }).lean() as any;
    if (!coupon) throw new Error('Invalid coupon');
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) throw new Error('This coupon has expired');
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) throw new Error('This coupon has reached its usage limit');

    const discountedPrice = applyDiscount(originalPrice, coupon.discountType, coupon.discountValue);
    return {
        couponId: coupon.id,
        discountedPrice,
        discountAmount: Math.max(0, originalPrice - discountedPrice),
    };
}

export async function createNoteOrder(req: express.Request, res: express.Response): Promise<void> {
    const noteId = req.params.id as string;
    const userId = (req as any).currentUser.id as string;
    const couponId = req.body?.couponId as string | undefined;
    try {
        const note = await Note.findOne({ id: noteId }).lean();
        if (!note) { res.status(404).json({ error: 'Note not found' }); return; }
        const couponPricing = await resolveNoteCoupon(noteId, couponId);

        const { appId, secretKey } = getCashfreeKeys();
        if (!appId || !secretKey || couponPricing.discountedPrice <= 0) {
            // Dev mode, or a 100% coupon: grant access directly after server-side validation.
            try {
                const user = await User.findOne({ id: userId });
                if (!user) { res.status(404).json({ error: 'User not found' }); return; }
                if (!Array.isArray(user.purchasedNoteIds)) user.purchasedNoteIds = [];
                if (!user.purchasedNoteIds.includes(noteId)) {
                    user.purchasedNoteIds.push(noteId);
                    await user.save();
                    const teacherId = (note as any).teacherId || 'admin';
                    const expiresAt = calculateItemExpiryDate(note as any);
                    await Purchase.create({
                        id: randomUUID(), userId, productId: noteId,
                        teacherId, productType: 'note',
                        amountPaid: couponPricing.discountedPrice,
                        couponId: couponPricing.couponId,
                        discountAmount: couponPricing.discountAmount,
                        expiresAt,
                    }).catch(err => { logger.warn('[Notes] Purchase record creation non-fatal error:', err); });
                    if (couponPricing.couponId) await incrementCouponUsage(couponPricing.couponId);
                }
                res.json({ devMode: true, user: sanitizeUser(user) });
            } catch (e) { throw e; }
            return;
        }

        const order = await createCashfreeOrder(
            Math.round(couponPricing.discountedPrice * 100),
            `note_${noteId.slice(0, 8)}_${Date.now().toString().slice(-10)}`,
            { noteId, userId, couponId: couponPricing.couponId || '', discountAmount: String(couponPricing.discountAmount) },
            appId!, secretKey!
        );
        res.json({
            orderId: order.order_id,
            paymentSessionId: order.payment_session_id,
            amount: order.order_amount,
            currency: order.order_currency,
            appId: appId!,
            couponId: couponPricing.couponId,
            discountAmount: couponPricing.discountAmount,
        });
    } catch (err) {
        logger.error('[Notes] createNoteOrder:', err);
        res.status(err instanceof Error && err.message.includes('coupon') ? 400 : 500).json({ error: err instanceof Error ? err.message : 'An internal error occurred' });
    }
}

export async function verifyNotePurchase(req: express.Request, res: express.Response): Promise<void> {
    const noteId = req.params.id as string;
    const userId = (req as any).currentUser.id as string;
    const cashfree_order_id = req.body.cashfree_order_id as string;
    const cashfree_payment_session_id = req.body.cashfree_payment_session_id as string;
    const couponId = req.body.couponId as string | undefined;

    const { appId, secretKey } = getCashfreeKeys();
    if (!appId || !secretKey) { res.status(500).json({ error: 'Payment not configured' }); return; }

    try {
        const isValid = await verifyCashfreePayment(cashfree_order_id, appId!, secretKey!);
        if (!isValid) { res.status(400).json({ error: 'Invalid payment signature — possible fraud attempt' }); return; }

        try {
            const [user, note] = await Promise.all([
                User.findOne({ id: userId }),
                Note.findOne({ id: noteId }).lean()
            ]);
            if (!user) { res.status(404).json({ error: 'User not found' }); return; }
            if (!note) { res.status(404).json({ error: 'Note not found' }); return; }
            const couponPricing = await resolveNoteCoupon(noteId, couponId);

            if (!Array.isArray(user.purchasedNoteIds)) user.purchasedNoteIds = [];
            if (!user.purchasedNoteIds.includes(noteId)) {
                user.purchasedNoteIds.push(noteId);
                await user.save();
                const teacherId = (note as any).teacherId || 'admin';
                const expiresAt = calculateItemExpiryDate(note as any);
                await Purchase.create({
                    id: randomUUID(), userId, productId: noteId,
                    teacherId, productType: 'note',
                    amountPaid: couponPricing.discountedPrice,
                    couponId: couponPricing.couponId,
                    discountAmount: couponPricing.discountAmount,
                    cashfreeOrderId: cashfree_order_id,
                    cashfreePaymentId: cashfree_payment_session_id,
                    expiresAt,
                }).catch(err => { logger.warn('[Notes] Purchase record creation non-fatal error:', err); });
                if (couponPricing.couponId) await incrementCouponUsage(couponPricing.couponId);
            }
            res.json({ success: true, user: sanitizeUser(user) });
        } catch (e) { throw e; }
    } catch (err) {
        logger.error('[Notes] verifyNotePurchase:', err);
        res.status(500).json({ error: 'An internal error occurred' });
    }
}

export async function purchaseNoteFree(req: express.Request, res: express.Response): Promise<void> {
    const noteId = req.params.id as string;
    const userId = (req as any).currentUser?.id as string;
    if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    try {
        await syncUserExpiredPurchases(userId);
        const [note, user] = await Promise.all([
            Note.findOne({ id: noteId }).lean(),
            User.findOne({ id: userId })
        ]);
        if (!note) { res.status(404).json({ error: 'Note not found' }); return; }
        if (!user) { res.status(404).json({ error: 'User not found' }); return; }
        
        // Security Check: Ensure note is free or user is from college
        const collegeDomain = note.collegeConfig?.emailDomain?.trim().toLowerCase();
        const isCollegeFree = !!collegeDomain && collegeDomain.length >= 3 && user.email.toLowerCase().endsWith(collegeDomain);
        if ((note.price ?? 0) > 0 && !isCollegeFree) {
            res.status(403).json({ error: 'This note requires payment' }); return;
        }

        if (!Array.isArray(user.purchasedNoteIds)) {
            user.purchasedNoteIds = [];
        }

        if (user.purchasedNoteIds.includes(noteId)) {
            res.status(400).json({ error: 'Already purchased' }); return;
        }
        user.purchasedNoteIds.push(noteId);
        await user.save();

        const teacherId = (note as any).teacherId || 'admin';
        const expiresAt = calculateItemExpiryDate(note as any);
        await Purchase.create({
            id: randomUUID(),
            userId,
            productId: noteId,
            teacherId,
            productType: 'note',
            amountPaid: 0,
            expiresAt,
        }).catch(err => {
            logger.warn('[Notes] Purchase record creation non-fatal error:', err);
        });

        res.json({ success: true, user: sanitizeUser(user), message: 'Purchase successful' });
    } catch (err) {
        logger.error('[Notes] purchaseNoteFree:', err);
        res.status(500).json({ error: 'An internal error occurred' });
    }
}

// ─── Courses ──────────────────────────────────────────────────────────────────

async function resolveCourseCoupon(courseId: string, couponId?: string): Promise<{
    couponId: string | null;
    discountedPrice: number;
    discountAmount: number;
}> {
    const course = await Course.findOne({ id: courseId }).lean() as any;
    if (!course) throw new Error('Course not found');

    const originalPrice = Math.max(0, Number(course.price) || 0);
    if (!couponId) {
        return { couponId: null, discountedPrice: originalPrice, discountAmount: 0 };
    }

    const coupon = await Coupon.findOne({ id: couponId, productId: courseId, productType: 'course', isActive: true }).lean() as any;
    if (!coupon) throw new Error('Invalid coupon');
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) throw new Error('This coupon has expired');
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) throw new Error('This coupon has reached its usage limit');

    const discountedPrice = applyDiscount(originalPrice, coupon.discountType, coupon.discountValue);
    return {
        couponId: coupon.id,
        discountedPrice,
        discountAmount: Math.max(0, originalPrice - discountedPrice),
    };
}

export async function createCourseOrder(req: express.Request, res: express.Response): Promise<void> {
    const courseId = req.params.id as string;
    const userId = (req as any).currentUser.id as string;
    const couponId = req.body?.couponId as string | undefined;
    try {
        const course = await Course.findOne({ id: courseId }).lean();
        if (!course) { res.status(404).json({ error: 'Course not found' }); return; }
        const couponPricing = await resolveCourseCoupon(courseId, couponId);

        const { appId, secretKey } = getCashfreeKeys();
        if (!appId || !secretKey || couponPricing.discountedPrice <= 0) {
            // Dev mode, or a 100% coupon: grant access directly.
            try {
                const user = await User.findOne({ id: userId });
                if (!user) { res.status(404).json({ error: 'User not found' }); return; }
                if (!Array.isArray(user.purchasedCourseIds)) user.purchasedCourseIds = [];
                if (!user.purchasedCourseIds.includes(courseId)) {
                    user.purchasedCourseIds.push(courseId);
                    await user.save();
                    const teacherId = (course as any).teacherId || 'admin';
                    const expiresAt = calculateItemExpiryDate(course as any);
                    await Purchase.create({
                        id: randomUUID(), userId, productId: courseId,
                        teacherId, productType: couponPricing.discountedPrice <= 0 ? 'free' : 'course',
                        amountPaid: couponPricing.discountedPrice,
                        couponId: couponPricing.couponId,
                        discountAmount: couponPricing.discountAmount,
                        expiresAt,
                    }).catch(err => { logger.warn('[Courses] Purchase record creation non-fatal error:', err); });
                    if (couponPricing.couponId) await incrementCouponUsage(couponPricing.couponId);
                }
                res.json({ devMode: true, user: sanitizeUser(user) });
            } catch (e) { throw e; }
            return;
        }

        const order = await createCashfreeOrder(
            Math.round(couponPricing.discountedPrice * 100),
            `course_${courseId.slice(0, 8)}_${Date.now().toString().slice(-10)}`,
            { courseId, userId, couponId: couponPricing.couponId || '', discountAmount: String(couponPricing.discountAmount) },
            appId!, secretKey!
        );
        res.json({
            orderId: order.order_id,
            paymentSessionId: order.payment_session_id,
            amount: order.order_amount,
            currency: order.order_currency,
            appId: appId!,
            couponId: couponPricing.couponId,
            discountAmount: couponPricing.discountAmount,
        });
    } catch (err) {
        logger.error('[Courses] createCourseOrder:', err);
        res.status(err instanceof Error && err.message.includes('coupon') ? 400 : 500).json({ error: err instanceof Error ? err.message : 'An internal error occurred' });
    }
}

export async function verifyCoursePayment(req: express.Request, res: express.Response): Promise<void> {
    const courseId = req.params.id as string;
    const userId = (req as any).currentUser.id as string;
    const cashfree_order_id = req.body.cashfree_order_id as string;
    const cashfree_payment_session_id = req.body.cashfree_payment_session_id as string;
    const couponId = req.body.couponId as string | undefined;

    const { appId, secretKey } = getCashfreeKeys();
    if (!appId || !secretKey) { res.status(500).json({ error: 'Payment not configured' }); return; }

    try {
        const isValid = await verifyCashfreePayment(cashfree_order_id, appId!, secretKey!);
        if (!isValid) { res.status(400).json({ error: 'Invalid payment signature — possible fraud attempt' }); return; }

        try {
            const [user, course] = await Promise.all([
                User.findOne({ id: userId }),
                Course.findOne({ id: courseId }).lean()
            ]);
            if (!user) { res.status(404).json({ error: 'User not found' }); return; }
            if (!course) { res.status(404).json({ error: 'Course not found' }); return; }
            const couponPricing = await resolveCourseCoupon(courseId, couponId);

            if (!Array.isArray(user.purchasedCourseIds)) user.purchasedCourseIds = [];
            if (!user.purchasedCourseIds.includes(courseId)) {
                user.purchasedCourseIds.push(courseId);
                await user.save();
                const teacherId = (course as any).teacherId || 'admin';
                const expiresAt = calculateItemExpiryDate(course as any);
                await Purchase.create({
                    id: randomUUID(), userId, productId: courseId,
                    teacherId, productType: 'course',
                    amountPaid: couponPricing.discountedPrice,
                    couponId: couponPricing.couponId,
                    discountAmount: couponPricing.discountAmount,
                    cashfreeOrderId: cashfree_order_id,
                    cashfreePaymentId: cashfree_payment_session_id,
                    expiresAt,
                }).catch(err => { logger.warn('[Courses] Purchase record creation non-fatal error:', err); });
                if (couponPricing.couponId) await incrementCouponUsage(couponPricing.couponId);
            }
            res.json({ success: true, user: sanitizeUser(user) });
        } catch (e) { throw e; }
    } catch (err) {
        logger.error('[Courses] verifyCoursePayment:', err);
        res.status(500).json({ error: 'An internal error occurred' });
    }
}

export async function enrollCourseFree(req: express.Request, res: express.Response): Promise<void> {
    const courseId = req.params.id as string;
    const userId = (req as any).currentUser?.id as string;
    if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    try {
        await syncUserExpiredPurchases(userId);
        const [course, user] = await Promise.all([
            Course.findOne({ id: courseId }).lean(),
            User.findOne({ id: userId })
        ]);
        if (!course) { res.status(404).json({ error: 'Course not found' }); return; }
        if (!user) { res.status(404).json({ error: 'User not found' }); return; }

        // Security Check: Ensure course is free or user is from college
        const collegeDomain = course.collegeConfig?.emailDomain?.trim().toLowerCase();
        const isCollegeFree = !!collegeDomain && collegeDomain.length >= 3 && user.email.toLowerCase().endsWith(collegeDomain);
        if ((course.price ?? 0) > 0 && !isCollegeFree) {
            res.status(403).json({ error: 'This course requires payment' }); return;
        }

        if (!Array.isArray(user.purchasedCourseIds)) {
            user.purchasedCourseIds = [];
        }

        if (user.purchasedCourseIds.includes(courseId)) {
            res.status(400).json({ error: 'Already enrolled' }); return;
        }

        user.purchasedCourseIds.push(courseId);
        await user.save();

        const teacherId = (course as any).teacherId || 'admin';
        const expiresAt = calculateItemExpiryDate(course as any);
        await Purchase.create({
            id: randomUUID(),
            userId,
            productId: courseId,
            teacherId,
            productType: 'course',
            amountPaid: 0,
            expiresAt,
        }).catch(err => {
            logger.warn('[Courses] Purchase record creation non-fatal error:', err);
        });

        res.json({ success: true, user: sanitizeUser(user), message: 'Enrolled successfully' });
    } catch (err) {
        logger.error('[Courses] enrollCourseFree:', err);
        res.status(500).json({ error: 'An internal error occurred' });
    }
}

// ─── Credits ──────────────────────────────────────────────────────────────────

const FREE_QUIZ_LIMIT = 3;

export const CREDIT_PLANS: Record<string, { credits?: number; unlimited?: boolean; hours?: number; price: number }> = {
    '15':            { credits: 15,  price: 2900 },
    '25':            { credits: 25,  price: 4500 },
    '75':            { credits: 75,  price: 9900 },
    'unlimited_24h': { unlimited: true, hours: 24, price: 1900 },
};

export async function getCredits(req: express.Request, res: express.Response): Promise<void> {
    try {
        const userId = (req as any).currentUser.id;
        const user = await User.findOne({ id: userId }).lean();
        if (!user) { res.status(404).json({ error: 'User not found' }); return; }
        res.json({
            credits: user.credits ?? 0,
            freeQuizUsed: user.freeQuizUsedToday ?? 0,
            freeQuizLimit: FREE_QUIZ_LIMIT,
            unlimitedPlan: user.unlimitedPlan ?? { active: false, expiresAt: null }
        });
    } catch (err) {
        logger.error('[Credits] getCredits:', err);
        res.status(500).json({ error: 'An internal error occurred' });
    }
}

export async function consumeCredit(req: express.Request, res: express.Response): Promise<void> {
    try {
        const userId = (req as any).currentUser.id;
        const user = await User.findOne({ id: userId });
        if (!user) { res.status(404).json({ error: 'User not found' }); return; }

        // Safety net: if the scheduler missed a midnight reset (e.g. server was down),
        // reset inline when we see a stale lastReset date.
        const now = new Date();
        const lastReset = user.lastReset ? new Date(user.lastReset) : new Date(0);
        const isNewDay = lastReset.toDateString() !== now.toDateString();
        if (isNewDay) {
            await User.updateOne({ id: userId }, { freeQuizUsedToday: 0, lastReset: now });
            user.freeQuizUsedToday = 0;
        }

        const unlimited = user.unlimitedPlan;
        if (unlimited?.active && unlimited.expiresAt && new Date(unlimited.expiresAt) > now) {
            res.json({ ok: true, method: 'unlimited', credits: user.credits ?? 0, freeQuizUsed: user.freeQuizUsedToday ?? 0 });
            return;
        }

        const freeUsed = user.freeQuizUsedToday ?? 0;
        if (freeUsed < FREE_QUIZ_LIMIT) {
            await User.updateOne({ id: userId }, { $inc: { freeQuizUsedToday: 1 } });
            res.json({ ok: true, method: 'free', credits: user.credits ?? 0, freeQuizUsed: freeUsed + 1 });
            return;
        }

        const credits = user.credits ?? 0;
        if (credits <= 0) { res.status(402).json({ error: 'No credits', freeQuizUsed: freeUsed, credits: 0 }); return; }

        await User.updateOne({ id: userId }, { $inc: { credits: -1 } });
        res.json({ ok: true, method: 'credit', credits: credits - 1, freeQuizUsed: freeUsed });
    } catch (err) {
        logger.error('[Credits] consumeCredit:', err);
        res.status(500).json({ error: 'An internal error occurred' });
    }
}

export async function createCreditOrder(req: express.Request, res: express.Response): Promise<void> {
    try {
        const { plan } = req.body as { plan: string };
        const selected = CREDIT_PLANS[plan];
        if (!selected) { res.status(400).json({ error: 'Invalid plan' }); return; }

        const { appId, secretKey } = getCashfreeKeys();
        const userId = (req as any).currentUser.id;

        if (!appId || !secretKey) {
            // Dev mode
            if (selected.unlimited) {
                const expiresAt = new Date(Date.now() + selected.hours! * 3600000);
                await User.updateOne({ id: userId }, { 'unlimitedPlan.active': true, 'unlimitedPlan.expiresAt': expiresAt });
                res.json({ devMode: true, ok: true });
            } else {
                const u = await User.findOneAndUpdate({ id: userId }, { $inc: { credits: selected.credits! } }, { new: true });
                res.json({ devMode: true, ok: true, credits: u?.credits ?? 0 });
            }
            return;
        }

        const order = await createCashfreeOrder(
            selected.price,
            `credit_${plan}_${Date.now().toString().slice(-10)}`,
            { plan, userId },
            appId!, secretKey!
        );
        res.json({
            orderId: order.order_id,
            paymentSessionId: order.payment_session_id,
            amount: order.order_amount,
            currency: order.order_currency,
        });
    } catch (err) {
        logger.error('[Credits] createCreditOrder:', err);
        res.status(500).json({ error: 'An internal error occurred' });
    }
}

export async function verifyCreditPayment(req: express.Request, res: express.Response): Promise<void> {
    try {
    const cashfree_order_id = req.body.cashfree_order_id as string;
    const cashfree_payment_session_id = req.body.cashfree_payment_session_id as string;
    const plan = req.body.plan as string;
        const { appId, secretKey } = getCashfreeKeys();
        if (!appId || !secretKey) { res.status(500).json({ error: 'Payment not configured' }); return; }

        const isValid = await verifyCashfreePayment(cashfree_order_id, appId!, secretKey!);
        if (!isValid) { res.status(400).json({ error: 'Invalid payment signature' }); return; }

        const userId = (req as any).currentUser.id;
        const selected = CREDIT_PLANS[plan];
        if (!selected) { res.status(400).json({ error: 'Invalid plan' }); return; }

        if (selected.unlimited) {
            const expiresAt = new Date(Date.now() + selected.hours! * 3600000);
            await User.updateOne({ id: userId }, { 'unlimitedPlan.active': true, 'unlimitedPlan.expiresAt': expiresAt });
            res.json({ ok: true, unlimitedPlan: { active: true, expiresAt } });
        } else {
            const user = await User.findOneAndUpdate({ id: userId }, { $inc: { credits: selected.credits! } }, { new: true });
            res.json({ ok: true, credits: user?.credits ?? 0 });
        }
    } catch (err) {
        logger.error('[Credits] verifyCreditPayment:', err);
        res.status(500).json({ error: 'An internal error occurred' });
    }
}

// ─── Video Key ────────────────────────────────────────────────────────────────

export async function getVideoKey(req: express.Request, res: express.Response): Promise<void> {
    try {
        const user = (req as any).currentUser;
        const videoId = req.params.videoId as string;

        const course = await Course.findOne({ 'modules.videos.videoId': videoId }).lean();
        if (!course) { res.status(404).send('Video not found'); return; }

        const hasPurchased =
            (Array.isArray(user.purchasedCourseIds) && user.purchasedCourseIds.includes((course as any).id)) ||
            (Array.isArray(user.purchasedNoteIds) && user.purchasedNoteIds.includes((course as any).id));
        const isOwner = user.role === UserRole.TEACHER && (course as any).teacherId === user.id;
        const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
        const isPreviewVideo = (course as any).modules?.[0]?.videos?.some((v: any) => v.videoId === videoId);

        if (!hasPurchased && !isOwner && !isAdmin && !isPreviewVideo) {
            res.status(403).send('Forbidden: Enrollment required'); return;
        }

        if (hasPurchased && !isOwner && !isAdmin && !isPreviewVideo) {
            const courseId = (course as any).id;
            const now = new Date();
            const sixMonthsAgo = new Date(now);
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

            const activePurchase = await Purchase.findOne({
                userId: user.id,
                productId: courseId,
                $or: [
                    { expiresAt: { $gt: now } },
                    { expiresAt: null, createdAt: { $gt: sixMonthsAgo } }
                ]
            }).lean();

            if (!activePurchase) {
                await User.updateOne({ id: user.id }, { $pull: { purchasedCourseIds: courseId } });
                res.status(403).send('Forbidden: Course access has expired');
                return;
            }
        }

        const record = await VideoKey.findOne({ videoId });
        if (!record) { res.status(404).send('Encryption key not found'); return; }

        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.send(Buffer.from(record.keyHex, 'hex'));
    } catch (err) {
        logger.error('[Video] getVideoKey:', err);
        res.status(500).json({ error: 'An internal error occurred' });
    }
}

export async function getMyPurchases(req: express.Request, res: express.Response): Promise<void> {
    const userId = (req as any).currentUser?.id as string;
    if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    try {
        await syncUserExpiredPurchases(userId);

        const purchases = await Purchase.find({ userId }).sort({ createdAt: -1 }).lean();
        const now = new Date();

        const result = purchases.map((p: any) => {
            const isExpired = isPurchaseExpired(p);
            let daysRemaining: number | null = null;
            if (!isExpired) {
                const expiryDate = p.expiresAt ? new Date(p.expiresAt) : new Date(new Date(p.createdAt).setMonth(new Date(p.createdAt).getMonth() + 6));
                const diffTime = expiryDate.getTime() - now.getTime();
                daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
            }

            return {
                id: p.id,
                userId: p.userId,
                productId: p.productId,
                teacherId: p.teacherId,
                productType: p.productType,
                amountPaid: p.amountPaid,
                createdAt: p.createdAt,
                expiresAt: p.expiresAt || null,
                isExpired,
                daysRemaining
            };
        });

        res.json(result);
    } catch (err) {
        logger.error('[User] getMyPurchases:', err);
        res.status(500).json({ error: 'An internal error occurred' });
    }
}

// ─── Combo Purchases & Access Fulfillment ──────────────────────────────────────

export async function fulfillComboAccess(
    userId: string,
    comboId: string,
    paymentMeta?: { cashfreeOrderId?: string; cashfreePaymentId?: string; amountPaid?: number }
): Promise<{ user: any; coursesUnlocked: number; notesUnlocked: number }> {
    const [user, combo] = await Promise.all([
        User.findOne({ id: userId }),
        Combo.findOne({ id: comboId }).lean() as any
    ]);
    if (!user) throw new Error('User not found');
    if (!combo) throw new Error('Combo not found');

    const subjectIds = Array.isArray(combo.subjectIds) ? combo.subjectIds : [];
    const comboType = combo.comboType || 'all';

    // Find all matching courses and notes for these subjects
    const [targetCourses, targetNotes] = await Promise.all([
        comboType === 'notes' ? [] : Course.find({ subjectId: { $in: subjectIds } }).lean(),
        comboType === 'courses' ? [] : Note.find({ subjectId: { $in: subjectIds } }).lean()
    ]);

    const expiresAt = calculateItemExpiryDate(combo);

    if (!Array.isArray(user.purchasedCourseIds)) user.purchasedCourseIds = [];
    if (!Array.isArray(user.purchasedNoteIds)) user.purchasedNoteIds = [];
    if (!Array.isArray((user as any).purchasedComboIds)) (user as any).purchasedComboIds = [];

    // Add combo ID
    if (!(user as any).purchasedComboIds.includes(comboId)) {
        (user as any).purchasedComboIds.push(comboId);
    }

    // Add course IDs
    for (const c of targetCourses) {
        if (!user.purchasedCourseIds.includes(c.id)) {
            user.purchasedCourseIds.push(c.id);
        }
    }

    // Add note IDs
    for (const n of targetNotes) {
        if (!user.purchasedNoteIds.includes(n.id)) {
            user.purchasedNoteIds.push(n.id);
        }
    }

    await user.save();

    // Create master Purchase record for the combo
    const amountPaid = paymentMeta?.amountPaid ?? (combo.price || 0);
    const teacherId = combo.teacherId || 'admin';

    await Purchase.create({
        id: randomUUID(),
        userId,
        productId: comboId,
        teacherId,
        productType: amountPaid <= 0 ? 'free' : 'combo',
        amountPaid,
        cashfreeOrderId: paymentMeta?.cashfreeOrderId,
        cashfreePaymentId: paymentMeta?.cashfreePaymentId,
        expiresAt
    }).catch(err => { logger.warn('[Combo] Master purchase record non-fatal error:', err); });

    // Create individual sub-purchase records for each course so HLS video decryption key-gate succeeds
    for (const c of targetCourses) {
        const existingPurchase = await Purchase.findOne({
            userId,
            productId: c.id,
            $or: [{ expiresAt: { $gt: new Date() } }, { expiresAt: null }]
        }).lean();

        if (!existingPurchase) {
            await Purchase.create({
                id: randomUUID(),
                userId,
                productId: c.id,
                teacherId: (c as any).teacherId || teacherId,
                productType: 'course',
                amountPaid: 0,
                cashfreeOrderId: paymentMeta?.cashfreeOrderId ? `${paymentMeta.cashfreeOrderId}_sub_${c.id}` : undefined,
                expiresAt
            }).catch(err => { logger.warn('[Combo] Sub-course purchase record non-fatal error:', err); });
        }
    }

    // Create individual sub-purchase records for each note so secure PDF file streaming succeeds
    for (const n of targetNotes) {
        const existingPurchase = await Purchase.findOne({
            userId,
            productId: n.id,
            $or: [{ expiresAt: { $gt: new Date() } }, { expiresAt: null }]
        }).lean();

        if (!existingPurchase) {
            await Purchase.create({
                id: randomUUID(),
                userId,
                productId: n.id,
                teacherId: (n as any).teacherId || teacherId,
                productType: 'note',
                amountPaid: 0,
                cashfreeOrderId: paymentMeta?.cashfreeOrderId ? `${paymentMeta.cashfreeOrderId}_sub_${n.id}` : undefined,
                expiresAt
            }).catch(err => { logger.warn('[Combo] Sub-note purchase record non-fatal error:', err); });
        }
    }

    logger.info(`[Combo] Fulfilled combo ${comboId} for user ${userId}: ${targetCourses.length} courses, ${targetNotes.length} notes unlocked.`);

    return {
        user,
        coursesUnlocked: targetCourses.length,
        notesUnlocked: targetNotes.length
    };
}

export async function createComboOrder(req: express.Request, res: express.Response): Promise<void> {
    const comboId = req.params.id as string;
    const userId = (req as any).currentUser.id as string;

    try {
        const combo = await Combo.findOne({ id: comboId }).lean() as any;
        if (!combo) { res.status(404).json({ error: 'Combo not found' }); return; }

        const price = Math.max(0, Number(combo.price) || 0);
        const { appId, secretKey } = getCashfreeKeys();

        if (!appId || !secretKey || price <= 0) {
            // Dev mode or 100% free combo: fulfill access immediately
            const result = await fulfillComboAccess(userId, comboId, { amountPaid: price });
            res.json({
                devMode: true,
                user: sanitizeUser(result.user),
                coursesUnlocked: result.coursesUnlocked,
                notesUnlocked: result.notesUnlocked
            });
            return;
        }

        const order = await createCashfreeOrder(
            Math.round(price * 100),
            `combo_${comboId.slice(0, 8)}_${Date.now().toString().slice(-10)}`,
            { comboId, userId },
            appId!,
            secretKey!
        );

        res.json({
            orderId: order.order_id,
            paymentSessionId: order.payment_session_id,
            amount: order.order_amount,
            currency: order.order_currency,
            appId: appId!
        });
    } catch (err) {
        logger.error('[Combos] createComboOrder:', err);
        res.status(500).json({ error: err instanceof Error ? err.message : 'An internal error occurred' });
    }
}

export async function verifyComboPurchase(req: express.Request, res: express.Response): Promise<void> {
    const comboId = req.params.id as string;
    const userId = (req as any).currentUser.id as string;
    const cashfree_order_id = req.body.cashfree_order_id as string;
    const cashfree_payment_session_id = req.body.cashfree_payment_session_id as string;

    const { appId, secretKey } = getCashfreeKeys();
    if (!appId || !secretKey) {
        res.status(500).json({ error: 'Payment not configured' });
        return;
    }

    try {
        const isValid = await verifyCashfreePayment(cashfree_order_id, appId!, secretKey!);
        if (!isValid) {
            res.status(400).json({ error: 'Invalid payment signature — possible fraud attempt' });
            return;
        }

        const combo = await Combo.findOne({ id: comboId }).lean() as any;
        if (!combo) { res.status(404).json({ error: 'Combo not found' }); return; }

        const result = await fulfillComboAccess(userId, comboId, {
            cashfreeOrderId: cashfree_order_id,
            cashfreePaymentId: cashfree_payment_session_id,
            amountPaid: combo.price
        });

        res.json({
            success: true,
            user: sanitizeUser(result.user),
            coursesUnlocked: result.coursesUnlocked,
            notesUnlocked: result.notesUnlocked
        });
    } catch (err) {
        logger.error('[Combos] verifyComboPurchase:', err);
        res.status(500).json({ error: 'An internal error occurred' });
    }
}

export async function enrollComboFree(req: express.Request, res: express.Response): Promise<void> {
    const comboId = req.params.id as string;
    const userId = (req as any).currentUser?.id as string;
    if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    try {
        await syncUserExpiredPurchases(userId);
        const [combo, user] = await Promise.all([
            Combo.findOne({ id: comboId }).lean() as any,
            User.findOne({ id: userId })
        ]);
        if (!combo) { res.status(404).json({ error: 'Combo not found' }); return; }
        if (!user) { res.status(404).json({ error: 'User not found' }); return; }

        // College specific free check
        const collegeDomain = combo.collegeConfig?.emailDomain?.trim().toLowerCase();
        const isCollegeFree = !!collegeDomain && collegeDomain.length >= 3 && user.email.toLowerCase().endsWith(collegeDomain);

        if ((combo.price ?? 0) > 0 && !isCollegeFree) {
            res.status(403).json({ error: 'This combo requires payment' });
            return;
        }

        const result = await fulfillComboAccess(userId, comboId, { amountPaid: 0 });
        res.json({
            success: true,
            user: sanitizeUser(result.user),
            coursesUnlocked: result.coursesUnlocked,
            notesUnlocked: result.notesUnlocked
        });
    } catch (err) {
        logger.error('[Combos] enrollComboFree:', err);
        res.status(500).json({ error: 'An internal error occurred' });
    }
}

