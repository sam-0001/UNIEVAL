import { Request, Response } from 'express';
import { LiveClass, Course, User } from '../models.js';
import { createDailyRoom, createMeetingToken, deleteDailyRoom } from '../services/daily.js';
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
    const room = await createDailyRoom(exp);

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

    const token = await createMeetingToken(liveClass.dailyRoomName, true, userName);
    res.status(200).json({ token, roomUrl: liveClass.dailyRoomUrl, liveClass });
  } catch (error: any) {
    logger.error('Error starting live class', { error: error.message });
    res.status(500).json({ error: 'Failed to start live class' });
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

    // Anti-Piracy Concurrency Check is now handled strictly in socket.ts via force-disconnect.

    const token = await createMeetingToken(liveClass.dailyRoomName, false, userName);
    res.status(200).json({ token, roomUrl: liveClass.dailyRoomUrl, liveClass });
  } catch (error: any) {
    logger.error('Error joining live class', { error: error.message });
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

    await deleteDailyRoom(liveClass.dailyRoomName);
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
    const liveClasses = await LiveClass.find({ courseId, status: { $ne: 'completed' } }).sort({ scheduledStartTime: 1 });
    res.status(200).json({ liveClasses });
  } catch (error: any) {
    logger.error('Error fetching live classes', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch live classes' });
  }
};

export const getMyLiveClassSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).currentUser;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Find free courses
    const freeCourses = await Course.find({ price: 0 });
    const freeCourseIds = freeCourses.map(c => c.id);

    // Get full user from DB to ensure purchasedCourseIds is up to date
    const dbUser = await User.findOne({ id: user.id });
    if (!dbUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    const validCourseIds = [...new Set([...(dbUser.purchasedCourseIds || []), ...freeCourseIds])];

    const liveClasses = await LiveClass.find({
      courseId: { $in: validCourseIds },
      status: { $in: ['scheduled', 'live'] }
    }).sort({ scheduledStartTime: 1 });

    res.status(200).json({ liveClasses });
  } catch (error: any) {
    logger.error('Error fetching my schedule', { error: error.message });
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
