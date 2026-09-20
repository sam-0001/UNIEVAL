import express from 'express';
import { 
  scheduleLiveClass, 
  startLiveClass, 
  joinLiveClass, 
  endLiveClass, 
  getLiveClassesForCourse,
  getMyLiveClassSchedule,
  deleteLiveClass,
  getTeacherLiveClassSchedule
} from '../controllers/liveClassController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/auth.js';
import { UserRole } from '../../types.js'; // Assuming teacher needs admin privileges or similar, adjust if needed
import { dailyWebhook, getPendingRecordings, finalizeRecording } from '../controllers/liveClassController.js';

const router = express.Router();

// Webhooks
router.post('/webhook', dailyWebhook);

// Admin Routes for Recording Archival
router.get('/pending-recordings', requireRole(UserRole.SUPER_ADMIN), getPendingRecordings);
router.post('/finalize-recording', requireRole(UserRole.SUPER_ADMIN), finalizeRecording);

// Teacher routes
router.get('/teacher-schedule', requireAuth, getTeacherLiveClassSchedule);
router.post('/schedule', requireAuth, scheduleLiveClass); // Add requireAdmin if needed
router.post('/:id/start', requireAuth, startLiveClass);
router.post('/:id/end', requireAuth, endLiveClass);
router.delete('/:id', requireAuth, deleteLiveClass);

// Student/General routes
router.post('/:id/join', requireAuth, joinLiveClass);
router.get('/my-schedule', requireAuth, getMyLiveClassSchedule);
router.get('/course/:courseId', requireAuth, getLiveClassesForCourse);

export default router;
