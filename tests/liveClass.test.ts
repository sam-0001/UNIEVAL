import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import liveClassRoutes from '../server/routes/liveClass.js';
import * as auth from '../server/middleware/auth.js';
import * as daily from '../server/services/daily.js';
import { LiveClass, Course } from '../server/models.js';

// Mock auth middleware to set a dummy user
vi.mock('../server/middleware/auth.js', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    req.user = { id: 'teacher1', name: 'Test Teacher', role: 'STUDENT' };
    next();
  }
}));

// Mock Daily.co API calls
vi.mock('../server/services/daily.js', () => ({
  createDailyRoom: vi.fn().mockResolvedValue({ name: 'test-room', url: 'https://test.daily.co/test-room' }),
  createMeetingToken: vi.fn().mockResolvedValue('test-token'),
  deleteDailyRoom: vi.fn().mockResolvedValue(true)
}));

// Mock Redis
vi.mock('../server/redis.js', () => ({
  getRedisClient: () => ({
    get: vi.fn().mockResolvedValue(null),
    setex: vi.fn().mockResolvedValue('OK')
  })
}));

const app = express();
app.use(express.json());
app.use('/api/live-classes', liveClassRoutes);

describe('Live Class Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should schedule a live class', async () => {
    // Mock Course.findOne
    const courseMock = { id: 'course1', teacherId: 'teacher1' };
    vi.spyOn(Course, 'findOne').mockResolvedValue(courseMock as any);
    
    // Mock LiveClass.create
    vi.spyOn(LiveClass, 'create').mockImplementation((data: any) => Promise.resolve(data) as any);

    const res = await request(app)
      .post('/api/live-classes/schedule')
      .send({
        courseId: 'course1',
        title: 'Test Class',
        scheduledStartTime: new Date().toISOString(),
        scheduledEndTime: new Date(Date.now() + 3600000).toISOString(),
      });

    expect(res.status).toBe(201);
    expect(res.body.liveClass.title).toBe('Test Class');
    expect(res.body.liveClass.dailyRoomName).toBe('test-room');
  });

  it('should return 400 if required fields are missing', async () => {
    const res = await request(app)
      .post('/api/live-classes/schedule')
      .send({ courseId: 'course1' });
    
    expect(res.status).toBe(400);
  });

  it('should join a live class', async () => {
    vi.spyOn(LiveClass, 'findOne').mockResolvedValue({
      id: 'class1',
      status: 'live',
      dailyRoomName: 'test-room',
      dailyRoomUrl: 'https://test.daily.co/test-room'
    } as any);

    const res = await request(app)
      .post('/api/live-classes/class1/join');

    expect(res.status).toBe(200);
    expect(res.body.token).toBe('test-token');
  });

  it('should not join an inactive live class', async () => {
    vi.spyOn(LiveClass, 'findOne').mockResolvedValue({
      id: 'class1',
      status: 'scheduled'
    } as any);

    const res = await request(app)
      .post('/api/live-classes/class1/join');

    expect(res.status).toBe(404);
  });
});
