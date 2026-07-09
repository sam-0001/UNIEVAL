import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  code: { type: String, required: true },
  branch: { type: String, required: true, index: true },
  year: { type: Number, required: true, index: true }
});

subjectSchema.index({ branch: 1, year: 1 });
subjectSchema.index({ name: 'text', code: 'text' });

export const Subject = mongoose.model('Subject', subjectSchema);
