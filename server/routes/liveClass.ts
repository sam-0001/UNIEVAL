import express from 'express';
import { 
  scheduleLiveClass, 
  startLiveClass, 
  joinLiveClass, 
  endLiveClass, 
  getLiveClassesForCourse,
  getMyLiveClassSchedule
} from '../controllers/liveClassController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js'; // Assuming teacher needs admin privileges or similar, adjust if needed

const router = express.Router();

// Teacher routes
router.post('/schedule', requireAuth, scheduleLiveClass); // Add requireAdmin if needed
router.post('/:id/start', requireAuth, startLiveClass);
router.post('/:id/end', requireAuth, endLiveClass);

// Student/General routes
router.post('/:id/join', requireAuth, joinLiveClass);
router.get('/my-schedule', requireAuth, getMyLiveClassSchedule);
router.get('/course/:courseId', requireAuth, getLiveClassesForCourse);

export default router;
