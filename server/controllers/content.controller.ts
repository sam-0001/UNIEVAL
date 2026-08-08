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
    const updates = req.body;
    if (Array.isArray(updates.modules)) updates.modules = sanitizeModules(updates.modules);
    try {
        const course = await Course.findOneAndUpdate({ id }, { $set: updates }, { new: true, runValidators: false });
        if (!course) { res.status(404).json({ error: 'Course not found' }); return; }
        await Promise.all([cache.invalidate('courses:*'), cache.invalidate(`course:${id}`)]);
        res.json(course);
    } catch (err) { logger.error('[Courses] updateCourse:', err); res.status(500).json({ error: 'An internal error occurred' }); }
}

export async function deleteCourse(req: express.Request, res: express.Response): Promise<void> {
    const id = req.params.id as string;
    try {
        const course = await Course.findOneAndDelete({ id }) as any;
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
    if (!noteData.title || !noteData.subjectId || !noteData.teacherId) { res.status(400).json({ error: 'Title, subjectId, and teacherId are required' }); return; }
    try {
        const note = await Note.create({ ...noteData, id: generateId(), uploadedAt: new Date().toISOString(), sections: safeSections(noteData.sections) });
        await cache.invalidate('notes:*');
        res.json(note);
    } catch (err) { logger.error('[Notes] createNote:', err); res.status(500).json({ error: 'An internal error occurred' }); }
}

export async function updateNote(req: express.Request, res: express.Response): Promise<void> {
    const id = req.params.id as string;
    const updates = req.body;
    if (Array.isArray(updates.sections)) updates.sections = safeSections(updates.sections);
    try {
        const note = await Note.findOneAndUpdate({ id }, { $set: updates }, { new: true, runValidators: false });
        if (!note) { res.status(404).json({ error: 'Note not found' }); return; }
        await Promise.all([cache.invalidate('notes:*'), cache.invalidate(`note:${id}`)]);
        res.json(note);
    } catch (err) { logger.error('[Notes] updateNote:', err); res.status(500).json({ error: 'An internal error occurred' }); }
}

export async function deleteNote(req: express.Request, res: express.Response): Promise<void> {
    const id = req.params.id as string;
    try {
        const note = await Note.findOneAndDelete({ id }) as any;
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
        res.json(quiz);
    } catch (err) { logger.error('[Quizzes] getQuizById:', err); res.status(500).json({ error: 'An internal error occurred' }); }
}

export async function createQuiz(req: express.Request, res: express.Response): Promise<void> {
    const quizData = req.body;
    if (!quizData.title || !quizData.subjectId) { res.status(400).json({ error: 'Title and subjectId are required' }); return; }
    try {
        const quiz = await Quiz.create({ ...quizData, id: generateId() });
        await cache.invalidate('quizzes:*');
        res.json(quiz);
    } catch (err) { logger.error('[Quizzes] createQuiz:', err); res.status(500).json({ error: 'An internal error occurred' }); }
}

export async function updateQuiz(req: express.Request, res: express.Response): Promise<void> {
    const id = req.params.id as string;
    try {
        const quiz = await Quiz.findOneAndUpdate({ id }, req.body, { new: true });
        if (!quiz) { res.status(404).json({ error: 'Quiz not found' }); return; }
        await Promise.all([cache.invalidate('quizzes:*'), cache.invalidate(`quiz:${id}`)]);
        res.json(quiz);
    } catch (err) { logger.error('[Quizzes] updateQuiz:', err); res.status(500).json({ error: 'An internal error occurred' }); }
}

export async function deleteQuiz(req: express.Request, res: express.Response): Promise<void> {
    const id = req.params.id as string;
    try {
        const quiz = await Quiz.findOneAndDelete({ id });
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
        res.json(viva);
    } catch (err) { logger.error('[Vivas] getVivaById:', err); res.status(500).json({ error: 'An internal error occurred' }); }
}

export async function createViva(req: express.Request, res: express.Response): Promise<void> {
    const vivaData = req.body;
    if (!vivaData.title || !vivaData.subjectId) { res.status(400).json({ error: 'Title and subjectId are required' }); return; }
    try {
        const viva = await Viva.create({ ...vivaData, id: generateId() });
        await cache.invalidate('vivas:*');
        res.json(viva);
    } catch (err) { logger.error('[Vivas] createViva:', err); res.status(500).json({ error: 'An internal error occurred' }); }
}

export async function updateViva(req: express.Request, res: express.Response): Promise<void> {
    const id = req.params.id as string;
    try {
        const viva = await Viva.findOneAndUpdate({ id }, req.body, { new: true });
        if (!viva) { res.status(404).json({ error: 'Viva not found' }); return; }
        await Promise.all([cache.invalidate('vivas:*'), cache.invalidate(`viva:${id}`)]);
        res.json(viva);
    } catch (err) { logger.error('[Vivas] updateViva:', err); res.status(500).json({ error: 'An internal error occurred' }); }
}

export async function deleteViva(req: express.Request, res: express.Response): Promise<void> {
    const id = req.params.id as string;
    try {
        const viva = await Viva.findOneAndDelete({ id });
        if (!viva) { res.status(404).json({ error: 'Viva not found' }); return; }
        await Promise.all([cache.invalidate('vivas:*'), cache.invalidate(`viva:${id}`)]);
        res.json({ success: true });
    } catch (err) { logger.error('[Vivas] deleteViva:', err); res.status(500).json({ error: 'An internal error occurred' }); }
}
