import mongoose from 'mongoose';

const beToolkitItemSchema = new mongoose.Schema({
  id:         { type: String, required: true, unique: true, index: true },
  title:      { type: String, required: true },
  type:       { type: String, enum: ['project', 'research', 'case-study'], required: true },
  branch:     { type: String, required: true, index: true },
  tags:       { type: [String], default: [] },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
  summary:    { type: String, required: true },
  source:     { type: String, required: true },
  link:       { type: String, required: true }
}, { timestamps: true });

beToolkitItemSchema.index({ branch: 1, type: 1, difficulty: 1 });
beToolkitItemSchema.index({ tags: 1 });

export const BEToolkitItem = mongoose.model('BEToolkitItem', beToolkitItemSchema);
