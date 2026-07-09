/**
 * server/services/scheduler.service.ts
 * Lightweight scheduler — no external dependency needed.
 * Runs daily tasks: free quiz reset, expired unlimited plan cleanup.
 *
 * Called once from server.ts at startup.
 */
import { User } from '../models/index.js';
import logger from '../logger.js';

function msUntilMidnight(): number {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0); // next midnight
    return midnight.getTime() - now.getTime();
}

async function runDailyReset(): Promise<void> {
    try {
        const now = new Date();

        // Reset free quiz counters for all users whose lastReset was yesterday or earlier
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(23, 59, 59, 999);

        const result = await User.updateMany(
            {
                $or: [
                    { lastReset: { $lte: yesterday } },
                    { lastReset: { $exists: false } }
                ]
            },
            {
                $set: { freeQuizUsedToday: 0, lastReset: now }
            }
        );

        // Deactivate expired unlimited plans
        const expiredResult = await User.updateMany(
            {
                'unlimitedPlan.active': true,
                'unlimitedPlan.expiresAt': { $lt: now }
            },
            {
                $set: { 'unlimitedPlan.active': false }
            }
        );

        logger.info('[Scheduler] Daily reset complete', {
            quizResetsCount: result.modifiedCount,
            expiredPlansDeactivated: expiredResult.modifiedCount,
        });
    } catch (err: any) {
        logger.error('[Scheduler] Daily reset failed', { error: err.message });
    }
}

export function startScheduler(): void {
    // Run immediately on startup to catch any missed resets (e.g. server was down at midnight)
    runDailyReset();

    // Then schedule to run every day at midnight
    function scheduleNext() {
        const delay = msUntilMidnight();
        logger.info(`[Scheduler] Next daily reset in ${Math.round(delay / 1000 / 60)} minutes`);
        setTimeout(async () => {
            await runDailyReset();
            scheduleNext(); // reschedule for the next midnight
        }, delay);
    }

    scheduleNext();
}
