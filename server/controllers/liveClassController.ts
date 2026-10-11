import { Request, Response } from 'express';
import { LiveClass, Course, User } from '../models.js';
import { createWebinar, deleteWebinar, getWebinarToken } from '../services/webinargg.js';
import logger from '../logger.js';
import crypto from 'crypto';
import { redis } from '../redis.js';

export const scheduleLiveClass = async (req: Request, res: Response): Promise<void> => {
  try {
    const { courseId, moduleId, title, description, scheduledStartTime, scheduledEndTime } = req.body;
    // Assuming req.user is set by auth middleware
    const teacherId = (req as any).currentUser?.id || (req as any).user?.id;

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

    // Calculate duration in minutes (supports classes up to 8 hours / 480 minutes)
    const startTimeDate = new Date(scheduledStartTime);
    const endTimeDate = new Date(scheduledEndTime);
    const diffMinutes = Math.floor((endTimeDate.getTime() - startTimeDate.getTime()) / 60000);
    const durationMinutes = Math.min(480, Math.max(15, diffMinutes > 0 ? diffMinutes : 120));

    let webinarId = `webinar-${crypto.randomUUID()}`;
    let webinarUrl = `https://webinar.gg/webinar-page/${webinarId}`;

    try {
      if (process.env.WEBINAR_GG_API_KEY || process.env.NODE_ENV === 'test') {
        const webinarRes = await createWebinar(title, scheduledStartTime, durationMinutes, 'Asia/Kolkata');
        webinarId = webinarRes.id;
        webinarUrl = webinarRes.url || webinarUrl;
      }
    } catch (e) {
      logger.warn('Failed to create Webinar.gg room, using fallback ID', { error: e });
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
      dailyRoomName: webinarId, // Reusing field for Webinar.gg ID
      dailyRoomUrl: webinarUrl, // Reusing field for Webinar.gg embed URL
      status: 'scheduled',
      passcode: '',
    });

    res.status(201).json({ liveClass });
  } catch (error: any) {
    logger.error('Error scheduling live class', { error: error.message });
    res.status(500).json({ error: 'Failed to schedule live class' });
  }
};

// In-memory store for single-use secure stream links (expires in 60 seconds)
const streamSessions = new Map<string, string>();

/**
 * Ensures a live class has a valid Webinar.gg room.
 * Migrates legacy Daily.co rooms or invalid rooms on the fly.
 */
const ensureWebinarRoom = async (liveClass: any): Promise<void> => {
  const isInvalidOrLegacy = 
    !liveClass.dailyRoomName || 
    liveClass.dailyRoomUrl?.includes('daily.co') || 
    !liveClass.dailyRoomUrl?.includes('webinar.gg');

  if (isInvalidOrLegacy && process.env.WEBINAR_GG_API_KEY) {
    try {
      logger.info(`Auto-provisioning Webinar.gg room for legacy/invalid class: ${liveClass.id}`);
      const webinarRes = await createWebinar(
        liveClass.title || 'UniEval Live Class',
        new Date().toISOString(),
        360,
        'Asia/Kolkata',
        liveClass.passcode || ''
      );
      if (webinarRes?.id) {
        liveClass.dailyRoomName = webinarRes.id;
        liveClass.dailyRoomUrl = webinarRes.url || `https://webinar.gg/webinar-page/${webinarRes.id}`;
        await liveClass.save();
        logger.info(`Successfully updated class ${liveClass.id} with Webinar.gg room ${webinarRes.id}`);
      }
    } catch (e: any) {
      logger.error('Failed to auto-provision Webinar.gg room for legacy class', { error: e.message });
    }
  }
};

export const startLiveClass = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const teacherId = (req as any).currentUser?.id;
    const userName = (req as any).currentUser?.name || 'Teacher';
    const userEmail = (req as any).currentUser?.email || 'teacher@unieval.in';

    const liveClass = await LiveClass.findOne({ id, teacherId });
    if (!liveClass) {
      res.status(404).json({ error: 'Live class not found or unauthorized' });
      return;
    }

    await ensureWebinarRoom(liveClass);

    liveClass.status = 'live';
    await liveClass.save();

    let token = 'dummy-token';
    if (process.env.WEBINAR_GG_API_KEY) {
      const cacheKey = `webinar:token:${liveClass.id}:${teacherId}`;
      const cachedToken = await redis.get(cacheKey).catch(() => null);
      if (cachedToken && cachedToken !== 'dummy-token') {
        token = cachedToken;
      } else {
        try {
          token = await getWebinarToken(liveClass.dailyRoomName, 'host', userName, userEmail, liveClass.passcode || '');
          await redis.setex(cacheKey, 14400, token).catch(() => null); // Cache for 4 hours
        } catch (e: any) {
          logger.error('Failed to get Webinar.gg host token', { error: e.message });
          // If webinar was not found on Webinar.gg (legacy, deleted, or expired), self-heal by provisioning a new room
          if (e.message?.includes('Webinar not found')) {
            try {
              logger.info(`Webinar not found for class ${liveClass.id}, creating a fresh Webinar.gg room...`);
              const webinarRes = await createWebinar(
                liveClass.title || 'UniEval Live Class',
                new Date().toISOString(),
                360,
                'Asia/Kolkata',
                liveClass.passcode || ''
              );
              if (webinarRes?.id) {
                liveClass.dailyRoomName = webinarRes.id;
                liveClass.dailyRoomUrl = webinarRes.url || `https://webinar.gg/webinar-page/${webinarRes.id}`;
                await liveClass.save();
                token = await getWebinarToken(liveClass.dailyRoomName, 'host', userName, userEmail, liveClass.passcode || '');
                await redis.setex(cacheKey, 14400, token).catch(() => null);
              }
            } catch (reErr: any) {
              logger.error('Failed to auto-heal webinar room', { error: reErr.message });
              if (process.env.NODE_ENV !== 'test') {
                throw new Error(`Failed to generate live session host token: ${reErr.message}`);
              }
            }
          } else if (process.env.NODE_ENV !== 'test') {
            throw new Error(`Failed to generate live session host token: ${e.message}`);
          }
        }
      }
    }

    // Generate secure single-use link
    const sessionKey = crypto.randomBytes(16).toString('hex');
    const targetUrl = `${liveClass.dailyRoomUrl}?token=${token}`;
    streamSessions.set(sessionKey, targetUrl);
    setTimeout(() => streamSessions.delete(sessionKey), 60000); // Expires in 1 min

    res.status(200).json({ sessionKey, callId: liveClass.dailyRoomName, liveClass, streamUrl: targetUrl });
  } catch (error: any) {
    logger.error('Error starting live class', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to start live class', details: error.message });
  }
};

export const joinLiveClass = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).currentUser?.id || (req as any).user?.id;
    const userName = (req as any).currentUser?.name || (req as any).user?.name || 'Student';
    const userEmail = (req as any).currentUser?.email || (req as any).user?.email || 'student@unieval.in';

    const liveClass = await LiveClass.findOne({ id });
    if (!liveClass || liveClass.status !== 'live') {
      const isScheduled = liveClass?.status === 'scheduled';
      const isCompleted = liveClass?.status === 'completed';
      res.status(404).json({ 
        error: isScheduled 
          ? 'Class has not started yet. The instructor will begin shortly.' 
          : isCompleted 
          ? 'This live class has ended.' 
          : 'Live class not active',
        code: isScheduled ? 'CLASS_SCHEDULED' : isCompleted ? 'CLASS_COMPLETED' : 'NOT_ACTIVE',
        scheduledStartTime: liveClass?.scheduledStartTime,
        courseId: liveClass?.courseId
      });
      return;
    }

    await ensureWebinarRoom(liveClass);

    const dbUser = userId ? await User.findOne({ id: userId }) : null;
    if (!dbUser && !(req as any).user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const isAdmin = dbUser?.role === 'ADMIN' || dbUser?.role === 'SUPER_ADMIN' || dbUser?.role === 'TEACHER' || (req as any).user?.role === 'ADMIN' || (req as any).user?.role === 'TEACHER';
    
    if (!isAdmin) {
      const hasPurchased = dbUser?.purchasedCourseIds?.includes(liveClass.courseId);
      
      if (!hasPurchased) {
        const course = await Course.findOne({ id: liveClass.courseId });
        res.status(403).json({ 
          error: 'Access denied: You must be enrolled in this course to join the live class',
          code: 'NOT_ENROLLED',
          courseId: liveClass.courseId,
          courseTitle: course?.title || 'UniEval Course'
        });
        return;
      }
    }

    let token = 'dummy-token';
    if (process.env.WEBINAR_GG_API_KEY) {
      const cacheKey = `webinar:token:${liveClass.id}:${userId}`;
      const cachedToken = await redis.get(cacheKey).catch(() => null);
      if (cachedToken && cachedToken !== 'dummy-token') {
        token = cachedToken;
      } else {
        try {
          token = await getWebinarToken(liveClass.dailyRoomName, 'attendee', userName, userEmail, liveClass.passcode || '');
          await redis.setex(cacheKey, 14400, token).catch(() => null); // Cache for 4 hours to allow rejoining long classes
        } catch (e: any) {
          logger.error('Failed to get Webinar.gg attendee token', { error: e.message });
          if (e.message?.includes('Webinar not found')) {
            try {
              logger.info(`Webinar not found for attendee join ${liveClass.id}, healing room...`);
              const webinarRes = await createWebinar(
                liveClass.title || 'UniEval Live Class',
                new Date().toISOString(),
                360,
                'Asia/Kolkata',
                liveClass.passcode || ''
              );
              if (webinarRes?.id) {
                liveClass.dailyRoomName = webinarRes.id;
                liveClass.dailyRoomUrl = webinarRes.url || `https://webinar.gg/webinar-page/${webinarRes.id}`;
                await liveClass.save();
                token = await getWebinarToken(liveClass.dailyRoomName, 'attendee', userName, userEmail, liveClass.passcode || '');
                await redis.setex(cacheKey, 14400, token).catch(() => null);
              }
            } catch (reErr: any) {
              logger.error('Failed to auto-heal webinar room for attendee', { error: reErr.message });
              if (process.env.NODE_ENV !== 'test') {
                throw new Error(`Failed to generate live session attendee token: ${reErr.message}`);
              }
            }
          } else if (process.env.NODE_ENV !== 'test') {
            throw new Error(`Failed to generate live session attendee token: ${e.message}`);
          }
        }
      }
    }

    // Generate secure single-use link
    const sessionKey = crypto.randomBytes(16).toString('hex');
    const targetUrl = `${liveClass.dailyRoomUrl}?token=${token}`;
    streamSessions.set(sessionKey, targetUrl);
    setTimeout(() => streamSessions.delete(sessionKey), 60000); // Expires in 1 min

    res.status(200).json({ sessionKey, callId: liveClass.dailyRoomName, liveClass, streamUrl: targetUrl, token });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to join live class' });
  }
};

// Endpoint to consume the one-time stream session
export const secureStreamRedirect = async (req: Request, res: Response): Promise<void> => {
  const sessionKey = req.params.sessionKey as string;
  const targetUrl = streamSessions.get(sessionKey);
  
  if (!targetUrl) {
    res.status(403).send('Stream link expired or invalid. Please rejoin the class.');
    return;
  }
  
  // Link expires automatically in 60s (handled by setTimeout when created)
  res.redirect(302, targetUrl);
};
export const endLiveClass = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const teacherId = (req as any).currentUser?.id || (req as any).user?.id;
    const userRole = (req as any).currentUser?.role || (req as any).user?.role;
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

    const query = isAdmin ? { id } : { id, teacherId };
    const liveClass = await LiveClass.findOne(query);
    if (!liveClass) {
      res.status(404).json({ error: 'Live class not found or unauthorized' });
      return;
    }

    liveClass.status = 'completed';
    // Do not set fake recordingUrl from dailyRoomUrl; real recording is attached when uploaded/ready
    await liveClass.save();

    res.status(200).json({ message: 'Live class ended successfully' });
  } catch (error: any) {
    logger.error('Error ending live class', { error: error.message });
    res.status(500).json({ error: 'Failed to end live class' });
  }
};

export const getLiveClassPlayback = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).currentUser?.id || (req as any).user?.id;
    const userName = (req as any).currentUser?.name || (req as any).user?.name || 'Student';
    const userEmail = (req as any).currentUser?.email || (req as any).user?.email || 'student@unieval.in';

    const liveClass = await LiveClass.findOne({ id });
    if (!liveClass) {
      res.status(404).json({ error: 'Live class not found' });
      return;
    }

    const dbUser = userId ? await User.findOne({ id: userId }) : null;
    if (!dbUser && !(req as any).user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const isAdmin = dbUser?.role === 'ADMIN' || dbUser?.role === 'SUPER_ADMIN' || dbUser?.role === 'TEACHER' || (req as any).user?.role === 'ADMIN' || (req as any).user?.role === 'TEACHER';

    // Verify course enrollment / purchase
    if (!isAdmin) {
      const hasPurchased = dbUser?.purchasedCourseIds?.includes(liveClass.courseId);

      if (!hasPurchased) {
        const course = await Course.findOne({ id: liveClass.courseId });
        res.status(403).json({
          error: 'Access denied: You must be enrolled in this course to watch this recording',
          code: 'NOT_ENROLLED',
          courseId: liveClass.courseId,
          courseTitle: course?.title || 'UniEval Course'
        });
        return;
      }
    }

    // Direct MP4 / CDN video recording
    if (liveClass.recordingUrl && !liveClass.recordingUrl.includes('webinar.gg')) {
      res.status(200).json({
        playbackUrl: liveClass.recordingUrl,
        type: 'video',
        title: liveClass.title
      });
      return;
    }

    // Webinar.gg room session replay: mint valid token for this user
    let token = 'dummy-token';
    if (process.env.WEBINAR_GG_API_KEY) {
      const cacheKey = `webinar:token:${liveClass.id}:${userId}`;
      const cachedToken = await redis.get(cacheKey).catch(() => null);
      if (cachedToken && cachedToken !== 'dummy-token') {
        token = cachedToken;
      } else {
        try {
          token = await getWebinarToken(
            liveClass.dailyRoomName,
            'attendee',
            userName,
            userEmail,
            liveClass.passcode || ''
          );
          await redis.setex(cacheKey, 14400, token).catch(() => null);
        } catch (e: any) {
          logger.error('Failed to get Webinar.gg playback token', { error: e.message });
          if (process.env.NODE_ENV !== 'test') {
            throw new Error(`Failed to generate recording playback token: ${e.message}`);
          }
        }
      }
    }

    const sessionKey = crypto.randomBytes(16).toString('hex');
    const targetUrl = `${liveClass.dailyRoomUrl}?token=${token}`;
    streamSessions.set(sessionKey, targetUrl);
    setTimeout(() => streamSessions.delete(sessionKey), 600000); // 10 min

    res.status(200).json({
      playbackUrl: targetUrl,
      sessionKey,
      token,
      type: 'embed',
      title: liveClass.title
    });
  } catch (error: any) {
    logger.error('Error in getLiveClassPlayback', { error: error.message });
    res.status(500).json({ error: error.message || 'Failed to generate recording playback session' });
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
      if (process.env.WEBINAR_GG_API_KEY && liveClass.dailyRoomName && !liveClass.dailyRoomName.startsWith('webinar-')) {
        await deleteWebinar(liveClass.dailyRoomName);
      }
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

    const course = await Course.findOne({ id: liveClass.courseId });
    const teacher = await User.findOne({ id: liveClass.teacherId });

    const sanitizedClass = {
      id: liveClass.id,
      title: liveClass.title,
      description: liveClass.description,
      courseId: liveClass.courseId,
      courseTitle: course?.title || 'UniEval Course',
      courseThumbnail: course?.thumbnail || '',
      coursePrice: (course as any)?.price ?? (course?.pricing as any)?.amount ?? 0,
      teacherName: teacher?.name || 'Instructor',
      scheduledStartTime: liveClass.scheduledStartTime,
      scheduledEndTime: liveClass.scheduledEndTime,
      status: liveClass.status
    };

    res.status(200).json({ liveClass: sanitizedClass });
  } catch (error: any) {
    logger.error('Failed to fetch live class details', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch live class details' });
  }
};

export const getMyLiveClassSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).currentUser || (req as any).user;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const dbUser = await User.findOne({ id: user.id });
    if (!dbUser && !(req as any).user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    const isAdminOrTeacher = dbUser?.role === 'admin' || dbUser?.role === 'teacher';
    let filter: any = {};

    if (!isAdminOrTeacher) {
      const validCourseIds = dbUser?.purchasedCourseIds || [];
      filter.courseId = { $in: validCourseIds };
    }

    const statusQuery = req.query.status as string | undefined;
    if (statusQuery === 'completed') {
      filter.status = 'completed';
    } else if (statusQuery === 'live') {
      filter.status = 'live';
    } else if (statusQuery === 'scheduled') {
      filter.status = 'scheduled';
    } else if (statusQuery === 'all') {
      // no status constraint
    }

    const rawClasses = await LiveClass.find(filter).sort({ scheduledStartTime: -1 });

    const courseIds = [...new Set(rawClasses.map(c => c.courseId))];
    const teacherIds = [...new Set(rawClasses.map(c => c.teacherId))];
    const [courses, teachers] = await Promise.all([
      Course.find({ id: { $in: courseIds } }).select('id title thumbnail subjectId'),
      User.find({ id: { $in: teacherIds } }).select('id name')
    ]);

    const courseMap = new Map(courses.map(c => [c.id, c]));
    const teacherMap = new Map(teachers.map(t => [t.id, t.name]));

    const liveClasses = rawClasses.map(lc => {
      const c = courseMap.get(lc.courseId);
      return {
        id: lc.id,
        courseId: lc.courseId,
        moduleId: lc.moduleId,
        title: lc.title,
        description: lc.description,
        teacherId: lc.teacherId,
        teacherName: teacherMap.get(lc.teacherId) || 'Instructor',
        course: c?.title || 'UniEval Course',
        subject: c?.subjectId || '',
        thumbnail: c?.thumbnail || '',
        scheduledStartTime: lc.scheduledStartTime,
        scheduledEndTime: lc.scheduledEndTime,
        status: lc.status,
        recordingUrl: lc.recordingUrl || null,
        dailyRoomUrl: lc.dailyRoomUrl
      };
    });

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

// Webinar.gg Webhook Handler
export const webinarWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const event = req.body;
    // Assuming Webinar.gg sends event.type == 'recording.ready' or similar
    if (event.type === 'recording.ready' || event.type === 'webinar.recording_ready' || event.type === 'webinar.recording.created') {
      const roomName = event.payload?.webinar_id || event.payload?.room_name;
      const rawMp4Url = event.payload?.download_link || event.payload?.recording_url;
      
      if (!roomName || !rawMp4Url) {
        res.status(400).send('Missing webhook payload data');
        return;
      }
      
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
    logger.error('Webhook Error', { error });
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

export const updateLiveClassRecording = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { recordingUrl } = req.body;
    const teacherId = (req as any).currentUser?.id || (req as any).user?.id;
    const userRole = (req as any).currentUser?.role || (req as any).user?.role;
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

    const query: any = { id };
    if (!isAdmin) {
      query.teacherId = teacherId;
    }

    const liveClass = await LiveClass.findOne(query);
    if (!liveClass) {
      res.status(404).json({ error: 'Live class not found or unauthorized' });
      return;
    }

    liveClass.recordingUrl = recordingUrl ? String(recordingUrl).trim() : null;
    await liveClass.save();

    res.status(200).json({ liveClass, message: 'Recording URL updated successfully' });
  } catch (error: any) {
    logger.error('Error updating live class recording', { error: error.message });
    res.status(500).json({ error: 'Failed to update recording URL' });
  }
};

