import express from 'express';
import { Course, CourseProgress } from '../models/index.js';
import logger from '../logger.js';

/**
 * Extracts all video IDs from a course's modules.
 */
function getCourseVideoIds(course: any): string[] {
    const videoIds: string[] = [];
    if (!course || !course.modules) return videoIds;
    for (const mod of course.modules) {
        if (mod.videos && Array.isArray(mod.videos)) {
            for (const v of mod.videos) {
                if (v.id) videoIds.push(v.id);
            }
        }
        // Handle legacy single-video modules if any
        if (mod.videoUrl && !mod.videos?.length) {
            videoIds.push(`legacy-${mod.id}`);
        }
    }
    return videoIds;
}

export async function getCourseProgress(req: express.Request, res: express.Response): Promise<void> {
    const currentUser = (req as any).currentUser;
    const courseId = req.params.courseId as string;

    try {
        const course = await Course.findOne({ id: courseId }).lean();
        if (!course) {
            res.status(404).json({ error: 'Course not found' });
            return;
        }

        const allVideoIds = getCourseVideoIds(course);
        const totalLectures = allVideoIds.length;

        const progress = await CourseProgress.findOne({
            userId: currentUser.id,
            courseId
        }).lean();

        const completedLectures: string[] = progress?.completedLectures || [];
        const completedCount = completedLectures.filter(id => allVideoIds.includes(id)).length;
        const percentage = totalLectures > 0 ? Math.round((completedCount / totalLectures) * 100) : 0;

        res.json({
            courseId,
            completedLectures,
            completed: progress?.completed || (totalLectures > 0 && completedCount === totalLectures),
            lastWatchedLectureId: progress?.lastWatchedLectureId || (allVideoIds.length > 0 ? allVideoIds[0] : null),
            totalLectures,
            completedCount,
            percentage
        });
    } catch (err: any) {
        logger.error('[CourseProgress] getCourseProgress error:', err);
        res.status(500).json({ error: 'Failed to fetch course progress' });
    }
}

export async function toggleLectureProgress(req: express.Request, res: express.Response): Promise<void> {
    const currentUser = (req as any).currentUser;
    const courseId = req.params.courseId as string;
    const { lectureId, isCompleted } = req.body;

    if (!lectureId) {
        res.status(400).json({ error: 'lectureId is required' });
        return;
    }

    try {
        const course = await Course.findOne({ id: courseId }).lean();
        if (!course) {
            res.status(404).json({ error: 'Course not found' });
            return;
        }

        const allVideoIds = getCourseVideoIds(course);
        const totalLectures = allVideoIds.length;

        let progress = await CourseProgress.findOne({
            userId: currentUser.id,
            courseId
        });

        if (!progress) {
            progress = new CourseProgress({
                userId: currentUser.id,
                courseId,
                completedLectures: [],
                completed: false,
                lastWatchedLectureId: lectureId
            });
        }

        const completedSet = new Set(progress.completedLectures || []);

        if (typeof isCompleted === 'boolean') {
            if (isCompleted) {
                completedSet.add(lectureId);
            } else {
                completedSet.delete(lectureId);
            }
        } else {
            // Toggle
            if (completedSet.has(lectureId)) {
                completedSet.delete(lectureId);
            } else {
                completedSet.add(lectureId);
            }
        }

        progress.completedLectures = Array.from(completedSet);
        progress.lastWatchedLectureId = lectureId;

        // Check if all lectures in course are completed
        const validCompletedCount = progress.completedLectures.filter(id => allVideoIds.includes(id)).length;
        progress.completed = totalLectures > 0 && validCompletedCount >= totalLectures;

        await progress.save();

        const percentage = totalLectures > 0 ? Math.round((validCompletedCount / totalLectures) * 100) : 0;

        res.json({
            courseId,
            completedLectures: progress.completedLectures,
            completed: progress.completed,
            lastWatchedLectureId: progress.lastWatchedLectureId,
            totalLectures,
            completedCount: validCompletedCount,
            percentage
        });
    } catch (err: any) {
        logger.error('[CourseProgress] toggleLectureProgress error:', err);
        res.status(500).json({ error: 'Failed to update course progress' });
    }
}

export async function setLastWatchedLecture(req: express.Request, res: express.Response): Promise<void> {
    const currentUser = (req as any).currentUser;
    const courseId = req.params.courseId as string;
    const { lectureId } = req.body;

    if (!lectureId) {
        res.status(400).json({ error: 'lectureId is required' });
        return;
    }

    try {
        await CourseProgress.findOneAndUpdate(
            { userId: currentUser.id, courseId },
            { $set: { lastWatchedLectureId: lectureId } },
            { upsert: true, new: true }
        );
        res.json({ ok: true, courseId, lastWatchedLectureId: lectureId });
    } catch (err: any) {
        logger.error('[CourseProgress] setLastWatchedLecture error:', err);
        res.status(500).json({ error: 'Failed to set last watched lecture' });
    }
}

export async function getAllStudentProgress(req: express.Request, res: express.Response): Promise<void> {
    const currentUser = (req as any).currentUser;

    try {
        const records = await CourseProgress.find({ userId: currentUser.id }).lean();
        const progressMap: Record<string, {
            completedLectures: string[];
            completed: boolean;
            lastWatchedLectureId: string | null;
            completedCount: number;
        }> = {};

        for (const r of records) {
            progressMap[r.courseId] = {
                completedLectures: r.completedLectures || [],
                completed: r.completed || false,
                lastWatchedLectureId: r.lastWatchedLectureId || null,
                completedCount: (r.completedLectures || []).length
            };
        }

        res.json({ progress: progressMap });
    } catch (err: any) {
        logger.error('[CourseProgress] getAllStudentProgress error:', err);
        res.status(500).json({ error: 'Failed to fetch student progress map' });
    }
}
