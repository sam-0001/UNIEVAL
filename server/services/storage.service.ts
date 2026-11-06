/**
 * server/services/storage.service.ts
 * Unified Cloudflare R2 / AWS S3 Storage Service.
 * Manages authenticated S3 clients, key extraction, direct buffer retrieval,
 * and single-file / recursive directory deletions.
 */

import {
  S3Client,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  GetObjectCommand
} from "@aws-sdk/client-s3";
import fs from 'fs';
import path from 'path';
import logger from '../logger.js';

export const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID?.trim();
export const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID?.trim();
export const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY?.trim();
export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME?.trim();
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL?.trim();

export const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || "",
    secretAccessKey: R2_SECRET_ACCESS_KEY || ""
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

export function extractR2KeyFromUrl(urlOrKey?: string): string | null {
  if (!urlOrKey || typeof urlOrKey !== 'string') return null;
  const trimmed = urlOrKey.trim();
  if (!trimmed || trimmed === '#') return null;

  if (trimmed.includes('picsum.photos') || trimmed.includes('placeholder')) return null;

  let pathStr = trimmed;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const u = new URL(trimmed);
      pathStr = u.pathname;
    } catch {
      return null;
    }
  }

  pathStr = pathStr.split('?')[0].split('#')[0];
  pathStr = pathStr.replace(/^\/+/, '');

  if (pathStr.startsWith('uploads/')) {
    pathStr = pathStr.substring('uploads/'.length);
  }

  try {
    pathStr = decodeURIComponent(pathStr);
  } catch {}

  return pathStr || null;
}

export async function deleteFileFromR2(keyOrUrl: string): Promise<void> {
  const key = extractR2KeyFromUrl(keyOrUrl);
  if (!key) return;

  const localPath = path.join(process.cwd(), 'uploads', key);
  if (fs.existsSync(localPath)) {
    try { fs.unlinkSync(localPath); } catch {}
  }

  if (!R2_BUCKET_NAME) return;
  try {
    await s3Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
    logger.info(`[R2] Deleted file: ${key}`);
  } catch (err) {
    logger.error(`[R2] Failed to delete ${key}:`, err);
  }
}

export async function deleteDirectoryFromR2(prefix: string): Promise<void> {
  if (!prefix) return;
  const cleanPrefix = prefix.replace(/^\/+/, '').replace(/\/+$/, '') + '/';

  const localDir = path.join(process.cwd(), 'uploads', cleanPrefix);
  if (fs.existsSync(localDir)) {
    try { fs.rmSync(localDir, { recursive: true, force: true }); } catch {}
  }

  const tempDir = path.join(process.cwd(), 'temp', 'hls', cleanPrefix.replace(/^videos\//, '').replace(/\/$/, ''));
  if (fs.existsSync(tempDir)) {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
  }

  if (!R2_BUCKET_NAME) return;
  try {
    let continuationToken: string | undefined = undefined;
    let totalDeleted = 0;
    do {
      const listCommand = new ListObjectsV2Command({
        Bucket: R2_BUCKET_NAME,
        Prefix: cleanPrefix,
        ContinuationToken: continuationToken,
      });
      const listResult: any = await s3Client.send(listCommand);
      const objects: any[] = listResult.Contents || [];
      if (objects.length > 0) {
        await s3Client.send(new DeleteObjectsCommand({
          Bucket: R2_BUCKET_NAME,
          Delete: {
            Objects: objects.map((o: any) => ({ Key: o.Key! })),
            Quiet: true,
          },
        }));
        totalDeleted += objects.length;
      }
      continuationToken = listResult.IsTruncated ? listResult.NextContinuationToken : undefined;
    } while (continuationToken);

    if (totalDeleted > 0) {
      logger.info(`[R2] Deleted ${totalDeleted} files under directory prefix: ${cleanPrefix}`);
    }
  } catch (err) {
    logger.error(`[R2] Failed to delete directory prefix ${cleanPrefix}:`, err);
  }
}

// In-flight fetch map to prevent duplicate requests
const inFlightRawFetches = new Map<string, Promise<{ buffer: Buffer; contentType?: string } | null>>();

export async function getFileBufferFromR2OrUrl(
  fileUrl: string,
  cacheStore?: Map<string, any>,
  maxCacheSize: number = 150,
  ttlMs: number = 30 * 60 * 1000
): Promise<{ buffer: Buffer; contentType?: string } | null> {
  if (!fileUrl || fileUrl === '#') return null;

  if (cacheStore && cacheStore.has(fileUrl)) {
    const entry = cacheStore.get(fileUrl);
    if (Date.now() - entry.cachedAt < ttlMs) {
      return { buffer: entry.buffer, contentType: entry.mimeType };
    }
  }

  if (inFlightRawFetches.has(fileUrl)) {
    return inFlightRawFetches.get(fileUrl)!;
  }

  const fetchTask = (async () => {
    try {
      const r2Key = extractR2KeyFromUrl(fileUrl);
      if (r2Key && R2_ACCOUNT_ID && R2_BUCKET_NAME) {
        try {
          const obj = await s3Client.send(new GetObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: r2Key
          }));
          const bytes = await (obj.Body as any).transformToByteArray();
          const buffer = Buffer.from(bytes);
          const contentType = obj.ContentType;

          if (cacheStore) {
            if (cacheStore.size >= maxCacheSize) {
              const oldestKey = cacheStore.keys().next().value;
              if (oldestKey) cacheStore.delete(oldestKey);
            }
            cacheStore.set(fileUrl, { buffer, mimeType: contentType, cachedAt: Date.now() });
          }

          return { buffer, contentType };
        } catch (s3Err: any) {
          logger.warn(`[Storage] Direct R2 fetch failed for key "${r2Key}", attempting upstream HTTP fallback:`, s3Err?.message || s3Err);
        }
      }

      if (r2Key) {
        const localPath = path.join(process.cwd(), 'uploads', r2Key);
        if (fs.existsSync(localPath)) {
          try {
            const buffer = fs.readFileSync(localPath);
            return { buffer };
          } catch {}
        }
      }

      if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
        try {
          const upstream = await fetch(fileUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 UniEval/1.0',
              'Accept': '*/*'
            }
          });
          if (upstream.ok) {
            const buffer = Buffer.from(await upstream.arrayBuffer());
            const contentType = upstream.headers.get('content-type') || undefined;

            if (cacheStore) {
              if (cacheStore.size >= maxCacheSize) {
                const oldestKey = cacheStore.keys().next().value;
                if (oldestKey) cacheStore.delete(oldestKey);
              }
              cacheStore.set(fileUrl, { buffer, mimeType: contentType, cachedAt: Date.now() });
            }

            return { buffer, contentType };
          }
        } catch (fetchErr: any) {
          logger.error(`[Storage] Upstream fetch error for ${fileUrl}:`, fetchErr?.message || fetchErr);
        }
      }

      return null;
    } finally {
      inFlightRawFetches.delete(fileUrl);
    }
  })();

  inFlightRawFetches.set(fileUrl, fetchTask);
  return fetchTask;
}
