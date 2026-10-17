/**
 * server/services/scheduler.service.ts
 * Lightweight scheduler — no external dependency needed.
 * Runs daily tasks: free quiz reset, expired unlimited plan cleanup.
 *
 * Called once from server.ts at startup.
 */
import { User, Purchase } from '../models/index.js';
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

        // Revoke access for purchases older than 6 months
        const sixMonthsAgo = new Date(now);
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const expiredPurchases = await Purchase.find({ createdAt: { $lt: sixMonthsAgo } }).lean();
        
        let expiredNotesCount = 0;
        let expiredCoursesCount = 0;

        for (const p of expiredPurchases) {
            if (p.productType === 'course') {
                const res = await User.updateOne({ id: p.userId }, { $pull: { purchasedCourseIds: p.productId } });
                if (res.modifiedCount > 0) expiredCoursesCount++;
            } else if (p.productType === 'note') {
                const res = await User.updateOne({ id: p.userId }, { $pull: { purchasedNoteIds: p.productId } });
                if (res.modifiedCount > 0) expiredNotesCount++;
            }
        }

        logger.info('[Scheduler] Daily reset complete', {
            quizResetsCount: result.modifiedCount,
            expiredPlansDeactivated: expiredResult.modifiedCount,
            expiredPurchasesRevoked: expiredNotesCount + expiredCoursesCount
        });
    } catch (err: any) {
        logger.error('[Scheduler] Daily reset failed', { error: err.message });
    }
}

async function syncActiveLiveClasses(): Promise<void> {
    try {
        const { LiveClass } = await import('../models.js');
        const { syncLiveClassStatus } = await import('../controllers/liveClassController.js');
        const activeClasses = await LiveClass.find({ status: 'live' });
        if (activeClasses.length > 0) {
            for (const lc of activeClasses) {
                await syncLiveClassStatus(lc);
            }
        }

        // Also check recently completed classes lacking cached recording to auto-cache once ready
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const pendingRecordings = await LiveClass.find({
            status: 'completed',
            dailyRoomName: { $exists: true, $ne: '' },
            $or: [
                { recordingUrl: null },
                { recordingUrl: '' }
            ],
            updatedAt: { $gte: oneDayAgo }
        }).limit(5);

        if (pendingRecordings.length > 0) {
            const { getWebinarRecording } = await import('./webinargg.js');
            for (const plc of pendingRecordings) {
                if (plc.dailyRoomName.startsWith('webinar-')) continue;
                try {
                    const rec = await getWebinarRecording(plc.dailyRoomName);
                    if (rec.status === 'ready' && rec.playbackUrl) {
                        plc.recordingUrl = rec.playbackUrl;
                        await plc.save();
                        logger.info(`[Scheduler] Automatically cached ready recording for LiveClass ${plc.id}`);
                    }
                } catch {
                    // silent catch
                }
            }
        }
    } catch (err: any) {
        // silent catch
    }
}

export function startScheduler(): void {
    // Run immediately on startup to catch any missed resets (e.g. server was down at midnight)
    runDailyReset();

    // Periodically sync any live classes status with Webinar.gg every 15 seconds
    syncActiveLiveClasses();
    setInterval(syncActiveLiveClasses, 15000);

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
