export enum UserRole {
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN'
}

// Changed from Enum to string type to support the extensive list of modern engineering branches
export type Branch = string;

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  qualification?: string; // For teachers
  purchasedNoteIds: string[]; // Track purchased notes
  purchasedCourseIds: string[]; // Track purchased courses
  archivedNoteIds?: string[];
  archivedCourseIds?: string[];
  upiId?: string; // For teacher payouts
  phoneNumber?: string; // WhatsApp number for community access
  credits: number;
  freeQuizUsedToday: number;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  branch: Branch;
  year: number; // 1, 2, 3, 4
}

export interface CollegeConfig {
  name: string;
  emailDomain: string; // e.g. "@coep.ac.in"
}

export interface Course {
  id: string;
  title: string;
  description: string;
  subjectId: string;
  teacherId: string;
  thumbnailUrl: string;
  createdAt: string;
  modules: CourseModule[];
  price?: number; // Added for store view
  originalPrice?: number; // Price before discount
  collegeConfig?: CollegeConfig; // College specific free access
}

export interface CourseResource {
  title: string;
  url: string;
  type: 'pdf' | 'link';
}

export interface CourseVideo {
  id: string;
  title: string;
  videoUrl: string;
  duration: string;
  resources?: CourseResource[];
  videoStatus?: 'uploading' | 'processing' | 'finalizing' | 'ready' | 'error';
  videoProgress?: number;
  videoId?: string;
  videoKey?: string;
  thumbnailUrl?: string;
}

export interface CourseModule {
  id: string;
  title: string;
  videos: CourseVideo[];
  // Legacy fields for backward compatibility
  videoUrl?: string;
  duration?: string;
  resources?: CourseResource[];
  videoStatus?: 'uploading' | 'processing' | 'finalizing' | 'ready' | 'error';
  videoProgress?: number;
  videoId?: string;
  videoKey?: string;
  thumbnailUrl?: string;
}

// New Interfaces for Notes Structure
export interface NoteFile {
  id: string;
  title: string;
  url: string; // Cloudflare R2 URL
  isFree: boolean; // Allow specific files to be free previews
}

export interface NoteSection {
  id: string;
  title: string; // e.g., "All Units Notes", "VIMP Questions"
  files: NoteFile[];
}

export interface Note {
  id: string;
  title: string;
  description: string;
  subjectId: string;
  teacherId: string;
  thumbnailUrl?: string;
  uploadedAt: string;
  price?: number;
  originalPrice?: number; // Price before discount
  sections: NoteSection[]; 
  collegeConfig?: CollegeConfig; // College specific free access
}

export interface Question {
  id: string;
  text: string;
  options?: string[]; // For MCQ
  correctAnswer?: string;
}

export interface Quiz {
  id: string;
  title: string;
  description?: string; // Added description
  subjectId: string;
  teacherId?: string; // Added for tracking ownership
  questionCount: number;
  durationMinutes: number;
  price?: number;
  originalPrice?: number; // Price before discount
  questions?: Question[];
  collegeConfig?: CollegeConfig;
}

export interface Viva {
  id: string;
  title: string;
  subjectId: string;
  teacherId?: string; // Added for tracking ownership
  description: string;
  price?: number;
  originalPrice?: number; // Price before discount
  questions?: Question[]; // For Viva, options might be empty, just text and expected answer
  collegeConfig?: CollegeConfig;
}

export interface Enrollment {
  userId: string;
  courseId: string;
  progress: number;
}
// ─── Exam Intelligence ────────────────────────────────────────────────────────

export interface PYQ {
  question: string;
  year: number;
  marks: number;
}

export interface ExamTopic {
  name: string;
  priority: 'high' | 'medium' | 'low';
  weightage: number;
  frequency: number;
  topQuestions: string[];
  pyqs: PYQ[];
}

export interface ExamUnit {
  unit: string;
  title: string;
  topics: ExamTopic[];
}

export interface ExamIntelligenceDoc {
  id: string;
  subject: string;
  semester: string;
  branch?: string;
  year?: string;
  units: ExamUnit[];
  createdAt?: string;
}

export interface UserCredits {
  credits: number;
  freeQuizUsedToday: number;
  lastReset: string;
  unlimitedPlan: {
    active: boolean;
    expiresAt: string | null;
  };
}

// ─── BE Toolkit ───────────────────────────────────────────────────────────────

export interface BEToolkitItem {
  id: string;
  title: string;
  type: 'project' | 'research' | 'case-study';
  branch: string;
  tags: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  summary: string;
  source: string;
  link: string;
  createdAt?: string;
}