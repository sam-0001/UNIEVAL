import mongoose from 'mongoose';

const quizSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  description: String,
  subjectId: { type: String, required: true, index: true },
  teacherId: { type: String, index: true },
  questionCount: Number,
  durationMinutes: Number,
  price: Number,
  originalPrice: Number,
  questions: [{ id: String, text: String, options: [String], correctAnswer: String, explanation: String }],
  collegeConfig: { name: String, emailDomain: String }
}, { timestamps: true });

quizSchema.index({ subjectId: 1, teacherId: 1 });
quizSchema.index({ title: 'text', description: 'text' });

export const Quiz = mongoose.model('Quiz', quizSchema);
