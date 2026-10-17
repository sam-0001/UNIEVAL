import express from 'express';
import mongoose from 'mongoose';

// ─────────────────────────────────────────────────────────────────────────────
// Dynamic Sitemap Generator — served at GET /sitemap.xml
//
// Strategy:
//   - Static pages (homepage, about, browse, notes, exam-intelligence, be-toolkit)
//     are always included.
//   - Public courses (all courses) are fetched from MongoDB and included.
//   - Private/paywalled pages (notes, quizzes, vivas, profile, admin) are excluded.
//   - The response is cached for 1 hour to avoid hammering the database on every
//     Googlebot crawl.
//
// This replaces the static public/sitemap.xml.
// ─────────────────────────────────────────────────────────────────────────────

const router = express.Router();
const BASE_URL = process.env.SITE_BASE_URL || 'https://unieval.in';

// ── Cache: store generated sitemap XML for 1 hour ─────────────────────────────
let cachedSitemap: string | null = null;
let cacheTime = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// ── Static pages config ───────────────────────────────────────────────────────
const STATIC_PAGES = [
  { url: '/',                  changefreq: 'daily',   priority: '1.0', lastmod: new Date().toISOString().split('T')[0] },
  { url: '/notes',             changefreq: 'daily',   priority: '1.0', lastmod: new Date().toISOString().split('T')[0] },
  { url: '/exam-intelligence', changefreq: 'daily',   priority: '0.95', lastmod: new Date().toISOString().split('T')[0] },
  { url: '/browse',            changefreq: 'daily',   priority: '0.9', lastmod: new Date().toISOString().split('T')[0] },
  { url: '/be-toolkit',        changefreq: 'weekly',  priority: '0.8' },
  { url: '/about',             changefreq: 'monthly', priority: '0.7' },
];

// ── Helper: build an XML <url> block ──────────────────────────────────────────
function urlEntry(
  loc: string,
  opts: { changefreq?: string; priority?: string; lastmod?: string } = {}
): string {
  const lines: string[] = [`  <url>`, `    <loc>${loc}</loc>`];
  if (opts.lastmod)    lines.push(`    <lastmod>${opts.lastmod}</lastmod>`);
  if (opts.changefreq) lines.push(`    <changefreq>${opts.changefreq}</changefreq>`);
  if (opts.priority)   lines.push(`    <priority>${opts.priority}</priority>`);
  lines.push(`  </url>`);
  return lines.join('\n');
}

// ── Route handler ─────────────────────────────────────────────────────────────
router.get('/sitemap.xml', async (_req, res) => {
  try {
    // Serve from cache if fresh
    if (cachedSitemap && Date.now() - cacheTime < CACHE_TTL_MS) {
      res.header('Content-Type', 'application/xml; charset=utf-8');
      res.header('Cache-Control', 'public, max-age=3600');
      res.send(cachedSitemap);
      return;
    }

    const urlBlocks: string[] = [];

    // 1. Static pages
    for (const page of STATIC_PAGES) {
      urlBlocks.push(urlEntry(`${BASE_URL}${page.url}`, {
        changefreq: page.changefreq,
        priority:   page.priority,
        lastmod:    page.lastmod,
      }));
    }

    // 2. Dynamic course pages & note pages — fetch from MongoDB if connected
    if (mongoose.connection.readyState === 1) {
      try {
        const db = mongoose.connection.db;
        if (db) {
          // Fetch Courses
          const courses = await db
            .collection('courses')
            .find(
              {},
              { projection: { id: 1, _id: 1, updatedAt: 1 }, limit: 1000 }
            )
            .toArray();

          for (const course of courses) {
            const id = (course.id || course._id).toString();
            const lastmod = course.updatedAt
              ? new Date(course.updatedAt).toISOString().split('T')[0]
              : undefined;

            urlBlocks.push(urlEntry(`${BASE_URL}/course/${id}`, {
              changefreq: 'weekly',
              priority:   '0.8',
              lastmod,
            }));
          }

          // Fetch Notes (High Priority for SPPU Notes searches)
          const notes = await db
            .collection('notes')
            .find(
              {},
              { projection: { id: 1, _id: 1, updatedAt: 1, uploadedAt: 1 }, limit: 1000 }
            )
            .toArray();

          for (const note of notes) {
            const id = (note.id || note._id).toString();
            const modDate = note.updatedAt || note.uploadedAt;
            const lastmod = modDate
              ? new Date(modDate).toISOString().split('T')[0]
              : undefined;

            urlBlocks.push(urlEntry(`${BASE_URL}/note/${id}`, {
              changefreq: 'weekly',
              priority:   '0.85',
              lastmod,
            }));
          }
        }
      } catch (dbErr) {
        // DB error — skip dynamic entries, still serve static sitemap
        console.error('[sitemap] Failed to fetch courses/notes:', dbErr);
      }
    }

    // 3. Build XML
    const xml = [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
      ...urlBlocks,
      `</urlset>`,
    ].join('\n');

    // Cache and serve
    cachedSitemap = xml;
    cacheTime = Date.now();

    res.header('Content-Type', 'application/xml; charset=utf-8');
    res.header('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch (err) {
    console.error('[sitemap] Unexpected error:', err);
    res.status(500).send('<?xml version="1.0"?><error>Sitemap generation failed</error>');
  }
});

// ── Cache invalidation helper (call after course create/delete) ───────────────
export function invalidateSitemapCache(): void {
  cachedSitemap = null;
  cacheTime = 0;
}

export default router;
