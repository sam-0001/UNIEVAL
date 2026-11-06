import mongoose from 'mongoose';

const pendingRecordingSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  courseId: { type: String, required: true, index: true },
  moduleId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  rawMp4Url: { type: String, required: true },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'error'], default: 'pending' }
}, { timestamps: true });

export const PendingRecording = mongoose.models.PendingRecording || mongoose.model('PendingRecording', pendingRecordingSchema);
