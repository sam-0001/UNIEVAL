import express, { Request, Response } from 'express';
import multer from 'multer';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import path from 'path';
import fs from 'fs';
import crypto, { randomUUID } from 'crypto';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Course, VideoKey, FileKey } from '../models/index.js'; 
import { requireAuth } from '../middleware/auth.js';
import { uploadRateLimit, presignedUrlLimit } from '../middleware/userRateLimit.js';
import logger from '../logger.js';
import { enqueueVideoJob, isQueueAvailable } from '../services/queue.service.js';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const router = express.Router();

// --- CONFIGURATION ---
const MAX_VIDEO_SIZE = 5 * 1024 * 1024 * 1024; // 5GB
const TEMP_FILE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

// IMPORTANT: Set API_BASE_URL=https://unieval.in in production .env
const API_BASE_URL = process.env.API_BASE_URL || (
  process.env.NODE_ENV === 'production'
    ? 'https://unieval.in'
    : 'http://localhost:3000'
);

const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo'];
const ALLOWED_VIDEO_EXTENSIONS = ['mp4', 'webm', 'ogg', 'mov', 'avi'];

const ALLOWED_DOC_EXTENSIONS = ['pdf', 'txt', 'md', 'csv', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'];
const MAX_DOC_SIZE = 100 * 1024 * 1024; // 100MB per note file

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const TEMP_DIR = path.join(UPLOADS_DIR, 'temp');
const SECURE_FILES_DIR = path.join(UPLOADS_DIR, 'secure-files'); // local fallback storage for encrypted note files

[UPLOADS_DIR, TEMP_DIR, SECURE_FILES_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// --- FILE (NOTE / DOCUMENT) ENCRYPTION HELPERS ---
// AES-256-GCM: a fresh random key + IV per file, key material stored only in MongoDB (FileKey),
// never in the object's storage path or filename. The encrypted blob at rest is unreadable
// without the DB record, and the DB record alone (without the blob) is useless.
function encryptBuffer(plain: Buffer): { ciphertext: Buffer; keyHex: string; ivHex: string; authTagHex: string } {
    const key = crypto.randomBytes(32); // AES-256
    const iv = crypto.randomBytes(12);  // recommended IV size for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return { ciphertext, keyHex: key.toString('hex'), ivHex: iv.toString('hex'), authTagHex: authTag.toString('hex') };
}

function decryptBuffer(ciphertext: Buffer, keyHex: string, ivHex: string, authTagHex: string): Buffer {
    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(keyHex, 'hex'), Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

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

// R2 Configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID?.trim();
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID?.trim();
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY?.trim();
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME?.trim();
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL?.trim();

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID || "", secretAccessKey: R2_SECRET_ACCESS_KEY || "" },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

// --- TYPES & STORE ---
interface Resolution { name: string; width: number; height: number; bitrate: string; }
interface ProcessVideoRequest { videoUrl: string; videoKey?: string; }
interface VideoJobStatus { videoId: string; status: 'processing' | 'finalizing' | 'ready' | 'error'; progress: number; error?: string; createdAt: Date; tempDir?: string; }

class VideoJobStore {
    private jobs: Map<string, VideoJobStatus> = new Map();
    set(videoId: string, status: VideoJobStatus): void { this.jobs.set(videoId, status); }
    get(videoId: string): VideoJobStatus | undefined { return this.jobs.get(videoId); }
    delete(videoId: string): void { this.jobs.delete(videoId); }
}
const videoJobStore = new VideoJobStore();

const RESOLUTIONS: Resolution[] = [
    { name: '360p', width: 640, height: 360, bitrate: '800k' },
    { name: '480p', width: 854, height: 480, bitrate: '1400k' },
    { name: '720p', width: 1280, height: 720, bitrate: '2800k' },
    { name: '1080p', width: 1920, height: 1080, bitrate: '5000k' },
];

const getMaxResolution = (): number => {
    const envRes = (process.env.MAX_VIDEO_RESOLUTION || '720p').toLowerCase();
    if (envRes.includes('1080')) return 1080;
    if (envRes.includes('720')) return 720;
    if (envRes.includes('480')) return 480;
    if (envRes.includes('360')) return 360;
    return 720;
};

// --- VALIDATION & SECURITY ---
function validateFileUpload(fileName: string, fileType: string, fileSize: number, isVideo: boolean): { valid: boolean; error?: string } {
    if (!fileName || !fileType) return { valid: false, error: 'File name and type are required' };
    const extension = fileName.toLowerCase().split('.').pop();
    if (!extension || (isVideo && (!ALLOWED_VIDEO_EXTENSIONS.includes(extension) || !ALLOWED_VIDEO_TYPES.includes(fileType.toLowerCase())))) {
        return { valid: false, error: 'Invalid video format' };
    }
    return { valid: true };
}

async function cleanupTempFiles(): Promise<void> {
    try {
        const now = Date.now();
        const tempEntries = fs.readdirSync(TEMP_DIR, { withFileTypes: true });
        for (const entry of tempEntries) {
            const fullPath = path.join(TEMP_DIR, entry.name);
            const stats = fs.statSync(fullPath);
            if (now - stats.mtimeMs > TEMP_FILE_TTL) {
                if (entry.isDirectory()) fs.rmSync(fullPath, { recursive: true, force: true });
                else fs.unlinkSync(fullPath);
            }
        }
    } catch (err) {}
}
setInterval(cleanupTempFiles, CLEANUP_INTERVAL);

async function cleanupOnError(videoId: string, tempDir?: string, videoKey?: string): Promise<void> {
    if (tempDir && fs.existsSync(tempDir)) {
        try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (err) {}
    }
    videoJobStore.delete(videoId);
}

async function updateCourseVideoStatus(videoId: string, status: string, finalUrl?: string, progress?: number): Promise<void> {
    try {
        const courses = await Course.find({ 'modules.videos.videoId': videoId });
        for (const course of courses) {
            let updated = false;
            course.modules.forEach((m: any) => {
                m.videos.forEach((v: any) => {
                    if (v.videoId === videoId) {
                        v.videoStatus = status;
                        if (status === 'ready') {
                            v.videoProgress = 100;
                            if (finalUrl) v.videoUrl = finalUrl;
                        } else if (progress !== undefined) {
                            v.videoProgress = progress;
                        }
                        updated = true;
                    }
                });
            });
            if (updated) await course.save();
        }
    } catch (err) { logger.error(`Error updating course:`, err); }
}

// --- ROUTES ---

router.get('/video/key/:videoId', async (req: Request, res: Response): Promise<void> => {
    try {
        const videoId = req.params.videoId as string;
        const videoKeyDoc = await VideoKey.findOne({ videoId });
        
        if (!videoKeyDoc || !videoKeyDoc.keyHex) {
            res.status(404).send('Key not found');
            return;
        }

        const keyBuffer = Buffer.from(videoKeyDoc.keyHex, 'hex');
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Access-Control-Allow-Origin', '*'); 
        res.send(keyBuffer);
    } catch (error) {
        logger.error('Error fetching AES key:', error);
        res.status(500).send('Error fetching key');
    }
});

// ✅ CHANGED: uploadRateLimit → presignedUrlLimit (cheap URL signing, not heavy processing)
router.post('/upload/r2-presigned-url', requireAuth, presignedUrlLimit, async (req: Request, res: Response): Promise<void> => {
  const { fileName, fileType, fileSize, isVideo = true } = req.body;
  const validation = validateFileUpload(fileName, fileType, fileSize, isVideo);
  if (!validation.valid) { res.status(400).json({ error: validation.error }); return; }

  const key = `raw-uploads/${Date.now()}-${randomUUID()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  if (R2_ACCOUNT_ID && R2_BUCKET_NAME) {
      const command = new PutObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key, ContentType: fileType });
      try {
        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        res.json({ uploadUrl, publicUrl: `${R2_PUBLIC_URL}/${key}`, key });
      } catch (error) { res.status(500).json({ error: 'Failed to generate URL' }); }
  } else {
      res.json({ uploadUrl: `/api/upload/local-put?key=${encodeURIComponent(key)}`, publicUrl: `/uploads/${key}`, key });
  }
});

// --- ENCRYPTED NOTE / DOCUMENT FILE UPLOAD ---
// Unlike videos, note files (PDF/office docs) are small enough to pass through the server,
// so we never hand out a direct-to-R2 presigned PUT for them. Instead the file is streamed
// to this endpoint, encrypted in memory with AES-256-GCM (fresh key+IV per file), and only
// the ciphertext is written to storage. The key/IV/authTag live exclusively in MongoDB
// (FileKey) and are never exposed to the client or embedded in the storage path.
router.post('/upload/file', requireAuth, uploadRateLimit, noteFileUpload.single('file'), async (req: Request, res: Response): Promise<void> => {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) { res.status(400).json({ error: 'No file provided' }); return; }

    try {
        const fileId = randomUUID();
        const { ciphertext, keyHex, ivHex, authTagHex } = encryptBuffer(file.buffer);

        let storageType: 'r2' | 'local';
        let storageKey: string;

        if (R2_ACCOUNT_ID && R2_BUCKET_NAME) {
            storageType = 'r2';
            storageKey = `secure-files/${fileId}`;
            await s3Client.send(new PutObjectCommand({
                Bucket: R2_BUCKET_NAME,
                Key: storageKey,
                Body: ciphertext,
                ContentType: 'application/octet-stream', // deliberately generic — real type never touches storage metadata
            }));
        } else {
            storageType = 'local';
            storageKey = path.join(SECURE_FILES_DIR, fileId);
            fs.writeFileSync(storageKey, ciphertext);
        }

        await FileKey.create({
            fileId, keyHex, ivHex, authTagHex, storageType, storageKey,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
        });

        // The stored "url" is just an opaque pointer to this proxy — never the raw storage location.
        res.json({ url: `/api/secure-file-raw/${fileId}`, fileId });
    } catch (error) {
        logger.error('Error encrypting/storing note file:', error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});

// --- SERVE + DECRYPT A NOTE FILE ---
// Access control (purchase / free / college-domain checks) happens upstream in
// server/routes/secureFile.ts, which resolves a Note's fileId and then fetches from here
// (or calls this logic directly) only after confirming the requester is entitled to it.
export async function readAndDecryptFile(fileId: string): Promise<{ buffer: Buffer; mimeType?: string; originalName?: string } | null> {
    const record = await FileKey.findOne({ fileId }).lean() as any;
    if (!record) return null;

    let ciphertext: Buffer;
    if (record.storageType === 'r2') {
        const obj = await s3Client.send(new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: record.storageKey }));
        const chunks: Buffer[] = [];
        for await (const chunk of obj.Body as any) chunks.push(Buffer.from(chunk));
        ciphertext = Buffer.concat(chunks);
    } else {
        ciphertext = fs.readFileSync(record.storageKey);
    }

    const buffer = decryptBuffer(ciphertext, record.keyHex, record.ivHex, record.authTagHex);
    return { buffer, mimeType: record.mimeType, originalName: record.originalName };
}

// uploadRateLimit stays here — this triggers heavy FFmpeg processing
router.post('/process-video', requireAuth, uploadRateLimit, async (req: Request, res: Response): Promise<void> => {
    const { videoUrl, videoKey } = req.body as ProcessVideoRequest;
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

export async function processVideoAsync(videoId: string, inputSource: string, tempOutputDir: string, videoKey?: string, onProgress?: (pct: number) => void): Promise<void> {
    try {
        const metadata = await new Promise<ffmpeg.FfprobeData>((resolve, reject) => {
            ffmpeg.ffprobe(inputSource, (err, data) => err ? reject(err) : resolve(data));
        });

        const videoStream = metadata.streams.find(s => s.codec_type === 'video');
        const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
        if (!videoStream) throw new Error("No video stream found.");

        const encryptionKey = crypto.randomBytes(16);
        const keyHex = encryptionKey.toString('hex');
        
        await VideoKey.findOneAndUpdate(
            { videoId },
            { keyHex, status: 'processing', progress: 0 },
            { upsert: true, new: true }
        );

        const absoluteTempDir = path.resolve(tempOutputDir);
        const keyFilePath = path.join(absoluteTempDir, 'video.key');
        const keyInfoPath = path.join(absoluteTempDir, 'key_info.txt');
        
        const keyUri = `${API_BASE_URL}/api/video/key/${videoId}`;
        
        fs.writeFileSync(keyFilePath, encryptionKey);
        
        const relativeKeyPath = path.relative(process.cwd(), keyFilePath).replace(/\\/g, '/');
        fs.writeFileSync(keyInfoPath, `${keyUri}\n${relativeKeyPath}\n`);

        const maxRes = getMaxResolution();
        let selectedResolutions = RESOLUTIONS.filter(r => r.height <= maxRes && r.height <= (videoStream.height || 1080));
        if (selectedResolutions.length === 0) selectedResolutions = [RESOLUTIONS[0]];

        for (let i = 0; i < selectedResolutions.length; i++) {
            const resConfig = selectedResolutions[i];
            const pct = Math.round((i / selectedResolutions.length) * 90);
            
            await VideoKey.findOneAndUpdate({ videoId }, { status: 'processing', progress: pct });
            videoJobStore.set(videoId, { videoId, status: 'processing', progress: pct, createdAt: new Date(), tempDir: tempOutputDir });
            onProgress?.(pct);
            
            await updateCourseVideoStatus(videoId, 'processing', undefined, pct);

            await new Promise<void>((resolve, reject) => {
                const command = ffmpeg(inputSource);
                if (inputSource.startsWith('http')) {
                    command.inputOptions(['-reconnect', '1', '-reconnect_streamed', '1', '-reconnect_delay_max', '5']);
                }

                const bitrateNum = parseInt(resConfig.bitrate.replace(/[^0-9]/g, ''), 10);
                const scaleFilter = `scale=-2:${resConfig.height}`;

                const outputOpts: string[] = [
                    '-map', '0:v:0',
                    '-vf', scaleFilter,
                    '-c:v', 'libx264',
                    '-profile:v', 'main',
                    '-level', '4.0',
                    '-pix_fmt', 'yuv420p',
                    '-b:v', resConfig.bitrate,
                    '-maxrate', `${Math.round(bitrateNum * 1.2)}k`,
                    '-bufsize', `${Math.round(bitrateNum * 2)}k`,
                    '-preset', 'fast',
                    '-g', '48',
                    '-keyint_min', '48',
                    '-sc_threshold', '0',
                ];

                if (audioStream) {
                    outputOpts.push('-map', '0:a:0', '-c:a', 'aac', '-ar', '44100', '-b:a', '128k', '-ac', '2');
                } else {
                    outputOpts.push('-an');
                }

                outputOpts.push(
                    '-f', 'hls',
                    '-hls_time', '4',
                    '-hls_playlist_type', 'vod',
                    '-hls_flags', 'independent_segments',
                    '-hls_segment_filename', path.join(absoluteTempDir, `stream_${i}_%03d.ts`),
                    '-hls_key_info_file', keyInfoPath,
                );

                command.outputOptions(outputOpts)
                    .output(path.join(absoluteTempDir, `stream_${i}.m3u8`))
                    .on('end', () => resolve())
                    .on('error', (err, stdout, stderr) => {
                        console.error('\n--- FFMPEG CRASH LOG ---\n');
                        console.error(stderr);
                        console.error('\n------------------------\n');
                        reject(new Error(`FFmpeg Error: ${err.message}\nDetails: ${stderr}`));
                    })
                    .run();
            });
        }

        let masterPlaylist = '#EXTM3U\n#EXT-X-VERSION:3\n';
        selectedResolutions.forEach((resConfig, index) => {
            const bandwidth = parseInt(resConfig.bitrate.replace(/[^0-9]/g, ''), 10) * 1000;
            masterPlaylist += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${resConfig.width}x${resConfig.height}\nstream_${index}.m3u8\n`;
        });
        fs.writeFileSync(path.join(absoluteTempDir, 'playlist.m3u8'), masterPlaylist);

        if (R2_ACCOUNT_ID && R2_BUCKET_NAME) {
            await VideoKey.findOneAndUpdate({ videoId }, { status: 'finalizing', progress: 95 });
            videoJobStore.set(videoId, { videoId, status: 'finalizing', progress: 95, createdAt: new Date(), tempDir: tempOutputDir });
            
            await uploadDirectoryToR2(absoluteTempDir, `videos/${videoId}`);
            try { fs.rmSync(absoluteTempDir, { recursive: true, force: true }); } catch (e) {}
        }

        const definitiveUrl = (R2_ACCOUNT_ID && R2_PUBLIC_URL)
            ? `${R2_PUBLIC_URL}/videos/${videoId}/playlist.m3u8`
            : `/api/video/playlist/${videoId}/playlist.m3u8`;

        await VideoKey.findOneAndUpdate({ videoId }, { status: 'ready', progress: 100, videoUrl: definitiveUrl });
        videoJobStore.set(videoId, { videoId, status: 'ready', progress: 100, createdAt: new Date() });
        
        await updateCourseVideoStatus(videoId, 'ready', definitiveUrl);

    } catch (err: any) {
        const errMsg = err instanceof Error ? err.message : String(err?.message ?? err ?? 'Unknown error');
        logger.error(`[${videoId}] Full Processing Failure: ${errMsg}`);
        
        await VideoKey.findOneAndUpdate({ videoId }, { status: 'error', progress: 0 });
        videoJobStore.set(videoId, { videoId, status: 'error', progress: 0, error: errMsg, createdAt: new Date(), tempDir: tempOutputDir });
        
        await updateCourseVideoStatus(videoId, 'error');
        await cleanupOnError(videoId, tempOutputDir, videoKey);
    }
}

async function uploadDirectoryToR2(localDir: string, r2Prefix: string): Promise<void> {
    const files = fs.readdirSync(localDir);
    
    for (const file of files) {
        if (file === 'video.key' || file === 'key_info.txt') continue;

        const filePath = path.join(localDir, file);
        const fileContent = fs.readFileSync(filePath);
        const key = `${r2Prefix}/${file}`;
        
        let contentType = 'application/octet-stream';
        if (file.endsWith('.m3u8')) contentType = 'application/vnd.apple.mpegurl';
        else if (file.endsWith('.ts')) contentType = 'video/mp2t';

        await s3Client.send(new PutObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key, Body: fileContent, ContentType: contentType }));
    }
}

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
        res.json(safeJob); return;
    }

    res.status(404).json({ error: 'Job not found' });
});

export default router;