/**
 * tests/ai.service.test.ts
 * Tests the Groq→Gemini fallback logic without real API calls.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock logger
vi.mock('../server/logger.js', () => ({
    default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

import { callAI, AIError } from '../server/services/ai.service.js';

function makeGroqResponse(text: string, ok = true) {
    return {
        ok,
        json: async () => ok
            ? { choices: [{ message: { content: text } }] }
            : { error: { message: 'Groq error' } },
    };
}

function makeGeminiResponse(text: string, ok = true) {
    return {
        ok,
        json: async () => ok
            ? { candidates: [{ content: { parts: [{ text }] } }] }
            : { error: { message: 'Gemini error' } },
    };
}

describe('callAI', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.GROQ_API_KEY   = 'test-groq-key';
        process.env.GEMINI_API_KEY = 'test-gemini-key';
    });

    afterEach(() => {
        process.env = { ...originalEnv };
    });

    it('returns Groq response when Groq succeeds', async () => {
        mockFetch.mockResolvedValueOnce(makeGroqResponse('Hello from Groq'));

        const result = await callAI('test prompt');
        expect(result.provider).toBe('groq');
        expect(result.text).toBe('Hello from Groq');
        expect(mockFetch).toHaveBeenCalledOnce();
    });

    it('falls back to Gemini when Groq fails', async () => {
        mockFetch.mockResolvedValueOnce(makeGroqResponse('', false));   // Groq fails
        mockFetch.mockResolvedValueOnce(makeGeminiResponse('Hello from Gemini')); // Gemini succeeds

        const result = await callAI('test prompt');
        expect(result.provider).toBe('gemini');
        expect(result.text).toBe('Hello from Gemini');
        expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('throws AIError when both providers fail', async () => {
        mockFetch.mockResolvedValueOnce(makeGroqResponse('', false));
        mockFetch.mockResolvedValueOnce(makeGeminiResponse('', false));

        await expect(callAI('test prompt')).rejects.toThrow(AIError);
    });

    it('uses Gemini directly when GROQ_API_KEY is not set', async () => {
        delete process.env.GROQ_API_KEY;
        mockFetch.mockResolvedValueOnce(makeGeminiResponse('Gemini only'));

        const result = await callAI('test prompt');
        expect(result.provider).toBe('gemini');
        expect(mockFetch).toHaveBeenCalledOnce();
    });

    it('throws when no API keys are configured', async () => {
        delete process.env.GROQ_API_KEY;
        delete process.env.GEMINI_API_KEY;

        await expect(callAI('test')).rejects.toThrow(/No AI provider/i);
        expect(mockFetch).not.toHaveBeenCalled();
    });
});
