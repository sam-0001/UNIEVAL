import express from 'express';
import { randomUUID } from 'crypto';
import { Coupon } from '../models/coupon.model.js';
import { Note, Course } from '../models/index.js';
import logger from '../logger.js';

// ─── Helper ───────────────────────────────────────────────────────────────────

/** Returns the discounted price (never below 0). */
export function applyDiscount(originalPrice: number, discountType: string, discountValue: number): number {
  const price = Math.max(0, Number(originalPrice) || 0);
  const value = Math.max(0, Number(discountValue) || 0);
  if (discountType === 'percent') {
    return Math.max(0, Math.round(price * (1 - value / 100)));
  }
  return Math.max(0, price - value);
}

// ─── Create coupon ────────────────────────────────────────────────────────────

export async function createCoupon(req: express.Request, res: express.Response): Promise<void> {
  const teacher = (req as any).currentUser;
  const { code, productId, productType, discountType, discountValue, maxUses, expiresAt } = req.body;

  if (!code || !productId || !productType || !discountType || discountValue == null) {
    res.status(400).json({ error: 'code, productId, productType, discountType and discountValue are required' });
    return;
  }
  if (!['note', 'course'].includes(productType)) {
    res.status(400).json({ error: 'productType must be note or course' });
    return;
  }
  if (!['flat', 'percent'].includes(discountType)) {
    res.status(400).json({ error: 'discountType must be flat or percent' });
    return;
  }
  if (discountType === 'percent' && (discountValue <= 0 || discountValue > 100)) {
    res.status(400).json({ error: 'percent discount must be between 1 and 100' });
    return;
  }
  if (discountType === 'flat' && discountValue <= 0) {
    res.status(400).json({ error: 'flat discount must be greater than 0' });
    return;
  }

  // Verify product exists and belongs to teacher (admins/super-admins bypass ownership check)
  try {
    const product = productType === 'note'
      ? await Note.findOne({ id: productId }).lean() as any
      : await Course.findOne({ id: productId }).lean() as any;
    if (!product) { res.status(404).json({ error: `${productType} not found` }); return; }

    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(teacher.role);
    if (!isAdmin && product.teacherId !== teacher.id) {
      res.status(403).json({ error: 'You can only create coupons for your own content' });
      return;
    }

    // Prevent duplicate active code for same product
    const existing = await Coupon.findOne({ code: code.trim().toUpperCase(), productId, isActive: true });
    if (existing) { res.status(409).json({ error: 'An active coupon with this code already exists for this product' }); return; }

    const coupon = await Coupon.create({
      id: randomUUID(),
      code: code.trim().toUpperCase(),
      productId,
      productType,
      teacherId: teacher.id,
      discountType,
      discountValue: Number(discountValue),
      maxUses: maxUses ? Number(maxUses) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      isActive: true,
    });

    res.status(201).json(coupon);
  } catch (err) {
    logger.error('[Coupon] createCoupon:', err);
    res.status(500).json({ error: 'An internal error occurred' });
  }
}

// ─── List coupons for a product ───────────────────────────────────────────────

export async function getCouponsForProduct(req: express.Request, res: express.Response): Promise<void> {
  const { productId } = req.params;
  const teacher = (req as any).currentUser;

  try {
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(teacher.role);
    const query: any = { productId };
    if (!isAdmin) query.teacherId = teacher.id;   // teachers only see their own

    const coupons = await Coupon.find(query).sort({ createdAt: -1 }).lean();
    res.json(coupons);
  } catch (err) {
    logger.error('[Coupon] getCouponsForProduct:', err);
    res.status(500).json({ error: 'An internal error occurred' });
  }
}

// ─── Deactivate (soft-delete) a coupon ───────────────────────────────────────

export async function deactivateCoupon(req: express.Request, res: express.Response): Promise<void> {
  const { couponId } = req.params;
  const teacher = (req as any).currentUser;

  try {
    const coupon = await Coupon.findOne({ id: couponId });
    if (!coupon) { res.status(404).json({ error: 'Coupon not found' }); return; }

    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(teacher.role);
    if (!isAdmin && coupon.teacherId !== teacher.id) {
      res.status(403).json({ error: 'Not authorised' });
      return;
    }

    coupon.isActive = false;
    await coupon.save();
    res.json({ success: true, coupon });
  } catch (err) {
    logger.error('[Coupon] deactivateCoupon:', err);
    res.status(500).json({ error: 'An internal error occurred' });
  }
}

// ─── Re-activate a coupon ─────────────────────────────────────────────────────

export async function activateCoupon(req: express.Request, res: express.Response): Promise<void> {
  const { couponId } = req.params;
  const teacher = (req as any).currentUser;

  try {
    const coupon = await Coupon.findOne({ id: couponId });
    if (!coupon) { res.status(404).json({ error: 'Coupon not found' }); return; }

    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(teacher.role);
    if (!isAdmin && coupon.teacherId !== teacher.id) {
      res.status(403).json({ error: 'Not authorised' });
      return;
    }

    coupon.isActive = true;
    await coupon.save();
    res.json({ success: true, coupon });
  } catch (err) {
    logger.error('[Coupon] activateCoupon:', err);
    res.status(500).json({ error: 'An internal error occurred' });
  }
}

// ─── Validate coupon (public – called by student at checkout) ─────────────────

export async function validateCoupon(req: express.Request, res: express.Response): Promise<void> {
  const { code, productId } = req.body;

  if (!code || !productId) {
    res.status(400).json({ error: 'code and productId are required' });
    return;
  }

  try {
    const coupon = await Coupon.findOne({
      code: String(code).trim().toUpperCase(),
      productId,
      isActive: true,
    }).lean() as any;

    if (!coupon) { res.status(404).json({ valid: false, error: 'Invalid or expired coupon code' }); return; }

    // Check expiry
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      res.status(400).json({ valid: false, error: 'This coupon has expired' });
      return;
    }

    // Check usage limit
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      res.status(400).json({ valid: false, error: 'This coupon has reached its usage limit' });
      return;
    }

    // Get original price from the product
    const product = coupon.productType === 'note'
      ? await Note.findOne({ id: productId }).lean() as any
      : await Course.findOne({ id: productId }).lean() as any;
    if (!product) { res.status(404).json({ valid: false, error: 'Product not found' }); return; }

    const originalPrice: number = product.price || 0;
    const discountedPrice = applyDiscount(originalPrice, coupon.discountType, coupon.discountValue);

    res.json({
      valid: true,
      couponId: coupon.id,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      originalPrice,
      discountedPrice,
      savings: originalPrice - discountedPrice,
    });
  } catch (err) {
    logger.error('[Coupon] validateCoupon:', err);
    res.status(500).json({ error: 'An internal error occurred' });
  }
}

// ─── Mark coupon as used (called internally after successful payment) ─────────

export async function incrementCouponUsage(couponId: string): Promise<void> {
  await Coupon.updateOne({ id: couponId }, { $inc: { usedCount: 1 } });
}
