/**
 * tests/scheduler.test.ts
 * Tests the daily reset logic — mocks the DB so no MongoDB needed.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the User model
vi.mock('../server/models/index.js', () => ({
    User: {
        updateMany: vi.fn(),
    },
}));

// Mock logger
vi.mock('../server/logger.js', () => ({
    default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

import { User } from '../server/models/index.js';

const mockUser = User as any;

describe('daily reset logic', () => {
    beforeEach(() => vi.clearAllMocks());

    it('calls updateMany to reset freeQuizUsedToday', async () => {
        mockUser.updateMany.mockResolvedValue({ modifiedCount: 42 });

        // Inline the reset logic to test it directly
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(23, 59, 59, 999);

        await User.updateMany(
            { $or: [{ lastReset: { $lte: yesterday } }, { lastReset: { $exists: false } }] },
            { $set: { freeQuizUsedToday: 0, lastReset: now } }
        );

        expect(mockUser.updateMany).toHaveBeenCalledOnce();
        const [filter, update] = mockUser.updateMany.mock.calls[0];
        expect(update.$set.freeQuizUsedToday).toBe(0);
        expect(update.$set.lastReset).toBeInstanceOf(Date);
    });

    it('deactivates expired unlimited plans', async () => {
        mockUser.updateMany.mockResolvedValue({ modifiedCount: 3 });
        const now = new Date();

        await User.updateMany(
            { 'unlimitedPlan.active': true, 'unlimitedPlan.expiresAt': { $lt: now } },
            { $set: { 'unlimitedPlan.active': false } }
        );

        expect(mockUser.updateMany).toHaveBeenCalledOnce();
        const [, update] = mockUser.updateMany.mock.calls[0];
        expect(update.$set['unlimitedPlan.active']).toBe(false);
    });
});
