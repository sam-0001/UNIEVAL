import mongoose from 'mongoose';

const pyqSchema = new mongoose.Schema({
  question: { type: String, required: true },
  year:     { type: Number, required: true },
  marks:    { type: Number, required: true }
}, { _id: false });

const examTopicSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  priority:     { type: String, enum: ['high', 'medium', 'low'], required: true },
  weightage:    { type: Number, required: true },
  frequency:    { type: Number, required: true },
  topQuestions: { type: [String], default: [] },
  pyqs:         { type: [pyqSchema], default: [] }
}, { _id: false });

const examUnitSchema = new mongoose.Schema({
  unit:   { type: String, required: true },
  title:  { type: String, required: true },
  topics: { type: [examTopicSchema], default: [] }
}, { _id: false });

const examIntelligenceSchema = new mongoose.Schema({
  id:       { type: String, required: true, unique: true, index: true },
  subject:  { type: String, required: true, index: true },
  semester: { type: String, required: true, index: true },
  branch:   { type: String, default: '' },
  year:     { type: String, default: '' },
  units:    { type: [examUnitSchema], default: [] }
}, { timestamps: true });

examIntelligenceSchema.index({ branch: 1, subject: 1, semester: 1 }, { unique: true });
examIntelligenceSchema.index({ branch: 1, year: 1 });

export const ExamIntelligence = mongoose.model('ExamIntelligence', examIntelligenceSchema);
