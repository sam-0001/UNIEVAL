import express from 'express';
import { randomUUID } from 'crypto';
import { Course, Note, Quiz, Viva, User } from '../models/index.js';
import { UserRole } from '../../types.js';
import { cache } from '../services/cache.service.js';
import logger from '../logger.js';
import { 
    deleteFileFromR2, 
    deleteDirectoryFromR2, 
    deleteVideoAssets, 
    deleteNoteFileAssets, 
    deleteNoteAssets, 
    deleteCourseAssets, 
    extractR2KeyFromUrl 
} from '../routes/upload.js';

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
    if (!courseData.title || !courseData.subjectId || !courseData.teacherId) { res.status(400).json({ error: 'Title, subjectId, and teacherId are required' }); return; }
    if (Array.isArray(courseData.modules)) courseData.modules = sanitizeModules(courseData.modules);
    if (!courseData.collegeConfig || !courseData.collegeConfig.name?.trim() || !courseData.collegeConfig.emailDomain?.trim()) {
        delete courseData.collegeConfig;
    } else {
        courseData.collegeConfig = {
            name: courseData.collegeConfig.name.trim(),
            emailDomain: courseData.collegeConfig.emailDomain.trim().toLowerCase()
        };
    }

    const validityType = courseData.validityType === 'date' ? 'date' : 'months';
    courseData.validityType = validityType;
    if (validityType === 'date' && courseData.validityDate) {
        courseData.validityDate = new Date(courseData.validityDate);
        courseData.validityMonths = 6;
    } else {
        courseData.validityType = 'months';
        courseData.validityMonths = Number(courseData.validityMonths) > 0 ? Number(courseData.validityMonths) : 6;
        courseData.validityDate = null;
    }
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
        const existingCourse = await Course.findOne({ id }).lean() as any;
        if (!existingCourse) { res.status(404).json({ error: 'Course not found' }); return; }

        const currentUser = (req as any).currentUser;
        const isAdmin = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.SUPER_ADMIN;
        if (currentUser?.role === UserRole.TEACHER && existingCourse.teacherId && existingCourse.teacherId !== currentUser.id && !isAdmin) {
            res.status(403).json({ error: 'You are not authorized to update this course' });
            return;
        }

        // Clean up removed videos and resources from R2
        if (Array.isArray(updates.modules) && Array.isArray(existingCourse.modules)) {
            const newVideoIds = new Set<string>();
            const newVideoKeys = new Set<string>();
            const newResourceUrls = new Set<string>();

            updates.modules.forEach((m: any) => {
                if (Array.isArray(m.videos)) {
                    m.videos.forEach((v: any) => {
                        if (v.id) newVideoIds.add(String(v.id));
                        if (v.videoId) newVideoIds.add(String(v.videoId));
                        if (v.videoKey) newVideoKeys.add(String(v.videoKey));
                        if (Array.isArray(v.resources)) {
                            v.resources.forEach((r: any) => { if (r?.url && r.url !== '#') newResourceUrls.add(String(r.url)); });
                        }
                    });
                }
            });

            // Find old videos that are no longer present
            const videosToDelete: any[] = [];
            existingCourse.modules.forEach((oldMod: any) => {
                if (Array.isArray(oldMod.videos)) {
                    oldMod.videos.forEach((oldVid: any) => {
                        const hasId = oldVid.id && newVideoIds.has(String(oldVid.id));
                        const hasVideoId = oldVid.videoId && newVideoIds.has(String(oldVid.videoId));
                        const hasVideoKey = oldVid.videoKey && newVideoKeys.has(String(oldVid.videoKey));
                        if (!hasId && !hasVideoId && !hasVideoKey) {
                            videosToDelete.push(oldVid);
                        } else {
                            // Video remains, but check if any of its resources were deleted
                            if (Array.isArray(oldVid.resources)) {
                                oldVid.resources.forEach((oldRes: any) => {
                                    if (oldRes?.url && !newResourceUrls.has(String(oldRes.url))) {
                                        deleteFileFromR2(oldRes.url).catch(e => logger.error('[R2] Error deleting removed resource:', e));
                                    }
                                });
                            }
                        }
                    });
                }
            });

            for (const v of videosToDelete) {
                await deleteVideoAssets(v);
            }
        }

        // If thumbnail was replaced
        if (updates.thumbnailUrl && existingCourse.thumbnailUrl && updates.thumbnailUrl !== existingCourse.thumbnailUrl) {
            deleteFileFromR2(existingCourse.thumbnailUrl).catch(e => logger.error('[R2] Error deleting old course thumbnail:', e));
        }

        const updateDoc: any = { $set: updates };
        if (updates.validityType !== undefined) {
            const validityType = updates.validityType === 'date' ? 'date' : 'months';
            updateDoc.$set.validityType = validityType;
            if (validityType === 'date' && updates.validityDate) {
                updateDoc.$set.validityDate = new Date(updates.validityDate);
                updateDoc.$set.validityMonths = 6;
            } else {
                updateDoc.$set.validityType = 'months';
                updateDoc.$set.validityMonths = Number(updates.validityMonths) > 0 ? Number(updates.validityMonths) : 6;
                updateDoc.$set.validityDate = null;
            }
        }

        if (!updates.collegeConfig || !updates.collegeConfig.name?.trim() || !updates.collegeConfig.emailDomain?.trim()) {
            delete updateDoc.$set.collegeConfig;
            updateDoc.$unset = { ...(updateDoc.$unset || {}), collegeConfig: 1 };
        } else {
            updateDoc.$set.collegeConfig = {
                name: updates.collegeConfig.name.trim(),
                emailDomain: updates.collegeConfig.emailDomain.trim().toLowerCase()
            };
        }

        const course = await Course.findOneAndUpdate({ id }, updateDoc, { new: true, runValidators: false });
        await Promise.all([cache.invalidate('courses:*'), cache.invalidate(`course:${id}`)]);
        res.json(course);
    } catch (err) { logger.error('[Courses] updateCourse:', err); res.status(500).json({ error: 'An internal error occurred' }); }
}

export async function deleteCourse(req: express.Request, res: express.Response): Promise<void> {
    const id = req.params.id as string;
    const currentUser = (req as any).currentUser;
    try {
        const existingCourse = await Course.findOne({ id }).lean() as any;
        if (!existingCourse) { res.status(404).json({ error: 'Course not found' }); return; }

        const isAdmin = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.SUPER_ADMIN;
        if (currentUser?.role === UserRole.TEACHER && existingCourse.teacherId && existingCourse.teacherId !== currentUser.id && !isAdmin) {
            res.status(403).json({ error: 'You are not authorized to delete this course' });
            return;
        }

        const course = await Course.findOneAndDelete({ id }) as any;
        if (!course) { res.status(404).json({ error: 'Course not found' }); return; }

        // Permanently delete all associated video folders, raw uploads, thumbnails and resources
        await deleteCourseAssets(course);

        await Promise.all([cache.invalidate('courses:*'), cache.invalidate(`course:${id}`)]);
        res.json({ success: true });
    } catch (err) { logger.error('[Courses] deleteCourse:', err); res.status(500).json({ error: 'An internal error occurred' }); }
}

export async function getCourseStudents(req: express.Request, res: express.Response): Promise<void> {
    const courseId = req.params.id as string;
    const currentUser = (req as any).currentUser;
    try {
        const course = await Course.findOne({ id: courseId }).lean();
        if (!course) {
            res.status(404).json({ error: 'Course not found' });
            return;
        }

        // Check ownership if teacher (admins and super admins can view any)
        if (currentUser && currentUser.role === UserRole.TEACHER && course.teacherId !== currentUser.id) {
            res.status(403).json({ error: 'You are not authorized to view students for this course' });
            return;
        }

        const students = await User.find(
            { purchasedCourseIds: courseId },
            'id name email phoneNumber createdAt'
        ).lean();

        res.json(students);
    } catch (err) {
        logger.error('[Courses] getCourseStudents error:', err);
        res.status(500).json({ error: 'Failed to fetch course students' });
    }
}

// ─── Notes ────────────────────────────────────────────────────────────────────

function sanitizeNoteForClient(note: any, userRole?: string, userId?: string): any {
    if (!note) return note;
    const role = (userRole || '').toUpperCase();
    const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
    const isTeacherOwner = role === 'TEACHER' && Boolean(note.teacherId && note.teacherId === userId);

    // Admins and author teachers get raw internal storage pointers for editing in dashboard
    if (isAdmin || isTeacherOwner) {
        return note;
    }

    // For students and unauthenticated viewers, mask all internal/Cloudflare R2 URLs
    const sanitized = { ...note };
    if (Array.isArray(sanitized.sections)) {
        sanitized.sections = sanitized.sections.map((sec: any) => ({
            ...sec,
            files: Array.isArray(sec.files) ? sec.files.map((f: any) => ({
                ...f,
                // Mask direct storage URLs with the secure proxy route
                url: `/api/secure-file/${note.id}/${f.id || f._id}`
            })) : []
        }));
    }
    return sanitized;
}

export async function getNotes(req: express.Request, res: express.Response): Promise<void> {
    const subjectId = req.query.subjectId ? String(req.query.subjectId) : undefined;
    const teacherId = req.query.teacherId ? String(req.query.teacherId) : undefined;
    const { page, limit, skip } = parsePagination(req.query);
    const currentUser = (req as any).currentUser;
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
        const sanitizedData = Array.isArray(result?.data)
            ? result.data.map((n: any) => sanitizeNoteForClient(n, currentUser?.role, currentUser?.id))
            : result?.data;
        res.json({ ...result, data: sanitizedData });
    } catch (err) { logger.error('[Notes] getNotes:', err); res.status(500).json({ error: 'An internal error occurred' }); }
}

export async function getNoteById(req: express.Request, res: express.Response): Promise<void> {
    const id = req.params.id as string;
    const currentUser = (req as any).currentUser;
    try {
        const note = await cache.getOrSet(`note:${id}`, () => Note.findOne({ id }).lean(), 600);
        if (!note) { res.status(404).json({ error: 'Note not found' }); return; }
        res.json(sanitizeNoteForClient(note, currentUser?.role, currentUser?.id));
    } catch (err) { logger.error('[Notes] getNoteById:', err); res.status(500).json({ error: 'An internal error occurred' }); }
}

export async function createNote(req: express.Request, res: express.Response): Promise<void> {
    const noteData = req.body;
    if (!noteData.title || !noteData.subjectId || !noteData.teacherId) { res.status(400).json({ error: 'Title, subjectId, and teacherId are required' }); return; }
    if (!noteData.collegeConfig || !noteData.collegeConfig.name?.trim() || !noteData.collegeConfig.emailDomain?.trim()) {
        delete noteData.collegeConfig;
    } else {
        noteData.collegeConfig = {
            name: noteData.collegeConfig.name.trim(),
            emailDomain: noteData.collegeConfig.emailDomain.trim().toLowerCase()
        };
    }

    const validityType = noteData.validityType === 'date' ? 'date' : 'months';
    noteData.validityType = validityType;
    if (validityType === 'date' && noteData.validityDate) {
        noteData.validityDate = new Date(noteData.validityDate);
        noteData.validityMonths = 6;
    } else {
        noteData.validityType = 'months';
        noteData.validityMonths = Number(noteData.validityMonths) > 0 ? Number(noteData.validityMonths) : 6;
        noteData.validityDate = null;
    }
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
        const existingNote = await Note.findOne({ id }).lean() as any;
        if (!existingNote) { res.status(404).json({ error: 'Note not found' }); return; }

        const currentUser = (req as any).currentUser;
        const isAdmin = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.SUPER_ADMIN;
        if (currentUser?.role === UserRole.TEACHER && existingNote.teacherId && existingNote.teacherId !== currentUser.id && !isAdmin) {
            res.status(403).json({ error: 'You are not authorized to update this note' });
            return;
        }

        // Clean up removed files from R2 and MongoDB
        if (Array.isArray(updates.sections) && Array.isArray(existingNote.sections)) {
            const newFileUrls = new Set<string>();
            const newFileIds = new Set<string>();

            updates.sections.forEach((s: any) => {
                if (Array.isArray(s.files)) {
                    s.files.forEach((f: any) => {
                        if (f.url && f.url !== '#') newFileUrls.add(String(f.url));
                        if (f.id) newFileIds.add(String(f.id));
                    });
                }
            });

            const filesToDelete: { url?: string; id?: string }[] = [];
            existingNote.sections.forEach((oldSec: any) => {
                if (Array.isArray(oldSec.files)) {
                    oldSec.files.forEach((oldFile: any) => {
                        const hasUrl = oldFile.url && newFileUrls.has(String(oldFile.url));
                        const hasId = oldFile.id && newFileIds.has(String(oldFile.id));
                        if (!hasUrl && !hasId && oldFile.url && oldFile.url !== '#') {
                            filesToDelete.push(oldFile);
                        }
                    });
                }
            });

            for (const f of filesToDelete) {
                await deleteNoteFileAssets(f.url, f.id);
            }
        }

        // If thumbnail was replaced
        if (updates.thumbnailUrl && existingNote.thumbnailUrl && updates.thumbnailUrl !== existingNote.thumbnailUrl) {
            deleteFileFromR2(existingNote.thumbnailUrl).catch(e => logger.error('[R2] Error deleting old note thumbnail:', e));
        }

        const updateDoc: any = { $set: updates };
        if (updates.validityType !== undefined) {
            const validityType = updates.validityType === 'date' ? 'date' : 'months';
            updateDoc.$set.validityType = validityType;
            if (validityType === 'date' && updates.validityDate) {
                updateDoc.$set.validityDate = new Date(updates.validityDate);
                updateDoc.$set.validityMonths = 6;
            } else {
                updateDoc.$set.validityType = 'months';
                updateDoc.$set.validityMonths = Number(updates.validityMonths) > 0 ? Number(updates.validityMonths) : 6;
                updateDoc.$set.validityDate = null;
            }
        }

        if (!updates.collegeConfig || !updates.collegeConfig.name?.trim() || !updates.collegeConfig.emailDomain?.trim()) {
            delete updateDoc.$set.collegeConfig;
            updateDoc.$unset = { ...(updateDoc.$unset || {}), collegeConfig: 1 };
        } else {
            updateDoc.$set.collegeConfig = {
                name: updates.collegeConfig.name.trim(),
                emailDomain: updates.collegeConfig.emailDomain.trim().toLowerCase()
            };
        }

        const note = await Note.findOneAndUpdate({ id }, updateDoc, { new: true, runValidators: false });
        await Promise.all([cache.invalidate('notes:*'), cache.invalidate(`note:${id}`)]);
        res.json(note);
    } catch (err) { logger.error('[Notes] updateNote:', err); res.status(500).json({ error: 'An internal error occurred' }); }
}

export async function deleteNote(req: express.Request, res: express.Response): Promise<void> {
    const id = req.params.id as string;
    const currentUser = (req as any).currentUser;
    try {
        const existingNote = await Note.findOne({ id }).lean() as any;
        if (!existingNote) { res.status(404).json({ error: 'Note not found' }); return; }

        const isAdmin = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.SUPER_ADMIN;
        if (currentUser?.role === UserRole.TEACHER && existingNote.teacherId && existingNote.teacherId !== currentUser.id && !isAdmin) {
            res.status(403).json({ error: 'You are not authorized to delete this note' });
            return;
        }

        const note = await Note.findOneAndDelete({ id }) as any;
        if (!note) { res.status(404).json({ error: 'Note not found' }); return; }
        
        // Permanently delete all associated encrypted files, bundles, and thumbnails from R2 and MongoDB
        await deleteNoteAssets(note);

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
        const existingQuiz = await Quiz.findOne({ id }).lean() as any;
        if (!existingQuiz) { res.status(404).json({ error: 'Quiz not found' }); return; }

        const currentUser = (req as any).currentUser;
        const isAdmin = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.SUPER_ADMIN;
        if (currentUser?.role === UserRole.TEACHER && existingQuiz.teacherId && existingQuiz.teacherId !== currentUser.id && !isAdmin) {
            res.status(403).json({ error: 'You are not authorized to update this quiz' });
            return;
        }

        const quiz = await Quiz.findOneAndUpdate({ id }, req.body, { new: true });
        if (!quiz) { res.status(404).json({ error: 'Quiz not found' }); return; }
        await Promise.all([cache.invalidate('quizzes:*'), cache.invalidate(`quiz:${id}`)]);
        res.json(quiz);
    } catch (err) { logger.error('[Quizzes] updateQuiz:', err); res.status(500).json({ error: 'An internal error occurred' }); }
}

export async function deleteQuiz(req: express.Request, res: express.Response): Promise<void> {
    const id = req.params.id as string;
    try {
        const existingQuiz = await Quiz.findOne({ id }).lean() as any;
        if (!existingQuiz) { res.status(404).json({ error: 'Quiz not found' }); return; }

        const currentUser = (req as any).currentUser;
        const isAdmin = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.SUPER_ADMIN;
        if (currentUser?.role === UserRole.TEACHER && existingQuiz.teacherId && existingQuiz.teacherId !== currentUser.id && !isAdmin) {
            res.status(403).json({ error: 'You are not authorized to delete this quiz' });
            return;
        }

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
        const currentUser = (req as any).currentUser;
        const viva = await Viva.create({
            ...vivaData,
            id: generateId(),
            teacherId: vivaData.teacherId || currentUser?.id
        });
        await cache.invalidate('vivas:*');
        res.json(viva);
    } catch (err) { logger.error('[Vivas] createViva:', err); res.status(500).json({ error: 'An internal error occurred' }); }
}

export async function updateViva(req: express.Request, res: express.Response): Promise<void> {
    const id = req.params.id as string;
    try {
        const existingViva = await Viva.findOne({ id }).lean() as any;
        if (!existingViva) { res.status(404).json({ error: 'Viva not found' }); return; }

        const currentUser = (req as any).currentUser;
        const isAdmin = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.SUPER_ADMIN;
        if (currentUser?.role === UserRole.TEACHER && existingViva.teacherId && existingViva.teacherId !== currentUser.id && !isAdmin) {
            res.status(403).json({ error: 'You are not authorized to update this viva' });
            return;
        }

        const viva = await Viva.findOneAndUpdate({ id }, req.body, { new: true });
        if (!viva) { res.status(404).json({ error: 'Viva not found' }); return; }
        await Promise.all([cache.invalidate('vivas:*'), cache.invalidate(`viva:${id}`)]);
        res.json(viva);
    } catch (err) { logger.error('[Vivas] updateViva:', err); res.status(500).json({ error: 'An internal error occurred' }); }
}

export async function deleteViva(req: express.Request, res: express.Response): Promise<void> {
    const id = req.params.id as string;
    try {
        const existingViva = await Viva.findOne({ id }).lean() as any;
        if (!existingViva) { res.status(404).json({ error: 'Viva not found' }); return; }

        const currentUser = (req as any).currentUser;
        const isAdmin = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.SUPER_ADMIN;
        if (currentUser?.role === UserRole.TEACHER && existingViva.teacherId && existingViva.teacherId !== currentUser.id && !isAdmin) {
            res.status(403).json({ error: 'You are not authorized to delete this viva' });
            return;
        }

        const viva = await Viva.findOneAndDelete({ id });
        if (!viva) { res.status(404).json({ error: 'Viva not found' }); return; }
        await Promise.all([cache.invalidate('vivas:*'), cache.invalidate(`viva:${id}`)]);
        res.json({ success: true });
    } catch (err) { logger.error('[Vivas] deleteViva:', err); res.status(500).json({ error: 'An internal error occurred' }); }
}
