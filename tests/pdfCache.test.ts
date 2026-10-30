import { describe, it, expect, beforeEach } from 'vitest';
import { getCachedPdf, storeCachedPdf, clearPdfCache, normalizeCacheKey } from '../services/pdfCache';

describe('PDF Browser Cache Service', () => {
  beforeEach(async () => {
    await clearPdfCache();
  });

  it('normalizes cache keys by stripping query params and adding user scoping', () => {
    const key1 = normalizeCacheKey('/api/secure-file/note1/file1?t=jwt_token_123', 'studentA');
    const key2 = normalizeCacheKey('/api/secure-file/note1/file1?t=new_token_456', 'studentA');
    expect(key1).toBe('u_studentA:/api/secure-file/note1/file1');
    expect(key1).toBe(key2); // rotation of JWT must not bust the cache
  });

  it('stores and retrieves PDF buffer instantly from cache', async () => {
    const testData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const url = '/api/secure-file/note123/file456?t=token';

    // Miss initially
    const initial = await getCachedPdf(url, 'user1');
    expect(initial).toBeNull();

    // Store in cache
    await storeCachedPdf(url, testData.buffer, 'user1');

    // Hit from cache
    const cached = await getCachedPdf(url, 'user1');
    expect(cached).not.toBeNull();
    expect(new Uint8Array(cached!)).toEqual(testData);
  });

  it('isolates cache between different users for DRM & security', async () => {
    const dataA = new Uint8Array([10, 20, 30]);
    const dataB = new Uint8Array([99, 88, 77]);
    const url = '/api/secure-file/note1/file1';

    await storeCachedPdf(url, dataA.buffer, 'studentA');
    await storeCachedPdf(url, dataB.buffer, 'studentB');

    const cachedA = await getCachedPdf(url, 'studentA');
    const cachedB = await getCachedPdf(url, 'studentB');

    expect(new Uint8Array(cachedA!)).toEqual(dataA);
    expect(new Uint8Array(cachedB!)).toEqual(dataB);
  });

  it('returns cloned buffer so worker detachment does not corrupt cache', async () => {
    const data = new Uint8Array([42, 43, 44]);
    const url = '/api/secure-file/note/unit1';

    await storeCachedPdf(url, data.buffer, 'user1');

    const firstRetrieval = await getCachedPdf(url, 'user1');
    expect(firstRetrieval).not.toBeNull();

    // Modify the retrieved buffer
    const view = new Uint8Array(firstRetrieval!);
    view[0] = 99;

    // Second retrieval should still have the original value 42
    const secondRetrieval = await getCachedPdf(url, 'user1');
    expect(new Uint8Array(secondRetrieval!)[0]).toBe(42);
  });

  it('clears all cached PDFs when clearPdfCache is called on logout', async () => {
    const data = new Uint8Array([1, 2, 3]);
    const url = '/api/secure-file/note/unit1';

    await storeCachedPdf(url, data.buffer, 'user1');
    expect(await getCachedPdf(url, 'user1')).not.toBeNull();

    await clearPdfCache();
    expect(await getCachedPdf(url, 'user1')).toBeNull();
  });
});
