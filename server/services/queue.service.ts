/**
 * server/services/queue.service.ts
 * Offloads FFmpeg video processing to a background worker process.
 * API responds instantly; client polls /api/video/status for progress.
 */
import { Queue, Worker, Job } from 'bullmq';
import { queueConnection, isRedisAvailable } from '../redis.js';
import logger from '../logger.js';

export const videoQueue = new Queue('video-processing', {
    connection: queueConnection,
    defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
    },
});

export const aiQueue = new Queue('ai-generation', {
    connection: queueConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { count: 200 },
        removeOnFail: { count: 100 },
    },
});

/** Add a video processing job. Returns jobId to poll status. */
export async function enqueueVideoJob(data: {
    videoId: string;
    videoUrl: string;
    videoKey?: string;
    tempOutputDir: string;
}): Promise<string> {
    const job = await videoQueue.add('process-video', data, { jobId: data.videoId });
    return job.id!;
}

/** Check if queue is usable (Redis must be up) */
export function isQueueAvailable(): boolean {
    return isRedisAvailable();
}

/** Start workers — called only in worker.ts, not in server.ts */
export function startVideoWorker() {
    const worker = new Worker('video-processing', async (job: Job) => {
        const { videoId, videoUrl, videoKey, tempOutputDir } = job.data;

        // Import processing function from upload route to avoid duplication
        const { processVideoAsync } = await import('../routes/upload.js');
        await processVideoAsync(videoId, videoUrl, tempOutputDir, videoKey,
            (progress: number) => {
                // BullMQ job progress is visible via the queue, but our API's
                // videoJobStore lives in a different process. Write progress
                // via BullMQ so it can be polled if needed.
                job.updateProgress(progress);
            }
        );
    }, {
        connection: queueConnection,
        concurrency: 2, // max 2 FFmpeg jobs at once (tune to CPU cores)
    });

    worker.on('completed', (job) => {
        logger.info(`[VideoWorker] Job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
        logger.error(`[VideoWorker] Job ${job?.id} failed:`, err.message);
    });

    return worker;
}