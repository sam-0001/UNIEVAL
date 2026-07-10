/**
 * SecureHtmlViewer — protected viewer for .html / .htm note files
 * ─────────────────────────────────────────────────────────────────
 * Mirrors the anti-piracy approach used by SecurePdfViewer:
 * • Content is fetched through the authenticated secure-file proxy as text —
 *   the raw storage URL is never placed in the DOM (no <iframe src="...">).
 * • Rendered via srcDoc into a locked-down sandboxed iframe (no scripts,
 *   no same-origin access, no top-navigation) so embedded JS in an uploaded
 *   file can't exfiltrate content or break out of the frame.
 * • A tiled, diagonal, semi-transparent watermark overlay sits on top of the
 *   iframe and stays pinned to the viewport while the document scrolls
 *   beneath it — same visual language as the PDF canvas watermark.
 * • Right-click / context menu disabled, no download affordance.
 *
 * Relative assets (e.g. a note's img/ folder — <img src="img/diagram1.png">)
 * are rewritten before rendering to point at the server's bundle-asset route
 * (/api/secure-file/:noteId/:fileId/asset?path=...&t=...), which re-checks the
 * same purchase/entitlement rules as the HTML file itself before decrypting
 * and streaming the image. Absolute/external/data URLs are left untouched.
 */

import React, { useEffect, useMemo, useState } from 'react';

interface Props {
  url: string;
  filename?: string;
  watermarkText?: string;
}

// Attributes across common elements that can carry a relative resource reference.
const REWRITE_TARGETS: Array<{ selector: string; attr: string }> = [
  { selector: 'img', attr: 'src' },
  { selector: 'img', attr: 'srcset' },
  { selector: 'source', attr: 'src' },
  { selector: 'source', attr: 'srcset' },
  { selector: 'link[rel="stylesheet"]', attr: 'href' },
  { selector: 'link[rel="icon"]', attr: 'href' },
];

function isRewritable(ref: string): boolean {
  if (!ref) return false;
  const trimmed = ref.trim();
  if (!trimmed) return false;
  if (/^(https?:)?\/\//i.test(trimmed)) return false; // absolute / protocol-relative
  if (/^(data|blob|mailto|javascript):/i.test(trimmed)) return false;
  if (trimmed.startsWith('#')) return false;
  return true;
}

function buildAssetUrl(assetBase: string, relativePath: string): string {
  return `${assetBase}&path=${encodeURIComponent(relativePath)}`;
}

const SecureHtmlViewer: React.FC<Props> = ({ url, filename, watermarkText }) => {
  const [srcDoc, setSrcDoc] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      setSrcDoc('');
      try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`Failed to load document (${resp.status})`);
        const rawHtml = await resp.text();
        if (cancelled) return;

        // Derive the bundle-asset endpoint from the same URL/token we used to
        // fetch the document: /secure-file/:noteId/:fileId?t=... -> .../:fileId/asset?t=...
        const parsed = new URL(url, window.location.origin);
        const match = parsed.pathname.match(/\/secure-file\/([^/]+)\/([^/]+)$/);
        const token = parsed.searchParams.get('t') || '';
        const assetBase = match
          ? `${parsed.origin}${parsed.pathname}/asset?t=${encodeURIComponent(token)}`
          : null;

        let finalHtml = rawHtml;
        if (assetBase) {
          try {
            const doc = new DOMParser().parseFromString(rawHtml, 'text/html');

            for (const { selector, attr } of REWRITE_TARGETS) {
              doc.querySelectorAll(selector).forEach(el => {
                const value = el.getAttribute(attr);
                if (!value) return;

                if (attr === 'srcset') {
                  // srcset: comma-separated "url descriptor" pairs
                  const rewritten = value
                    .split(',')
                    .map(part => {
                      const [ref, descriptor] = part.trim().split(/\s+/, 2);
                      if (!isRewritable(ref)) return part.trim();
                      const newUrl = buildAssetUrl(assetBase, ref);
                      return descriptor ? `${newUrl} ${descriptor}` : newUrl;
                    })
                    .join(', ');
                  el.setAttribute(attr, rewritten);
                } else if (isRewritable(value)) {
                  el.setAttribute(attr, buildAssetUrl(assetBase, value));
                }
              });
            }

            // Inline style="background-image:url(...)" and <style> blocks with url(...)
            const cssUrlPattern = /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi;
            const rewriteCssUrls = (css: string) =>
              css.replace(cssUrlPattern, (full, quote, ref) => {
                if (!isRewritable(ref)) return full;
                return `url(${quote}${buildAssetUrl(assetBase, ref)}${quote})`;
              });

            doc.querySelectorAll('[style]').forEach(el => {
              const style = el.getAttribute('style');
              if (style && style.includes('url(')) el.setAttribute('style', rewriteCssUrls(style));
            });
            doc.querySelectorAll('style').forEach(el => {
              if (el.textContent && el.textContent.includes('url(')) el.textContent = rewriteCssUrls(el.textContent);
            });

            finalHtml = `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
          } catch {
            // If parsing/rewriting fails for any reason, fall back to the raw HTML
            // rather than showing a blank viewer — images just won't resolve.
            finalHtml = rawHtml;
          }
        }

        if (!cancelled) setSrcDoc(finalHtml);
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to load document');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [url]);

  // Build a tiled diagonal watermark grid so it's visible no matter where the
  // reader has scrolled the document to.
  const watermarkTiles = useMemo(() => {
    if (!watermarkText) return null;
    const cols = 3;
    const rows = 7;
    const tiles: React.ReactNode[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        tiles.push(
          <span
            key={`${r}-${c}`}
            style={{
              position: 'absolute',
              top: `${((r + 0.5) / rows) * 100}%`,
              left: `${((c + 0.5) / cols) * 100}%`,
              transform: 'translate(-50%, -50%) rotate(-30deg)',
              whiteSpace: 'nowrap',
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '0.02em',
              color: 'rgba(0,0,0,0.14)',
            }}
          >
            {watermarkText}
          </span>,
        );
      }
    }
    return tiles;
  }, [watermarkText]);

  return (
    <div
      className="flex flex-col bg-slate-700 select-none h-full"
      onContextMenu={e => e.preventDefault()}
    >
      {filename && (
        <div className="flex items-center px-3 py-2 bg-slate-800 text-white text-xs shrink-0 gap-2 z-10 shadow-md">
          <span className="truncate text-slate-300">{filename}</span>
        </div>
      )}

      <div className="flex-1 relative overflow-hidden bg-white">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-3">
            <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" />
            <span className="text-sm">Loading document…</span>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-red-500 gap-2 p-4 text-center">
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <iframe
            title={filename || 'Document'}
            srcDoc={srcDoc}
            className="w-full h-full border-none bg-white"
            // No scripts, no same-origin, no top navigation, no forms —
            // this is a read-only document view, not an app sandbox.
            sandbox=""
            onContextMenu={(e: React.MouseEvent) => e.preventDefault()}
          />
        )}

        {/* Anti-piracy watermark — pinned over the viewport, ignores clicks,
            stays visible as the reader scrolls the document beneath it. */}
        {!loading && !error && watermarkTiles && (
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ pointerEvents: 'none', zIndex: 20 }}
          >
            {watermarkTiles}
          </div>
        )}
      </div>
    </div>
  );
};

export default SecureHtmlViewer;
