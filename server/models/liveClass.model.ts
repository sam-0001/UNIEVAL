import mongoose from 'mongoose';

const liveClassSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  courseId: { type: String, required: true, index: true },
  moduleId: { type: String, default: null, index: true },
  title: { type: String, required: true },
  description: { type: String },
  teacherId: { type: String, required: true, index: true },
  scheduledStartTime: { type: Date, required: true },
  scheduledEndTime: { type: Date, required: true },
  dailyRoomName: { type: String, required: true },
  dailyRoomUrl: { type: String, required: true },
  status: { type: String, enum: ['scheduled', 'live', 'completed'], default: 'scheduled', index: true },
  recordingUrl: { type: String, default: null },
  passcode: { type: String, default: '' },
}, { timestamps: true });

liveClassSchema.index({ courseId: 1, status: 1 });

export const LiveClass = mongoose.models.LiveClass || mongoose.model('LiveClass', liveClassSchema);
