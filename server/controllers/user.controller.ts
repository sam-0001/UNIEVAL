import express from 'express';
import mongoose from 'mongoose';
import { randomUUID } from 'crypto';
import { User, Course, Note, Subject, Purchase, VideoKey, Coupon } from '../models/index.js';
import { UserRole } from '../../types.js';
import { sanitizeUser, generateId, findUserByEmail } from './auth.controller.js';
import { applyDiscount, incrementCouponUsage } from './coupon.controller.js';
import logger from '../logger.js';

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
    // Strip fields that must never be updated via this endpoint
    ['password', 'role', 'id', '_id', 'purchasedNoteIds'].forEach(k => delete updates[k]);

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

// ─── Subjects ─────────────────────────────────────────────────────────────────

export async function getSubjects(req: express.Request, res: express.Response): Promise<void> {
    const query: any = {};
    if (req.query.year) query.year = Number(req.query.year as string);
    if (req.query.branch) query.branch = String(req.query.branch);
    try {
        res.json(await Subject.find(query).lean());
    } catch (err) {
        logger.error('[Subjects] getSubjects:', err);
        res.status(500).json({ error: 'An internal error occurred' });
    }
}

export async function createSubject(req: express.Request, res: express.Response): Promise<void> {
    const { name, code, branch, year } = req.body;
    if (!name || !branch || !year) {
        res.status(400).json({ error: 'Name, branch, and year are required' }); return;
    }
    try {
        const existing = await Subject.findOne({
            name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'), branch, year
        });
        if (existing) { res.json(existing); return; }
        const newSubject = await Subject.create({
            id: generateId(), name,
            code: code || name.substring(0, 3).toUpperCase(),
            branch, year
        });
        res.json(newSubject);
    } catch (err) {
        logger.error('[Subjects] createSubject:', err);
        res.status(500).json({ error: 'An internal error occurred' });
    }
}

// ─── Note Purchases ───────────────────────────────────────────────────────────

function getCashfreeKeys(): { appId: string | undefined; secretKey: string | undefined } {
    return {
        appId: process.env.CASHFREE_APP_ID,
        secretKey: process.env.CASHFREE_SECRET_KEY,
    };
}

function assertString(val: string | undefined, name: string): string {
    if (!val) throw new Error(`${name} is not set`);
    return val;
}

async function createCashfreeOrder(amount: number, receipt: string, notes: Record<string, string>, appId: string, secretKey: string) {
    const url = process.env.NODE_ENV === 'production' ? 'https://api.cashfree.com/pg/orders' : 'https://sandbox.cashfree.com/pg/orders';
    const orderRes = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-client-id': appId,
            'x-client-secret': secretKey,
            'x-api-version': '2023-08-01'
        },
        body: JSON.stringify({
            order_amount: amount / 100, // Cashfree expects amount in INR
            order_currency: 'INR',
            order_id: receipt,
            customer_details: {
                customer_id: notes.userId || 'user_123',
                customer_phone: '9999999999',
            },
            order_meta: {
                return_url: `https://unieval.in/payment-callback?order_id={order_id}`
            },
            order_tags: notes
        })
    });
    const order = await orderRes.json() as any;
    if (!orderRes.ok) throw new Error(order.message || 'Failed to create order');
    return order;
}

async function verifyCashfreePayment(orderId: string, appId: string, secretKey: string): Promise<boolean> {
    const url = process.env.NODE_ENV === 'production' ? 'https://api.cashfree.com/pg/orders' : 'https://sandbox.cashfree.com/pg/orders';
    const res = await fetch(`${url}/${orderId}`, {
        headers: {
            'x-client-id': appId,
            'x-client-secret': secretKey,
            'x-api-version': '2023-08-01'
        }
    });
    const data = await res.json();
    return data.order_status === 'PAID';
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
            const session = await mongoose.startSession();
            session.startTransaction();
            try {
                const user = await User.findOne({ id: userId }).session(session);
                if (!user) { await session.abortTransaction(); res.status(404).json({ error: 'User not found' }); return; }
                if (!user.purchasedNoteIds.includes(noteId)) {
                    user.purchasedNoteIds.push(noteId);
                    await user.save({ session });
                    await Purchase.create([{
                        id: randomUUID(), userId, productId: noteId,
                        teacherId: (note as any).teacherId, productType: couponPricing.discountedPrice <= 0 ? 'free' : 'note',
                        amountPaid: couponPricing.discountedPrice,
                        couponId: couponPricing.couponId,
                        discountAmount: couponPricing.discountAmount,
                    }], { session });
                    if (couponPricing.couponId) await incrementCouponUsage(couponPricing.couponId);
                }
                await session.commitTransaction();
                res.json({ devMode: true, user: sanitizeUser(user) });
            } catch (e) { await session.abortTransaction(); throw e; }
            finally { session.endSession(); }
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

        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const [user, note] = await Promise.all([
                User.findOne({ id: userId }).session(session),
                Note.findOne({ id: noteId }).lean()
            ]);
            if (!user) { await session.abortTransaction(); res.status(404).json({ error: 'User not found' }); return; }
            if (!note) { await session.abortTransaction(); res.status(404).json({ error: 'Note not found' }); return; }
            const couponPricing = await resolveNoteCoupon(noteId, couponId);

            if (!user.purchasedNoteIds.includes(noteId)) {
                user.purchasedNoteIds.push(noteId);
                await user.save({ session });
                await Purchase.create([{
                    id: randomUUID(), userId, productId: noteId,
                    teacherId: (note as any).teacherId, productType: 'note',
                    amountPaid: couponPricing.discountedPrice,
                    couponId: couponPricing.couponId,
                    discountAmount: couponPricing.discountAmount,
                    cashfreeOrderId: cashfree_order_id,
                    cashfreePaymentId: cashfree_payment_session_id,
                }], { session });
                if (couponPricing.couponId) await incrementCouponUsage(couponPricing.couponId);
            }
            await session.commitTransaction();
            res.json({ success: true, user: sanitizeUser(user) });
        } catch (e) { await session.abortTransaction(); throw e; }
        finally { session.endSession(); }
    } catch (err) {
        logger.error('[Notes] verifyNotePurchase:', err);
        res.status(500).json({ error: 'An internal error occurred' });
    }
}

export async function purchaseNoteFree(req: express.Request, res: express.Response): Promise<void> {
    const noteId = req.params.id as string;
    const userId = (req as any).currentUser.id as string;
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const [note, user] = await Promise.all([
            Note.findOne({ id: noteId }).session(session),
            User.findOne({ id: userId }).session(session)
        ]);
        if (!note) { await session.abortTransaction(); res.status(404).json({ error: 'Note not found' }); return; }
        if (!user) { await session.abortTransaction(); res.status(404).json({ error: 'User not found' }); return; }
        if (user.purchasedNoteIds.includes(noteId)) {
            await session.abortTransaction(); res.status(400).json({ error: 'Already purchased' }); return;
        }
        user.purchasedNoteIds.push(noteId);
        await user.save({ session });
        await Purchase.create({ id: randomUUID(), userId, productId: noteId, teacherId: (note as any).teacherId, productType: 'free', amountPaid: 0 });
        await session.commitTransaction();
        res.json({ success: true, user: sanitizeUser(user), message: 'Purchase successful' });
    } catch (err) {
        await session.abortTransaction();
        logger.error('[Notes] purchaseNoteFree:', err);
        res.status(500).json({ error: 'An internal error occurred' });
    } finally {
        session.endSession();
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
            const session = await mongoose.startSession();
            session.startTransaction();
            try {
                const user = await User.findOne({ id: userId }).session(session);
                if (!user) { await session.abortTransaction(); res.status(404).json({ error: 'User not found' }); return; }
                if (!user.purchasedCourseIds.includes(courseId)) {
                    user.purchasedCourseIds.push(courseId);
                    await user.save({ session });
                    await Purchase.create([{
                        id: randomUUID(), userId, productId: courseId,
                        teacherId: (course as any).teacherId, productType: couponPricing.discountedPrice <= 0 ? 'free' : 'course',
                        amountPaid: couponPricing.discountedPrice,
                        couponId: couponPricing.couponId,
                        discountAmount: couponPricing.discountAmount,
                    }], { session });
                    if (couponPricing.couponId) await incrementCouponUsage(couponPricing.couponId);
                }
                await session.commitTransaction();
                res.json({ devMode: true, user: sanitizeUser(user) });
            } catch (e) { await session.abortTransaction(); throw e; }
            finally { session.endSession(); }
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

        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const [user, course] = await Promise.all([
                User.findOne({ id: userId }).session(session),
                Course.findOne({ id: courseId }).lean()
            ]);
            if (!user) { await session.abortTransaction(); res.status(404).json({ error: 'User not found' }); return; }
            if (!course) { await session.abortTransaction(); res.status(404).json({ error: 'Course not found' }); return; }
            const couponPricing = await resolveCourseCoupon(courseId, couponId);

            if (!user.purchasedCourseIds.includes(courseId)) {
                user.purchasedCourseIds.push(courseId);
                await user.save({ session });
                await Purchase.create([{
                    id: randomUUID(), userId, productId: courseId,
                    teacherId: (course as any).teacherId, productType: 'course',
                    amountPaid: couponPricing.discountedPrice,
                    couponId: couponPricing.couponId,
                    discountAmount: couponPricing.discountAmount,
                    cashfreeOrderId: cashfree_order_id,
                    cashfreePaymentId: cashfree_payment_session_id,
                }], { session });
                if (couponPricing.couponId) await incrementCouponUsage(couponPricing.couponId);
            }
            await session.commitTransaction();
            res.json({ success: true, user: sanitizeUser(user) });
        } catch (e) { await session.abortTransaction(); throw e; }
        finally { session.endSession(); }
    } catch (err) {
        logger.error('[Courses] verifyCoursePayment:', err);
        res.status(500).json({ error: 'An internal error occurred' });
    }
}

export async function enrollCourseFree(req: express.Request, res: express.Response): Promise<void> {
    const courseId = req.params.id as string;
    const userId = (req as any).currentUser.id as string;
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const [course, user] = await Promise.all([
            Course.findOne({ id: courseId }).session(session),
            User.findOne({ id: userId }).session(session)
        ]);
        if (!course) { await session.abortTransaction(); res.status(404).json({ error: 'Course not found' }); return; }
        if (!user) { await session.abortTransaction(); res.status(404).json({ error: 'User not found' }); return; }
        if (user.purchasedCourseIds.includes(courseId)) {
            await session.abortTransaction(); res.status(400).json({ error: 'Already enrolled' }); return;
        }
        user.purchasedCourseIds.push(courseId);
        await user.save({ session });
        await Purchase.create([{ id: randomUUID(), userId, productId: courseId, teacherId: (course as any).teacherId, productType: 'free', amountPaid: 0 }], { session });
        await session.commitTransaction();
        res.json({ success: true, user: sanitizeUser(user), message: 'Enrolled successfully' });
    } catch (err) {
        await session.abortTransaction();
        logger.error('[Courses] enrollCourseFree:', err);
        res.status(500).json({ error: 'An internal error occurred' });
    } finally {
        session.endSession();
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
        res.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId });
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

        const isFree = !course.price || course.price === 0;
        const hasPurchased =
            (Array.isArray(user.purchasedCourseIds) && user.purchasedCourseIds.includes((course as any).id)) ||
            (Array.isArray(user.purchasedNoteIds) && user.purchasedNoteIds.includes((course as any).id));
        const isOwner = user.role === UserRole.TEACHER && (course as any).teacherId === user.id;
        const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;

        if (!isFree && !hasPurchased && !isOwner && !isAdmin) {
            res.status(403).send('Forbidden: Purchase required'); return;
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