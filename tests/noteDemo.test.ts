import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import secureFileRoutes from '../server/routes/secureFile.js';
import { Note, User, Purchase } from '../server/models/index.js';
import * as uploadModule from '../server/routes/upload.js';
import jwt from 'jsonwebtoken';

vi.mock('../server/routes/upload.js', () => ({
  readAndDecryptFile: vi.fn(),
  readAndDecryptBundleAsset: vi.fn(),
  getBundleIdForFile: vi.fn()
}));

const app = express();
app.use(express.json());
app.use('/api', secureFileRoutes);

const mockNote = {
  id: 'note-123',
  title: 'Engineering Mathematics 3',
  price: 299,
  sections: [
    {
      id: 'sec-1',
      title: 'Unit 1: LDE',
      files: [
        { id: 'file-demo-1', title: 'Unit 1 Notes.pdf', url: '/api/secure-file-raw/enc-file-1', isFree: false },
        { id: 'file-locked-2', title: 'Unit 1 Solved Questions.pdf', url: '/api/secure-file-raw/enc-file-2', isFree: false }
      ]
    },
    {
      id: 'sec-2',
      title: 'Unit 2: Transforms',
      files: [
        { id: 'file-locked-3', title: 'Unit 2 Notes.pdf', url: '/api/secure-file-raw/enc-file-3', isFree: false }
      ]
    }
  ]
};

describe('Note 1st PDF Free Demo Access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows anyone (guest without auth token) to open the 1st PDF file as a free demo', async () => {
    vi.spyOn(Note, 'findOne').mockReturnValue({
      lean: vi.fn().mockResolvedValue(mockNote)
    } as any);

    vi.mocked(uploadModule.readAndDecryptFile).mockResolvedValue({
      buffer: Buffer.from('%PDF-1.4 demo content'),
      mimeType: 'application/pdf'
    });

    const res = await request(app)
      .get(`/api/secure-file/note-123/file-demo-1`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.body.toString()).toBe('%PDF-1.4 demo content');
  });

  it('blocks unauthenticated requests to the 2nd file with 401', async () => {
    vi.spyOn(Note, 'findOne').mockReturnValue({
      lean: vi.fn().mockResolvedValue(mockNote)
    } as any);

    const res = await request(app)
      .get(`/api/secure-file/note-123/file-locked-2`);

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Authentication required/i);
  });

  it('blocks authenticated students who have not purchased the 2nd file with 403', async () => {
    vi.spyOn(Note, 'findOne').mockReturnValue({
      lean: vi.fn().mockResolvedValue(mockNote)
    } as any);

    const secret = process.env.JWT_SECRET || 'test-secret';
    const studentToken = jwt.sign({ userId: 'student-999', role: 'student' }, secret);

    vi.spyOn(User, 'findOne').mockResolvedValue({
      id: 'student-999',
      email: 'student@example.com',
      purchasedNoteIds: []
    } as any);

    const res = await request(app)
      .get(`/api/secure-file/note-123/file-locked-2?t=${studentToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Purchase required/i);
  });

  it('allows access to locked files if student has actively purchased the note', async () => {
    vi.spyOn(Note, 'findOne').mockReturnValue({
      lean: vi.fn().mockResolvedValue(mockNote)
    } as any);

    const secret = process.env.JWT_SECRET || 'test-secret';
    const studentToken = jwt.sign({ userId: 'student-999', role: 'student' }, secret);

    vi.spyOn(User, 'findOne').mockResolvedValue({
      id: 'student-999',
      email: 'student@example.com',
      purchasedNoteIds: ['note-123']
    } as any);

    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 3);

    vi.spyOn(Purchase, 'findOne').mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        id: 'pur-1',
        userId: 'student-999',
        productId: 'note-123',
        expiresAt: futureDate
      })
    } as any);

    vi.mocked(uploadModule.readAndDecryptFile).mockResolvedValue({
      buffer: Buffer.from('%PDF-1.4 locked unit 2 content'),
      mimeType: 'application/pdf'
    });

    const res = await request(app)
      .get(`/api/secure-file/note-123/file-locked-2?t=${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.toString()).toBe('%PDF-1.4 locked unit 2 content');
  });
});
