import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  description: String,
  subjectId: { type: String, required: true, index: true },
  teacherId: { type: String, required: true, index: true },
  thumbnailUrl: String,
  price: Number,
  originalPrice: Number,
  modules: [{
    id: String,
    title: String,
    videos: [{
      id: String,
      title: String,
      videoUrl: String,
      duration: String,
      videoStatus: String,
      videoProgress: Number,
      videoId: String,
      videoKey: String,
      resources: [{ title: String, url: String, type: { type: String } }]
    }]
  }],
  collegeConfig: { name: String, emailDomain: String }
}, { timestamps: true });

courseSchema.index({ subjectId: 1, teacherId: 1 });
courseSchema.index({ 'modules.videos.videoId': 1 });
courseSchema.index({ title: 'text', description: 'text' });

export const Course = mongoose.model('Course', courseSchema);
