import mongoose from 'mongoose';

const liveQuestionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  classId: { type: String, required: true, index: true },
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  content: { type: String, required: true },
  upvotes: { type: [String], default: [] },
  isAnswered: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

export const LiveQuestion = mongoose.models.LiveQuestion || mongoose.model('LiveQuestion', liveQuestionSchema);
