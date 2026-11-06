import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { VideoKey, Course } from '../models/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { UserRole } from '../../types.js';
import { uploadRateLimit, noteUploadRateLimit, presignedUrlLimit } from '../middleware/userRateLimit.js';
import logger from '../logger.js';
import { enqueueVideoJob, isQueueAvailable } from '../services/queue.service.js';

// Import decoupled services
import {
    s3Client,
    R2_ACCOUNT_ID,
    R2_BUCKET_NAME,
    R2_PUBLIC_URL,
    extractR2KeyFromUrl,
    deleteFileFromR2,
    deleteDirectoryFromR2
} from '../services/storage.service.js';
import {
    encryptAndStoreFile,
    readAndDecryptFile,
    readAndDecryptBundleAsset,
    getBundleIdForFile,
    getFileBufferFromR2OrUrl,
    invalidateDecryptedCache
} from '../services/crypto.service.js';
import {
    deleteVideoAssets,
    deleteNoteFileAssets,
    deleteNoteAssets,
    deleteCourseAssets
} from '../services/assetCleanup.service.js';
import {
    processVideoAsync,
    videoJobStore
} from '../services/videoTranscode.service.js';

// Backward-compatibility exports
export {
    extractR2KeyFromUrl,
    deleteFileFromR2,
    deleteDirectoryFromR2,
    readAndDecryptFile,
    readAndDecryptBundleAsset,
    getBundleIdForFile,
    getFileBufferFromR2OrUrl,
    invalidateDecryptedCache,
    deleteVideoAssets,
    deleteNoteFileAssets,
    deleteNoteAssets,
    deleteCourseAssets,
    processVideoAsync
};

const router = express.Router();

const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo'];
const ALLOWED_VIDEO_EXTENSIONS = ['mp4', 'webm', 'ogg', 'mov', 'avi'];
const ALLOWED_DOC_EXTENSIONS = ['pdf', 'txt', 'md', 'csv', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'html', 'htm', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'];
const MAX_DOC_SIZE = 100 * 1024 * 1024; // 100MB per note file
const TEMP_DIR = path.join(process.cwd(), 'uploads', 'temp');

if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

router.use('/video/playlist', express.static(TEMP_DIR));

// Dynamic fallback for playlist/chunks
router.get('/video/playlist/:videoId/:file', async (req: Request, res: Response, next: express.NextFunction): Promise<void> => {
    try {
        const videoId = String(req.params.videoId);
        const file = String(req.params.file);
        const videoKeyDoc = await VideoKey.findOne({ videoId });

        if (videoKeyDoc && videoKeyDoc.status === 'ready' && videoKeyDoc.videoUrl && videoKeyDoc.videoUrl.includes('r2.dev')) {
            const baseUrl = videoKeyDoc.videoUrl.replace(/\/playlist\.m3u8$/, '');
            res.redirect(302, `${baseUrl}/${file}`);
            return;
        }

        const localPath = path.join(TEMP_DIR, videoId, file);
        if (fs.existsSync(localPath)) {
            res.sendFile(localPath);
            return;
        }

        res.status(404).send('Not found');
    } catch (err) {
        next(err);
    }
});

const noteFileUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_DOC_SIZE },
    fileFilter: (_req, file, cb) => {
        const ext = (file.originalname.split('.').pop() || '').toLowerCase();
        if (!ALLOWED_DOC_EXTENSIONS.includes(ext)) {
            cb(new Error('Unsupported file type'));
            return;
        }
        cb(null, true);
    }
});

function validateFileUpload(fileName: string, fileType: string, _fileSize: number, isVideo: boolean): { valid: boolean; error?: string } {
    if (!fileName || !fileType) return { valid: false, error: 'File name and type are required' };
    const extension = fileName.toLowerCase().split('.').pop();
    if (!extension || (isVideo && (!ALLOWED_VIDEO_EXTENSIONS.includes(extension) || !ALLOWED_VIDEO_TYPES.includes(fileType.toLowerCase())))) {
        return { valid: false, error: 'Invalid video format' };
    }
    return { valid: true };
}

// ─── POST /delete-files ────────────────────────────────────────────────────────
router.post('/delete-files', requireAuth, requireRole(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN), async (req: Request, res: Response): Promise<void> => {
    const { urls } = req.body;
    if (!Array.isArray(urls) || urls.length === 0) {
        res.status(400).json({ error: 'urls array is required' });
        return;
    }
    try {
        for (const item of urls) {
            if (!item || typeof item !== 'string' || item === '#') continue;

            if (item.includes('/videos/') || item.startsWith('vid-') || item.includes('playlist.m3u8')) {
                let vidId: string | undefined;
                const match = item.match(/videos\/(vid-[a-zA-Z0-9_-]+)/);
                if (match) vidId = match[1];
                else if (item.startsWith('vid-')) vidId = item;

                if (vidId) {
                    await deleteVideoAssets({ videoId: vidId });
                    continue;
                }
            }

            if (item.includes('/api/secure-file-raw/') || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item)) {
                await deleteNoteFileAssets(item);
                continue;
            }

            await deleteFileFromR2(item);
        }
        res.json({ success: true, message: 'Files deleted successfully' });
    } catch (err) {
        logger.error('[delete-files] Error deleting files:', err);
        res.status(500).json({ error: 'Failed to delete files' });
    }
});

// ─── POST /upload/r2-presigned-url ─────────────────────────────────────────────
router.post('/upload/r2-presigned-url', requireAuth, requireRole(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN), presignedUrlLimit, async (req: Request, res: Response): Promise<void> => {
    const { fileName, fileType, fileSize, isVideo = true } = req.body;
    const validation = validateFileUpload(fileName, fileType, fileSize, isVideo);
    if (!validation.valid) { res.status(400).json({ error: validation.error }); return; }

    const key = `raw-uploads/${Date.now()}-${randomUUID()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    if (R2_ACCOUNT_ID && R2_BUCKET_NAME) {
        const command = new PutObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key, ContentType: fileType });
        try {
            const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
            res.json({ uploadUrl, publicUrl: `${R2_PUBLIC_URL}/${key}`, key });
        } catch (error) {
            res.status(500).json({ error: 'Failed to generate URL' });
        }
    } else {
        res.json({ uploadUrl: `/api/upload/local-put?key=${encodeURIComponent(key)}`, publicUrl: `/uploads/${key}`, key });
    }
});

// ─── POST /upload/file ─────────────────────────────────────────────────────────
router.post(
    '/upload/file',
    requireAuth,
    requireRole(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
    noteUploadRateLimit,
    (req: Request, res: Response, next: express.NextFunction) => {
        noteFileUpload.single('file')(req, res, (err: any) => {
            if (err) {
                logger.error('[upload/file] Multer error:', err);
                res.status(400).json({ error: err.message || 'File upload error' });
                return;
            }
            next();
        });
    },
    async (req: Request, res: Response): Promise<void> => {
        const file = (req as any).file as Express.Multer.File | undefined;
        if (!file) { res.status(400).json({ error: 'No file provided' }); return; }

        try {
            const fileId = await encryptAndStoreFile(file.buffer, {
                originalName: file.originalname,
                mimeType: file.mimetype,
            });

            res.json({ url: `/api/secure-file-raw/${fileId}`, fileId });
        } catch (error) {
            logger.error('Error encrypting/storing note file:', error);
            res.status(500).json({ error: 'Failed to upload file' });
        }
    }
);

// ─── POST /upload/html-bundle ──────────────────────────────────────────────────
const ALLOWED_BUNDLE_ENTRY_EXTENSIONS = ['html', 'htm'];
const ALLOWED_BUNDLE_ASSET_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];
const MAX_BUNDLE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_BUNDLE_FILES = 200;

const bundleUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_BUNDLE_SIZE },
    fileFilter: (_req, file, cb) => {
        const ext = (file.originalname.split('.').pop() || '').toLowerCase();
        if (ext !== 'zip') { cb(new Error('Expected a .zip file')); return; }
        cb(null, true);
    },
});

router.post(
    '/upload/html-bundle',
    requireAuth,
    requireRole(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
    noteUploadRateLimit,
    (req: Request, res: Response, next: express.NextFunction) => {
        bundleUpload.single('file')(req, res, (err: any) => {
            if (err) {
                logger.error('[upload/html-bundle] Multer error:', err);
                res.status(400).json({ error: err.message || 'Bundle upload error' });
                return;
            }
            next();
        });
    },
    async (req: Request, res: Response): Promise<void> => {
        const file = (req as any).file as Express.Multer.File | undefined;
        if (!file) { res.status(400).json({ error: 'No file provided' }); return; }

        try {
            const AdmZip = (await import('adm-zip')).default;
            const zip = new AdmZip(file.buffer);
            const entries = zip.getEntries().filter(e => !e.isDirectory);

            if (entries.length === 0) { res.status(400).json({ error: 'Zip is empty' }); return; }
            if (entries.length > MAX_BUNDLE_FILES) { res.status(400).json({ error: 'Too many files in zip' }); return; }

            for (const e of entries) {
                const normalized = path.posix.normalize(e.entryName.replace(/\\/g, '/'));
                if (normalized.startsWith('..') || path.posix.isAbsolute(normalized)) {
                    res.status(400).json({ error: `Unsafe path in zip: ${e.entryName}` });
                    return;
                }
            }

            const htmlEntries = entries.filter(e => {
                const ext = (e.entryName.split('.').pop() || '').toLowerCase();
                return ALLOWED_BUNDLE_ENTRY_EXTENSIONS.includes(ext);
            });
            if (htmlEntries.length === 0) { res.status(400).json({ error: 'Zip must contain an .html file' }); return; }
            const entryFile = htmlEntries.find(e => /(^|\/)index\.html?$/i.test(e.entryName)) || htmlEntries[0];

            const assetEntries = entries.filter(e => {
                if (e === entryFile) return false;
                const ext = (e.entryName.split('.').pop() || '').toLowerCase();
                return ALLOWED_BUNDLE_ASSET_EXTENSIONS.includes(ext);
            });

            const bundleId = randomUUID();
            const mimeByExt: Record<string, string> = {
                png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
                gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
            };

            for (const asset of assetEntries) {
                const ext = (asset.entryName.split('.').pop() || '').toLowerCase();
                await encryptAndStoreFile(asset.getData(), {
                    originalName: path.posix.basename(asset.entryName),
                    mimeType: mimeByExt[ext] || 'application/octet-stream',
                    bundleId,
                    relativePath: asset.entryName.replace(/\\/g, '/'),
                    isEntry: false,
                });
            }

            const entryFileId = await encryptAndStoreFile(entryFile.getData(), {
                originalName: path.posix.basename(entryFile.entryName),
                mimeType: 'text/html',
                bundleId,
                relativePath: entryFile.entryName.replace(/\\/g, '/'),
                isEntry: true,
            });

            res.json({ url: `/api/secure-file-raw/${entryFileId}`, fileId: entryFileId, entryName: path.posix.basename(entryFile.entryName) });
        } catch (error) {
            logger.error('Error processing HTML bundle upload:', error);
            res.status(500).json({ error: 'Failed to process zip file' });
        }
    }
);

// ─── POST /process-video ───────────────────────────────────────────────────────
router.post('/process-video', requireAuth, requireRole(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN), uploadRateLimit, async (req: Request, res: Response): Promise<void> => {
    const { videoUrl, videoKey } = req.body;
    if (!videoUrl) { res.status(400).json({ error: 'Missing videoUrl' }); return; }

    const videoId = `vid-${Date.now()}-${randomUUID()}`;
    const tempOutputDir = path.join(TEMP_DIR, videoId);
    if (!fs.existsSync(tempOutputDir)) fs.mkdirSync(tempOutputDir, { recursive: true });

    videoJobStore.set(videoId, { videoId, status: 'processing', progress: 0, createdAt: new Date(), tempDir: tempOutputDir });

    try {
        await VideoKey.findOneAndUpdate(
            { videoId },
            { videoId, status: 'processing', progress: 0 },
            { upsert: true, new: true }
        );
    } catch (err) {
        logger.error(`[${videoId}] Error creating initial DB state:`, err);
    }

    if (isQueueAvailable()) {
        await enqueueVideoJob({ videoId, videoUrl, videoKey, tempOutputDir });
        logger.info(`[${videoId}] Job enqueued to worker`);
    } else {
        logger.warn(`[${videoId}] Queue unavailable — processing inline`);
        processVideoAsync(videoId, videoUrl, tempOutputDir, videoKey).catch(console.error);
    }

    const finalPlaylistUrl = (R2_ACCOUNT_ID && R2_PUBLIC_URL)
        ? `${R2_PUBLIC_URL}/videos/${videoId}/playlist.m3u8`
        : `/api/video/playlist/${videoId}/playlist.m3u8`;

    res.json({ message: 'Processing started', url: finalPlaylistUrl, videoId });
});

// ─── GET /video/status ─────────────────────────────────────────────────────────
router.get('/video/status', async (req: Request, res: Response): Promise<void> => {
    const { videoId } = req.query;
    if (!videoId || typeof videoId !== 'string') { res.status(400).json({ error: 'Missing videoId' }); return; }

    try {
        const videoRecord = await VideoKey.findOne({ videoId }).lean() as any;

        if (videoRecord && (videoRecord.status !== 'processing' || videoRecord.progress > 0)) {
            res.json({
                videoId,
                status: videoRecord.status || 'processing',
                progress: videoRecord.progress || 0
            });
            return;
        }

        const course = await Course.findOne({ 'modules.videos.videoId': videoId }).lean() as any;
        if (course) {
            let foundStatus: string = 'processing';
            let foundProgress: number = 0;
            course.modules?.forEach((m: any) => m.videos?.forEach((v: any) => {
                if (v.videoId === videoId) {
                    foundStatus = v.videoStatus || 'processing';
                    foundProgress = foundStatus === 'ready' ? 100 : (v.videoProgress ?? 0);
                }
            }));

            if (foundProgress > 0 || foundStatus !== 'processing') {
                res.json({ videoId, status: foundStatus, progress: foundProgress });
                return;
            }
        }
    } catch (err) {
        logger.error('[video/status] DB lookup error:', err);
    }

    const job = videoJobStore.get(videoId);
    if (job) {
        const { tempDir, ...safeJob } = job;
        res.json(safeJob);
        return;
    }

    res.status(404).json({ error: 'Job not found' });
});

export default router;
