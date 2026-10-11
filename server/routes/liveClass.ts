import express from 'express';
import { 
  scheduleLiveClass, 
  startLiveClass, 
  joinLiveClass, 
  endLiveClass, 
  getLiveClassesForCourse,
  getMyLiveClassSchedule,
  deleteLiveClass,
  getTeacherLiveClassSchedule,
  getLiveClassDetails,
  getLiveClassPlayback,
  updateLiveClassRecording
} from '../controllers/liveClassController.js';
import { requireAuth } from '../middleware/auth.js';

import { 
  webinarWebhook, 
  getPendingRecordings, 
  finalizeRecording,
  secureStreamRedirect 
} from '../controllers/liveClassController.js';

const router = express.Router();

// Secure iframe stream redirect (unauthenticated, uses one-time sessionKey)
router.get('/stream/:sessionKey', secureStreamRedirect);

// Webhooks
router.post('/webhook', webinarWebhook);

// Admin Routes for Recording Archival
router.get('/pending-recordings', requireAuth, getPendingRecordings);
router.post('/finalize-recording', requireAuth, finalizeRecording);

// Teacher routes
router.get('/teacher-schedule', requireAuth, getTeacherLiveClassSchedule);
router.post('/schedule', requireAuth, scheduleLiveClass); // Add requireAdmin if needed
router.post('/:id/start', requireAuth, startLiveClass);
router.post('/:id/end', requireAuth, endLiveClass);
router.patch('/:id/recording', requireAuth, updateLiveClassRecording);
router.delete('/:id', requireAuth, deleteLiveClass);

// Student/General routes
router.get('/info/:id', getLiveClassDetails);
router.post('/:id/join', requireAuth, joinLiveClass);
router.get('/my-schedule', requireAuth, getMyLiveClassSchedule);
router.get('/course/:courseId', requireAuth, getLiveClassesForCourse);
router.get('/:id/playback', requireAuth, getLiveClassPlayback);

export default router;
