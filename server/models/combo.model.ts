import mongoose from 'mongoose';

const comboSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  subjectIds: { type: [String], required: true, index: true },
  comboType: { type: String, enum: ['all', 'notes', 'courses'], default: 'all' },
  teacherId: { type: String, required: true, index: true },
  thumbnailUrl: { type: String, default: '' },
  price: { type: Number, required: true },
  originalPrice: { type: Number, default: 0 },
  collegeConfig: {
    name: String,
    emailDomain: String
  },
  validityType: { type: String, enum: ['months', 'date'], default: 'months' },
  validityMonths: { type: Number, default: 6 },
  validityDate: { type: Date, default: null }
}, { timestamps: true });

comboSchema.index({ title: 'text', description: 'text' });

export const Combo = mongoose.models.Combo || mongoose.model('Combo', comboSchema);
