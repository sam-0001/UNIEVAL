import mongoose from 'mongoose';

const payoutSchema = new mongoose.Schema({
  id:            { type: String, required: true, unique: true, index: true },
  teacherId:     { type: String, required: true, index: true },
  amount:        { type: Number, required: true },
  grossAmount:   { type: Number, required: true },
  platformFee:   { type: Number, required: true },
  status:        { type: String, enum: ['PENDING', 'COMPLETED'], default: 'PENDING', index: true },
  transactionId: { type: String, default: null },
  completedAt:   { type: Date,   default: null },
}, { timestamps: true });

payoutSchema.index({ teacherId: 1, status: 1 });

export const Payout = mongoose.model('Payout', payoutSchema);
