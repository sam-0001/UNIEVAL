import mongoose from 'mongoose';

const videoKeySchema = new mongoose.Schema({
  videoId: { type: String, required: true, unique: true, index: true },
  keyHex:  { type: String, required: true },
  
  // 🌟 NEW FIELDS: These allow your UI to track progress 
  // independently of whether the Course is saved yet!
  status: { type: String, default: 'processing' },
  progress: { type: Number, default: 0 },
  videoUrl: { type: String }
  
}, { timestamps: true });

export const VideoKey = mongoose.model('VideoKey', videoKeySchema);