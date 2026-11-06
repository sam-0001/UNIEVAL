import mongoose from 'mongoose';

const courseProgressSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  courseId: { type: String, required: true, index: true },
  completedLectures: [{ type: String }],
  completed: { type: Boolean, default: false },
  lastWatchedLectureId: { type: String, default: null }
}, { timestamps: true });

courseProgressSchema.index({ userId: 1, courseId: 1 }, { unique: true });

export const CourseProgress = mongoose.model('CourseProgress', courseProgressSchema);
