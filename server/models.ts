import mongoose from 'mongoose';
import { UserRole } from '../types';

const OTP_EXPIRY_SECONDS = parseInt(process.env.OTP_EXPIRY_SECONDS || '600', 10);

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  role: { type: String, enum: Object.values(UserRole), default: UserRole.STUDENT, index: true },
  avatar: String,
  qualification: String,
  purchasedNoteIds: [String],
  purchasedCourseIds: [String],   // Track purchased video courses for key-gate access
  upiId: String,
  phoneNumber: { type: String, default: '' },  // WhatsApp number — stored plain (not sensitive)

  // ── Exam credit system ──
  credits:           { type: Number, default: 0 },
  freeQuizUsedToday: { type: Number, default: 0 },
  lastReset:         { type: Date,   default: Date.now },
  unlimitedPlan: {
    active:    { type: Boolean, default: false },
    expiresAt: { type: Date,    default: null }
  },
  // Single-device session enforcement
  sessionToken: { type: String, default: null }
}, { timestamps: true });

userSchema.index({ email: 1, role: 1 });

const subjectSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  code: { type: String, required: true },
  branch: { type: String, required: true, index: true },
  year: { type: Number, required: true, index: true }
});

subjectSchema.index({ branch: 1, year: 1 });
subjectSchema.index({ name: 'text', code: 'text' });

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
      resources: [{
        title: String,
        url: String,
        type: { type: String } // FIXED: Tells Mongoose this is a field named "type"
      }]
    }]
  }],
  collegeConfig: {
    name: String,
    emailDomain: String
  }
}, { timestamps: true });

courseSchema.index({ subjectId: 1, teacherId: 1 });
courseSchema.index({ 'modules.videos.videoId': 1 });
courseSchema.index({ title: 'text', description: 'text' });

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
    id: String,
    title: String,
    files: [{
      id: String,
      title: String,
      url: String,
      isFree: Boolean
    }]
  }],
  collegeConfig: {
    name: String,
    emailDomain: String
  }
}, { timestamps: true });

noteSchema.index({ subjectId: 1, teacherId: 1 });
noteSchema.index({ title: 'text', description: 'text' });

const quizSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  description: String,
  subjectId: { type: String, required: true, index: true },
  teacherId: { type: String, index: true },
  questionCount: Number,
  durationMinutes: Number,
  price: Number,
  originalPrice: Number,
  questions: [{
    id: String,
    text: String,
    options: [String],
    correctAnswer: String
  }],
  collegeConfig: {
    name: String,
    emailDomain: String
  }
}, { timestamps: true });

quizSchema.index({ subjectId: 1, teacherId: 1 });
quizSchema.index({ title: 'text', description: 'text' });

const vivaSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  description: String,
  subjectId: { type: String, required: true, index: true },
  teacherId: { type: String, index: true },
  price: Number,
  originalPrice: Number,
  questions: [{
    id: String,
    text: String,
    correctAnswer: String
  }],
  collegeConfig: {
    name: String,
    emailDomain: String
  }
}, { timestamps: true });

vivaSchema.index({ subjectId: 1, teacherId: 1 });
vivaSchema.index({ title: 'text', description: 'text' });

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true },
  otp: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  locked: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, expires: OTP_EXPIRY_SECONDS }
});
// Note: email index is defined inline above; no separate .index() needed

export const User = mongoose.models.User || mongoose.model('User', userSchema);
export const Subject = mongoose.models.Subject || mongoose.model('Subject', subjectSchema);
export const Course = mongoose.models.Course || mongoose.model('Course', courseSchema);
export const Note = mongoose.models.Note || mongoose.model('Note', noteSchema);
export const Quiz = mongoose.models.Quiz || mongoose.model('Quiz', quizSchema);
export const Viva = mongoose.models.Viva || mongoose.model('Viva', vivaSchema);
export const OTP = mongoose.models.OTP || mongoose.model('OTP', otpSchema);

// Stores AES-128 encryption keys for HLS segments — never exposed publicly
const videoKeySchema = new mongoose.Schema({
  videoId: { type: String, required: true, unique: true, index: true },
  keyHex:  { type: String, required: true }   // 16-byte key stored as 32-char hex
}, { timestamps: true });

export const VideoKey = mongoose.models.VideoKey || mongoose.model('VideoKey', videoKeySchema);

// ─── Exam Intelligence ────────────────────────────────────────────────────────

const pyqSchema = new mongoose.Schema({
  question: { type: String, required: true },
  year:     { type: Number, required: true },
  marks:    { type: Number, required: true }
}, { _id: false });

const examTopicSchema = new mongoose.Schema({
  name:          { type: String, required: true },
  priority:      { type: String, enum: ['high', 'medium', 'low'], required: true },
  weightage:     { type: Number, required: true },
  frequency:     { type: Number, required: true },
  topQuestions:  { type: [String], default: [] },
  pyqs:          { type: [pyqSchema], default: [] }
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

export const ExamIntelligence = mongoose.models.ExamIntelligence || mongoose.model('ExamIntelligence', examIntelligenceSchema);
// ─── BE Toolkit ───────────────────────────────────────────────────────────────

const beToolkitItemSchema = new mongoose.Schema({
  id:         { type: String, required: true, unique: true, index: true },
  title:      { type: String, required: true },
  type:       { type: String, enum: ['project', 'research', 'case-study'], required: true },
  branch:     { type: String, required: true, index: true },
  tags:       { type: [String], default: [] },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
  summary:    { type: String, required: true },
  source:     { type: String, required: true },
  link:       { type: String, required: true }
}, { timestamps: true });

beToolkitItemSchema.index({ branch: 1, type: 1, difficulty: 1 });
beToolkitItemSchema.index({ tags: 1 });

export const BEToolkitItem = mongoose.models.BEToolkitItem || mongoose.model('BEToolkitItem', beToolkitItemSchema);

// ─── Generated Quiz Pool (up to 10 quizzes per difficulty level) ─────────────

const quizQuestionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options:  { type: [String], required: true },
  correct:  { type: String, required: true }
}, { _id: false });

const quizEntrySchema = new mongoose.Schema({
  id:        { type: String, required: true },
  questions: { type: [quizQuestionSchema], default: [] },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const difficultyPoolSchema = new mongoose.Schema({
  level:   { type: Number, required: true, min: 1, max: 5 },
  quizzes: { type: [quizEntrySchema], default: [] }
}, { _id: false });

// One document per branch+year+subject+unit — holds all 5 difficulty pools
const quizPoolSchema = new mongoose.Schema({
  id:       { type: String, required: true, unique: true, index: true },
  branch:   { type: String, default: '' },
  year:     { type: String, default: '' },
  subject:  { type: String, required: true },
  semester: { type: String, required: true },
  unit:     { type: String, required: true },
  difficulties: { type: [difficultyPoolSchema], default: () =>
    [1,2,3,4,5].map(level => ({ level, quizzes: [] }))
  }
}, { timestamps: true });

quizPoolSchema.index({ branch: 1, subject: 1, semester: 1, unit: 1 }, { unique: true });

export const QuizPool = mongoose.models.QuizPool || mongoose.model('QuizPool', quizPoolSchema);

const payoutSchema = new mongoose.Schema({
  id:            { type: String, required: true, unique: true, index: true },
  teacherId:     { type: String, required: true, index: true },
  amount:        { type: Number, required: true },
  grossAmount:   { type: Number, required: true },
  platformFee:   { type: Number, required: true },
  status:        { type: String, enum: ['PENDING', 'COMPLETED'], default: 'PENDING', index: true },
  transactionId: { type: String, default: null },
  completedAt:   { type: Date,   default: null },
}, { timestamps: true });
 
payoutSchema.index({ teacherId: 1, status: 1 });
 
export const Payout = mongoose.models.Payout || mongoose.model('Payout', payoutSchema);

 
const purchaseSchema = new mongoose.Schema({
  id:                { type: String, required: true, unique: true, index: true },
  userId:            { type: String, required: true, index: true },
  productId:         { type: String, required: true, index: true },
  teacherId:         { type: String, required: true, index: true },
  productType:       { type: String, enum: ['note', 'course', 'quiz', 'viva', 'free'], required: true },
  amountPaid:        { type: Number, required: true },
  razorpayOrderId:   { type: String, default: null },
  razorpayPaymentId: { type: String, default: null },
}, { timestamps: true });
 
purchaseSchema.index({ teacherId: 1, createdAt: -1 });
 
export const Purchase = mongoose.models.Purchase || mongoose.model('Purchase', purchaseSchema);

// ─── Live Classes (Daily.co) ──────────────────────────────────────────────────
const liveClassSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  courseId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  description: { type: String },
  teacherId: { type: String, required: true, index: true },
  scheduledStartTime: { type: Date, required: true },
  scheduledEndTime: { type: Date, required: true },
  dailyRoomName: { type: String, required: true },
  dailyRoomUrl: { type: String, required: true },
  status: { type: String, enum: ['scheduled', 'live', 'completed'], default: 'scheduled', index: true },
  recordingUrl: { type: String, default: null },
}, { timestamps: true });

liveClassSchema.index({ courseId: 1, status: 1 });

export const LiveClass = mongoose.models.LiveClass || mongoose.model('LiveClass', liveClassSchema);