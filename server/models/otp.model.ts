import mongoose from 'mongoose';

const OTP_EXPIRY_SECONDS = parseInt(process.env.OTP_EXPIRY_SECONDS || '600', 10);

const otpSchema = new mongoose.Schema({
  email:       { type: String, required: true, index: true },
  otp:         { type: String, required: true },          // email OTP
  phoneOtp:    { type: String, default: null },           // SMS OTP (signup only)
  phoneNumber: { type: String, default: null },           // which phone this SMS was sent to
  attempts:    { type: Number, default: 0 },
  phoneAttempts: { type: Number, default: 0 },
  locked:      { type: Boolean, default: false },
  phoneLocked: { type: Boolean, default: false },
  createdAt:   { type: Date, default: Date.now, expires: OTP_EXPIRY_SECONDS }
});

export const OTP = mongoose.model('OTP', otpSchema);