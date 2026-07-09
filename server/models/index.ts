/**
 * models/index.ts — barrel re-export for all Mongoose models.
 * Usage everywhere: import { User, Course, Note } from '../models/index.js'
 */
export { User }              from './user.model.js';
export { Subject }           from './subject.model.js';
export { Course }            from './course.model.js';
export { Note }              from './note.model.js';
export { Quiz }              from './quiz.model.js';
export { Viva }              from './viva.model.js';
export { OTP }               from './otp.model.js';
export { VideoKey }          from './videoKey.model.js';
export { FileKey }           from './fileKey.model.js';
export { Purchase }          from './purchase.model.js';
export { Coupon }            from './coupon.model.js';
export { Payout }            from './payout.model.js';
export { ExamIntelligence }  from './examIntelligence.model.js';
export { QuizPool }          from './quizPool.model.js';
export { BEToolkitItem }     from './beToolkit.model.js';
