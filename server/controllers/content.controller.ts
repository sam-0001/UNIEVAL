import express from 'express';
import { randomUUID } from 'crypto';
import { Course, Note, Quiz, Viva } from '../models/index.js';
import { cache } from '../services/cache.service.js';
import logger from '../logger.js';
import { deleteFileFromR2 } from '../routes/upload.js';

function extractR2Key(fileUrl?: string): string | null {
    if (!fileUrl) return null;
    try {
        const u = new URL(fileUrl);
        let key = u.pathname;
        if (key.startsWith('/')) key = key.substring(1);
        return key;
    } catch { return null; }
}

export function generateId(): string { return randomUUID(); }

function buildAuthQuery(req: express.Request, id: string) {
    const user = (req as any).currentUser;
    const query: any = { id };
    if (user.role === 'TEACHER') {
        query.teacherId = user.id;
    }
    return query;
}

function enforceTeacherId(req: express.Request, data: any) {
    const user = (req as any).currentUser;
    if (user.role === 'TEACHER') {
        data.teacherId = user.id;
    }
}


function parsePagination(query: any) {
    const page = Math.max(1, parseInt(query.page as string) || 1);
    const limit = Math.min(100, parseInt(query.limit as string) || 20);
    return { page, limit, skip: (page - 1) * limit };
}

function safeResources(resources: any): any[] {
    if (Array.isArray(resources)) return resources;
    if (typeof resources === 'string') {
        try { const p = JSON.parse(resources); return Array.isArray(p) ? p : []; } catch { return []; }
    }
    return [];
}

function sanitizeModules(modules: any[]): any[] {
    return modules.map((m: any) => ({
        id: m.id, title: m.title,
        videos: Array.isArray(m.videos) ? m.videos.map((v: any) => ({
            id: v.id, title: v.title, videoUrl: v.videoUrl, duration: v.duration,
            videoStatus: v.videoStatus, videoProgress: v.videoProgress,
            videoId: v.videoId, videoKey: v.videoKey,
            thumbnailUrl: v.thumbnailUrl,
            resources: safeResources(v.resources)
        })) : []
    }));
}

function safeSections(sections: any): any[] {
    if (!Array.isArray(sections)) return [];
    return sections.map((s: any) => ({
        id: s.id, title: s.title,
        files: Array.isArray(s.files) ? s.files.map((f: any) => ({
            id: f.id, title: f.title,
            url: typeof f.url === 'string' && f.url.startsWith('data:') ? '#' : (f.url || '#'),
            isFree: Boolean(f.isFree)
        })) : []
    }));
}

// ─── Courses ──────────────────────────────────────────────────────────────────

export async function getCourses(req: express.Request, res: express.Response): Promise<void> {
    const subjectId = req.query.subjectId ? String(req.query.subjectId) : undefined;
    const teacherId = req.query.teacherId ? String(req.query.teacherId) : undefined;
    const { page, limit, skip } = parsePagination(req.query);
    try {
        const result = await cache.getOrSet(
            `courses:${subjectId||'all'}:${teacherId||'all'}:${page}:${limit}`,
            async () => {
                const query: any = {};
                if (subjectId) query.subjectId = subjectId;
                if (teacherId) query.teacherId = teacherId;
                const [data, total] = await Promise.all([Course.find(query).skip(skip).limit(limit).lean(), Course.countDocuments(query)]);
                return { data, page, limit, total, totalPages: Math.ceil(total / limit) };
            }, 300
        );
        res.json(result);
    } catch (err) { logger.error('[Courses] getCourses:', err); res.status(500).json({ error: 'An internal error occurred' }); }
}

export async function getCourseById(req: express.Request, res: express.Response): Promise<void> {
    const id = req.params.id as string;
    try {
        const course = await cache.getOrSet(`course:${id}`, () => Course.findOne({ id }).lean(), 600);
        if (!course) { res.status(404).json({ error: 'Course not found' }); return; }
        res.json(course);
    } catch (err) { logger.error('[Courses] getCourseById:', err); res.status(500).json({ error: 'An internal error occurred' }); }
}

export async function createCourse(req: express.Request, res: express.Response): Promise<void> {
    const courseData = req.body;
    enforceTeacherId(req, courseData);
    if (!courseData.title || !courseData.subjectId || !courseData.teacherId) { res.status(400).json({ error: 'Title, subjectId, and teacherId are required' }); return; }
    if (Array.isArray(courseData.modules)) courseData.modules = sanitizeModules(courseData.modules);
    try {
        const course = await Course.create({ ...courseData, id: generateId() });
        await cache.invalidate('courses:*');
        res.json(course);
    } catch (err) { logger.error('[Courses] createCourse:', err); res.status(500).json({ error: 'An internal error occurred' }); }
}

export async function updateCourse(req: express.Request, res: express.Response): Promise<void> {
    const id = req.params.id as string;
    const query = buildAuthQuery(req, id);
    const updates = req.body;
    if (Array.isArray(updates.modules)) updates.modules = sanitizeModules(updates.modules);
    try {
        const course = await Course.findOneAndUpdate(query, { $set: updates }, { new: true, runValidators: false });
        if (!course) { res.status(404).json({ error: 'Course not found' }); return; }
        await Promise.all([cache.invalidate('courses:*'), cache.invalidate(`course:${id}`)]);
        res.json(course);
    } catch (err) { logger.error('[Courses] updateCourse:', err); res.status(500).json({ error: 'An internal error occurred' }); }
}

export async function deleteCourse(req: express.Request, res: express.Response): Promise<void> {
    const id = req.params.id as string;
    const query = buildAuthQuery(req, id);
    try {
        const course = await Course.findOneAndDelete(query) as any;
        if (!course) { res.status(404).json({ error: 'Course not found' }); return; }

        // Extract and delete files from R2
        const keysToDelete: string[] = [];
        const thumbKey = extractR2Key(course.thumbnailUrl);
        if (thumbKey) keysToDelete.push(thumbKey);

        if (Array.isArray(course.modules)) {
            course.modules.forEach((mod: any) => {
                if (Array.isArray(mod.videos)) {
                    mod.videos.forEach((vid: any) => {
                        const vKey = extractR2Key(vid.videoUrl) || vid.videoKey;
                        if (vKey) keysToDelete.push(vKey);
                        if (Array.isArray(vid.resources)) {
                            vid.resources.forEach((resItem: any) => {
                                const rKey = extractR2Key(resItem.url);
                                if (rKey) keysToDelete.push(rKey);
                            });
                        }
                    });
                }
            });
        }
        
        Promise.all(keysToDelete.map(k => deleteFileFromR2(k))).catch(e => {
            logger.error('[Courses] Failed to delete some R2 files during course deletion:', e);
        });

        await Promise.all([cache.invalidate('courses:*'), cache.invalidate(`course:${id}`)]);
        res.json({ success: true });
    } catch (err) { logger.error('[Courses] deleteCourse:', err); res.status(500).json({ error: 'An internal error occurred' }); }
}

// ─── Notes ────────────────────────────────────────────────────────────────────

export async function getNotes(req: express.Request, res: express.Response): Promise<void> {
    const subjectId = req.query.subjectId ? String(req.query.subjectId) : undefined;
    const teacherId = req.query.teacherId ? String(req.query.teacherId) : undefined;
    const { page, limit, skip } = parsePagination(req.query);
    try {
        const result = await cache.getOrSet(
            `notes:${subjectId||'all'}:${teacherId||'all'}:${page}:${limit}`,
            async () => {
                const query: any = {};
                if (subjectId) query.subjectId = subjectId;
                if (teacherId) query.teacherId = teacherId;
                const [data, total] = await Promise.all([Note.find(query).skip(skip).limit(limit).lean(), Note.countDocuments(query)]);
                return { data, page, limit, total, totalPages: Math.ceil(total / limit) };
            }, 300
        );
        res.json(result);
    } catch (err) { logger.error('[Notes] getNotes:', err); res.status(500).json({ error: 'An internal error occurred' }); }
}

export async function getNoteById(req: express.Request, res: express.Response): Promise<void> {
    const id = req.params.id as string;
    try {
        const note = await cache.getOrSet(`note:${id}`, () => Note.findOne({ id }).lean(), 600);
        if (!note) { res.status(404).json({ error: 'Note not found' }); return; }
        res.json(note);
    } catch (err) { logger.error('[Notes] getNoteById:', err); res.status(500).json({ error: 'An internal error occurred' }); }
}

export async function createNote(req: express.Request, res: express.Response): Promise<void> {
    const noteData = req.body;
    enforceTeacherId(req, noteData);
    if (!noteData.title || !noteData.subjectId || !noteData.teacherId) { res.status(400).json({ error: 'Title, subjectId, and teacherId are required' }); return; }
    try {
        const note = await Note.create({ ...noteData, id: generateId(), uploadedAt: new Date().toISOString(), sections: safeSections(noteData.sections) });
        await cache.invalidate('notes:*');
        res.json(note);
    } catch (err) { logger.error('[Notes] createNote:', err); res.status(500).json({ error: 'An internal error occurred' }); }
}

export async function updateNote(req: express.Request, res: express.Response): Promise<void> {
    const id = req.params.id as string;
    const query = buildAuthQuery(req, id);
    const updates = req.body;
    if (Array.isArray(updates.sections)) updates.sections = safeSections(updates.sections);
    try {
        const note = await Note.findOneAndUpdate(query, { $set: updates }, { new: true, runValidators: false });
        if (!note) { res.status(404).json({ error: 'Note not found' }); return; }
        await Promise.all([cache.invalidate('notes:*'), cache.invalidate(`note:${id}`)]);
        res.json(note);
    } catch (err) { logger.error('[Notes] updateNote:', err); res.status(500).json({ error: 'An internal error occurred' }); }
}

export async function deleteNote(req: express.Request, res: express.Response): Promise<void> {
    const id = req.params.id as string;
    const query = buildAuthQuery(req, id);
    try {
        const note = await Note.findOneAndDelete(query) as any;
        if (!note) { res.status(404).json({ error: 'Note not found' }); return; }
        
        // Extract and delete files from R2
        const keysToDelete: string[] = [];
        const thumbKey = extractR2Key(note.thumbnailUrl);
        if (thumbKey) keysToDelete.push(thumbKey);
        
        if (Array.isArray(note.sections)) {
            note.sections.forEach((sec: any) => {
                if (Array.isArray(sec.files)) {
                    sec.files.forEach((f: any) => {
                        const fk = extractR2Key(f.url);
                        if (fk) keysToDelete.push(fk);
                    });
                }
            });
        }
        
        // Delete all extracted keys asynchronously
        Promise.all(keysToDelete.map(k => deleteFileFromR2(k))).catch(e => {
            logger.error('[Notes] Failed to delete some R2 files during note deletion:', e);
        });

        await Promise.all([cache.invalidate('notes:*'), cache.invalidate(`note:${id}`)]);
        res.json({ success: true });
    } catch (err) { logger.error('[Notes] deleteNote:', err); res.status(500).json({ error: 'An internal error occurred' }); }
}

// ─── Quizzes ──────────────────────────────────────────────────────────────────

export async function getQuizzes(req: express.Request, res: express.Response): Promise<void> {
    const subjectId = req.query.subjectId ? String(req.query.subjectId) : undefined;
    const teacherId = req.query.teacherId ? String(req.query.teacherId) : undefined;
    const { page, limit, skip } = parsePagination(req.query);
    try {
        const result = await cache.getOrSet(
            `quizzes:${subjectId||'all'}:${teacherId||'all'}:${page}:${limit}`,
            async () => {
                const query: any = {};
                if (subjectId) query.subjectId = subjectId;
                if (teacherId) query.teacherId = teacherId;
                const [data, total] = await Promise.all([Quiz.find(query).skip(skip).limit(limit).lean(), Quiz.countDocuments(query)]);
                return { data, page, limit, total, totalPages: Math.ceil(total / limit) };
            }, 120
        );
        res.json(result);
    } catch (err) { logger.error('[Quizzes] getQuizzes:', err); res.status(500).json({ error: 'An internal error occurred' }); }
}

export async function getQuizById(req: express.Request, res: express.Response): Promise<void> {
    const id = req.params.id as string;
    try {
        const quiz = await cache.getOrSet(`quiz:${id}`, () => Quiz.findOne({ id }).lean(), 300);
        if (!quiz) { res.status(404).json({ error: 'Quiz not found' }); return; }
        
        let responseQuiz = { ...quiz };
        if (req.currentUser && req.currentUser.role === 'STUDENT') {
            // Give them the question count, but clear the questions array
            const qCount = responseQuiz.questions ? responseQuiz.questions.length : 0;
            responseQuiz.questions = Array.from({ length: qCount }).map((_, i) => ({ id: i.toString(), text: 'Hidden until started', options: [], correctAnswer: '' })) as any;
        }
        res.json(responseQuiz);

    } catch (err) { logger.error('[Quizzes] getQuizById:', err); res.status(500).json({ error: 'An internal error occurred' }); }
}

export async function createQuiz(req: express.Request, res: express.Response): Promise<void> {
    const quizData = req.body;
    enforceTeacherId(req, quizData);
    if (!quizData.title || !quizData.subjectId) { res.status(400).json({ error: 'Title and subjectId are required' }); return; }
    try {
        const quiz = await Quiz.create({ ...quizData, id: generateId() });
        await cache.invalidate('quizzes:*');
        let responseQuiz = { ...quiz };
        const user = (req as any).currentUser;
        if (!user || user.role === 'STUDENT') {
            const qCount = responseQuiz.questions ? responseQuiz.questions.length : 0;
            // Provide dummy questions so frontend length logic doesn't crash before rewrite is complete
            responseQuiz.questions = Array.from({ length: qCount }).map((_, i) => ({ id: i.toString(), text: 'Hidden until started', options: [], correctAnswer: '' })) as any;
        }
        res.json(responseQuiz);
    } catch (err) { logger.error('[Quizzes] createQuiz:', err); res.status(500).json({ error: 'An internal error occurred' }); }
}

export async function updateQuiz(req: express.Request, res: express.Response): Promise<void> {
    const id = req.params.id as string;
    const query = buildAuthQuery(req, id);
    try {
        const quiz = await Quiz.findOneAndUpdate(query, req.body, { new: true });
        if (!quiz) { res.status(404).json({ error: 'Quiz not found' }); return; }
        await Promise.all([cache.invalidate('quizzes:*'), cache.invalidate(`quiz:${id}`)]);
        res.json(quiz);
    } catch (err) { logger.error('[Quizzes] updateQuiz:', err); res.status(500).json({ error: 'An internal error occurred' }); }
}

export async function deleteQuiz(req: express.Request, res: express.Response): Promise<void> {
    const id = req.params.id as string;
    const query = buildAuthQuery(req, id);
    try {
        const quiz = await Quiz.findOneAndDelete(query);
        if (!quiz) { res.status(404).json({ error: 'Quiz not found' }); return; }
        await Promise.all([cache.invalidate('quizzes:*'), cache.invalidate(`quiz:${id}`)]);
        res.json({ success: true });
    } catch (err) { logger.error('[Quizzes] deleteQuiz:', err); res.status(500).json({ error: 'An internal error occurred' }); }
}

// ─── Vivas ────────────────────────────────────────────────────────────────────

export async function getVivas(req: express.Request, res: express.Response): Promise<void> {
    const subjectId = req.query.subjectId ? String(req.query.subjectId) : undefined;
    const teacherId = req.query.teacherId ? String(req.query.teacherId) : undefined;
    const { page, limit, skip } = parsePagination(req.query);
    try {
        const result = await cache.getOrSet(
            `vivas:${subjectId||'all'}:${teacherId||'all'}:${page}:${limit}`,
            async () => {
                const query: any = {};
                if (subjectId) query.subjectId = subjectId;
                if (teacherId) query.teacherId = teacherId;
                const [data, total] = await Promise.all([Viva.find(query).skip(skip).limit(limit).lean(), Viva.countDocuments(query)]);
                return { data, page, limit, total, totalPages: Math.ceil(total / limit) };
            }, 120
        );
        res.json(result);
    } catch (err) { logger.error('[Vivas] getVivas:', err); res.status(500).json({ error: 'An internal error occurred' }); }
}

export async function getVivaById(req: express.Request, res: express.Response): Promise<void> {
    const id = req.params.id as string;
    try {
        const viva = await cache.getOrSet(`viva:${id}`, () => Viva.findOne({ id }).lean(), 300);
        if (!viva) { res.status(404).json({ error: 'Viva not found' }); return; }
        let responseViva = { ...viva };
        const user = (req as any).currentUser;
        if (!user || user.role === 'STUDENT') {
            if (responseViva.questions) {
                responseViva.questions = responseViva.questions.map((q: any) => ({
                    ...q,
                    correctAnswer: 'Hidden'
                })) as any;
            }
        }
        res.json(responseViva);
    } catch (err) { logger.error('[Vivas] getVivaById:', err); res.status(500).json({ error: 'An internal error occurred' }); }
}

export async function createViva(req: express.Request, res: express.Response): Promise<void> {
    const vivaData = req.body;
    enforceTeacherId(req, vivaData);
    if (!vivaData.title || !vivaData.subjectId) { res.status(400).json({ error: 'Title and subjectId are required' }); return; }
    try {
        const viva = await Viva.create({ ...vivaData, id: generateId() });
        await cache.invalidate('vivas:*');
        res.json(viva);
    } catch (err) { logger.error('[Vivas] createViva:', err); res.status(500).json({ error: 'An internal error occurred' }); }
}

export async function updateViva(req: express.Request, res: express.Response): Promise<void> {
    const id = req.params.id as string;
    const query = buildAuthQuery(req, id);
    try {
        const viva = await Viva.findOneAndUpdate(query, req.body, { new: true });
        if (!viva) { res.status(404).json({ error: 'Viva not found' }); return; }
        await Promise.all([cache.invalidate('vivas:*'), cache.invalidate(`viva:${id}`)]);
        res.json(viva);
    } catch (err) { logger.error('[Vivas] updateViva:', err); res.status(500).json({ error: 'An internal error occurred' }); }
}

export async function deleteViva(req: express.Request, res: express.Response): Promise<void> {
    const id = req.params.id as string;
    const query = buildAuthQuery(req, id);
    try {
        const viva = await Viva.findOneAndDelete(query);
        if (!viva) { res.status(404).json({ error: 'Viva not found' }); return; }
        await Promise.all([cache.invalidate('vivas:*'), cache.invalidate(`viva:${id}`)]);
        res.json({ success: true });
    } catch (err) { logger.error('[Vivas] deleteViva:', err); res.status(500).json({ error: 'An internal error occurred' }); }
}


export async function startQuiz(req: express.Request, res: express.Response): Promise<void> {
    const id = req.params.id as string;
    try {
        const quiz = await Quiz.findOne({ id }).lean();
        if (!quiz) { res.status(404).json({ error: 'Quiz not found' }); return; }
        
        let responseQuiz = { ...quiz };
        const user = (req as any).currentUser;
        if (!user || user.role === 'STUDENT') {
            if (responseQuiz.questions) {
                responseQuiz.questions = responseQuiz.questions.map((q: any) => ({
                    ...q,
                    correctAnswer: 'Hidden'
                })) as any;
            }
        }
        res.json(responseQuiz);
    } catch (err) { logger.error('[Quizzes] startQuiz:', err); res.status(500).json({ error: 'An internal error occurred' }); }
}

export async function evaluateQuiz(req: express.Request, res: express.Response): Promise<void> {
    const id = req.params.id as string;
    const { answers } = req.body;
    try {
        const quiz = await Quiz.findOne({ id }).lean();
        if (!quiz) { res.status(404).json({ error: 'Quiz not found' }); return; }
        
        let score = 0;
        const results: Record<string, { correct: boolean; correctAnswer: string }> = {};
        
        if (quiz.questions) {
            quiz.questions.forEach((q: any) => {
                const isCorrect = answers[q.id] === q.correctAnswer;
                if (isCorrect) score++;
                results[q.id] = { correct: isCorrect, correctAnswer: q.correctAnswer };
            });
        }
        
        res.json({ score, results });
    } catch (err) { logger.error('[Quizzes] evaluateQuiz:', err); res.status(500).json({ error: 'An internal error occurred' }); }
}

// Ensure fetch is available for AI
export async function evaluateVivaQuestion(req: express.Request, res: express.Response): Promise<void> {
    const id = req.params.id as string;
    const { questionId, userAnswer } = req.body;
    
    try {
        const viva = await Viva.findOne({ id }).lean();
        if (!viva) { res.status(404).json({ error: 'Viva not found' }); return; }
        
        const question = viva.questions?.find((q: any) => q.id === questionId);
        if (!question) { res.status(404).json({ error: 'Question not found' }); return; }
        
        const prompt = `
            You are an expert engineering examiner conducting a Viva Voce.
            
            Question: "${question.text}"
            Expected Concept/Key Points: "${question.correctAnswer}"
            Student Answer: "${userAnswer}"
            
            Evaluation Guidelines:
            1. Conceptual Match: If the student's answer conveys the correct meaning, treat it as CORRECT even if wording differs.
            2. Voice Input: Ignore minor grammatical errors or phonetic misinterpretations.
            3. Scoring: 8-10 correct, 5-7 partial, 0-4 wrong/irrelevant.
            
            Output Format: JSON only.
            {"score": number (0-10), "feedback": "string (under 30 words)"}
        `;
        
        // Use the existing local callAI utility if available, or just fallback to fetch
        // Since we are in the backend, we can import callAI from services/ai.service.ts
        const aiService = await import('../services/ai.service.js').catch(() => null);
        if (aiService && aiService.callAI) {
            const aiResult = await aiService.callAI(prompt);
            let jsonText = aiResult.text.trim();
            const arrayMatch = jsonText.match(/\{[\s\S]*\}/);
            if (arrayMatch) {
                jsonText = arrayMatch[0];
            } else {
                jsonText = jsonText.replace(/^\x60\x60\x60json\s*/i, '').replace(/^\x60\x60\x60\s*/i, '').replace(/\s*\x60\x60\x60$/i, '').trim();
            }
            res.json(JSON.parse(jsonText));
            return;
        }
        
        res.status(500).json({ error: 'AI Service unavailable' });
    } catch (err) { logger.error('[Vivas] evaluateVivaQuestion:', err); res.status(500).json({ error: 'An internal error occurred' }); }
}
