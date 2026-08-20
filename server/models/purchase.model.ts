import mongoose from 'mongoose';

const purchaseSchema = new mongoose.Schema({
  id:                { type: String, required: true, unique: true, index: true },
  userId:            { type: String, required: true, index: true },
  productId:         { type: String, required: true, index: true },
  teacherId:         { type: String, required: true, index: true },
  productType:       { type: String, enum: ['note', 'course', 'quiz', 'viva', 'free'], required: true },
  amountPaid:        { type: Number, required: true },
  couponId:          { type: String, default: null, index: true },
  discountAmount:    { type: Number, default: 0 },
  cashfreeOrderId:   { type: String, default: null },
  cashfreePaymentId: { type: String, default: null },
}, { timestamps: true });

purchaseSchema.index({ teacherId: 1, createdAt: -1 });

export const Purchase = mongoose.model('Purchase', purchaseSchema);
