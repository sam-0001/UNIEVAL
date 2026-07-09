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
import { Note, User } from '../models/index.js';
import { JwtPayload } from '../middleware/auth.js';
import { readAndDecryptFile } from './upload.js';

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
    if (!token) { res.status(401).json({ error: 'Authentication required' }); return; }
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
        const user = await User.findOne({ id: decoded.userId });
        if (!user) { res.status(401).json({ error: 'Invalid session' }); return; }
        (req as any).currentUser = user;
        next();
    } catch {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
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
};

function extOf(filename: string): string {
    return (filename.split('.').pop() || '').toLowerCase();
}

// ── Proxy route ───────────────────────────────────────────────────────────────
router.get('/secure-file/:noteId/:fileId', requireAuthOrQuery, async (req: Request, res: Response): Promise<void> => {
    const { noteId, fileId } = req.params;
    const currentUser = (req as any).currentUser;

    // 1. Load note
    const note = await Note.findOne({ id: noteId }).lean() as any;
    if (!note) { res.status(404).json({ error: 'Note not found' }); return; }

    // 2. Find the file within any section
    let targetFile: { id: string; title: string; url: string; isFree: boolean } | undefined;
    for (const section of note.sections || []) {
        const found = (section.files || []).find((f: any) => f.id === fileId);
        if (found) { targetFile = found; break; }
    }
    if (!targetFile) { res.status(404).json({ error: 'File not found' }); return; }

    // 3. Access check
    const isPurchased   = Array.isArray(currentUser.purchasedNoteIds) && currentUser.purchasedNoteIds.includes(noteId);
    const isCollegeFree = note.collegeConfig?.emailDomain && currentUser.email?.endsWith(note.collegeConfig.emailDomain.trim());
    const isFreeNote    = !note.price || note.price === 0;
    const hasAccess     = isPurchased || isCollegeFree || isFreeNote || targetFile.isFree;
    if (!hasAccess) { res.status(403).json({ error: 'Purchase required to access this file' }); return; }

    // 4. Validate URL
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
    // Decrypt server-side (only ever in memory) and stream the plaintext to the
    // already-authenticated, already-entitled requester.
    const encryptedMatch = fileUrl.match(/^\/api\/secure-file-raw\/([a-zA-Z0-9-]+)$/);
    if (encryptedMatch) {
        try {
            const decrypted = await readAndDecryptFile(encryptedMatch[1]);
            if (!decrypted) { res.status(404).json({ error: 'File not found' }); return; }
            res.setHeader('Content-Type', decrypted.mimeType || mimeType);
            res.setHeader('Content-Length', decrypted.buffer.length);
            res.end(decrypted.buffer);
        } catch (err) {
            if (!res.headersSent) res.status(500).json({ error: 'Failed to decrypt file' });
        }
        return;
    }

    // 5b. Legacy path: files uploaded before encryption was introduced are stored as a
    // plain (unencrypted) URL and are proxied through as before.
    try {
        const upstream = await fetch(fileUrl);
        if (!upstream.ok) { res.status(502).json({ error: 'Could not retrieve file from storage' }); return; }

        res.setHeader('Content-Type', mimeType || upstream.headers.get('content-type') || 'application/octet-stream');
        if (upstream.headers.has('content-length')) {
            res.setHeader('Content-Length', upstream.headers.get('content-length')!);
        }

        // Stream body to client
        if (upstream.body) {
            const reader = upstream.body.getReader();
            while (true) {
                const { done, value } = await reader.read();
                if (done) { res.end(); break; }
                if (!res.write(value)) await new Promise(r => res.once('drain', r));
            }
        } else {
            res.end(Buffer.from(await upstream.arrayBuffer()));
        }
    } catch {
        if (!res.headersSent) res.status(502).json({ error: 'File proxy error' });
    }
});

export default router;