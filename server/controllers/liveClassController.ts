import { Request, Response } from 'express';
import { LiveClass, Course, User } from '../models.js';
import { createDailyRoom, createMeetingToken, deleteDailyRoom } from '../services/daily.js';
import logger from '../logger.js';
import crypto from 'crypto';
import { redis } from '../redis.js';

export const scheduleLiveClass = async (req: Request, res: Response): Promise<void> => {
  try {
    const { courseId, title, description, scheduledStartTime, scheduledEndTime } = req.body;
    // Assuming req.user is set by auth middleware
    const teacherId = (req as any).currentUser?.id;

    if (!teacherId || !courseId || !scheduledStartTime || !scheduledEndTime) {
      logger.error('Missing required fields', { teacherId, courseId, scheduledStartTime, scheduledEndTime, title });
      res.status(400).json({ error: 'Missing required fields', details: { teacherId, courseId, scheduledStartTime, scheduledEndTime, title } });
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
      title,
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

    // Anti-Piracy Concurrency Check using Redis
    if (redis) {
      // Temporarily bypass strict 409 lockout so students can refresh the page without getting locked out for an hour.
      // A proper implementation should use Socket.io disconnects to clear this key.
      await redis.setex(`liveclass:${id}:user:${userId}`, 3600, 'joined');
    }

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
    const liveClasses = await LiveClass.find({ courseId }).sort({ scheduledStartTime: 1 });
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
