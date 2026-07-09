import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';

interface HlsPlayerProps {
  src: string;
  poster?: string;
  autoPlay?: boolean;
}

export const HlsPlayer: React.FC<HlsPlayerProps> = ({ src, poster, autoPlay = false }) => {
  const containerRef  = useRef<HTMLDivElement>(null);
  const videoRef      = useRef<HTMLVideoElement>(null);
  const hlsRef        = useRef<Hls | null>(null);
  const progressRef   = useRef<HTMLDivElement>(null);

  // Playback state
  const [isLoading,    setIsLoading]    = useState(true);
  const [isSeeking,    setIsSeeking]    = useState(false);
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [currentTime,  setCurrentTime]  = useState(0);
  const [duration,     setDuration]     = useState(0);
  const [buffered,     setBuffered]     = useState(0);   // furthest buffered second
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume,       setVolume]       = useState(1);
  const [isMuted,      setIsMuted]      = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // While the user is dragging the seek bar we show a "preview" position
  // immediately so the bar doesn't snap back during buffering.
  const [seekPreview,  setSeekPreview]  = useState<number | null>(null);
  const isDraggingRef = useRef(false);

  // Auto-hide controls timer
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  const showAndScheduleHide = useCallback(() => {
    setShowControls(true);
    scheduleHide();
  }, [scheduleHide]);

  // ── HLS INIT ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setIsLoading(true);
    setError(null);
    setCurrentTime(0);
    setDuration(0);
    setBuffered(0);
    setSeekPreview(null);

    const onSeeking  = () => { setIsSeeking(true);  setIsLoading(true); };
    const onSeeked   = () => { setIsSeeking(false); setIsLoading(false); };
    const onWaiting  = () => setIsLoading(true);
    const onCanPlay  = () => setIsLoading(false);
    const onPlaying  = () => { setIsLoading(false); setIsPlaying(true); };

    const onTimeUpdate = () => {
      // Only update if user is NOT dragging — prevents visual snap-back
      if (!isDraggingRef.current) setCurrentTime(video.currentTime);

      // Update buffered range
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
    };

    const onDurationChange = () => {
      if (isFinite(video.duration)) setDuration(video.duration);
    };

    const onPlay    = () => setIsPlaying(true);
    const onPause   = () => setIsPlaying(false);
    const onRate    = () => setPlaybackRate(video.playbackRate);
    const onVolume  = () => { setVolume(video.volume); setIsMuted(video.muted); };
    const onFSChange = () => setIsFullscreen(!!document.fullscreenElement);

    video.addEventListener('seeking',        onSeeking);
    video.addEventListener('seeked',         onSeeked);
    video.addEventListener('waiting',        onWaiting);
    video.addEventListener('canplay',        onCanPlay);
    video.addEventListener('playing',        onPlaying);
    video.addEventListener('timeupdate',     onTimeUpdate);
    video.addEventListener('durationchange', onDurationChange);
    video.addEventListener('play',           onPlay);
    video.addEventListener('pause',          onPause);
    video.addEventListener('ratechange',     onRate);
    video.addEventListener('volumechange',   onVolume);
    document.addEventListener('fullscreenchange', onFSChange);

    if (Hls.isSupported()) {
      const hls = new Hls({
        debug: false,
        enableWorker: true,
        // Instant-start tuning: buffer only 8s before allowing play,
        // but let the back-buffer grow to fill memory for smooth seeking.
        maxBufferLength: 8,           // start playing after 8s buffered
        maxMaxBufferLength: 120,      // grow up to 120s once playing
        maxBufferSize: 60 * 1000 * 1000, // 60 MB cap
        startLevel: 0,                // always start at lowest quality → plays immediately
        abrEwmaDefaultEstimate: 1000000,
        // Pull the first segment ASAP after manifest is parsed
        startFragPrefetch: true,
      });

      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        if (autoPlay) video.play().catch(() => {});
      });

      // Also attempt play as soon as the first fragment is buffered
      hls.on(Hls.Events.FRAG_BUFFERED, () => {
        if (video.paused && autoPlay) {
          video.play().catch(() => {});
        }
      });

      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (!data.fatal) return;
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            // Try to recover — re-attempt load
            hls.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            hls.recoverMediaError();
            break;
          default:
            hls.destroy();
            setError(`Playback error: ${data.details}`);
            setIsLoading(false);
        }
      });

    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS
      video.src = src;
      video.addEventListener('loadedmetadata', () => {
        setIsLoading(false);
        if (autoPlay) video.play().catch(() => {});
      });
    } else {
      setError('HLS playback is not supported in this browser.');
      setIsLoading(false);
    }

    return () => {
      video.removeEventListener('seeking',        onSeeking);
      video.removeEventListener('seeked',         onSeeked);
      video.removeEventListener('waiting',        onWaiting);
      video.removeEventListener('canplay',        onCanPlay);
      video.removeEventListener('playing',        onPlaying);
      video.removeEventListener('timeupdate',     onTimeUpdate);
      video.removeEventListener('durationchange', onDurationChange);
      video.removeEventListener('play',           onPlay);
      video.removeEventListener('pause',          onPause);
      video.removeEventListener('ratechange',     onRate);
      video.removeEventListener('volumechange',   onVolume);
      document.removeEventListener('fullscreenchange', onFSChange);
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [src, autoPlay]);

  // ── SEEK FROM PROGRESS BAR CLICK / DRAG ──────────────────────────────────
  // We handle the progress bar with mouse/touch events directly on the bar div
  // rather than an <input type="range"> so we have full control over the visual
  // position during dragging (no snap-back while buffering).

  const getSeekTimeFromEvent = useCallback((e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent): number => {
    const bar = progressRef.current;
    if (!bar || !duration) return 0;
    const rect = bar.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return ratio * duration;
  }, [duration]);

  const handleProgressMouseDown = useCallback((e: React.MouseEvent) => {
    if (!duration) return;
    isDraggingRef.current = true;
    const time = getSeekTimeFromEvent(e);
    setSeekPreview(time);

    const onMove = (me: MouseEvent) => {
      const t = getSeekTimeFromEvent(me);
      setSeekPreview(t);
    };
    const onUp = (me: MouseEvent) => {
      const t = getSeekTimeFromEvent(me);
      setSeekPreview(null);
      isDraggingRef.current = false;
      const video = videoRef.current;
      if (video) {
        video.currentTime = t;
        setCurrentTime(t); // immediate visual update — don't wait for timeupdate
      }
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
  }, [duration, getSeekTimeFromEvent]);

  const handleProgressTouchStart = useCallback((e: React.TouchEvent) => {
    if (!duration) return;
    isDraggingRef.current = true;
    const time = getSeekTimeFromEvent(e);
    setSeekPreview(time);

    const onMove = (te: TouchEvent) => {
      const t = getSeekTimeFromEvent(te);
      setSeekPreview(t);
    };
    const onEnd = (te: TouchEvent) => {
      const t = te.changedTouches[0]
        ? (() => {
            const bar = progressRef.current!;
            const rect = bar.getBoundingClientRect();
            const ratio = Math.max(0, Math.min(1, (te.changedTouches[0].clientX - rect.left) / rect.width));
            return ratio * duration;
          })()
        : seekPreview ?? currentTime;
      setSeekPreview(null);
      isDraggingRef.current = false;
      const video = videoRef.current;
      if (video) {
        video.currentTime = t;
        setCurrentTime(t);
      }
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend',  onEnd);
    };
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend',  onEnd);
  }, [duration, getSeekTimeFromEvent, seekPreview, currentTime]);

  // ── CONTROLS ──────────────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.paused ? v.play() : v.pause();
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
  }, []);

  const changeVolume = useCallback((val: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = val;
    v.muted  = val === 0;
  }, []);

  const skip = useCallback((seconds: number) => {
    const v = videoRef.current;
    if (!v || !duration) return;
    const next = Math.max(0, Math.min(duration, v.currentTime + seconds));
    v.currentTime = next;
    setCurrentTime(next); // immediate visual update
  }, [duration]);

  const toggleFullscreen = useCallback(() => {
    const c = containerRef.current;
    if (!c) return;
    if (!document.fullscreenElement) {
      c.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  }, []);

  // ── FORMAT TIME (handles hours) ───────────────────────────────────────────
  const formatTime = (secs: number) => {
    if (!isFinite(secs) || isNaN(secs)) return '0:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    const mm = String(m).padStart(h > 0 ? 2 : 1, '0');
    const ss = String(s).padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  };

  // ── KEYBOARD SHORTCUTS ────────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (!e.repeat) {
            const v = videoRef.current;
            if (v) v.playbackRate = 2.0;
          }
          break;
        case 'ArrowRight': e.preventDefault(); skip(10);  break;
        case 'ArrowLeft':  e.preventDefault(); skip(-10); break;
        case 'ArrowUp':    e.preventDefault(); changeVolume(Math.min(1, volume + 0.1)); break;
        case 'ArrowDown':  e.preventDefault(); changeVolume(Math.max(0, volume - 0.1)); break;
        case 'KeyM':       e.preventDefault(); toggleMute(); break;
        case 'KeyF':       e.preventDefault(); toggleFullscreen(); break;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
      if (e.code === 'Space') {
        const v = videoRef.current;
        if (v) v.playbackRate = 1.0;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup',   onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup',   onKeyUp);
    };
  }, [skip, toggleMute, toggleFullscreen, volume, changeVolume]);

  // ── DERIVED VALUES ────────────────────────────────────────────────────────
  // Use seekPreview while dragging so the bar tracks the finger/mouse immediately
  const displayTime   = seekPreview !== null ? seekPreview : currentTime;
  const progressPct   = duration > 0 ? (displayTime  / duration) * 100 : 0;
  const bufferedPct   = duration > 0 ? (buffered     / duration) * 100 : 0;
  const showSpinner   = isLoading || isSeeking;

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl ring-1 ring-slate-800 select-none"
      onMouseMove={showAndScheduleHide}
      onMouseEnter={() => { setShowControls(true); scheduleHide(); }}
      onMouseLeave={() => scheduleHide()}
      onTouchStart={() => { setShowControls(true); scheduleHide(); }}
    >
      {/* ── Video element ── */}
      <video
        ref={videoRef}
        poster={poster}
        playsInline
        preload="auto"
        className="w-full h-full object-contain"
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
      />

      {/* ── Spinner (initial load + seeking) ── */}
      {showSpinner && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-none">
          <div className="relative flex items-center justify-center">
            <div className="w-14 h-14 rounded-full border-4 border-white/20 border-t-indigo-400 animate-spin" />
            {isSeeking && (
              <span className="absolute text-[10px] font-bold text-white/60">
                {formatTime(displayTime)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Speed badge ── */}
      {playbackRate > 1 && !showSpinner && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm pointer-events-none">
          ⚡ {playbackRate}x
        </div>
      )}

      {/* ── Error overlay ── */}
      {error && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-gray-950/95 text-white p-6 text-center">
          <svg className="w-12 h-12 text-red-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <p className="font-bold text-red-400 mb-1">Playback Error</p>
          <p className="text-sm text-slate-400">{error}</p>
        </div>
      )}

      {/* ── Controls bar ── */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent px-4 pt-8 pb-3 transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Progress bar ── */}
        <div
          ref={progressRef}
          className="relative h-1 mb-3 cursor-pointer group/bar"
          style={{ touchAction: 'none' }}
          onMouseDown={handleProgressMouseDown}
          onTouchStart={handleProgressTouchStart}
        >
          {/* Track background */}
          <div className="absolute inset-0 bg-white/20 rounded-full" />

          {/* Buffered bar */}
          <div
            className="absolute top-0 left-0 h-full bg-white/30 rounded-full transition-all duration-300 pointer-events-none"
            style={{ width: `${bufferedPct}%` }}
          />

          {/* Played bar */}
          <div
            className="absolute top-0 left-0 h-full bg-indigo-500 rounded-full pointer-events-none transition-all duration-100"
            style={{ width: `${progressPct}%` }}
          />

          {/* Thumb — bigger on hover */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover/bar:opacity-100 transition-all duration-150 pointer-events-none"
            style={{ left: `${progressPct}%` }}
          />

          {/* Seek time tooltip while dragging */}
          {seekPreview !== null && (
            <div
              className="absolute -top-8 -translate-x-1/2 bg-black/90 text-white text-xs font-mono px-2 py-1 rounded pointer-events-none whitespace-nowrap"
              style={{ left: `${progressPct}%` }}
            >
              {formatTime(seekPreview)}
            </div>
          )}
        </div>

        {/* ── Bottom controls row ── */}
        <div className="flex items-center gap-3 text-white">

          {/* Play/Pause */}
          <button onClick={togglePlay} className="hover:text-indigo-400 transition shrink-0" title="Play/Pause (Space)">
            {isPlaying ? (
              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
            ) : (
              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            )}
          </button>

          {/* Skip back 10s */}
          <button onClick={() => skip(-10)} className="hover:text-indigo-400 transition shrink-0" title="Back 10s (←)">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
              <text x="9" y="15" fontSize="5" fill="currentColor" fontWeight="bold">10</text>
            </svg>
          </button>

          {/* Skip forward 10s */}
          <button onClick={() => skip(10)} className="hover:text-indigo-400 transition shrink-0" title="Forward 10s (→)">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/>
              <text x="9" y="15" fontSize="5" fill="currentColor" fontWeight="bold">10</text>
            </svg>
          </button>

          {/* Time display */}
          <span className="text-xs font-mono text-slate-300 shrink-0 tabular-nums">
            {formatTime(displayTime)} / {formatTime(duration)}
          </span>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Volume */}
          <div className="hidden sm:flex items-center gap-1.5 group/vol">
            <button onClick={toggleMute} className="hover:text-indigo-400 transition shrink-0" title="Mute (M)">
              {isMuted || volume === 0 ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16.5 12A4.5 4.5 0 0014 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                </svg>
              ) : volume < 0.5 ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.5 12A4.5 4.5 0 0016 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                </svg>
              )}
            </button>
            <input
              type="range"
              min="0" max="1" step="0.05"
              value={isMuted ? 0 : volume}
              onChange={e => changeVolume(Number(e.target.value))}
              className="w-16 accent-indigo-500 cursor-pointer"
              title="Volume (↑↓)"
            />
          </div>

          {/* Playback speed */}
          <div className="hidden md:flex items-center gap-1 text-xs text-slate-400 shrink-0">
            <span className="text-[10px]">Hold Space 2×</span>
          </div>

          {/* Fullscreen */}
          <button onClick={toggleFullscreen} className="hover:text-indigo-400 transition shrink-0" title="Fullscreen (F)">
            {isFullscreen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 9V5m0 4H5m10-4v4m0 0h4M9 15v4m0-4H5m10 4v-4m0 0h4"/>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HlsPlayer;