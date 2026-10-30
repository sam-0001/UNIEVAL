/**
 * pdfCache.ts — Multi-Tier High Performance Browser Cache for Note PDFs
 * ──────────────────────────────────────────────────────────────────────────
 * Solves the accidental page-reload / re-fetching delay for students.
 * When a student reloads or revisits a note, the PDF loads in <50ms from
 * the browser cache without re-downloading multi-megabyte streams over the internet.
 *
 * Tier 1: In-Memory LRU RAM Cache (0.01ms instant switching between units)
 * Tier 2: Cache API with IndexedDB fallback (persistent across page reloads & offline)
 */

const CACHE_NAME = 'unieval-pdf-cache-v1';
const MAX_RAM_ENTRIES = 10;
const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface RamEntry {
  buffer: ArrayBuffer;
  cachedAt: number;
}

const ramCache = new Map<string, RamEntry>();

export function normalizeCacheKey(url: string, userId?: string): string {
  // Strip auth query params (?t=...) so JWT rotation doesn't invalidate valid cached notes
  const cleanUrl = url.split('?')[0].split('#')[0];
  const userPrefix = userId ? `u_${userId}` : 'demo';
  return `${userPrefix}:${cleanUrl}`;
}

// ── Cache API Helpers ────────────────────────────────────────────────────────
async function getFromCacheApi(key: string): Promise<ArrayBuffer | null> {
  if (typeof window === 'undefined' || !('caches' in window)) return null;
  try {
    const cache = await caches.open(CACHE_NAME);
    const reqUrl = new URL(`/pdf-cache/${encodeURIComponent(key)}`, window.location.origin).toString();
    const match = await cache.match(reqUrl);
    if (!match) return null;

    const cachedAtHeader = match.headers.get('x-cached-at');
    if (cachedAtHeader) {
      const cachedAt = parseInt(cachedAtHeader, 10);
      if (Date.now() - cachedAt > MAX_CACHE_AGE_MS) {
        await cache.delete(reqUrl);
        return null;
      }
    }

    return await match.arrayBuffer();
  } catch (err) {
    console.warn('[PdfCache] Cache API read error, skipping:', err);
    return null;
  }
}

async function putToCacheApi(key: string, buffer: ArrayBuffer): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) return;
  try {
    const cache = await caches.open(CACHE_NAME);
    const reqUrl = new URL(`/pdf-cache/${encodeURIComponent(key)}`, window.location.origin).toString();
    const response = new Response(buffer.slice(0), {
      headers: {
        'Content-Type': 'application/pdf',
        'x-cached-at': Date.now().toString(),
      },
    });
    await cache.put(reqUrl, response);
  } catch (err) {
    console.warn('[PdfCache] Cache API write failed:', err);
  }
}

// ── IndexedDB Fallback ───────────────────────────────────────────────────────
const DB_NAME = 'unieval_pdf_cache_db';
const STORE_NAME = 'pdf_blobs';

function openIndexedDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getFromIndexedDb(key: string): Promise<ArrayBuffer | null> {
  try {
    const db = await openIndexedDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => {
        const result = req.result;
        if (!result) return resolve(null);
        if (Date.now() - result.cachedAt > MAX_CACHE_AGE_MS) {
          resolve(null);
        } else {
          resolve(result.buffer);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function putToIndexedDb(key: string, buffer: ArrayBuffer): Promise<void> {
  try {
    const db = await openIndexedDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({ key, buffer: buffer.slice(0), cachedAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // ignore
  }
}

// ── Public Cache Functions ───────────────────────────────────────────────────

/**
 * Retrieves a cached PDF ArrayBuffer.
 * Priority: L1 (RAM) -> L2 (Cache API) -> L2 (IndexedDB).
 * Always returns a cloned slice to avoid detached buffer issues when workers process it.
 */
export async function getCachedPdf(url: string, userId?: string): Promise<ArrayBuffer | null> {
  if (!url) return null;
  const key = normalizeCacheKey(url, userId);

  // 1. Check RAM Cache
  const ramEntry = ramCache.get(key);
  if (ramEntry) {
    if (Date.now() - ramEntry.cachedAt < MAX_CACHE_AGE_MS) {
      // Move to MRU position
      ramCache.delete(key);
      ramCache.set(key, ramEntry);
      return ramEntry.buffer.slice(0);
    } else {
      ramCache.delete(key);
    }
  }

  // 2. Check Cache API
  let buffer = await getFromCacheApi(key);

  // 3. Check IndexedDB fallback
  if (!buffer) {
    buffer = await getFromIndexedDb(key);
  }

  if (buffer) {
    // Populate RAM cache for subsequent instant access
    ramCache.set(key, { buffer: buffer.slice(0), cachedAt: Date.now() });
    return buffer.slice(0);
  }

  return null;
}

/**
 * Stores a PDF ArrayBuffer in both RAM and persistent browser storage.
 */
export async function storeCachedPdf(url: string, buffer: ArrayBuffer, userId?: string): Promise<void> {
  if (!url || !buffer || buffer.byteLength === 0) return;
  const key = normalizeCacheKey(url, userId);

  // Enforce RAM LRU eviction
  if (ramCache.size >= MAX_RAM_ENTRIES) {
    const oldestKey = ramCache.keys().next().value;
    if (oldestKey) ramCache.delete(oldestKey);
  }
  ramCache.set(key, { buffer: buffer.slice(0), cachedAt: Date.now() });

  // Persist to browser storage asynchronously
  try {
    if (typeof window !== 'undefined' && 'caches' in window) {
      await putToCacheApi(key, buffer);
    } else if (typeof window !== 'undefined' && 'indexedDB' in window) {
      await putToIndexedDb(key, buffer);
    }
  } catch (err) {
    console.warn('[PdfCache] Storage write error:', err);
  }
}

/**
 * Clears all cached PDFs from RAM and persistent browser storage.
 * Automatically called when user logs out.
 */
export async function clearPdfCache(): Promise<void> {
  ramCache.clear();
  try {
    if (typeof window !== 'undefined' && 'caches' in window) {
      await caches.delete(CACHE_NAME);
    }
  } catch (e) {
    console.warn('[PdfCache] Error clearing Cache API:', e);
  }
  try {
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      indexedDB.deleteDatabase(DB_NAME);
    }
  } catch (e) {
    console.warn('[PdfCache] Error clearing IndexedDB:', e);
  }
}
