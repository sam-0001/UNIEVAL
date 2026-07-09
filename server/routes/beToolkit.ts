import express from 'express';
import { randomUUID } from 'crypto';
import { BEToolkitItem } from '../models/index.js';
import { requireRole } from '../middleware/auth.js';
import { UserRole } from '../../types.js';
import logger from '../logger.js';

const router = express.Router();

// ─── Validation ───────────────────────────────────────────────────────────────

const VALID_TYPES       = ['project', 'research', 'case-study'] as const;
const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

function validateItem(body: any): string | null {
  if (typeof body.title !== 'string' || !body.title.trim())
    return 'title must be a non-empty string';
  if (!VALID_TYPES.includes(body.type))
    return 'type must be "project", "research", or "case-study"';
  if (typeof body.branch !== 'string' || !body.branch.trim())
    return 'branch must be a non-empty string';
  if (!Array.isArray(body.tags))
    return 'tags must be an array';
  if (!VALID_DIFFICULTIES.includes(body.difficulty))
    return 'difficulty must be "easy", "medium", or "hard"';
  if (typeof body.summary !== 'string' || !body.summary.trim())
    return 'summary must be a non-empty string';
  if (typeof body.source !== 'string' || !body.source.trim())
    return 'source must be a non-empty string';
  if (typeof body.link !== 'string' || !body.link.trim())
    return 'link must be a non-empty string';
  // Basic URL check
  try { new URL(body.link); } catch { return 'link must be a valid URL'; }
  return null;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// POST /api/be-toolkit
// Admin/Teacher only — add a new toolkit item
router.post(
  '/be-toolkit',
  requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.TEACHER),
  async (req, res) => {
    const err = validateItem(req.body);
    if (err) { res.status(400).json({ error: err }); return; }

    try {
      const item = new BEToolkitItem({
        id:         randomUUID(),
        title:      req.body.title.trim(),
        type:       req.body.type,
        branch:     req.body.branch.trim(),
        tags:       req.body.tags,
        difficulty: req.body.difficulty,
        summary:    req.body.summary.trim(),
        source:     req.body.source.trim(),
        link:       req.body.link.trim(),
      });
      await item.save();
      res.status(201).json({ message: 'Item added successfully', id: item.id });
    } catch (error) {
      logger.error('[BEToolkit] Create error:', error);
      res.status(500).json({ error: 'Failed to save toolkit item' });
    }
  }
);

// GET /api/be-toolkit
// Public — list all, supports ?branch=&type=&difficulty=&tag= filters
router.get('/be-toolkit', async (req, res) => {
  try {
    const filter: Record<string, any> = {};
    if (req.query.branch)     filter.branch     = req.query.branch;
    if (req.query.type)       filter.type       = req.query.type;
    if (req.query.difficulty) filter.difficulty = req.query.difficulty;
    if (req.query.tag)        filter.tags       = req.query.tag; // matches if tag is in array

    const items = await BEToolkitItem.find(filter, '-_id -__v').lean();
    res.json(items);
  } catch (error) {
    logger.error('[BEToolkit] List error:', error);
    res.status(500).json({ error: 'Failed to fetch toolkit items' });
  }
});

export default router;
