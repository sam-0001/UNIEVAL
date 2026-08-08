import mongoose from 'mongoose';
import { UserRole } from '../../types.js';

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  role: { type: String, enum: Object.values(UserRole), default: UserRole.STUDENT, index: true },
  avatar: String,
  qualification: String,
  purchasedNoteIds: [String],
  purchasedCourseIds: [String],
  archivedNoteIds: [String],
  archivedCourseIds: [String],
  upiId: String,
  phoneNumber: { type: String, default: '' },
  credits:           { type: Number, default: 0 },
  freeQuizUsedToday: { type: Number, default: 0 },
  lastReset:         { type: Date,   default: Date.now },
  unlimitedPlan: {
    active:    { type: Boolean, default: false },
    expiresAt: { type: Date,    default: null }
  },
  sessionToken: { type: String, default: null }
}, { timestamps: true });

userSchema.index({ email: 1, role: 1 });

export const User = mongoose.model('User', userSchema);
