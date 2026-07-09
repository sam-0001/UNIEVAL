/**
 * beToolkitSearch route — POST /api/be-toolkit/search
 *
 * 1. Validate request
 * 2. Check user credits (≥ 2 required)
 * 3. Fetch raw resources from open-access APIs
 * 4. AI-filter + summarise with Groq/Gemini
 * 5. Deduct 2 credits
 * 6. Return structured results
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { User } from '../models/index.js';
import { callAI } from '../services/ai.service.js';
import { fetchResources, RawResource } from '../services/beToolkitSearch.js';
import logger from '../logger.js';

const router = express.Router();

const VALID_CATEGORIES = ['research', 'case-study', 'project'] as const;
type Category = typeof VALID_CATEGORIES[number];

const CREDITS_COST = 2;

// ─── POST /api/be-toolkit/search ─────────────────────────────────────────────

router.post('/be-toolkit/search', requireAuth, async (req, res) => {
  const { topic, category } = req.body as { topic?: string; category?: string; userId?: string };
  const currentUser = (req as any).currentUser;

  // ── Validate ──
  if (!topic || typeof topic !== 'string' || !topic.trim()) {
    res.status(400).json({ error: 'topic must be a non-empty string' });
    return;
  }
  if (!category || !VALID_CATEGORIES.includes(category as Category)) {
    res.status(400).json({ error: 'category must be "research", "case-study", or "project"' });
    return;
  }

  const cleanTopic = topic.trim().slice(0, 120);

  // ── Check credits ──
  const user = await User.findOne({ id: currentUser.id });
  if (!user) { res.status(401).json({ error: 'User not found' }); return; }

  const unlimitedActive =
    user.unlimitedPlan?.active &&
    user.unlimitedPlan?.expiresAt &&
    new Date(user.unlimitedPlan.expiresAt) > new Date();

  if (!unlimitedActive && (user.credits ?? 0) < CREDITS_COST) {
    res.status(402).json({
      error: `Insufficient credits. You need ${CREDITS_COST} credits. Current balance: ${user.credits ?? 0}.`,
      credits: user.credits ?? 0,
    });
    return;
  }

  // ── Fetch raw resources ──
  let raw: RawResource[] = [];
  try {
    raw = await fetchResources(cleanTopic, category as Category);
  } catch (err) {
    logger.error('[BEToolkit] Fetch error:', err);
    res.status(502).json({ error: 'Failed to fetch resources from external APIs. Please retry.' });
    return;
  }

  if (raw.length === 0) {
    res.status(404).json({ error: 'No open-access resources found for this topic. Try a different keyword.' });
    return;
  }

  // ── AI filter + summarise ──
  const resourceList = raw
    .map((r, i) => `[${i + 1}] Title: ${r.title}\nAbstract: ${r.abstract.slice(0, 300)}\nURL: ${r.url}\nSource: ${r.source}`)
    .join('\n\n');

  const categoryLabel = category === 'case-study' ? 'case studies' : category === 'research' ? 'research papers' : 'projects';

  const prompt = `You are an expert academic assistant helping engineering students find resources.

Topic: "${cleanTopic}"
Category: ${categoryLabel}

Resources to filter:
${resourceList}

Instructions:
1. Select the 5–8 MOST RELEVANT results for the topic and category "${categoryLabel}".
2. Remove off-topic, low-quality, or duplicate entries.
3. For each selected result, produce a JSON object.
4. Difficulty: judge based on abstract complexity — use "Beginner", "Intermediate", or "Advanced".
5. Summary: 2–3 sentence plain-English explanation for engineering students.

Respond ONLY with a valid JSON array (no markdown, no explanation):
[
  {
    "title": "...",
    "summary": "...",
    "difficulty": "Beginner|Intermediate|Advanced",
    "link": "...",
    "source": "..."
  }
]`;

  let results: Array<{ title: string; summary: string; difficulty: string; link: string; source: string }> = [];

  try {
    const { text } = await callAI(prompt);
    // Strip possible markdown fences
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    if (!Array.isArray(parsed)) throw new Error('AI did not return an array');
    results = parsed.slice(0, 8).map((r: any) => ({
      title:      String(r.title      ?? '').slice(0, 200),
      summary:    String(r.summary    ?? '').slice(0, 600),
      difficulty: ['Beginner', 'Intermediate', 'Advanced'].includes(r.difficulty)
                    ? r.difficulty
                    : 'Intermediate',
      link:       String(r.link       ?? ''),
      source:     String(r.source     ?? ''),
    })).filter(r => r.title && r.link);
  } catch (err) {
    logger.error('[BEToolkit] AI error:', err);
    // Fallback: return first 6 raw results without AI summary
    results = raw.slice(0, 6).map(r => ({
      title:      r.title,
      summary:    r.abstract.slice(0, 400) || 'No description available.',
      difficulty: 'Intermediate',
      link:       r.url,
      source:     r.source,
    }));
  }

  // ── Deduct credits ──
  if (!unlimitedActive) {
    await User.updateOne({ id: currentUser.id }, { $inc: { credits: -CREDITS_COST } });
  }

  res.json({
    results,
    creditsUsed: unlimitedActive ? 0 : CREDITS_COST,
    remainingCredits: unlimitedActive
      ? (user.credits ?? 0)
      : Math.max(0, (user.credits ?? 0) - CREDITS_COST),
  });
});

// ─── POST /api/be-toolkit/summarise-pdf ──────────────────────────────────────
// Generates an AI summary for a PDF. No credits deducted — free value-add.

router.post('/be-toolkit/summarise-pdf', requireAuth, async (req, res) => {
  const { url, title } = req.body as { url?: string; title?: string };

  if (!url || typeof url !== 'string' || !url.startsWith('http')) {
    res.status(400).json({ error: 'A valid PDF URL is required.' });
    return;
  }

  const prompt = `You are an academic assistant helping engineering students understand research papers and case studies.

Title: "${title || 'Untitled'}"
PDF URL: ${url}

Write a clear, concise summary (150–250 words) of this document for a BE (Bachelor of Engineering) student. Cover:
1. What the paper/study is about
2. The main problem it addresses
3. Key findings or contributions
4. Why it is relevant for engineering students

Write in plain English. Do not use jargon without explanation.`;

  try {
    const { text } = await callAI(prompt);
    res.json({ summary: text.trim() });
  } catch (err) {
    logger.error('[BEToolkit] Summarise PDF error:', err);
    res.status(500).json({ error: 'Failed to generate summary. Please try again.' });
  }
});

export default router;