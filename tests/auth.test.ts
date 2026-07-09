/**
 * tests/auth.test.ts
 * Unit tests for auth business logic — no DB or network needed.
 * Run: npm test
 */
import { describe, it, expect } from 'vitest';
import { validatePassword, sanitizeUser } from '../server/controllers/auth.controller.js';

describe('validatePassword', () => {
    it('rejects password shorter than 8 chars', () => {
        expect(validatePassword('Ab1').valid).toBe(false);
    });

    it('rejects password with no uppercase', () => {
        expect(validatePassword('abcdef1!').valid).toBe(false);
        expect(validatePassword('abcdef1!').error).toMatch(/uppercase/i);
    });

    it('rejects password with no lowercase', () => {
        expect(validatePassword('ABCDEF1!').valid).toBe(false);
        expect(validatePassword('ABCDEF1!').error).toMatch(/lowercase/i);
    });

    it('rejects password with no number', () => {
        expect(validatePassword('Abcdefgh').valid).toBe(false);
        expect(validatePassword('Abcdefgh').error).toMatch(/number/i);
    });

    it('accepts valid password', () => {
        expect(validatePassword('Secure123').valid).toBe(true);
        expect(validatePassword('MyP@ssw0rd').valid).toBe(true);
    });
});

describe('sanitizeUser', () => {
    it('strips password from user object', () => {
        const user = {
            toObject: () => ({
                id: 'u1', name: 'Test', email: 'test@test.com',
                password: 'hashed_pw', __v: 0, _id: 'mongoId',
                role: 'student',
            })
        };
        const result = sanitizeUser(user);
        expect(result.password).toBeUndefined();
        expect(result.__v).toBeUndefined();
        expect(result._id).toBeUndefined();
        expect(result.name).toBe('Test');
        expect(result.email).toBe('test@test.com');
    });

    it('works with plain objects too', () => {
        const user = { id: 'u1', password: 'secret', name: 'Test' };
        const result = sanitizeUser(user);
        expect(result.password).toBeUndefined();
        expect(result.name).toBe('Test');
    });
});
