import express from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { UserRole } from '../../types.js';

import * as AuthCtrl from '../controllers/auth.controller.js';
import * as ContentCtrl from '../controllers/content.controller.js';
import * as UserCtrl from '../controllers/user.controller.js';
import * as AdminCtrl from '../controllers/admin.controller.js';
import { callAI } from '../services/ai.service.js';
import logger from '../logger.js';
import couponRouter from './coupon.js';

const router = express.Router();

// Rate limiter for the video key endpoint (60 req/min per IP)
const keyLimiter = rateLimit({
    windowMs: 60 * 1000, max: 60,
    standardHeaders: true, legacyHeaders: false,
    message: 'Too many key requests',
});

// ─── Auth ─────────────────────────────────────────────────────────────────────
router.post('/auth/login',             AuthCtrl.login);
router.post('/auth/register',          AuthCtrl.register);
router.get( '/auth/session-check',     requireAuth, AuthCtrl.sessionCheck);
// FIX: Returns fresh user object so frontend reflects admin-granted access immediately
router.get( '/auth/me',                requireAuth, AuthCtrl.getMe);
router.post('/auth/logout',            requireAuth, AuthCtrl.logout);
router.post('/auth/otp/send',          AuthCtrl.sendOtp);
router.post('/auth/check-phone',        AuthCtrl.checkPhone);
router.post('/auth/otp/verify',        AuthCtrl.verifyOtp);
router.post('/auth/otp/verify-phone',  AuthCtrl.verifyPhoneOtp);
router.post('/auth/password/reset',    AuthCtrl.resetPassword);
router.post('/auth/password/reset-by-phone', AuthCtrl.resetPasswordByPhone);
router.post('/auth/super-admin/login', AdminCtrl.superAdminLogin);

// ─── Users ────────────────────────────────────────────────────────────────────
router.get('/users/teachers',        UserCtrl.getTeachers);
router.put('/users/:id',             requireAuth, UserCtrl.updateUser);
router.get('/teachers/:id/stats',    requireAuth, UserCtrl.getTeacherStats);

// ─── Admin ────────────────────────────────────────────────────────────────────
router.get(   '/admin/users',                    requireRole(UserRole.SUPER_ADMIN), AdminCtrl.getUsers);
router.post(  '/admin/users/:userId/credits',    requireRole(UserRole.SUPER_ADMIN), AdminCtrl.updateUserCredits);
router.post(  '/admin/users/:userId/access',     requireRole(UserRole.SUPER_ADMIN), AdminCtrl.grantAccess);
router.delete('/admin/users/:userId/access',     requireRole(UserRole.SUPER_ADMIN), AdminCtrl.revokeAccess);

router.post('/admin/revoke-all-access',          requireRole(UserRole.SUPER_ADMIN), AdminCtrl.revokeAllStudentAccess);
router.post('/admin/revert-revoke-all-access',   requireRole(UserRole.SUPER_ADMIN), AdminCtrl.revertRevokeAllStudentAccess);
router.post('/admin/clear-cache',                requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER), AdminCtrl.clearCache);

// ─── Subjects ─────────────────────────────────────────────────────────────────
router.get( '/subjects',  UserCtrl.getSubjects);
router.post('/subjects',  requireRole(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN), UserCtrl.createSubject);

// ─── Courses ──────────────────────────────────────────────────────────────────
router.get(   '/courses',      ContentCtrl.getCourses);
router.get(   '/courses/:id',  ContentCtrl.getCourseById);
router.post(  '/courses',      requireRole(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN), ContentCtrl.createCourse);
router.put(   '/courses/:id',  requireRole(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN), ContentCtrl.updateCourse);
router.delete('/courses/:id',  requireRole(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN), ContentCtrl.deleteCourse);

// ─── Notes ────────────────────────────────────────────────────────────────────
router.get(   '/notes',                       ContentCtrl.getNotes);
router.get(   '/notes/:id',                   ContentCtrl.getNoteById);
router.post(  '/notes',                       requireRole(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN), ContentCtrl.createNote);
router.put(   '/notes/:id',                   requireRole(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN), ContentCtrl.updateNote);
router.delete('/notes/:id',                   requireRole(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN), ContentCtrl.deleteNote);
router.post(  '/notes/:id/purchase',          requireAuth, UserCtrl.purchaseNoteFree);
router.post(  '/notes/:id/create-order',      requireAuth, UserCtrl.createNoteOrder);
router.post(  '/notes/:id/verify-purchase',   requireAuth, UserCtrl.verifyNotePurchase);

// ─── Course purchase (with coupon support) ────────────────────────────────────
router.post(  '/courses/:id/enroll',          requireAuth, UserCtrl.enrollCourseFree);
router.post(  '/courses/:id/create-order',    requireAuth, UserCtrl.createCourseOrder);
router.post(  '/courses/:id/verify-payment',  requireAuth, UserCtrl.verifyCoursePayment);

// ─── Quizzes ──────────────────────────────────────────────────────────────────
router.get(   '/quizzes',      ContentCtrl.getQuizzes);
router.get(   '/quizzes/:id',  ContentCtrl.getQuizById);
router.post(  '/quizzes',      requireRole(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN), ContentCtrl.createQuiz);
router.put(   '/quizzes/:id',  requireRole(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN), ContentCtrl.updateQuiz);
router.delete('/quizzes/:id',  requireRole(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN), ContentCtrl.deleteQuiz);

// ─── Vivas ────────────────────────────────────────────────────────────────────
router.get(   '/vivas',      ContentCtrl.getVivas);
router.get(   '/vivas/:id',  ContentCtrl.getVivaById);
router.post(  '/vivas',      requireRole(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN), ContentCtrl.createViva);
router.put(   '/vivas/:id',  requireRole(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN), ContentCtrl.updateViva);
router.delete('/vivas/:id',  requireRole(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN), ContentCtrl.deleteViva);

// ─── Credits ──────────────────────────────────────────────────────────────────
router.get( '/credits',                requireAuth, UserCtrl.getCredits);
router.post('/credits/consume',        requireAuth, UserCtrl.consumeCredit);
router.post('/credits/create-order',   requireAuth, UserCtrl.createCreditOrder);
router.post('/credits/verify-payment', requireAuth, UserCtrl.verifyCreditPayment);

// ─── Coupons ──────────────────────────────────────────────────────────────────
router.use('/coupons', couponRouter);

// ─── Video Key (AES-128 HLS) ──────────────────────────────────────────────────
router.get('/video/key/:videoId', requireAuth, keyLimiter, UserCtrl.getVideoKey);

// ─── AI Proxy ─────────────────────────────────────────────────────────────────
router.post('/ai/generate', requireAuth, async (req, res) => {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string') { res.status(400).json({ error: 'prompt is required' }); return; }
    if (prompt.length > 8000) { res.status(400).json({ error: 'Prompt too long' }); return; }
    try {
        const { text, provider } = await callAI(prompt);
        res.json({ text, provider });
    } catch (err: any) {
        logger.error('[AI route]', err.message);
        res.status(503).json({ error: 'AI service unavailable. Please try again later.' });
    }
});

export default router;