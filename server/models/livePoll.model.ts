import mongoose from 'mongoose';

const livePollSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  classId: { type: String, required: true, index: true },
  question: { type: String, required: true },
  options: [{
    id: { type: String, required: true },
    text: { type: String, required: true }
  }],
  correctOptionId: { type: String },
  status: { type: String, enum: ['active', 'closed'], default: 'active' },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

export const LivePoll = mongoose.models.LivePoll || mongoose.model('LivePoll', livePollSchema);

const livePollResponseSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  pollId: { type: String, required: true, index: true },
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  selectedOptionId: { type: String, required: true },
  responseTime: { type: Number, required: true } // Time in ms taken to answer
}, { timestamps: true });

export const LivePollResponse = mongoose.models.LivePollResponse || mongoose.model('LivePollResponse', livePollResponseSchema);
