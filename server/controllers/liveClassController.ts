import { Request, Response } from 'express';
import { LiveClass, Course, User } from '../models.js';
import { createDailyRoom, createMeetingToken, deleteDailyRoom, getDailyRoom } from '../services/daily.js';
import { createStreamToken } from '../services/stream.js';
import logger from '../logger.js';
import crypto from 'crypto';
import { redis } from '../redis.js';

export const scheduleLiveClass = async (req: Request, res: Response): Promise<void> => {
  try {
    const { courseId, moduleId, title, description, scheduledStartTime, scheduledEndTime } = req.body;
    // Assuming req.user is set by auth middleware
    const teacherId = (req as any).currentUser?.id;

    if (!teacherId || !courseId || !title || !scheduledStartTime || !scheduledEndTime) {
      logger.error('Missing required fields', { teacherId, courseId, title, scheduledStartTime, scheduledEndTime });
      res.status(400).json({ error: 'Missing required fields: courseId, title, scheduledStartTime, scheduledEndTime are required' });
      return;
    }

    // Verify course ownership
    const course = await Course.findOne({ id: courseId, teacherId });
    if (!course) {
      res.status(403).json({ error: 'Not authorized to schedule class for this course' });
      return;
    }

    // Create Daily room expiring 2 hours after end time
    const exp = Math.floor(new Date(scheduledEndTime).getTime() / 1000) + 7200;
    let room = { name: `room-${crypto.randomUUID()}`, url: `https://dummy.com/room` };
    try {
      if (process.env.DAILY_API_KEY) {
        room = await createDailyRoom(exp);
      }
    } catch (e) {
      logger.warn('Failed to create Daily room, using dummy values for Stream compatibility', { error: e });
    }

    const liveClass = await LiveClass.create({
      id: crypto.randomUUID(),
      courseId,
      moduleId: moduleId || null,
      title: title || 'Live Class',
      description,
      teacherId,
      scheduledStartTime,
      scheduledEndTime,
      dailyRoomName: room.name,
      dailyRoomUrl: room.url,
      status: 'scheduled',
    });

    res.status(201).json({ liveClass });
  } catch (error: any) {
    logger.error('Error scheduling live class', { error: error.message });
    res.status(500).json({ error: 'Failed to schedule live class' });
  }
};

export const startLiveClass = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const teacherId = (req as any).currentUser?.id;
    const userName = (req as any).currentUser?.name || 'Teacher';

    const liveClass = await LiveClass.findOne({ id, teacherId });
    if (!liveClass) {
      res.status(404).json({ error: 'Live class not found or unauthorized' });
      return;
    }

    liveClass.status = 'live';
    await liveClass.save();

    const token = createStreamToken(teacherId);
    res.status(200).json({ token, callId: liveClass.id, liveClass });
  } catch (error: any) {
    logger.error('Error starting live class', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to start live class', details: error.message });
  }
};
export const joinLiveClass = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).currentUser?.id;
    const userName = (req as any).currentUser?.name || 'Student';

    const liveClass = await LiveClass.findOne({ id });
    if (!liveClass || liveClass.status !== 'live') {
      res.status(404).json({ error: 'Live class is not active' });
      return;
    }

    const token = createStreamToken(userId);
    res.status(200).json({ token, callId: liveClass.id, liveClass });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to join live class' });
  }
};
export const endLiveClass = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const teacherId = (req as any).currentUser?.id;

    const liveClass = await LiveClass.findOne({ id, teacherId });
    if (!liveClass) {
      res.status(404).json({ error: 'Live class not found or unauthorized' });
      return;
    }

    // Stream calls don't need explicit deletion here
    liveClass.status = 'completed';
    await liveClass.save();

    res.status(200).json({ message: 'Live class ended successfully' });
  } catch (error: any) {
    logger.error('Error ending live class', { error: error.message });
    res.status(500).json({ error: 'Failed to end live class' });
  }
};

export const getLiveClassesForCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { courseId } = req.params;
    const liveClasses = await LiveClass.find({ courseId, ...(req.query.status === 'completed' ? { status: 'completed' } : req.query.status === 'all' ? {} : { status: { $ne: 'completed' } }) }).sort({ scheduledStartTime: 1 });
    res.status(200).json({ liveClasses });
  } catch (error: any) {
    logger.error('Error fetching live classes', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch live classes' });
  }
};

export const deleteLiveClass = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const teacherId = (req as any).currentUser?.id;

    const liveClass = await LiveClass.findOne({ id, teacherId });
    if (!liveClass) {
      res.status(404).json({ error: 'Live class not found or unauthorized' });
      return;
    }

    try {
      // Stream calls don't need explicit deletion here
    } catch (e) {
      // Room might already be deleted or expired, ignore
    }

    await LiveClass.deleteOne({ id, teacherId });
    res.status(200).json({ message: 'Live class deleted successfully' });
  } catch (error: any) {
    logger.error('Error deleting live class', { error: error.message });
    res.status(500).json({ error: 'Failed to delete live class' });
  }
};


export const getLiveClassDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const liveClass = await LiveClass.findOne({ id });
    if (!liveClass) {
      res.status(404).json({ error: 'Live class not found' });
      return;
    }
    res.status(200).json({ liveClass });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch live class details' });
  }
};

export const getMyLiveClassSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).currentUser;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Get full user from DB to ensure purchasedCourseIds is up to date
    const dbUser = await User.findOne({ id: user.id });
    if (!dbUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    // Student must be authorized (purchased, or if free then enrolled)
    const validCourseIds = [...new Set([...(dbUser.purchasedCourseIds || [])])];

    const liveClasses = await LiveClass.find({
      courseId: { $in: validCourseIds },
      ...(req.query.status === 'completed' ? { status: 'completed' } : req.query.status === 'all' ? {} : { ...(req.query.status === 'completed' ? { status: 'completed' } : req.query.status === 'all' ? {} : { ...(req.query.status === 'completed' ? { status: 'completed' } : req.query.status === 'all' ? {} : { status: { $in: ['scheduled', 'live'] } }) }) })
    }).sort({ scheduledStartTime: 1 });

    res.status(200).json({ liveClasses });
  } catch (error: any) {
    logger.error('Error fetching my schedule', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
};

export const getTeacherLiveClassSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const teacherId = (req as any).currentUser?.id;
    if (!teacherId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const liveClasses = await LiveClass.find({
      teacherId,
      ...(req.query.status === 'completed' ? { status: 'completed' } : req.query.status === 'all' ? {} : { status: { $in: ['scheduled', 'live'] } })
    }).sort({ scheduledStartTime: 1 });

    res.status(200).json({ liveClasses });
  } catch (error: any) {
    logger.error('Error fetching teacher schedule', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
};

// Daily.co Webhook Handler
export const dailyWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const event = req.body;
    if (event.type === 'recording.ready') {
      const roomName = event.payload.room_name;
      const rawMp4Url = event.payload.download_link; // Assuming standard Daily payload
      
      const liveClass = await LiveClass.findOne({ dailyRoomName: roomName });
      if (liveClass) {
        await import('../models.js').then(({ PendingRecording }) => {
          PendingRecording.create({
            id: crypto.randomUUID(),
            courseId: liveClass.courseId,
            moduleId: liveClass.moduleId,
            title: liveClass.title,
            rawMp4Url,
            status: 'pending'
          });
        });
      }
    }
    res.status(200).send('OK');
  } catch (error) {
    res.status(500).send('Webhook Error');
  }
};

// Admin Endpoints for Pending Recordings
export const getPendingRecordings = async (req: Request, res: Response): Promise<void> => {
  try {
    const PendingRecording = (await import('../models.js')).PendingRecording;
    const recordings = await PendingRecording.find({ status: 'pending' });
    res.status(200).json({ recordings });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch pending recordings' });
  }
};

export const finalizeRecording = async (req: Request, res: Response): Promise<void> => {
  try {
    const { recordingId, videoUrl, videoKey, resources } = req.body;
    const PendingRecording = (await import('../models.js')).PendingRecording;
    
    const recording = await PendingRecording.findOne({ id: recordingId });
    if (!recording) {
      res.status(404).json({ error: 'Recording not found' });
      return;
    }
    
    // Add to Course Module
    const course = await Course.findOne({ id: recording.courseId });
    if (course) {
      const module = course.modules.find((m: any) => m.id === recording.moduleId);
      if (module) {
        module.videos.push({
          id: crypto.randomUUID(),
          title: recording.title,
          videoUrl,
          videoStatus: 'ready',
          videoProgress: 100,
          videoId: crypto.randomUUID(),
          videoKey,
          resources: resources || []
        });
        await course.save();
      }
    }
    
    // Cleanup
    await PendingRecording.deleteOne({ id: recordingId });
    await LiveClass.deleteOne({ courseId: recording.courseId, moduleId: recording.moduleId, title: recording.title });
    
    res.status(200).json({ message: 'Recording finalized' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to finalize recording' });
  }
};
