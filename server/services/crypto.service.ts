/**
 * server/services/crypto.service.ts
 * AES-256-GCM buffer encryption and decryption at rest with LRU memory caching.
 */

import crypto, { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { FileKey } from '../models/index.js';
import { s3Client, R2_BUCKET_NAME, R2_ACCOUNT_ID, getFileBufferFromR2OrUrl as storageGetBuffer } from './storage.service.js';

const SECURE_FILES_DIR = path.join(process.cwd(), 'uploads', 'secure-files');
if (!fs.existsSync(SECURE_FILES_DIR)) {
    fs.mkdirSync(SECURE_FILES_DIR, { recursive: true });
}

export async function encryptAndStoreFile(
    buffer: Buffer,
    meta: { originalName?: string; mimeType?: string; bundleId?: string; relativePath?: string; isEntry?: boolean },
): Promise<string> {
    const fileId = randomUUID();
    const { ciphertext, keyHex, ivHex, authTagHex } = encryptBuffer(buffer);

    let storageType: 'r2' | 'local';
    let storageKey: string;

    if (R2_ACCOUNT_ID && R2_BUCKET_NAME) {
        storageType = 'r2';
        storageKey = `secure-files/${fileId}`;
        await s3Client.send(new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: storageKey,
            Body: ciphertext,
            ContentType: 'application/octet-stream',
        }));
    } else {
        storageType = 'local';
        storageKey = path.join(SECURE_FILES_DIR, fileId);
        fs.writeFileSync(storageKey, ciphertext);
    }

    await FileKey.create({
        fileId, keyHex, ivHex, authTagHex, storageType, storageKey,
        originalName: meta.originalName,
        mimeType: meta.mimeType,
        size: buffer.length,
        bundleId: meta.bundleId,
        relativePath: meta.relativePath,
        isEntry: meta.isEntry || false,
    });

    return fileId;
}

export function encryptBuffer(plain: Buffer): { ciphertext: Buffer; keyHex: string; ivHex: string; authTagHex: string } {
    const key = crypto.randomBytes(32); // AES-256
    const iv = crypto.randomBytes(12);  // 12-byte IV for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return {
        ciphertext,
        keyHex: key.toString('hex'),
        ivHex: iv.toString('hex'),
        authTagHex: authTag.toString('hex')
    };
}

export function decryptBuffer(ciphertext: Buffer, keyHex: string, ivHex: string, authTagHex: string): Buffer {
    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(keyHex, 'hex'), Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export async function decryptRecord(record: any): Promise<Buffer> {
    let ciphertext: Buffer;
    if (record.storageType === 'r2') {
        const obj = await s3Client.send(new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: record.storageKey }));
        const chunks: Buffer[] = [];
        for await (const chunk of obj.Body as any) chunks.push(Buffer.from(chunk));
        ciphertext = Buffer.concat(chunks);
    } else {
        ciphertext = fs.readFileSync(record.storageKey);
    }
    return decryptBuffer(ciphertext, record.keyHex, record.ivHex, record.authTagHex);
}

export interface DecryptedCacheEntry {
    buffer: Buffer;
    mimeType?: string;
    originalName?: string;
    bundleId?: string;
    isEntry?: boolean;
    cachedAt: number;
}

export const decryptedCache = new Map<string, DecryptedCacheEntry>();
export const MAX_DECRYPTED_CACHE_SIZE = parseInt(process.env.MAX_NOTE_CACHE_SIZE || '150', 10);
export const DECRYPTED_CACHE_TTL_MS = 30 * 60 * 1000; // 30 mins
const inFlightDecrypts = new Map<string, Promise<{ buffer: Buffer; mimeType?: string; originalName?: string; bundleId?: string; isEntry?: boolean } | null>>();

export function invalidateDecryptedCache(fileId?: string) {
    if (fileId) {
        decryptedCache.delete(fileId);
    } else {
        decryptedCache.clear();
    }
}

export async function readAndDecryptFile(fileId: string): Promise<{ buffer: Buffer; mimeType?: string; originalName?: string; bundleId?: string; isEntry?: boolean } | null> {
    const cached = decryptedCache.get(fileId);
    if (cached && (Date.now() - cached.cachedAt < DECRYPTED_CACHE_TTL_MS)) {
        return {
            buffer: cached.buffer,
            mimeType: cached.mimeType,
            originalName: cached.originalName,
            bundleId: cached.bundleId,
            isEntry: cached.isEntry
        };
    }

    if (inFlightDecrypts.has(fileId)) {
        return inFlightDecrypts.get(fileId)!;
    }

    const decryptTask = (async () => {
        try {
            const record = await FileKey.findOne({ fileId }).lean() as any;
            if (!record) return null;
            const buffer = await decryptRecord(record);
            const result = { buffer, mimeType: record.mimeType, originalName: record.originalName, bundleId: record.bundleId, isEntry: record.isEntry };

            if (decryptedCache.size >= MAX_DECRYPTED_CACHE_SIZE) {
                const oldestKey = decryptedCache.keys().next().value;
                if (oldestKey) decryptedCache.delete(oldestKey);
            }
            decryptedCache.set(fileId, { ...result, cachedAt: Date.now() });

            return result;
        } finally {
            inFlightDecrypts.delete(fileId);
        }
    })();

    inFlightDecrypts.set(fileId, decryptTask);
    return decryptTask;
}

export async function getFileBufferFromR2OrUrl(fileUrl: string): Promise<{ buffer: Buffer; contentType?: string } | null> {
    return await storageGetBuffer(fileUrl, decryptedCache, MAX_DECRYPTED_CACHE_SIZE, DECRYPTED_CACHE_TTL_MS);
}

export async function getBundleIdForFile(fileId: string): Promise<string | undefined> {
    const record = await FileKey.findOne({ fileId }).select('bundleId').lean() as any;
    return record?.bundleId;
}

export async function readAndDecryptBundleAsset(bundleId: string, relativePath: string): Promise<{ buffer: Buffer; mimeType?: string } | null> {
    const record = await FileKey.findOne({ bundleId, relativePath, isEntry: { $ne: true } }).lean() as any;
    if (!record) return null;
    const buffer = await decryptRecord(record);
    return { buffer, mimeType: record.mimeType };
}
