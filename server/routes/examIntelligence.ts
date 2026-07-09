import express from 'express';
import { randomUUID } from 'crypto';
import { ExamIntelligence } from '../models/index.js';
import { requireRole } from '../middleware/auth.js';
import { UserRole } from '../../types.js';
import logger from '../logger.js';

const router = express.Router();

// ─── Validation ───────────────────────────────────────────────────────────────

function validatePYQ(pyq: any, path: string): string | null {
  if (typeof pyq.question !== 'string' || !pyq.question.trim())
    return `${path}.question must be a non-empty string`;
  if (typeof pyq.year !== 'number' || pyq.year < 2000 || pyq.year > 2100)
    return `${path}.year must be a number between 2000–2100`;
  if (typeof pyq.marks !== 'number' || pyq.marks < 1)
    return `${path}.marks must be a positive number`;
  return null;
}

function validateTopic(topic: any, path: string): string | null {
  if (typeof topic.name !== 'string' || !topic.name.trim())
    return `${path}.name must be a non-empty string`;
  if (!['high', 'medium', 'low'].includes(topic.priority))
    return `${path}.priority must be "high", "medium", or "low"`;
  if (typeof topic.weightage !== 'number' || topic.weightage < 0 || topic.weightage > 100)
    return `${path}.weightage must be 0–100`;
  if (typeof topic.frequency !== 'number' || topic.frequency < 0)
    return `${path}.frequency must be non-negative`;
  if (!Array.isArray(topic.topQuestions)) return `${path}.topQuestions must be an array`;
  if (!Array.isArray(topic.pyqs))         return `${path}.pyqs must be an array`;
  for (let i = 0; i < topic.pyqs.length; i++) {
    const err = validatePYQ(topic.pyqs[i], `${path}.pyqs[${i}]`);
    if (err) return err;
  }
  return null;
}

function validateUnit(unit: any, path: string): string | null {
  if (typeof unit.unit  !== 'string' || !unit.unit.trim())  return `${path}.unit must be a non-empty string`;
  if (typeof unit.title !== 'string' || !unit.title.trim()) return `${path}.title must be a non-empty string`;
  if (!Array.isArray(unit.topics)) return `${path}.topics must be an array`;
  for (let i = 0; i < unit.topics.length; i++) {
    const err = validateTopic(unit.topics[i], `${path}.topics[${i}]`);
    if (err) return err;
  }
  return null;
}

function validateSubject(body: any): string | null {
  if (typeof body.subject !== 'string' || !body.subject.trim())   return 'subject must be a non-empty string';
  if (typeof body.semester !== 'string' || !body.semester.trim()) return 'semester must be a non-empty string';
  if (!Array.isArray(body.units)) return 'units must be an array';
  for (let i = 0; i < body.units.length; i++) {
    const err = validateUnit(body.units[i], `units[${i}]`);
    if (err) return err;
  }
  return null;
}

// ─── Normalise any input shape → flat array of subjects ──────────────────────
function normalise(body: any): any[] | { error: string } {
  if (body && !Array.isArray(body) && Array.isArray(body.subjects)) return body.subjects;
  if (Array.isArray(body)) return body;
  if (body && typeof body === 'object') return [body];
  return { error: 'Invalid payload format' };
}

// ─── POST /api/exam-intelligence/upload ──────────────────────────────────────
router.post(
  '/exam-intelligence/upload',
  requireRole(UserRole.SUPER_ADMIN),
  async (req, res) => {
    const normalised = normalise(req.body);
    if ('error' in normalised) { res.status(400).json({ error: (normalised as any).error }); return; }

    const items = normalised as any[];
    if (items.length === 0) { res.status(400).json({ error: 'No subjects found in file' }); return; }

    for (let i = 0; i < items.length; i++) {
      const err = validateSubject(items[i]);
      if (err) { res.status(400).json({ error: `subjects[${i}] — ${err}` }); return; }
    }

    try {
      const wrapperBranch = Array.isArray(req.body) ? '' : (req.body?.branch ?? '');
      const wrapperYear   = Array.isArray(req.body) ? '' : (req.body?.year   ?? '');
      const saved: string[]   = [];
      const skipped: string[] = [];

      for (const item of items) {
        const subject  = item.subject.trim();
        const semester = item.semester.trim();
        const branch   = (item.branch   ?? wrapperBranch).toString().trim();
        const year     = (item.year     ?? wrapperYear).toString().trim();

        // Deduplicate: same branch + subject + semester = skip
        const exists = await ExamIntelligence.exists({ subject, semester, branch });
        if (exists) { skipped.push(`${subject} (Sem ${semester}, ${branch})`); continue; }

        await new ExamIntelligence({ id: randomUUID(), subject, semester, branch, year, units: item.units }).save();
        saved.push(`${subject} (Sem ${semester})`);
      }

      const message = saved.length > 0
        ? `Uploaded ${saved.length} subject(s).${skipped.length > 0 ? ` Skipped ${skipped.length} duplicate(s).` : ''}`
        : `Nothing uploaded — all ${skipped.length} subject(s) already exist.`;

      res.status(saved.length > 0 ? 201 : 200).json({ message, saved, skipped });
    } catch (err) {
      logger.error('[ExamIntelligence] Upload error:', err);
      res.status(500).json({ error: 'Failed to save data' });
    }
  }
);

// ─── GET /api/exam-intelligence — list with branch + year ────────────────────
router.get('/exam-intelligence', async (_req, res) => {
  try {
    const docs = await ExamIntelligence.find({}, 'id subject semester branch year createdAt').lean();
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch list' });
  }
});

// ─── GET /api/exam-intelligence/:id — full document ──────────────────────────
router.get('/exam-intelligence/:id', async (req, res) => {
  try {
    const doc = await ExamIntelligence.findOne({ id: req.params.id }).lean();
    if (!doc) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// ─── DELETE /api/exam-intelligence/:id — admin/teacher only ──────────────────
router.delete(
  '/exam-intelligence/:id',
  requireRole(UserRole.SUPER_ADMIN),
  async (req, res) => {
    try {
      const result = await ExamIntelligence.deleteOne({ id: req.params.id });
      if (result.deletedCount === 0) { res.status(404).json({ error: 'Not found' }); return; }
      res.json({ message: 'Subject deleted successfully' });
    } catch (err) {
      logger.error('[ExamIntelligence] Delete error:', err);
      res.status(500).json({ error: 'Failed to delete' });
    }
  }
);

export default router;