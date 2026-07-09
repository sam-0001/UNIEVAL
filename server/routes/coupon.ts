/**
 * server/routes/coupon.ts
 * Mount in server/routes/api.ts with:
 *   import couponRouter from './coupon.js';
 *   router.use('/coupons', couponRouter);
 */
import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { UserRole } from '../../types.js';
import * as CouponCtrl from '../controllers/coupon.controller.js';

const router = express.Router();

// Teacher/Admin: manage coupons for their content
router.post(
  '/',
  requireRole(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  CouponCtrl.createCoupon,
);

router.get(
  '/product/:productId',
  requireRole(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  CouponCtrl.getCouponsForProduct,
);

router.patch(
  '/:couponId/deactivate',
  requireRole(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  CouponCtrl.deactivateCoupon,
);

router.patch(
  '/:couponId/activate',
  requireRole(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  CouponCtrl.activateCoupon,
);

// Student: validate a coupon (must be logged in)
router.post('/validate', requireAuth, CouponCtrl.validateCoupon);

export default router;
