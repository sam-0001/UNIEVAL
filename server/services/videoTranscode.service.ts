/**
 * server/services/videoTranscode.service.ts
 * Adaptive Bitrate HLS video transcoding with AES-128 encryption and Cloudflare R2 uploads.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import logger from '../logger.js';
import { Course, VideoKey } from '../models/index.js';
import { s3Client, R2_ACCOUNT_ID, R2_BUCKET_NAME, R2_PUBLIC_URL, deleteFileFromR2 } from './storage.service.js';

if (ffmpegInstaller.path) {
    ffmpeg.setFfmpegPath(ffmpegInstaller.path);
}

export interface Resolution {
    name: string;
    width: number;
    height: number;
    bitrate: string;
}

export interface VideoJobStatus {
    videoId: string;
    status: 'processing' | 'finalizing' | 'ready' | 'error';
    progress: number;
    error?: string;
    createdAt: Date;
    tempDir?: string;
}

export class VideoJobStore {
    private jobs: Map<string, VideoJobStatus> = new Map();
    set(videoId: string, status: VideoJobStatus): void { this.jobs.set(videoId, status); }
    get(videoId: string): VideoJobStatus | undefined { return this.jobs.get(videoId); }
    delete(videoId: string): void { this.jobs.delete(videoId); }
}

export const videoJobStore = new VideoJobStore();

export const RESOLUTIONS: Resolution[] = [
    { name: '360p', width: 640, height: 360, bitrate: '800k' },
    { name: '480p', width: 854, height: 480, bitrate: '1400k' },
    { name: '720p', width: 1280, height: 720, bitrate: '2800k' },
    { name: '1080p', width: 1920, height: 1080, bitrate: '5000k' },
];

export const getMaxResolution = (): number => {
    const envRes = (process.env.MAX_VIDEO_RESOLUTION || '720p').toLowerCase();
    if (envRes.includes('1080')) return 1080;
    if (envRes.includes('720')) return 720;
    if (envRes.includes('480')) return 480;
    if (envRes.includes('360')) return 360;
    return 720;
};

export async function cleanupOnError(videoId: string, tempDir?: string, videoKey?: string): Promise<void> {
    if (tempDir && fs.existsSync(tempDir)) {
        try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
    }
    if (videoKey) {
        await deleteFileFromR2(videoKey);
    }
}

export async function updateCourseVideoStatus(videoId: string, status: string, finalUrl?: string, progress?: number): Promise<void> {
    try {
        const updateFields: any = { 'modules.$[].videos.$[v].status': status };
        if (finalUrl) updateFields['modules.$[].videos.$[v].videoUrl'] = finalUrl;
        if (progress !== undefined) updateFields['modules.$[].videos.$[v].progress'] = progress;

        await Course.updateOne(
            { 'modules.videos.videoId': videoId },
            { $set: updateFields },
            { arrayFilters: [{ 'v.videoId': videoId }] }
        );
    } catch (err) {
        logger.error(`[${videoId}] Failed to update Course video status:`, err);
    }
}

export async function uploadDirectoryToR2(localDir: string, r2Prefix: string): Promise<void> {
    if (!R2_BUCKET_NAME) return;
    const files = fs.readdirSync(localDir);

    for (const file of files) {
        if (file === 'video.key' || file === 'key_info.txt') continue;

        const filePath = path.join(localDir, file);
        const fileContent = fs.readFileSync(filePath);
        const key = `${r2Prefix}/${file}`;

        let contentType = 'application/octet-stream';
        if (file.endsWith('.m3u8')) contentType = 'application/vnd.apple.mpegurl';
        else if (file.endsWith('.ts')) contentType = 'video/mp2t';

        await s3Client.send(new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
            Body: fileContent,
            ContentType: contentType
        }));
    }
}

export async function processVideoAsync(
    videoId: string,
    inputSource: string,
    tempOutputDir: string,
    videoKey?: string,
    onProgress?: (pct: number) => void
): Promise<void> {
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

        const actualApiBase = process.env.API_BASE_URL
            ? process.env.API_BASE_URL
            : (process.env.NODE_ENV === 'production' ? 'https://unieval.in' : 'http://localhost:3000');

        const keyUri = `${actualApiBase}/api/video/key/${videoId}`;

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
                    '-hls_key_info_file', keyInfoPath,
                );

                command.outputOptions(outputOpts)
                    .output(path.join(absoluteTempDir, `stream_${i}.m3u8`))
                    .on('end', () => resolve())
                    .on('error', (err, stdout, stderr) => {
                        logger.error(`FFmpeg error for ${videoId}:`, { err: err.message, stderr });
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
