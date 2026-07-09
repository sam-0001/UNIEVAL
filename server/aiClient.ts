/**
 * aiClient.ts — Groq-first AI helper with Gemini fallback
 *
 * Usage:
 *   import { callAI } from '../services/ai.service.js';
 *   const text = await callAI(prompt);   // throws if both providers fail
 */

const GROQ_API_URL   = 'https://api.groq.com/openai/v1/chat/completions';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

export class AIError extends Error {
  constructor(message: string, public provider: 'groq' | 'gemini' | 'none') {
    super(message);
    this.name = 'AIError';
  }
}

async function callGroq(prompt: string, groqKey: string): Promise<string> {
  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 2048,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as any;
    throw new AIError(
      `Groq HTTP ${res.status}: ${body?.error?.message || 'unknown error'}`,
      'groq'
    );
  }

  const data = await res.json() as any;
  const text = data.choices?.[0]?.message?.content?.trim() ?? '';
  if (!text) throw new AIError('Groq returned empty content', 'groq');
  return text;
}

async function callGemini(prompt: string, geminiKey: string): Promise<string> {
  const res = await fetch(`${GEMINI_API_URL}?key=${geminiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.8, maxOutputTokens: 2048 },
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as any;
    throw new AIError(
      `Gemini HTTP ${res.status}: ${body?.error?.message || 'unknown error'}`,
      'gemini'
    );
  }

  const data = await res.json() as any;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
  if (!text) throw new AIError('Gemini returned empty content', 'gemini');
  return text;
}

/**
 * Call Groq first. If Groq fails for any reason, fall back to Gemini.
 * Throws AIError (with provider = 'none') only if BOTH fail.
 */
export async function callAI(prompt: string): Promise<{ text: string; provider: 'groq' | 'gemini' }> {
  const groqKey   = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  // ── Try Groq first ──────────────────────────────────────────────────────────
  if (groqKey) {
    try {
      const text = await callGroq(prompt, groqKey);
      return { text, provider: 'groq' };
    } catch (err: any) {
      console.warn(`[AI] Groq failed (${err.message}) — falling back to Gemini`);
    }
  } else {
    console.warn('[AI] GROQ_API_KEY not set — trying Gemini directly');
  }

  // ── Fall back to Gemini ─────────────────────────────────────────────────────
  if (geminiKey) {
    try {
      const text = await callGemini(prompt, geminiKey);
      return { text, provider: 'gemini' };
    } catch (err: any) {
      throw new AIError(
        `Both AI providers failed. Gemini error: ${err.message}`,
        'none'
      );
    }
  }

  throw new AIError(
    'No AI provider available. Set GROQ_API_KEY and/or GEMINI_API_KEY in .env',
    'none'
  );
}