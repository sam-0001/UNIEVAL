import mongoose from 'mongoose';

const liveChatSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  classId: { type: String, required: true, index: true },
  senderId: { type: String, required: true },
  senderName: { type: String, required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

export const LiveChat = mongoose.models.LiveChat || mongoose.model('LiveChat', liveChatSchema);
