import { Purchase, User } from '../models/index.js';
import logger from '../logger.js';

/**
 * Safe helper to add months to a Date, clamping to the last valid day of the target month
 * (e.g. Oct 31 + 6 months becomes April 30, not May 1).
 */
export function addMonths(startDate: Date, months: number): Date {
    const d = new Date(startDate);
    const day = d.getDate();
    d.setMonth(d.getMonth() + months);
    if (d.getDate() !== day) {
        d.setDate(0);
    }
    return d;
}

/**
 * Calculates the expiration date for a purchase based on the course/note's validity settings.
 * Defaults to 6 months if not specified or invalid.
 */
export function calculateItemExpiryDate(
    item?: { validityType?: string; validityMonths?: number; validityDate?: Date | string | null } | null
): Date {
    if (item?.validityType === 'date' && item.validityDate) {
        const d = new Date(item.validityDate);
        if (!isNaN(d.getTime())) {
            // Set to end of day in local/UTC
            d.setHours(23, 59, 59, 999);
            return d;
        }
    }

    const months = (typeof item?.validityMonths === 'number' && item.validityMonths > 0)
        ? Math.min(60, item.validityMonths)
        : 6;

    return addMonths(new Date(), months);
}

/**
 * Checks whether a single purchase record has expired.
 */
export function isPurchaseExpired(purchase: { expiresAt?: Date | string | null; createdAt?: Date | string }): boolean {
    const now = new Date();
    if (purchase.expiresAt) {
        return new Date(purchase.expiresAt).getTime() < now.getTime();
    }
    // Default fallback: 6 months from creation
    const createdAt = purchase.createdAt ? new Date(purchase.createdAt) : now;
    const sixMonthsAfter = addMonths(createdAt, 6);
    return sixMonthsAfter.getTime() < now.getTime();
}

/**
 * Prunes expired courses and notes for a specific user and updates MongoDB.
 * Called during auth verification/getMe and before streaming.
 */
export async function syncUserExpiredPurchases(userId: string): Promise<{
    activeCourseIds: string[];
    activeNoteIds: string[];
}> {
    try {
        const [user, purchases] = await Promise.all([
            User.findOne({ id: userId }),
            Purchase.find({ userId }).lean()
        ]);

        if (!user) {
            return { activeCourseIds: [], activeNoteIds: [] };
        }

        const currentCourseIds = Array.isArray(user.purchasedCourseIds) ? user.purchasedCourseIds : [];
        const currentNoteIds = Array.isArray(user.purchasedNoteIds) ? user.purchasedNoteIds : [];

        if (purchases.length === 0) {
            return { activeCourseIds: currentCourseIds, activeNoteIds: currentNoteIds };
        }

        // Group purchases by productId to see if there is any active purchase
        const productPurchases = new Map<string, Array<{ isExpired: boolean; productType: string }>>();
        for (const p of purchases) {
            const list = productPurchases.get(p.productId) || [];
            list.push({ isExpired: isPurchaseExpired(p), productType: p.productType });
            productPurchases.set(p.productId, list);
        }

        const expiredProductIds = new Set<string>();
        for (const [productId, list] of productPurchases.entries()) {
            const hasActive = list.some(item => !item.isExpired);
            if (!hasActive) {
                expiredProductIds.add(productId);
            }
        }

        if (expiredProductIds.size === 0) {
            return { activeCourseIds: currentCourseIds, activeNoteIds: currentNoteIds };
        }

        const filteredCourseIds = currentCourseIds.filter(id => !expiredProductIds.has(id));
        const filteredNoteIds = currentNoteIds.filter(id => !expiredProductIds.has(id));

        const coursesRemoved = currentCourseIds.length - filteredCourseIds.length;
        const notesRemoved = currentNoteIds.length - filteredNoteIds.length;

        if (coursesRemoved > 0 || notesRemoved > 0) {
            user.purchasedCourseIds = filteredCourseIds;
            user.purchasedNoteIds = filteredNoteIds;
            await User.updateOne(
                { id: userId },
                {
                    $set: {
                        purchasedCourseIds: filteredCourseIds,
                        purchasedNoteIds: filteredNoteIds
                    }
                }
            );
            logger.info(`[Validity] Pruned expired purchases for user ${userId}: -${coursesRemoved} courses, -${notesRemoved} notes`);
        }

        return { activeCourseIds: filteredCourseIds, activeNoteIds: filteredNoteIds };
    } catch (err: any) {
        logger.error(`[Validity] Error syncing expired purchases for user ${userId}:`, err);
        return { activeCourseIds: [], activeNoteIds: [] };
    }
}
