import mongoose from 'mongoose';

const vivaSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  description: String,
  subjectId: { type: String, required: true, index: true },
  teacherId: { type: String, index: true },
  price: Number,
  originalPrice: Number,
  questions: [{ id: String, text: String, correctAnswer: String }],
  collegeConfig: { name: String, emailDomain: String }
}, { timestamps: true });

vivaSchema.index({ subjectId: 1, teacherId: 1 });
vivaSchema.index({ title: 'text', description: 'text' });

export const Viva = mongoose.model('Viva', vivaSchema);
