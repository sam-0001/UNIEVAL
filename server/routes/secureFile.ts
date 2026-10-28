/**
 * Secure File Proxy
 * -----------------
 * Serves PDF / office files through the server so that:
 *   1. The real R2 / storage URL is NEVER sent to the browser.
 *   2. Content-Disposition: inline → browser renders, cannot trigger save-dialog.
 *   3. Cache-Control: no-store prevents caching leaks.
 *   4. Access is gated: user must be authenticated AND have purchased (or file must be free).
 *
 * Endpoint:  GET /api/secure-file/:noteId/:fileId?t=<jwt>
 *   Auth via  Authorization: Bearer <jwt>  header  OR  ?t=<jwt>  query param.
 *   The query-param fallback is needed because <iframe src="..."> cannot set headers.
 *
 * The frontend never sees the raw R2 URL; it only ever requests this proxy endpoint.
 */

import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Note, User, Purchase } from '../models/index.js';
import { JwtPayload } from '../middleware/auth.js';
import { readAndDecryptFile, readAndDecryptBundleAsset, getBundleIdForFile } from './upload.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET!;

// ── Auth middleware — accepts Bearer header OR ?t= query param ────────────────
async function requireAuthOrQuery(req: Request, res: Response, next: NextFunction): Promise<void> {
    let token: string | undefined;
    const authHeader = req.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.slice(7);
    } else if (typeof req.query.t === 'string' && req.query.t) {
        token = req.query.t;
    }
    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
            const user = await User.findOne({ id: decoded.userId });
            if (user) {
                (req as any).currentUser = user;
            }
        } catch {
            // Invalid/expired token: leave currentUser unset so free demo access can still proceed
        }
    }
    next();
}

// ── MIME map ──────────────────────────────────────────────────────────────────
const MIME: Record<string, string> = {
    pdf:  'application/pdf',
    txt:  'text/plain',
    md:   'text/plain',
    csv:  'text/csv',
    doc:  'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ppt:  'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    xls:  'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    html: 'text/html',
    htm:  'text/html',
};

function extOf(filename: string): string {
    return (filename.split('.').pop() || '').toLowerCase();
}

function resolveBufferContentType(buffer: Buffer, originalName?: string, title?: string, fallback?: string): string {
    if (buffer.length >= 4 && buffer.subarray(0, 4).toString() === '%PDF') {
        return 'application/pdf';
    }
    if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) {
        return 'image/png';
    }
    if (buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
        return 'image/jpeg';
    }
    if (originalName) {
        const ext = extOf(originalName);
        if (MIME[ext]) return MIME[ext];
    }
    if (title) {
        const ext = extOf(title);
        if (MIME[ext]) return MIME[ext];
    }
    if (fallback && fallback !== 'application/octet-stream') {
        return fallback;
    }
    return 'application/pdf';
}

function streamBufferWithRange(req: Request, res: Response, buffer: Buffer, contentType: string): void {
    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('x-no-compression', '1');

    const total = buffer.length;
    const range = req.headers.range;

    if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        let start = parseInt(parts[0], 10);
        let end = parts[1] ? parseInt(parts[1], 10) : total - 1;

        if (isNaN(start)) {
            start = total - end;
            end = total - 1;
        }
        if (isNaN(end) || end >= total) {
            end = total - 1;
        }

        if (start > end || start >= total) {
            res.status(416).setHeader('Content-Range', `bytes */${total}`).end();
            return;
        }

        const chunk = buffer.subarray(start, end + 1);
        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
        res.setHeader('Content-Length', chunk.length);
        res.end(chunk);
    } else {
        res.status(200);
        res.setHeader('Content-Length', total);
        res.end(buffer);
    }
}

// Shared by both the main file route and the bundle-asset route: loads the note, finds the
// requested file, and checks the requester is entitled to it (purchased / free / college-domain / 1st PDF demo).
async function resolveFileAccess(
    noteId: string,
    fileId: string,
    currentUser: any,
): Promise<{ ok: true; targetFile: { id: string; title: string; url: string; isFree: boolean } } | { ok: false; status: number; error: string }> {
    const note = await Note.findOne({ id: noteId }).lean() as any;
    if (!note) return { ok: false, status: 404, error: 'Note not found' };

    let targetFile: { id: string; title: string; url: string; isFree: boolean } | undefined;
    let firstFileId: string | null = null;
    for (const section of note.sections || []) {
        if (!firstFileId && Array.isArray(section.files) && section.files.length > 0) {
            firstFileId = section.files[0].id;
        }
        const found = (section.files || []).find((f: any) => f.id === fileId);
        if (found) { targetFile = found; }
    }
    if (!targetFile) return { ok: false, status: 404, error: 'File not found' };

    // The 1st PDF / file across all sections is open for everyone as a free demo preview
    const isFirstFileDemo = Boolean(firstFileId && String(targetFile.id) === String(firstFileId));
    const isFreeNote      = !note.price || note.price === 0;
    const isAlwaysFree    = isFirstFileDemo || targetFile.isFree || isFreeNote;

    if (isAlwaysFree) {
        return { ok: true, targetFile };
    }

    if (!currentUser) {
        return { ok: false, status: 401, error: 'Authentication required to access this file' };
    }

    const userRole      = (currentUser?.role || '').toUpperCase();
    const isAdmin       = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
    const isTeacherOwner = userRole === 'TEACHER' && Boolean(note.teacherId && note.teacherId === currentUser?.id);
    const isPurchased   = Array.isArray(currentUser?.purchasedNoteIds) && currentUser.purchasedNoteIds.includes(noteId);
    let activePurchased = isPurchased;
    if (isPurchased && currentUser?.id) {
        const now = new Date();
        const sixMonthsAgo = new Date(now);
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const activeRecord = await Purchase.findOne({
            userId: currentUser.id,
            productId: noteId,
            $or: [
                { expiresAt: { $gt: now } },
                { expiresAt: null, createdAt: { $gt: sixMonthsAgo } }
            ]
        }).lean();

        if (!activeRecord) {
            activePurchased = false;
            await User.updateOne({ id: currentUser.id }, { $pull: { purchasedNoteIds: noteId } });
        }
    }

    const collegeDomain = note.collegeConfig?.emailDomain?.trim().toLowerCase();
    const isCollegeFree = !!collegeDomain && collegeDomain.length >= 3 && currentUser.email?.toLowerCase().endsWith(collegeDomain);
    const hasAccess     = activePurchased || isCollegeFree || isAdmin || isTeacherOwner;
    if (!hasAccess) {
        if (isPurchased && !activePurchased) {
            return { ok: false, status: 403, error: 'Your access to this note has expired. Please renew your purchase.' };
        }
        return { ok: false, status: 403, error: 'Purchase required to access this file' };
    }

    return { ok: true, targetFile };
}

// ── Proxy route ───────────────────────────────────────────────────────────────
router.get('/secure-file/:noteId/:fileId', requireAuthOrQuery, async (req: Request, res: Response): Promise<void> => {
    const { noteId, fileId } = req.params;
    const currentUser = (req as any).currentUser;

    const access = await resolveFileAccess(String(noteId), String(fileId), currentUser);
    if (!access.ok) { res.status(access.status).json({ error: access.error }); return; }
    const targetFile = access.targetFile;
    const fileUrl = targetFile.url;
    if (!fileUrl || fileUrl === '#') { res.status(404).json({ error: 'File URL not configured' }); return; }

    const ext      = extOf(targetFile.title);
    const mimeType = MIME[ext] || 'application/octet-stream';

    // Common security headers — inline rendering only, no download, no caching
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');

    // 5a. Encrypted-at-rest files: url looks like /api/secure-file-raw/<fileId>.
    // Decrypt server-side (only ever in memory) and stream the plaintext with Range support
    // to the already-authenticated, already-entitled requester.
    const encryptedMatch = fileUrl.match(/^\/api\/secure-file-raw\/([a-zA-Z0-9-]+)$/);
    if (encryptedMatch) {
        try {
            const decrypted = await readAndDecryptFile(encryptedMatch[1]);
            if (!decrypted) { res.status(404).json({ error: 'File not found' }); return; }
            const contentType = resolveBufferContentType(decrypted.buffer, decrypted.originalName, targetFile.title, decrypted.mimeType || mimeType);
            streamBufferWithRange(req, res, decrypted.buffer, contentType);
        } catch (err) {
            if (!res.headersSent) res.status(500).json({ error: 'Failed to decrypt file' });
        }
        return;
    }

    // 5b. Legacy path: files uploaded before encryption was introduced are stored as a
    // plain (unencrypted) URL and are proxied through with Range support.
    try {
        if (!fileUrl.startsWith('http://') && !fileUrl.startsWith('https://')) {
            res.status(404).json({ error: 'File missing or corrupted in storage' });
            return;
        }
        
        const upstream = await fetch(fileUrl);
        if (!upstream.ok) { res.status(404).json({ error: 'File missing or corrupted in storage' }); return; }

        const buffer = Buffer.from(await upstream.arrayBuffer());
        const contentType = resolveBufferContentType(buffer, undefined, targetFile.title, upstream.headers.get('content-type') || mimeType);
        streamBufferWithRange(req, res, buffer, contentType);
    } catch {
        if (!res.headersSent) res.status(404).json({ error: 'File missing or corrupted in storage' });
    }
});

const ASSET_MIME: Record<string, string> = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
};

// ── Bundle asset route (images etc. referenced by an HTML note file) ──────────
// GET /api/secure-file/:noteId/:fileId/asset?path=img/diagram1.png&t=<jwt>
// :fileId is the HTML entry file's id (the one the note actually lists); the asset itself
// is looked up by the bundle it was uploaded together with, plus its relative path.
router.get('/secure-file/:noteId/:fileId/asset', requireAuthOrQuery, async (req: Request, res: Response): Promise<void> => {
    const { noteId, fileId } = req.params;
    const currentUser = (req as any).currentUser;
    const relativePath = req.query.path;
    if (typeof relativePath !== 'string' || !relativePath) { res.status(400).json({ error: 'Missing asset path' }); return; }

    // Reject path traversal outright.
    if (relativePath.includes('..') || relativePath.startsWith('/')) { res.status(400).json({ error: 'Invalid asset path' }); return; }

    // Same entitlement check as the entry file itself — access to the HTML note implies
    // access to the images it embeds.
    const access = await resolveFileAccess(String(noteId), String(fileId), currentUser);
    if (!access.ok) { res.status(access.status).json({ error: access.error }); return; }

    try {
        const bundleId = await getBundleIdForFile(String(fileId));
        if (!bundleId) { res.status(404).json({ error: 'Asset not found' }); return; }

        const asset = await readAndDecryptBundleAsset(bundleId, relativePath);
        if (!asset) { res.status(404).json({ error: 'Asset not found' }); return; }

        const ext = extOf(relativePath);
        const contentType = asset.mimeType || ASSET_MIME[ext] || 'application/octet-stream';
        streamBufferWithRange(req, res, asset.buffer, contentType);
    } catch (err) {
        if (!res.headersSent) res.status(500).json({ error: 'Failed to load asset' });
    }
});

export default router;