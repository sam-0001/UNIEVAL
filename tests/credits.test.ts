/**
 * tests/credits.test.ts
 * Unit tests for credit plan logic and validation — no DB needed.
 * Run: npm test
 */
import { describe, it, expect } from 'vitest';
import { CREDIT_PLANS } from '../server/controllers/user.controller.js';

describe('CREDIT_PLANS', () => {
    it('has expected plan keys', () => {
        expect(Object.keys(CREDIT_PLANS)).toContain('15');
        expect(Object.keys(CREDIT_PLANS)).toContain('25');
        expect(Object.keys(CREDIT_PLANS)).toContain('75');
        expect(Object.keys(CREDIT_PLANS)).toContain('unlimited_24h');
    });

    it('each paid plan has a positive price', () => {
        for (const [key, plan] of Object.entries(CREDIT_PLANS)) {
            expect(plan.price).toBeGreaterThan(0);
        }
    });

    it('credit plans have correct credit counts', () => {
        expect(CREDIT_PLANS['15'].credits).toBe(15);
        expect(CREDIT_PLANS['25'].credits).toBe(25);
        expect(CREDIT_PLANS['75'].credits).toBe(75);
    });

    it('unlimited plan has hours and no credits', () => {
        const plan = CREDIT_PLANS['unlimited_24h'];
        expect(plan.unlimited).toBe(true);
        expect(plan.hours).toBe(24);
        expect(plan.credits).toBeUndefined();
    });

    it('no plan has negative price', () => {
        for (const plan of Object.values(CREDIT_PLANS)) {
            expect(plan.price).toBeGreaterThanOrEqual(0);
        }
    });
});

describe('credit plan price sanity', () => {
    it('larger credit bundles are cheaper per credit', () => {
        const plan15 = CREDIT_PLANS['15'].price / 15;
        const plan25 = CREDIT_PLANS['25'].price / 25;
        const plan75 = CREDIT_PLANS['75'].price / 75;
        expect(plan25).toBeLessThan(plan15);
        expect(plan75).toBeLessThan(plan25);
    });
});
