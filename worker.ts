/**
 * worker.ts — Background job worker. Run separately from the API server.
 *
 * Development:  npx tsx worker.ts
 * Production:   pm2 start ecosystem.config.cjs  (starts both API + worker)
 *
 * This process handles FFmpeg video processing so it never blocks API requests.
 */
import 'dotenv/config';
import connectDB from './server/db.js';
import { connectRedis } from './server/redis.js';
import { startVideoWorker } from './server/services/queue.service.js';
import logger from './server/logger.js';

async function main() {
    logger.info('[Worker] Starting...');
    await connectDB();
    await connectRedis();
    startVideoWorker();
    logger.info('[Worker] Ready — listening for jobs');
}

main().catch((err) => {
    logger.error('[Worker] Fatal startup error:', err);
    process.exit(1);
});
