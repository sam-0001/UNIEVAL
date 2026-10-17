import "dotenv/config";
import express from "express";
import fs from "fs";
import mongoose from "mongoose";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import path from "path";
import { fileURLToPath } from "url";
import rateLimit from "express-rate-limit";
import apiRoutes from "./server/routes/api.js";
import webhookRoutes from './server/routes/webhook.js';

import uploadRoutes from "./server/routes/upload.js";
import examIntelligenceRoutes from "./server/routes/examIntelligence.js";
import beToolkitRoutes from "./server/routes/beToolkit.js";
import beToolkitSearchRoutes from "./server/routes/beToolkitSearch.js";
import generateQuizRoutes from "./server/routes/generateQuiz.js";
import payoutRoutes from "./server/routes/payout.js";
import secureFileRoutes from "./server/routes/secureFile.js";
import liveClassRoutes from "./server/routes/liveClass.js";
import whatsappRoutes from './server/routes/whatsapp.js';
import sitemapRoutes from './server/routes/sitemap.js';
import connectDB, { getDBStatus } from "./server/db.js";
import { connectRedis, isRedisAvailable } from "./server/redis.js";
import { startScheduler } from "./server/services/scheduler.service.js";
import { initSocket } from "./server/socket.js";
import logger from "./server/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const NODE_ENV       = process.env.NODE_ENV || 'development';
const PORT           = parseInt(process.env.PORT || '3000', 10);
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
const FORCE_HTTPS    = process.env.FORCE_HTTPS === 'true';
const REQUEST_TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || '120000', 10);

function validateEnv() {
    if (NODE_ENV !== 'production') return;
    const requiredKeys = [
        'JWT_SECRET', 'DATABASE_URL', 'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID',
        'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_URL', 
        'CASHFREE_APP_ID', 'CASHFREE_SECRET_KEY'
    ];
    const missing = requiredKeys.filter(key => !process.env[key]);
    if (missing.length > 0) {
        logger.error(`FATAL: Missing required environment variables in production: ${missing.join(', ')}`);
        // process.exit(1);
    }
}

async function startServer() {
    validateEnv();
    await connectDB();
    await connectRedis();
    startScheduler();

    const app = express();
    app.set('trust proxy', 1); // trust first proxy (Nginx) for correct IP in rate limiting & HTTPS redirect

    logger.info(`Starting UNIEVAL in ${NODE_ENV} mode on port ${PORT}`);

    // ── HTTPS redirect ─────────────────────────────────────────────────────────
    if (FORCE_HTTPS && NODE_ENV === 'production') {
        app.use((req, res, next) => {
            if (req.headers['x-forwarded-proto'] !== 'https') {
                return res.redirect(301, `https://${req.hostname}${req.url}`);
            }
            next();
        });
    }

    // ── Security headers (Helmet) ─────────────────────────────────────────────
    // Helmet sets: X-Frame-Options, X-Content-Type-Options, HSTS, Referrer-Policy,
    // X-XSS-Protection, Content-Security-Policy, and more — in one call.
    app.use(helmet({
        contentSecurityPolicy: NODE_ENV === 'production' ? {
            useDefaults: false, // prevents Helmet from auto-adding upgrade-insecure-requests
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc:  ["'self'", "'unsafe-inline'", "'unsafe-eval'",
                             "https://sdk.cashfree.com",
                             "https://cdnjs.cloudflare.com", "https://cdn.tailwindcss.com", "https://unpkg.com"],
                styleSrc:   ["'self'", "'unsafe-inline'",
                             "https://fonts.googleapis.com", "https://cdn.tailwindcss.com"],
                fontSrc:    ["'self'", "https://fonts.gstatic.com", "data:"],
                imgSrc:     ["'self'", "data:", "https:", "blob:"],
                mediaSrc:   ["'self'", "https:", "blob:"],
                connectSrc: [
                    "'self'",
                    "ws:",
                    "wss:",
                    "https://*.unieval.in",
                    "wss://*.unieval.in",
                    "https://unieval.in",
                    "wss://unieval.in",
                    "https://api.cashfree.com",
                    "https://sandbox.cashfree.com",
                    "https://sdk.cashfree.com",
                    "https://*.r2.cloudflarestorage.com",
                    "https://*.r2.dev",
                    "https://*.webinar.gg",
                    "https://webinar.gg",
                    "https://*.webinar-api.webinar.gg",
                    "https://webinar-api.webinar.gg",
                    "wss://*.webinar.gg",
                    "wss://*.webinar-api.webinar.gg",
                    "https://*.classx.co.in",
                    "wss://*.classx.co.in",
                    "https://classx.co.in",
                    "wss://classx.co.in",
                    "https://*.zego.im",
                    "wss://*.zego.im",
                    "https://*.zegocloud.com",
                    "wss://*.zegocloud.com",
                    "https://*.agora.io",
                    "wss://*.agora.io",
                    "https://*.edge.agora.io",
                    "wss://*.edge.agora.io",
                    "https://*.sd-rtn.com",
                    "wss://*.sd-rtn.com",
                    "https://*.daily.co",
                    "wss://*.daily.co",
                    "https://*.sentry.io",
                    "https://*.stream-io-video.com",
                    "wss://*.stream-io-video.com",
                    "https://stream-io-video.com",
                    "wss://stream-io-video.com",
                    "https://hint.stream-io-video.com",
                    "https://*.stream-io-api.com",
                    "wss://*.stream-io-api.com",
                    "https://stream-io-api.com",
                    "wss://stream-io-api.com",
                    "https://*.getstream.io",
                    "wss://*.getstream.io",
                    "https://getstream.io",
                    "wss://getstream.io"
                ],
                frameSrc:   [
                    "'self'",
                    "https://sandbox.cashfree.com",
                    "https://payments.cashfree.com",
                    "https://sdk.cashfree.com",
                    "https://api.cashfree.com",
                    "https://webinar.gg",
                    "https://*.webinar.gg",
                    "https://webinar-api.webinar.gg",
                    "https://*.webinar-api.webinar.gg",
                    "https://*.classx.co.in",
                    "https://classx.co.in",
                    "https://*.daily.co"
                ],
                workerSrc:  ["'self'", "blob:"],
                // NOTE: upgradeInsecureRequests is intentionally omitted — server runs plain HTTP
            },
        } : false, // disable CSP in dev (Vite HMR needs it off)
        crossOriginEmbedderPolicy: false, // needed for HLS video player
    }));

    // ── Static assets served BEFORE CORS — they are always same-origin ──────
    // Serving dist assets before CORS middleware prevents static files from
    // being rejected by CORS when CORS_ORIGINS is set to a specific domain.
    if (NODE_ENV === 'production') {
        const distPath = path.resolve(__dirname, 'dist');
        app.use(express.static(distPath, {
            maxAge: '1y',
            immutable: true,
            setHeaders: (res, filePath) => {
                if (filePath.endsWith('.html')) {
                    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
                }
            }
        }));
    }

    // ── CORS ─────────────────────────────────────────────────────────────────
    app.use(cors({
        origin: (origin, callback) => {
            if (NODE_ENV === 'development') { callback(null, true); return; }
            if (!origin) { callback(null, true); return; }
            if (ALLOWED_ORIGINS.length === 0) { callback(new Error('CORS_ORIGINS not configured')); return; }
            if (ALLOWED_ORIGINS.includes(origin)) { callback(null, true); }
            else { callback(new Error(`Origin ${origin} not allowed`)); }
        },
        credentials: true,
        optionsSuccessStatus: 200,
    }));

    app.use(compression());

    // ── Body limits — 1mb for API, 50mb only for file operations ─────────────
    // 50mb on all routes was a DoS vector — any endpoint could receive huge payloads.
    app.use((req, res, next) => {
        const isFileRoute = req.path.startsWith('/api/upload') || req.path.startsWith('/api/process-video') || req.path.startsWith('/api/delete-files');
        const limit = isFileRoute ? '50mb' : '1mb';
        express.json({ limit })(req, res, (err) => {
            if (err) { res.status(413).json({ error: 'Request body too large' }); return; }
            next();
        });
    });
    app.use(express.urlencoded({ extended: true, limit: '1mb' }));

    // ── Request timeout ───────────────────────────────────────────────────────
    app.use((req, res, next) => {
        const isUpload = req.path.startsWith('/api/upload/') || req.path.startsWith('/api/process-video');
        if (!isUpload) {
            req.setTimeout(REQUEST_TIMEOUT);
            res.setTimeout(REQUEST_TIMEOUT);
        }
        next();
    });

    // ── Rate limiting ─────────────────────────────────────────────────────────
    const globalLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, max: 500,
        message: 'Too many requests. Please try again later.',
        standardHeaders: true, legacyHeaders: false,
        skip: (req) => req.path.startsWith('/upload/') || req.path.startsWith('/process-video'),
    });
    const authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, max: 100,
        skipSuccessfulRequests: true,
        handler: (req, res) => { res.status(429).json({ error: 'Too many login attempts. Please wait 15 minutes and try again.' }); },
        standardHeaders: true, legacyHeaders: false,
    });

    app.use('/api', globalLimiter);
    app.use('/api/auth', authLimiter);

    // ── Request logging (development only — in prod use nginx/cloudflare logs) ─
    if (NODE_ENV === 'development') {
        app.use((req, _res, next) => {
            logger.debug(`${req.method} ${req.path}`);
            next();
        });
    }

    // ── Static uploads ────────────────────────────────────────────────────────
    app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

    // ── Static images (logo etc) ──────────────────────────────────────────────
    app.use('/img', express.static(path.join(__dirname, 'img')));

    // ── API routes ────────────────────────────────────────────────────────────
    app.use('/api', apiRoutes);
    app.use('/api', uploadRoutes);
    app.use('/api', examIntelligenceRoutes);
    app.use('/api', beToolkitRoutes);
    app.use('/api', beToolkitSearchRoutes);
    app.use('/api', generateQuizRoutes);
    app.use('/api', payoutRoutes);
    app.use('/api/webhooks', webhookRoutes);

    app.use('/api', secureFileRoutes);  // Secure PDF/file proxy — never exposes R2 URLs
    app.use('/api/live-classes', liveClassRoutes);
    app.use('/api/whatsapp', whatsappRoutes);

    // ── Dynamic Sitemap ───────────────────────────────────────────────────────
    // Served BEFORE the static file middleware so Express handles /sitemap.xml
    // with live course data from MongoDB (not the static public/sitemap.xml).
    app.use(sitemapRoutes);

    // ── Health check ──────────────────────────────────────────────────────────
    app.get('/api/health', async (_req, res) => {
        const db = await getDBStatus();
        const status = db.connected ? 'ok' : 'degraded';
        res.status(db.connected ? 200 : 503).json({
            status,
            timestamp: new Date().toISOString(),
            uptime: Math.floor(process.uptime()),
            environment: NODE_ENV,
            database: { connected: db.connected, readyState: db.readyState },
            redis: { connected: isRedisAvailable() },
            memory: {
                rss:      `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
                heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
            },
        });
    });

    // ── Global error handler ──────────────────────────────────────────────────
    app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
        const status  = err.status || err.statusCode || 500;
        const message = (NODE_ENV === 'production' && status === 500)
            ? 'Internal server error'
            : (err.message || 'Internal server error');

        logger.error(`${req.method} ${req.path} → ${status}`, {
            error: err.message,
            stack: NODE_ENV !== 'production' ? err.stack : undefined,
        });

        if (!res.headersSent) res.status(status).json({ error: message });
    });

    // ── Frontend ───────────────────────────────────────────────────────────────
    if (NODE_ENV !== 'production') {
        const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
        app.use(vite.middlewares);
    } else {
        const distPath = path.resolve(__dirname, 'dist');
        const indexPath = path.join(distPath, 'index.html');
        let cachedIndexHtml: string | null = null;

        app.get(/.*/, async (req, res) => {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            try {
                if (!cachedIndexHtml) {
                    cachedIndexHtml = await fs.promises.readFile(indexPath, 'utf-8');
                }

                let html = cachedIndexHtml;
                const urlPath = req.path;

                if (urlPath === '/notes') {
                    html = html
                        .replace(/<title>.*?<\/title>/i, '<title>SPPU Notes PDF - Download Pune University Engineering Notes | UniEval</title>')
                        .replace(/content="Top-ranked SPPU Engineering notes.*?"/i, 'content="Download chapter-wise SPPU Engineering Notes PDF for FE, SE, TE, and BE across Computer, IT, Mechanical, Civil, ENTC & AIDS branches."');
                } else if (urlPath === '/exam-intelligence') {
                    html = html
                        .replace(/<title>.*?<\/title>/i, '<title>SPPU PYQs & Exam Intelligence - High-Weightage Topics & Question Papers | UniEval</title>')
                        .replace(/content="Top-ranked SPPU Engineering notes.*?"/i, 'content="Master SPPU insem and endsem exams with past year question paper analysis, mark weightage distributions, and verified questions."');
                } else if (urlPath === '/browse') {
                    html = html
                        .replace(/<title>.*?<\/title>/i, '<title>SPPU Engineering Courses, Video Lectures & Syllabus | Pune University - UniEval</title>')
                        .replace(/content="Top-ranked SPPU Engineering notes.*?"/i, 'content="Explore video lectures, curriculum, and subject modules for all SPPU engineering branches and semesters."');
                } else if (urlPath === '/be-toolkit') {
                    html = html
                        .replace(/<title>.*?<\/title>/i, '<title>SPPU BE Toolkit - Final Year Engineering Projects, Research & Viva | UniEval</title>')
                        .replace(/content="Top-ranked SPPU Engineering notes.*?"/i, 'content="Comprehensive Final Year (BE) engineering toolkit for SPPU students: capstone project topics, case studies, and placement prep."');
                } else if (urlPath.startsWith('/note/')) {
                    const noteId = urlPath.replace('/note/', '').split('/')[0];
                    if (mongoose.connection.readyState === 1 && noteId) {
                        try {
                            const db = mongoose.connection.db;
                            const noteDoc = await db?.collection('notes').findOne(
                                { $or: [{ id: noteId }, { _id: noteId as any }] },
                                { projection: { title: 1, description: 1 } }
                            );
                            if (noteDoc?.title) {
                                html = html
                                    .replace(/<title>.*?<\/title>/i, `<title>${noteDoc.title} - SPPU Engineering Notes PDF | UniEval</title>`)
                                    .replace(/content="Top-ranked SPPU Engineering notes.*?"/i, `content="Download ${noteDoc.title} notes for SPPU (Pune University) engineering students. Exam-oriented chapter notes & verified materials."`);
                            }
                        } catch {
                            // Fallback to default template
                        }
                    }
                } else if (urlPath.startsWith('/course/')) {
                    const courseId = urlPath.replace('/course/', '').split('/')[0];
                    if (mongoose.connection.readyState === 1 && courseId) {
                        try {
                            const db = mongoose.connection.db;
                            const courseDoc = await db?.collection('courses').findOne(
                                { $or: [{ id: courseId }, { _id: courseId as any }] },
                                { projection: { title: 1, description: 1 } }
                            );
                            if (courseDoc?.title) {
                                html = html
                                    .replace(/<title>.*?<\/title>/i, `<title>${courseDoc.title} - SPPU Engineering Course | UniEval</title>`)
                                    .replace(/content="Top-ranked SPPU Engineering notes.*?"/i, `content="${courseDoc.title} - comprehensive video lectures and study material for SPPU engineering students."`);
                            }
                        } catch {
                            // Fallback to default template
                        }
                    }
                }

                res.send(html);
            } catch (err) {
                res.sendFile(indexPath);
            }
        });
    }

    const server = app.listen(PORT, '0.0.0.0', () => {
        logger.info(`Server ready → http://localhost:${PORT}`);
        
        // Tell PM2 we are ready to accept traffic (enables zero-downtime reloads)
        if (typeof process.send === 'function') {
            process.send('ready');
        }
    });

    // Initialize Socket.io
    initSocket(server);

    server.timeout = 0;
    server.keepAliveTimeout = 65000;

    // ── Graceful shutdown ─────────────────────────────────────────────────────
    const shutdown = (signal: string) => {
        logger.info(`${signal} received — shutting down gracefully`);
        server.close(() => {
            logger.info('HTTP server closed');
            process.exit(0);
        });
        setTimeout(() => { logger.warn('Forced exit after timeout'); process.exit(1); }, 10000);
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));
}

// ── Global process crash protection ──────────────────────────────────────────
process.on('unhandledRejection', (reason: any) => {
    logger.error('[Process] Unhandled Rejection:', {
        error: reason?.message || String(reason),
        stack: reason?.stack,
    });
});

process.on('uncaughtException', (err: Error) => {
    logger.error('[Process] Uncaught Exception:', {
        error: err.message,
        stack: err.stack,
    });
});

startServer().catch((err) => {
    logger.error('Fatal startup error', { error: err.message, stack: err.stack });
    process.exit(1);
});