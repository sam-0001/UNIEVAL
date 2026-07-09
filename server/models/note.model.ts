import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  description: String,
  subjectId: { type: String, required: true, index: true },
  teacherId: { type: String, required: true, index: true },
  thumbnailUrl: String,
  price: Number,
  originalPrice: Number,
  sections: [{
    id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString()  // ✅ FIX: auto-generate unique ID
    },
    title: String,
    files: [{
      id: {
        type: String,
        default: () => new mongoose.Types.ObjectId().toString()  // ✅ FIX: auto-generate unique ID
      },
      title: String,
      url: String,
      isFree: Boolean
    }]
  }],
  collegeConfig: { name: String, emailDomain: String }
}, { timestamps: true });

noteSchema.index({ subjectId: 1, teacherId: 1 });
noteSchema.index({ title: 'text', description: 'text' });

export const Note = mongoose.model('Note', noteSchema);