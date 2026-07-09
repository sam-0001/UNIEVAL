import mongoose from 'mongoose';

const quizQuestionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options:  { type: [String], required: true },
  correct:  { type: String, required: true },
  explanation: { type: String, default: '' }
}, { _id: false });

const quizEntrySchema = new mongoose.Schema({
  id:        { type: String, required: true },
  questions: { type: [quizQuestionSchema], default: [] },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const difficultyPoolSchema = new mongoose.Schema({
  level:   { type: Number, required: true, min: 1, max: 5 },
  quizzes: { type: [quizEntrySchema], default: [] }
}, { _id: false });

const quizPoolSchema = new mongoose.Schema({
  id:       { type: String, required: true, unique: true, index: true },
  branch:   { type: String, default: '' },
  year:     { type: String, default: '' },
  subject:  { type: String, required: true },
  semester: { type: String, required: true },
  unit:     { type: String, required: true },
  difficulties: { type: [difficultyPoolSchema], default: () =>
    [1,2,3,4,5].map(level => ({ level, quizzes: [] }))
  }
}, { timestamps: true });

quizPoolSchema.index({ branch: 1, subject: 1, semester: 1, unit: 1 }, { unique: true });

export const QuizPool = mongoose.model('QuizPool', quizPoolSchema);
