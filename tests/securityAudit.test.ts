import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addMonths, calculateItemExpiryDate, isPurchaseExpired } from '../server/services/validity.service.js';

describe('Security & Validity Audit Unit Tests', () => {
    describe('addMonths utility', () => {
        it('should correctly add months within standard dates', () => {
            const start = new Date(2026, 0, 15); // Jan 15, 2026
            const result = addMonths(start, 6);
            expect(result.getFullYear()).toBe(2026);
            expect(result.getMonth()).toBe(6); // July
            expect(result.getDate()).toBe(15);
        });

        it('should clamp month-end rollover without leaking into next month (e.g. Oct 31 -> April 30)', () => {
            const start = new Date(2026, 9, 31); // Oct 31, 2026
            const result = addMonths(start, 6);
            // In standard JS Date, Oct 31 + 6 months rolls over into May 1st!
            // With addMonths, it should clamp strictly to April 30th.
            expect(result.getFullYear()).toBe(2027);
            expect(result.getMonth()).toBe(3); // April (0-indexed: 0=Jan, 1=Feb, 2=Mar, 3=Apr)
            expect(result.getDate()).toBe(30);
        });

        it('should clamp August 31 + 6 months to February 28 (non-leap year)', () => {
            const start = new Date(2026, 7, 31); // Aug 31, 2026
            const result = addMonths(start, 6);
            expect(result.getFullYear()).toBe(2027);
            expect(result.getMonth()).toBe(1); // February
            expect(result.getDate()).toBe(28);
        });
    });

    describe('calculateItemExpiryDate', () => {
        it('should handle exact date validity with end of day time', () => {
            const targetDate = '2026-12-31';
            const expiry = calculateItemExpiryDate({
                validityType: 'date',
                validityDate: targetDate
            });
            expect(expiry.getFullYear()).toBe(2026);
            expect(expiry.getMonth()).toBe(11); // December
            expect(expiry.getDate()).toBe(31);
            expect(expiry.getHours()).toBe(23);
            expect(expiry.getMinutes()).toBe(59);
            expect(expiry.getSeconds()).toBe(59);
        });

        it('should default to 6 months if validityMonths not provided or invalid', () => {
            const now = new Date();
            const expiry = calculateItemExpiryDate(null);
            const expectedMonth = (now.getMonth() + 6) % 12;
            expect(expiry.getMonth()).toBe(expectedMonth);
        });

        it('should cap validityMonths at 60 months (5 years max)', () => {
            const expiry = calculateItemExpiryDate({
                validityType: 'months',
                validityMonths: 1000 // Huge input
            });
            const now = new Date();
            // Should be clamped to 60 months (5 years)
            expect(expiry.getFullYear()).toBe(now.getFullYear() + 5);
        });
    });

    describe('isPurchaseExpired', () => {
        it('should detect unexpired purchase with future expiresAt', () => {
            const future = new Date(Date.now() + 86400000 * 30);
            expect(isPurchaseExpired({ expiresAt: future })).toBe(false);
        });

        it('should detect expired purchase with past expiresAt', () => {
            const past = new Date(Date.now() - 86400000);
            expect(isPurchaseExpired({ expiresAt: past })).toBe(true);
        });

        it('should fallback to 6 months check if expiresAt is null', () => {
            const fiveMonthsAgo = new Date();
            fiveMonthsAgo.setMonth(fiveMonthsAgo.getMonth() - 5);
            expect(isPurchaseExpired({ expiresAt: null, createdAt: fiveMonthsAgo })).toBe(false);

            const sevenMonthsAgo = new Date();
            sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 7);
            expect(isPurchaseExpired({ expiresAt: null, createdAt: sevenMonthsAgo })).toBe(true);
        });
    });

    describe('Year resolution & academic segmentation logic', () => {
        const resolveYear = (subjectId: string, subjectsList: Array<{ id: string; year: number }>) => {
            const found = subjectsList.find(s => s.id === subjectId);
            if (found?.year) return found.year;
            const lower = (subjectId || '').toLowerCase();
            if (lower.startsWith('fe') || lower.includes('fe-') || lower.includes('first')) return 1;
            if (lower.startsWith('se') || lower.includes('se-') || lower.includes('second')) return 2;
            if (lower.startsWith('te') || lower.includes('te-') || lower.includes('third')) return 3;
            if (lower.startsWith('be') || lower.includes('be-') || lower.includes('final')) return 4;
            return 1;
        };

        it('should resolve year from subject document if present', () => {
            const subjects = [
                { id: 'sub-m1', year: 1 },
                { id: 'sub-ds', year: 2 },
                { id: 'sub-cn', year: 3 },
                { id: 'sub-ai', year: 4 },
            ];
            expect(resolveYear('sub-m1', subjects)).toBe(1);
            expect(resolveYear('sub-ds', subjects)).toBe(2);
            expect(resolveYear('sub-cn', subjects)).toBe(3);
            expect(resolveYear('sub-ai', subjects)).toBe(4);
        });

        it('should fallback to subjectId prefixes when subject record is missing', () => {
            expect(resolveYear('fe-maths', [])).toBe(1);
            expect(resolveYear('se-data-structures', [])).toBe(2);
            expect(resolveYear('te-networks', [])).toBe(3);
            expect(resolveYear('be-cloud-computing', [])).toBe(4);
        });
    });
});
