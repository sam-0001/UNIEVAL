import express from 'express';
import mongoose from 'mongoose';
import { randomUUID } from 'crypto';
import { User, Course, Note, Purchase } from '../models/index.js';
import logger from '../logger.js';
import { incrementCouponUsage } from '../controllers/coupon.controller.js';

const router = express.Router();

function getCashfreeKeys() {
    return {
        appId: process.env.CASHFREE_APP_ID,
        secretKey: process.env.CASHFREE_SECRET_KEY,
    };
}

// Cashfree Webhook Handler
router.post('/cashfree', async (req, res) => {
    try {
        const payload = req.body;
        
        // Only process PAYMENT_SUCCESS_WEBHOOK
        if (payload?.type !== 'PAYMENT_SUCCESS_WEBHOOK') {
            res.status(200).send('Ignored non-success webhook');
            return;
        }

        const orderId = payload.data?.order?.order_id;
        if (!orderId) {
            res.status(400).send('Missing order_id');
            return;
        }

        const { appId, secretKey } = getCashfreeKeys();
        if (!appId || !secretKey) {
            res.status(500).send('Webhook: Payment not configured');
            return;
        }

        // Verify with Cashfree directly (More secure than signature validation)
        const url = process.env.NODE_ENV === 'production' ? 'https://api.cashfree.com/pg/orders' : 'https://sandbox.cashfree.com/pg/orders';
        const verifyRes = await fetch(`${url}/${orderId}`, {
            headers: {
                'x-client-id': appId,
                'x-client-secret': secretKey,
                'x-api-version': '2023-08-01'
            }
        });
        
        const data = await verifyRes.json();
        
        if (data.order_status !== 'PAID') {
            logger.warn(`[Webhook] Order ${orderId} is not PAID.`);
            res.status(400).send('Order not paid');
            return;
        }

        const tags = data.order_tags || {};
        const { userId, courseId, noteId, couponId, discountAmount, plan } = tags;

        if (!userId) {
            res.status(400).send('No userId in order_tags');
            return;
        }

        // Handle Course Purchase
        if (courseId) {
            const user = await User.findOne({ id: userId });
            if (!user) throw new Error('User not found');
            
            if (!Array.isArray(user.purchasedCourseIds)) user.purchasedCourseIds = [];
            if (!user.purchasedCourseIds.includes(courseId)) {
                user.purchasedCourseIds.push(courseId);
                await user.save();
                
                const course = await Course.findOne({ id: courseId }).lean();
                const teacherId = (course as any)?.teacherId || 'admin';
                await Purchase.create({
                    id: randomUUID(),
                    userId,
                    productId: courseId,
                    teacherId,
                    productType: 'course',
                    amountPaid: data.order_amount,
                    cashfreeOrderId: orderId,
                    couponId: couponId || undefined,
                    discountAmount: discountAmount ? Number(discountAmount) : 0,
                }).catch(err => { logger.warn('[Webhook] Purchase record creation non-fatal error:', err); });

                if (couponId) await incrementCouponUsage(couponId);
            }
        } 
        // Handle Note Purchase
        else if (noteId) {
            const user = await User.findOne({ id: userId });
            if (!user) throw new Error('User not found');
            
            if (!Array.isArray(user.purchasedNoteIds)) user.purchasedNoteIds = [];
            if (!user.purchasedNoteIds.includes(noteId)) {
                user.purchasedNoteIds.push(noteId);
                await user.save();
                
                const note = await Note.findOne({ id: noteId }).lean();
                const teacherId = (note as any)?.teacherId || 'admin';
                await Purchase.create({
                    id: randomUUID(),
                    userId,
                    productId: noteId,
                    teacherId,
                    productType: 'note',
                    amountPaid: data.order_amount,
                    cashfreeOrderId: orderId,
                    couponId: couponId || undefined,
                    discountAmount: discountAmount ? Number(discountAmount) : 0,
                }).catch(err => { logger.warn('[Webhook] Purchase record creation non-fatal error:', err); });

                if (couponId) await incrementCouponUsage(couponId);
            }
        }
        // Handle Credits Purchase
        else if (plan) {
            const user = await User.findOne({ id: userId });
            if (!user) throw new Error('User not found');
            
            const existingPurchase = await Purchase.findOne({ cashfreeOrderId: orderId });
            if (!existingPurchase) {
                const creditsToAdd = plan === '25' ? 25 : plan === '100' ? 100 : plan === '250' ? 250 : plan === '1000' ? 1000 : 0;
                user.credits = (user.credits || 0) + creditsToAdd;
                await user.save();
                
                await Purchase.create({
                    id: randomUUID(),
                    userId,
                    productId: `plan_${plan}`,
                    teacherId: 'admin',
                    productType: 'credits',
                    amountPaid: data.order_amount,
                    cashfreeOrderId: orderId,
                }).catch(err => { logger.warn('[Webhook] Purchase record creation non-fatal error:', err); });
            }
        }

        res.status(200).send('OK');
    } catch (err: any) {
        logger.error('[Webhook] Error processing Cashfree webhook:', err);
        res.status(500).send('Internal Server Error');
    }
});

export default router;
