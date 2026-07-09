import express from 'express';
import { randomUUID } from 'crypto';
import { ExamIntelligence, QuizPool, User } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { callAI, AIError } from '../services/ai.service.js';
import { aiRateLimit } from '../middleware/userRateLimit.js';
import logger from '../logger.js';

const router = express.Router();

const FREE_QUIZ_LIMIT = 3;
const DIFF_LABELS = ['', 'Very Easy', 'Easy', 'Medium', 'Hard', 'Very Hard'];
const MAX_POOL    = 10;

// ─── Duplicate detection ──────────────────────────────────────────────────────
function isTooSimilar(newQ: string, existingQuestions: string[]): boolean {
  const normalise = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
  const nNew = normalise(newQ);
  return existingQuestions.some(eq => {
    const nEx = normalise(eq);
    const wordsNew = new Set(nNew.split(' ').filter(w => w.length > 3));
    const wordsEx  = new Set(nEx.split(' ').filter(w => w.length > 3));
    if (wordsNew.size === 0) return false;
    let overlap = 0;
    wordsNew.forEach(w => { if (wordsEx.has(w)) overlap++; });
    return overlap / wordsNew.size >= 0.6;
  });
}

// ─── Credit helpers ───────────────────────────────────────────────────────────
async function consumeOneCredit(userId: string): Promise<{ ok: boolean; status: number; error?: string; method?: string }> {
  const user = await User.findOne({ id: userId });
  if (!user) return { ok: false, status: 404, error: 'User not found' };

  const ul = (user as any).unlimitedPlan;
  if (ul?.active && ul.expiresAt && new Date(ul.expiresAt) > new Date()) {
    return { ok: true, status: 200, method: 'unlimited' };
  }

  const freeUsed = (user as any).freeQuizUsedToday ?? 0;
  if (freeUsed < FREE_QUIZ_LIMIT) {
    await User.updateOne({ id: userId }, { $inc: { freeQuizUsedToday: 1 } });
    return { ok: true, status: 200, method: 'free' };
  }

  const credits = (user as any).credits ?? 0;
  if (credits <= 0) return { ok: false, status: 402, error: 'No credits remaining. Please buy credits to continue.' };
  await User.updateOne({ id: userId }, { $inc: { credits: -1 } });
  return { ok: true, status: 200, method: 'credit' };
}

// Undo a consumed credit — called whenever AI fails so the user is not charged
async function refundOneCredit(userId: string, method: string): Promise<void> {
  try {
    if (method === 'unlimited') return;
    if (method === 'free') {
      await User.updateOne({ id: userId }, { $inc: { freeQuizUsedToday: -1 } });
    } else if (method === 'credit') {
      await User.updateOne({ id: userId }, { $inc: { credits: 1 } });
    }
  } catch (e) {
    logger.error('[GenerateQuiz] Refund failed:', e);
  }
}

// ─── POST /api/generate-quiz ──────────────────────────────────────────────────
router.post('/generate-quiz', requireAuth, aiRateLimit, async (req, res) => {
  const { subject, semester, unit, difficulty, branch, year } = req.body;
  const userId = (req as any).currentUser?.id as string;

  if (!subject || !semester || !unit) {
    res.status(400).json({ error: 'subject, semester, and unit are required' });
    return;
  }
  const diffNum = Number(difficulty);
  if (!difficulty || isNaN(diffNum) || diffNum < 1 || diffNum > 5) {
    res.status(400).json({ error: 'difficulty must be 1-5' });
    return;
  }

  // ── Step 1: Consume credit (will be refunded if AI fails) ─────────────────
  const creditResult = await consumeOneCredit(userId);
  if (!creditResult.ok) {
    res.status(creditResult.status).json({ error: creditResult.error });
    return;
  }
  const creditMethod = creditResult.method!;

  try {
    // ── Step 2: Find or create pool ────────────────────────────────────────
    let pool = await QuizPool.findOne({ subject, semester, unit });
    if (!pool) {
      pool = new QuizPool({
        id: randomUUID(), subject, semester, unit,
        branch: branch ?? '', year: year ?? '',
        difficulties: [1,2,3,4,5].map(level => ({ level, quizzes: [] })),
      });
    }

    const diffPool = pool.difficulties.find((d: any) => d.level === diffNum);
    if (!diffPool) {
      await refundOneCredit(userId, creditMethod);
      res.status(500).json({ error: 'Difficulty pool not found' });
      return;
    }

    // ── Step 3: Return cached quiz if pool is full (credit stays consumed) ──
    if (diffPool.quizzes.length >= MAX_POOL) {
      const pick = diffPool.quizzes[Math.floor(Math.random() * diffPool.quizzes.length)];
      res.json({ questions: pick.questions, cached: true, poolSize: diffPool.quizzes.length });
      return;
    }

    // ── Step 4: Fetch exam data from DB ────────────────────────────────────
    const doc = await ExamIntelligence.findOne({ subject, semester }).lean() as any;
    if (!doc) {
      if (diffPool.quizzes.length > 0) {
        const pick = diffPool.quizzes[Math.floor(Math.random() * diffPool.quizzes.length)];
        res.json({ questions: pick.questions, cached: true, poolSize: diffPool.quizzes.length });
        return;
      }
      await refundOneCredit(userId, creditMethod);
      res.status(404).json({ error: `No exam data found for "${subject}" sem ${semester}` });
      return;
    }

    const unitData = doc.units.find((u: any) => u.unit === unit || u.title === unit);
    if (!unitData) {
      await refundOneCredit(userId, creditMethod);
      res.status(404).json({ error: `Unit "${unit}" not found` });
      return;
    }

    // ── Step 5: Build prompt ──────────────────────────────────────────────
    const existingQuestions: string[] = diffPool.quizzes.flatMap(
      (qz: any) => qz.questions.map((q: any) => q.question)
    );
    const diffLabel = DIFF_LABELS[diffNum];
    const topicsSummary = unitData.topics.map((t: any) => {
      const pyqList = t.pyqs?.length > 0
        ? t.pyqs.map((p: any) => `  - [${p.year}, ${p.marks}M] ${p.question}`).join('\n')
        : '  - No PYQs available';
      return `Topic: ${t.name} (Priority: ${t.priority}, Frequency: ${t.frequency}x)\nPYQs:\n${pyqList}`;
    }).join('\n\n');
    const avoidHint = existingQuestions.length > 0
      ? `\nALREADY ASKED (DO NOT repeat):\n${existingQuestions.slice(-15).map((q,i) => `${i+1}. ${q}`).join('\n')}\n`
      : '';

    const prompt = `You are an expert exam question generator for engineering students.

Subject: ${subject} | Semester: ${semester} | Unit: ${unitData.title}
Difficulty: ${diffNum}/5 (${diffLabel})

Topics and PYQs:
${topicsSummary}
${avoidHint}
Generate exactly 5 MCQs. Each question MUST test a DIFFERENT concept.
Rules:
- 4 options per question labeled "A. ...", "B. ...", "C. ...", "D. ..."
- "correct" must be the full option string e.g. "A. Newton's first law"
- "explanation" must be a concise (1-2 sentences) explanation of why that option is correct.
- NO repeated or rephrased questions
- Mix: definition, application, numerical, conceptual
- Match difficulty ${diffNum}/5

Respond ONLY with a valid JSON array. No markdown, no backticks, no explanation outside the JSON.
[{"question":"...","options":["A. ...","B. ...","C. ...","D. ..."],"correct":"A. ...","explanation":"..."},...]`;

    // ── Step 6: Call AI (Groq first, Gemini fallback) ─────────────────────
    let rawText: string;
    try {
      const aiResult = await callAI(prompt);
      rawText = aiResult.text;
      logger.info(`[GenerateQuiz] Used provider: ${aiResult.provider}`);
    } catch (err: any) {
      logger.error('[GenerateQuiz] All AI providers failed:', err.message);
      await refundOneCredit(userId, creditMethod);
      res.status(502).json({ error: 'AI service unavailable. Your credit has been refunded. Please try again.' });
      return;
    }

    // ── Step 7: Parse & validate — refund on ANY invalid response ─────────
    const jsonText = rawText
      .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

    if (!jsonText) {
      logger.error('[GenerateQuiz] Empty content from AI');
      await refundOneCredit(userId, creditMethod);
      res.status(502).json({ error: 'AI returned nothing. Your credit has been refunded. Please try again.' });
      return;
    }

    let parsed: any[];
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      logger.error('[GenerateQuiz] Non-JSON from AI:', rawText.slice(0, 300));
      await refundOneCredit(userId, creditMethod);
      res.status(502).json({ error: 'AI returned an invalid response. Your credit has been refunded. Please try again.' });
      return;
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      logger.error('[GenerateQuiz] Empty array from AI');
      await refundOneCredit(userId, creditMethod);
      res.status(502).json({ error: 'AI returned no questions. Your credit has been refunded. Please try again.' });
      return;
    }

    // Validate each question has required fields
    const validQuestions = parsed.filter(q =>
      q && typeof q.question === 'string' && q.question.trim() &&
      Array.isArray(q.options) && q.options.length >= 2 &&
      typeof q.correct === 'string' && q.correct.trim() &&
      typeof q.explanation === 'string'
    );

    if (validQuestions.length < 3) {
      logger.error('[GenerateQuiz] Too few valid questions:', validQuestions.length);
      await refundOneCredit(userId, creditMethod);
      res.status(502).json({ error: 'AI response was malformed. Your credit has been refunded. Please try again.' });
      return;
    }

    // ── Step 9: Deduplicate and save ───────────────────────────────────────
    const deduped = validQuestions.filter(q => !isTooSimilar(q.question, existingQuestions));
    const finalQuestions = deduped.length >= 3 ? deduped : validQuestions;

    diffPool.quizzes.push({ id: randomUUID(), questions: finalQuestions, createdAt: new Date() });
    await pool.save();

    res.json({ questions: finalQuestions, cached: false, poolSize: diffPool.quizzes.length });

  } catch (err) {
    logger.error('[GenerateQuiz] Unexpected error:', err);
    // Unexpected crash — always refund so user isn't charged for a server bug
    await refundOneCredit(userId, creditMethod);
    res.status(500).json({ error: 'Quiz generation failed. Your credit has been refunded. Please try again.' });
  }
});

export default router;