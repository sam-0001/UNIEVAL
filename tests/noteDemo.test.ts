import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import secureFileRoutes from '../server/routes/secureFile.js';
import { Note, User, Purchase } from '../server/models/index.js';
import * as uploadModule from '../server/routes/upload.js';
import * as ContentCtrl from '../server/controllers/content.controller.js';
import jwt from 'jsonwebtoken';

vi.mock('../server/routes/upload.js', () => ({
  readAndDecryptFile: vi.fn(),
  readAndDecryptBundleAsset: vi.fn(),
  getBundleIdForFile: vi.fn(),
  getFileBufferFromR2OrUrl: vi.fn()
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

  it('supports HTTP 206 Partial Content range requests for instant progressive PDF loading', async () => {
    vi.spyOn(Note, 'findOne').mockReturnValue({
      lean: vi.fn().mockResolvedValue(mockNote)
    } as any);

    const fullContent = Buffer.from('%PDF-1.4 header and 64kb of chunked payload');
    vi.mocked(uploadModule.readAndDecryptFile).mockResolvedValue({
      buffer: fullContent,
      mimeType: 'application/octet-stream' // generic MIME, should resolve to application/pdf from %PDF magic bytes
    });

    const res = await request(app)
      .get(`/api/secure-file/note-123/file-demo-1`)
      .set('Range', 'bytes=0-7');

    expect(res.status).toBe(206);
    expect(res.headers['content-range']).toBe(`bytes 0-7/${fullContent.length}`);
    expect(res.headers['accept-ranges']).toBe('bytes');
    expect(res.headers['x-no-compression']).toBe('1');
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.body.toString()).toBe('%PDF-1.4');
  });

  it('successfully serves direct R2 / legacy raw uploaded PDF files using getFileBufferFromR2OrUrl', async () => {
    const noteWithR2 = {
      ...mockNote,
      sections: [{
        id: 'sec-1',
        title: 'Unit 1',
        files: [
          {
            id: 'file-r2-1',
            title: 'Unit1_R2.pdf',
            url: 'https://pub-xyz.r2.dev/raw-uploads/123-Unit1_R2.pdf',
            isFree: false
          }
        ]
      }]
    };

    vi.spyOn(Note, 'findOne').mockReturnValue({
      lean: vi.fn().mockResolvedValue(noteWithR2)
    } as any);

    vi.mocked(uploadModule.getFileBufferFromR2OrUrl).mockResolvedValue({
      buffer: Buffer.from('%PDF-1.4 direct R2 content'),
      contentType: 'application/pdf'
    });

    const res = await request(app).get(`/api/secure-file/note-123/file-r2-1`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.body.toString()).toBe('%PDF-1.4 direct R2 content');
    expect(uploadModule.getFileBufferFromR2OrUrl).toHaveBeenCalledWith('https://pub-xyz.r2.dev/raw-uploads/123-Unit1_R2.pdf');
  });

  it('masks internal storage URLs when fetching note by id for unauthenticated users', async () => {
    const rawNote = {
      id: 'note-secret',
      title: 'Secret Notes',
      teacherId: 'teacher-1',
      sections: [{
        id: 's1',
        title: 'Section 1',
        files: [{
          id: 'f1',
          title: 'file.pdf',
          url: 'https://pub-secret.r2.dev/raw-uploads/secret-file.pdf',
          isFree: false
        }]
      }]
    };
    vi.spyOn(Note, 'findOne').mockReturnValue({
      lean: vi.fn().mockResolvedValue(rawNote)
    } as any);

    const req: any = { params: { id: 'note-secret' } };
    let jsonResult: any = null;
    const res: any = { json: (data: any) => { jsonResult = data; } };

    await ContentCtrl.getNoteById(req, res);

    expect(jsonResult).not.toBeNull();
    expect(jsonResult.sections[0].files[0].url).toBe('/api/secure-file/note-secret/f1');
    expect(jsonResult.sections[0].files[0].url).not.toContain('pub-secret.r2.dev');
  });
});
