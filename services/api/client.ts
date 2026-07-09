/**
 * services/api/client.ts
 * Core fetch helper shared by all API service modules.
 */

export const API_BASE = '/api';

export function authHeaders(): Record<string, string> {
    try {
        const token = localStorage.getItem('token');
        if (token) return { 'Authorization': `Bearer ${token}` };
    } catch {}
    return {};
}

export async function fetchJson<T>(url: string, options?: RequestInit, timeoutMs = 15000): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(`${API_BASE}${url}`, { ...options, signal: controller.signal });
        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(err.error || `Request failed with status ${response.status}`);
        }
        return response.json();
    } catch (err: any) {
        if (err.name === 'AbortError') throw new Error('Request timed out. Please try again.');
        throw err;
    } finally {
        clearTimeout(timer);
    }
}

/** Unwraps paginated response `{ data: T[] }` OR plain `T[]` */
export function unwrapList<T>(res: { data: T[] } | T[]): T[] {
    return Array.isArray(res) ? res : (res as { data: T[] }).data ?? [];
}
