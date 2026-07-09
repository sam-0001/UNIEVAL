import mongoose from 'mongoose';

// Stores the AES-256-GCM key material for an encrypted note/document file.
// Mirrors the videoKey.model.ts pattern used for HLS video encryption.
const fileKeySchema = new mongoose.Schema({
  fileId:      { type: String, required: true, unique: true, index: true },
  keyHex:      { type: String, required: true }, // 32-byte AES-256 key
  ivHex:       { type: String, required: true }, // 12-byte GCM IV
  authTagHex:  { type: String, required: true }, // 16-byte GCM auth tag
  storageType: { type: String, enum: ['r2', 'local'], required: true },
  storageKey:  { type: String, required: true }, // R2 object key or local file path
  originalName: { type: String },
  mimeType:    { type: String },
  size:        { type: Number },
}, { timestamps: true });

export const FileKey = mongoose.model('FileKey', fileKeySchema);
