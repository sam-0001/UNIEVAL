import logger from '../logger.js';

/**
 * ai.service.ts — Groq-first AI helper with Gemini fallback.
 * Usage: import { callAI } from './ai.service';
 */

const GROQ_API_URL   = 'https://api.groq.com/openai/v1/chat/completions';

export class AIError extends Error {
    constructor(message: string, public provider: 'groq' | 'gemini' | 'openrouter' | 'none') {
        super(message);
        this.name = 'AIError';
    }
}

async function callGroq(prompt: string, apiKey: string, models = ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'llama3-8b-8192']): Promise<string> {
    let lastError = 'Unknown error';
    for (const model of models) {
        try {
            const res = await fetch(GROQ_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                signal: AbortSignal.timeout(45000),
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.8, max_tokens: 2048,
                }),
            });

            if (!res.ok) {
                const body = await res.json().catch(() => ({})) as any;
                if (res.status === 404 || (res.status === 400 && body?.error?.message?.toLowerCase().includes('decommissioned'))) {
                    lastError = `Groq HTTP ${res.status}: model ${model} not found/decommissioned`;
                    logger.warn(`[AI] Groq model ${model} not found/decommissioned, trying next...`);
                    continue; // Try next model
                }
                throw new AIError(`Groq HTTP ${res.status} (${model}): ${body?.error?.message || 'unknown error'}`, 'groq');
            }

            const data = await res.json() as any;
            const text = data.choices?.[0]?.message?.content?.trim() ?? '';
            logger.info('[AI] Groq returned text length: ' + text.length + ' chars');
            if(text.length > 0 && text.length < 100) logger.info('[AI] Groq short response: ' + text);
            if (!text) throw new AIError('Groq returned empty content', 'groq');
            return text;
        } catch (e: any) {
            lastError = e.message;
            if (e.name === 'AbortError' || e.message.includes('timeout')) throw e; // Don't retry on timeout
            if (models.indexOf(model) === models.length - 1) throw e; // Rethrow if last model
            logger.warn(`[AI] Groq model ${model} failed (${e.message}), trying next...`);
        }
    }
    throw new AIError(`All Groq models failed. Last error: ${lastError}`, 'groq');
}

async function callGemini(prompt: string, apiKey: string, models = ['gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-3.5-flash', 'gemini-3.8-flash']): Promise<string> {
    let lastError = 'Unknown error';
    for (const model of models) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(45000),
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.8, maxOutputTokens: 2048, responseMimeType: "application/json" }
                })
            });

            if (!res.ok) {
                const body = await res.json().catch(() => ({})) as any;
                if (res.status === 404) {
                    lastError = `Gemini HTTP 404: model ${model} not found`;
                    logger.warn(`[AI] Gemini model ${model} not found, trying next...`);
                    continue; // Try next model
                }
                throw new AIError(`Gemini HTTP ${res.status} (${model}): ${body?.error?.message || 'unknown error'}`, 'gemini');
            }

            const data = await res.json() as any;
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
            if (!text) throw new AIError('Gemini returned empty content', 'gemini');
            return text;
        } catch (e: any) {
            lastError = e.message;
            if (e.name === 'AbortError' || e.message.includes('timeout')) throw e; // Don't retry on timeout
            if (models.indexOf(model) === models.length - 1) throw e; // Rethrow if last model
            logger.warn(`[AI] Gemini model ${model} failed (${e.message}), trying next...`);
        }
    }
    throw new AIError(`All Gemini models failed. Last error: ${lastError}`, 'gemini');
}

async function callOpenRouter(prompt: string, apiKey: string): Promise<string> {
    // OpenRouter has completely free, non-geoblocked routing for these models
    const models = ['openrouter/free', 'google/gemma-4-31b-it:free', 'nvidia/nemotron-3-super-120b-a12b:free'];
    let lastError = 'Unknown error';
    for (const model of models) {
        try {
            const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': 'https://unieval.in',
                    'X-Title': 'UniEval'
                },
                signal: AbortSignal.timeout(45000),
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.8, max_tokens: 2048,
                }),
            });

            if (!res.ok) {
                const body = await res.json().catch(() => ({})) as any;
                if (res.status === 404) {
                    lastError = `OpenRouter HTTP 404: model ${model} not found`;
                    logger.warn(`[AI] OpenRouter model ${model} not found, trying next...`);
                    continue;
                }
                throw new AIError(`OpenRouter HTTP ${res.status} (${model}): ${body?.error?.message || 'unknown error'}`, 'none');
            }

            const data = await res.json() as any;
            const text = data.choices?.[0]?.message?.content?.trim() ?? '';
            if (!text) throw new AIError('OpenRouter returned empty content', 'none');
            return text;
        } catch (e: any) {
            lastError = e.message;
            if (e.name === 'AbortError' || e.message.includes('timeout')) throw e;
            if (models.indexOf(model) === models.length - 1) throw e;
            logger.warn(`[AI] OpenRouter model ${model} failed (${e.message}), trying next...`);
        }
    }
    throw new AIError(`All OpenRouter free models failed. Last error: ${lastError}`, 'none');
}

/** Tries Groq first. Falls back to Gemini, then OpenRouter. Throws if all fail. */
export async function callAI(prompt: string): Promise<{ text: string; provider: 'groq' | 'gemini' | 'openrouter' }> {
    const groqKey   = process.env.GROQ_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    
    let errors: string[] = [];

    if (groqKey) {
        try {
            return { text: await callGroq(prompt, groqKey), provider: 'groq' };
        } catch (err: any) {
            errors.push(`Groq: ${err.message}`);
            logger.warn(`[AI] Groq failed (${err.message}) — falling back...`);
        }
    } else {
        errors.push('Groq: GROQ_API_KEY not set');
    }

    if (geminiKey) {
        try {
            return { text: await callGemini(prompt, geminiKey), provider: 'gemini' };
        } catch (err: any) {
            errors.push(`Gemini: ${err.message}`);
            logger.warn(`[AI] Gemini failed (${err.message}) — falling back...`);
        }
    } else {
        errors.push('Gemini: GEMINI_API_KEY not set');
    }
    
    if (openRouterKey) {
        try {
            return { text: await callOpenRouter(prompt, openRouterKey), provider: 'openrouter' };
        } catch (err: any) {
            errors.push(`OpenRouter: ${err.message}`);
            logger.warn(`[AI] OpenRouter failed (${err.message})`);
        }
    } else {
        errors.push('OpenRouter: OPENROUTER_API_KEY not set');
    }

    throw new AIError(`All AI providers failed. Details: ${errors.join(' | ')}`, 'none');
}


class AIQueue {
    private concurrency = 20;
    private running = 0;
    private queue: Array<() => void> = [];

    async enqueue<T>(task: () => Promise<T>): Promise<T> {
        if (this.running >= this.concurrency) {
            await new Promise<void>(resolve => this.queue.push(resolve));
        }
        this.running++;
        try {
            return await task();
        } finally {
            this.running--;
            if (this.queue.length > 0) {
                const next = this.queue.shift();
                if (next) next();
            }
        }
    }
}
export const globalAIQueue = new AIQueue();
