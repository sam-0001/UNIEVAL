import mongoose from 'mongoose';

const pushSubscriptionSchema = new mongoose.Schema({
  endpoint: { type: String, required: true, unique: true, index: true },
  userId: { type: String, index: true, default: null },
  userRole: { type: String, default: 'GUEST' },
  userEmail: { type: String, default: null },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true }
  },
  userAgent: { type: String, default: '' },
  deviceType: { type: String, enum: ['mobile', 'desktop', 'tablet'], default: 'desktop' }
}, { timestamps: true });

pushSubscriptionSchema.index({ userRole: 1 });
pushSubscriptionSchema.index({ createdAt: -1 });

export const PushSubscription = mongoose.model('PushSubscription', pushSubscriptionSchema);
