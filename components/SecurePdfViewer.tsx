/**
 * SecurePdfViewer — production-quality PDF viewer
 * ─────────────────────────────────────────────────
 * Features:
 * • High-DPI rendering (devicePixelRatio)
 * • Chrome-style Zoom: Instant CSS transform panning + 300ms debounced high-res render
 * • Double-Buffered: Zero flickering when upgrading to high-res
 * • Native Panning: Scrolling just moves the page, no accidental page turns
 * • Mobile: pinch-to-zoom + swipe left/right (only when not zoomed in)
 * • Desktop: Ctrl/Cmd+scroll to zoom
 * • Keyboard: Arrow keys for navigation (smart zoom-aware)
 * • Anti-Piracy: Single, centered diagonal canvas watermark
 */

import React, {
  useEffect, useRef, useState, useCallback,
} from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Fetch the worker from a free CDN to save server bandwidth
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface Props {
  url: string;
  filename?: string;
  watermarkText?: string;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 5.0;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const SecurePdfViewer: React.FC<Props> = ({ url, filename, watermarkText }) => {
  const containerRef  = useRef<HTMLDivElement>(null);
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);
  const renderTimeoutRef = useRef<number | null>(null);

  const [pdfDoc,      setPdfDoc]      = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages,    setNumPages]    = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  
  // scale = Instant visual CSS scale
  // renderScale = The actual pixel density currently rendered on the canvas
  const [scale, setScale] = useState(1.0); 
  const [renderScale, setRenderScale] = useState(1.0); 
  const [basePageSize, setBasePageSize] = useState({ w: 0, h: 0 }); 

  const [loading,     setLoading]     = useState(true);
  const [rendering,   setRendering]   = useState(false);
  const [error,       setError]       = useState('');
  const [animDirection, setAnimDirection] = useState<'next' | 'prev' | null>(null);

  // ── Load PDF ────────────────────────────────────────────────────────────────
  const loadPdf = useCallback(async () => {
    setLoading(true);
    setError('');
    setPdfDoc(null);
    setNumPages(0);
    setCurrentPage(1);
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`Failed to load PDF (${resp.status})`);
      const buffer = await resp.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
      setPdfDoc(doc);
      setNumPages(doc.numPages);
    } catch (e: any) {
      setError(e.message || 'Failed to load PDF');
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => { loadPdf(); }, [loadPdf]);

  // ── Auto-fit width on first page load ───────────────────────────────────────
  useEffect(() => {
    if (!pdfDoc || !containerRef.current) return;
    (async () => {
      const page     = await pdfDoc.getPage(1);
      const viewport = page.getViewport({ scale: 1 });
      const containerW = containerRef.current!.clientWidth - 32;
      const fitScale  = containerW / viewport.width;
      const clamped = clamp(fitScale, MIN_SCALE, MAX_SCALE);
      
      setScale(clamped);
      setRenderScale(clamped);
      setBasePageSize({ w: viewport.width, h: viewport.height });
    })();
  }, [pdfDoc]);

  // ── Render page (Debounced & Double-Buffered) ───────────────────────────────
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    let cancelled = false;

    const render = async () => {
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch {}
        renderTaskRef.current = null;
      }
      setRendering(true);
      try {
        const page = await pdfDoc.getPage(currentPage);
        if (cancelled) return;

        const vp1 = page.getViewport({ scale: 1 });
        setBasePageSize({ w: vp1.width, h: vp1.height });

        const dpr = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale: renderScale * dpr });

        // Off-screen rendering (Background buffer)
        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = viewport.width;
        offscreenCanvas.height = viewport.height;
        const offscreenCtx = offscreenCanvas.getContext('2d');
        if (!offscreenCtx) return;

        const task = page.render({ canvasContext: offscreenCtx, viewport });
        renderTaskRef.current = task;
        await task.promise;

        if (cancelled) return;

        // Draw Watermark
        if (watermarkText) {
          offscreenCtx.save();
          offscreenCtx.globalAlpha = 0.2; 
          offscreenCtx.fillStyle = '#000000';
          offscreenCtx.font = `bold ${50 * renderScale * dpr}px sans-serif`;
          offscreenCtx.textAlign = 'center';
          offscreenCtx.textBaseline = 'middle';
          offscreenCtx.translate(offscreenCanvas.width / 2, offscreenCanvas.height / 2);
          offscreenCtx.rotate(-Math.PI / 4); 
          offscreenCtx.fillText(watermarkText, 0, 0);
          offscreenCtx.restore();
        }

        // Swap to visible canvas instantly
        const visibleCanvas = canvasRef.current;
        if (visibleCanvas && !cancelled) {
          visibleCanvas.width = viewport.width;
          visibleCanvas.height = viewport.height;
          const visibleCtx = visibleCanvas.getContext('2d');
          visibleCtx?.drawImage(offscreenCanvas, 0, 0);
        }

      } catch (e: any) {
        if (e?.name !== 'RenderingCancelledException') console.error(e);
      } finally {
        if (!cancelled) setRendering(false);
      }
    };

    render();
    return () => { cancelled = true; };
  }, [pdfDoc, currentPage, renderScale, watermarkText]);

  // ── Navigation & Smooth Zoom Logic ──────────────────────────────────────────
  const goTo = useCallback((p: number, direction?: 'next' | 'prev') => {
    const clamped = clamp(p, 1, numPages);
    if (clamped !== currentPage) {
      if (direction) setAnimDirection(direction);
      setCurrentPage(clamped);
    }
  }, [numPages, currentPage]);

  const zoomTo = useCallback((s: number | ((prev: number) => number)) => {
    setScale(prevScale => {
      const target = typeof s === 'function' ? s(prevScale) : s;
      const newScale = clamp(+target.toFixed(2), MIN_SCALE, MAX_SCALE);
      
      // Debounce the heavy pdf.js render for 300ms
      if (renderTimeoutRef.current) window.clearTimeout(renderTimeoutRef.current);
      renderTimeoutRef.current = window.setTimeout(() => {
        setRenderScale(newScale);
      }, 300);

      return newScale;
    });
  }, []);

  const zoomIn  = () => zoomTo(s => s * 1.2);
  const zoomOut = () => zoomTo(s => s / 1.2);

  // ── Desktop: Ctrl+Wheel Zoom ────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        
        // Calculate zoom based on cursor position for better UX
        const zoomModifier = e.deltaY < 0 ? 1.1 : 0.9;
        zoomTo(s => s * zoomModifier);
      }
    };
    
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomTo]);

  // ── Mobile: Touch Zoom & Safe Swipe ─────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let initialDist = 0;
    let initialScale = scale;
    let touchStartX = 0;
    let touchStartY = 0;
    let lastTouchX = 0;
    let lastTouchY = 0;
    let isSwiping = false;

    const dist = (t: TouchList) =>
      Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        initialDist  = dist(e.touches);
        setScale(current => { initialScale = current; return current; });
        isSwiping    = false;
      } else if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        lastTouchX  = touchStartX;
        lastTouchY  = touchStartY;
        isSwiping   = true;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialDist > 0) {
        e.preventDefault(); 
        const newScale = initialScale * (dist(e.touches) / initialDist);
        zoomTo(newScale);
        isSwiping = false;
      } else if (e.touches.length === 1 && isSwiping) {
        // Manually scroll the container (needed because touchAction: 'none' disables native scroll)
        const dx = lastTouchX - e.touches[0].clientX;
        const dy = lastTouchY - e.touches[0].clientY;
        el.scrollLeft += dx;
        el.scrollTop  += dy;
        lastTouchX = e.touches[0].clientX;
        lastTouchY = e.touches[0].clientY;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!isSwiping || e.changedTouches.length !== 1) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;

      const isZoomed = Math.round(el.scrollWidth) > Math.round(el.clientWidth) + 5 || 
                       Math.round(el.scrollHeight) > Math.round(el.clientHeight) + 5;

      if (!isZoomed && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
         if (dx < 0) goTo(currentPage + 1, 'next');
         else        goTo(currentPage - 1, 'prev');
      }
      isSwiping = false;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove',  onTouchMove,  { passive: false });
    el.addEventListener('touchend',   onTouchEnd,   { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove',  onTouchMove);
      el.removeEventListener('touchend',   onTouchEnd);
    };
  }, [scale, zoomTo, currentPage, goTo]);

  // ── Keyboard Navigation (NEW) ───────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events if the user is typing in the page number input or if still loading
      if (document.activeElement?.tagName === 'INPUT' || loading) return;

      const el = containerRef.current;
      if (!el) return;

      // Detect if the document is currently zoomed in (and thus needs scrolling capability)
      const isZoomed = 
        Math.round(el.scrollWidth) > Math.round(el.clientWidth) + 5 || 
        Math.round(el.scrollHeight) > Math.round(el.clientHeight) + 5;

      if (e.key === 'ArrowLeft') {
        goTo(currentPage - 1, 'prev');
      } else if (e.key === 'ArrowRight') {
        goTo(currentPage + 1, 'next');
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        // If they are zoomed in, let the browser handle ArrowUp natively so it scrolls.
        // PageUp, however, should still forcefully change the page.
        if (!isZoomed || e.key === 'PageUp') {
          e.preventDefault();
          goTo(currentPage - 1, 'prev');
        }
      } else if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        if (!isZoomed || e.key === 'PageDown') {
          e.preventDefault();
          goTo(currentPage + 1, 'next');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, goTo, loading]);

  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = 0;
  }, [currentPage]);

  // CSS Math: How much do we stretch the canvas while waiting for the high-res render?
  const cssScaleRatio = scale / renderScale;

  // ── JSX ─────────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col bg-slate-700 select-none h-full"
      onContextMenu={e => e.preventDefault()}
    >
      <style>{`
        @keyframes slideUpIn {
          0% { opacity: 0; transform: translateY(40px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDownIn {
          0% { opacity: 0; transform: translateY(-40px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .anim-next { animation: slideUpIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .anim-prev { animation: slideDownIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-800 text-white text-xs shrink-0 gap-2 z-10 shadow-md">
        <div className="flex items-center gap-1">
          <button onClick={() => goTo(currentPage - 1, 'prev')} disabled={currentPage <= 1 || loading} className="w-8 h-8 flex items-center justify-center rounded hover:bg-slate-600 disabled:opacity-30 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="flex items-center gap-1">
            <input type="number" min={1} max={numPages || 1} value={loading ? '' : currentPage} disabled={loading} onChange={e => goTo(parseInt(e.target.value) || 1, (parseInt(e.target.value) || 1) > currentPage ? 'next' : 'prev')} className="w-10 text-center text-xs bg-slate-700 text-white border border-slate-600 rounded px-1 py-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
            <span className="text-slate-400 whitespace-nowrap">/ {loading ? '…' : numPages}</span>
          </div>
          <button onClick={() => goTo(currentPage + 1, 'next')} disabled={currentPage >= numPages || loading} className="w-8 h-8 flex items-center justify-center rounded hover:bg-slate-600 disabled:opacity-30 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>

        {filename && (
          <span className="truncate text-slate-300 text-[11px] hidden sm:block max-w-[30%]">{filename}</span>
        )}

        <div className="flex items-center gap-1">
          <button onClick={zoomOut} disabled={loading} className="w-8 h-8 flex items-center justify-center rounded hover:bg-slate-600 disabled:opacity-30 transition-colors text-lg font-bold leading-none">−</button>
          <button onClick={() => { if (basePageSize.w && containerRef.current) zoomTo((containerRef.current.clientWidth - 32) / basePageSize.w); }} disabled={loading} title="Fit to width" className="font-mono w-14 text-center text-xs bg-slate-700 hover:bg-slate-600 rounded py-1 transition-colors disabled:opacity-30">{Math.round(scale * 100)}%</button>
          <button onClick={zoomIn} disabled={loading} className="w-8 h-8 flex items-center justify-center rounded hover:bg-slate-600 disabled:opacity-30 transition-colors text-lg font-bold leading-none">+</button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-auto min-h-0 flex justify-center items-start py-4 px-2"
        style={{ touchAction: 'none' }}
      >
        {loading && (
          <div className="flex flex-col items-center justify-center text-white/60 mt-20 gap-3">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <span className="text-sm">Loading PDF…</span>
          </div>
        )}
        
        {error && (
          <div className="flex flex-col items-center justify-center text-red-300 mt-20 gap-2 max-w-xs text-center">
            <p className="text-sm font-medium">{error}</p>
            <button onClick={loadPdf} className="mt-2 text-xs text-white/60 border border-white/20 rounded px-3 py-1 hover:bg-white/10 transition-colors">Retry</button>
          </div>
        )}

        {/* CSS Scaled Wrapper: This reserves the correct layout space instantly so scrollbars react instantly */}
        <div 
          key={currentPage} 
          className={animDirection === 'next' ? 'anim-next' : animDirection === 'prev' ? 'anim-prev' : ''}
          style={{ 
            position: 'relative', 
            display: loading || error ? 'none' : 'block',
            width: basePageSize.w ? `${basePageSize.w * scale}px` : 'auto',
            height: basePageSize.h ? `${basePageSize.h * scale}px` : 'auto',
          }}
        >
          <canvas
            ref={canvasRef}
            className="shadow-2xl rounded-sm block bg-white origin-top-left"
            style={{
              // The actual CSS width of the currently rendered high-res image
              width: basePageSize.w ? `${basePageSize.w * renderScale}px` : 'auto',
              height: basePageSize.h ? `${basePageSize.h * renderScale}px` : 'auto',
              
              // The magic: instantly stretch/shrink the old render until the new one is ready
              transform: `scale(${cssScaleRatio})`,
              
              // Absolute position keeps it pinned to the top-left of the wrapper while stretching
              position: 'absolute',
              top: 0, 
              left: 0
            }}
            onContextMenu={e => e.preventDefault()}
          />
          
          {rendering && scale !== renderScale && (
            <div className="absolute top-2 right-2 flex items-center gap-2 bg-black/50 text-white/80 px-2 py-1 rounded text-[10px] z-20">
               <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> Enhancing...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SecurePdfViewer;