import mongoose from 'mongoose';

/**
 * Coupon Model
 * Each coupon is tied to a specific product (note or course).
 * A teacher/admin creates it; it can be disabled later without deletion.
 */
const couponSchema = new mongoose.Schema({
  id:           { type: String, required: true, unique: true, index: true },
  code:         { type: String, required: true, index: true },   // e.g. "SAVE50"
  productId:    { type: String, required: true, index: true },   // note id or course id
  productType:  { type: String, enum: ['note', 'course'], required: true },
  teacherId:    { type: String, required: true, index: true },

  // Discount — either flat amount (₹) or percentage
  discountType: { type: String, enum: ['flat', 'percent'], required: true },
  discountValue:{ type: Number, required: true },               // e.g. 50 (₹50) or 20 (20 %)

  maxUses:      { type: Number, default: null },                // null = unlimited
  usedCount:    { type: Number, default: 0 },
  expiresAt:    { type: Date,   default: null },                // null = never expires
  isActive:     { type: Boolean, default: true, index: true },
}, { timestamps: true });

// Compound index so look-up by code+productId is fast
couponSchema.index({ code: 1, productId: 1 });

export const Coupon = mongoose.model('Coupon', couponSchema);
