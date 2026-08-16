import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { 
  Play, Pause, Volume2, VolumeX, Maximize, Minimize, 
  Settings, FileText, ExternalLink,
  SkipForward, SkipBack
} from 'lucide-react';
import { CourseResource } from '../types';

interface CustomVideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  nextTitle?: string;
  onNext?: () => void;
  onPrev?: () => void;
  resources?: CourseResource[];
  autoPlay?: boolean;
  watermarkText?: string; // e.g. "9876543210 | ID:abc123" — identifies the viewer
}

const CustomVideoPlayer: React.FC<CustomVideoPlayerProps> = ({ 
  src, poster, title, nextTitle, onNext, onPrev, resources = [], autoPlay = false, watermarkText
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Safely store onNext callback without triggering re-renders
  const onNextRef = useRef(onNext);
  useEffect(() => {
    onNextRef.current = onNext;
  }, [onNext]);

  // Persistent refs for spacebar logic
  const spaceTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // State
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isHoldingSpace, setIsHoldingSpace] = useState(false);
  const [qualityLevels, setQualityLevels] = useState<{height: number, level: number}[]>([]);
  const [currentQuality, setCurrentQuality] = useState(-1); // -1 is auto
  const [showSettings, setShowSettings] = useState(false);
  const [showResources, setShowResources] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showNextOverlay, setShowNextOverlay] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Watermark: random position that shifts every 6–10 seconds
  const [wmPos, setWmPos] = useState({ top: '8%', left: '5%' });
  const [wmOpacity, setWmOpacity] = useState(0.5);

  useEffect(() => {
    if (!watermarkText) return;
    const move = () => {
      setWmPos({
        top:  `${5 + Math.random() * 80}%`,
        left: `${3 + Math.random() * 75}%`,
      });
      setWmOpacity(0.35 + Math.random() * 0.3);
    };
    // Randomise initial position immediately
    move();
    const intervalMs = 6000 + Math.random() * 4000;
    const id = setInterval(move, intervalMs);
    return () => clearInterval(id);
  }, [watermarkText]);

  // Initialize HLS
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Reset all state whenever src changes
    setLoading(true);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setShowNextOverlay(false);
    setQualityLevels([]);
    setCurrentQuality(-1);
    setErrorMsg(null);

    const handleLoadedMetadata = () => {
      if (isFinite(video.duration)) setDuration(video.duration);
    };
    const handleDurationChange = () => {
      if (isFinite(video.duration) && video.duration > 0) setDuration(video.duration);
    };
    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (isFinite(video.duration) && video.duration > 0) setDuration(video.duration);
    };
    
    const handleWaiting  = () => setLoading(true);
    const handleCanPlay  = () => setLoading(false);
    const handlePlaying  = () => setLoading(false);
    
    // Stop spinner if the video file itself is broken/404s
    const handleError = () => {
      setLoading(false);
      setErrorMsg('Video file could not be loaded or is unavailable.');
    };

    const handlePlay  = () => { setIsPlaying(true); setShowNextOverlay(false); };
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setShowControls(true);
      if (onNextRef.current) setShowNextOverlay(true);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('timeupdate',     handleTimeUpdate);
    video.addEventListener('waiting',        handleWaiting);
    video.addEventListener('canplay',        handleCanPlay);
    video.addEventListener('playing',        handlePlaying);
    video.addEventListener('error',          handleError);
    video.addEventListener('play',           handlePlay);
    video.addEventListener('pause',          handlePause);
    video.addEventListener('ended',          handleEnded);

    if (Hls.isSupported() && src.includes('.m3u8')) {
      const hls = new Hls({
        // Let hls.js handle its own default buffer limits!
        xhrSetup: (xhr: XMLHttpRequest, url: string) => {
          if (url.includes('/api/video/key/')) {
            // Dynamically rewrite the URL to point to the current frontend's domain!
            // This forces the video player to ask for the decryption key from the same server it loaded the website from.
            const videoId = url.split('/').pop();
            const localApiBase = `${window.location.origin}/api`;
            const newUrl = `${localApiBase}/video/key/${videoId}`;
            
            xhr.open('GET', newUrl, true);
            
            const token = localStorage.getItem('token');
            if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          }
        },
      });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        const levels = data.levels.map((l, index) => ({ height: l.height, level: index }));
        setQualityLevels(levels);
        setLoading(false);
        if (autoPlay) video.play().catch(() => {});
      });

      let networkRetries = 0;
      hls.on(Hls.Events.ERROR, (_event, data) => {
        console.error('[HLS] error', data.type, data.details, 'fatal:', data.fatal);
        if (!data.fatal) return;
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            networkRetries++;
            if (networkRetries <= 3) {
              console.error(`[HLS] fatal network error — retry ${networkRetries}/3`);
              hls.startLoad();
            } else {
              console.error('[HLS] network error: max retries reached — destroying');
              hls.destroy();
              setLoading(false);
              setErrorMsg('Video could not be loaded. It may still be processing or unavailable.');
            }
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            console.error('[HLS] fatal media error — recovering');
            hls.recoverMediaError();
            break;
          default:
            console.error('[HLS] unrecoverable error — destroying');
            hls.destroy();
            setLoading(false);
            setErrorMsg('Video could not be loaded. It may still be processing or unavailable.');
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
    } else {
      video.src = src;
    }

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('timeupdate',     handleTimeUpdate);
      video.removeEventListener('waiting',        handleWaiting);
      video.removeEventListener('canplay',        handleCanPlay);
      video.removeEventListener('playing',        handlePlaying);
      video.removeEventListener('error',          handleError);
      video.removeEventListener('play',           handlePlay);
      video.removeEventListener('pause',          handlePause);
      video.removeEventListener('ended',          handleEnded);
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [src, autoPlay]); // Removed onNext from dependencies

  // Controls Visibility
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  };

  const handleMouseLeave = () => {
    if (isPlaying) setShowControls(false);
  };

  // Playback Control
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch((err) => {
        if (err.name !== 'AbortError') console.error('[Player] play() error:', err);
      });
    } else {
      video.pause();
    }
  }, []);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const time = parseFloat(e.target.value);
    video.currentTime = time;
    setCurrentTime(time);
  };

  const skip = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(Math.max(video.currentTime + seconds, 0), video.duration);
  }, []);

  // Volume Control
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isMuted) {
      video.volume = volume || 1;
      setIsMuted(false);
    } else {
      video.volume = 0;
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  // Fullscreen
  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Quality
  const changeQuality = (level: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = level;
      setCurrentQuality(level);
      setShowSettings(false);
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      switch(e.code) {
        case 'ArrowLeft':
          skip(-5);
          break;
        case 'ArrowRight':
          skip(5);
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (videoRef.current) {
            const newVol = Math.min(volume + 0.1, 1);
            videoRef.current.volume = newVol;
            setVolume(newVol);
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (videoRef.current) {
            const newVol = Math.max(volume - 0.1, 0);
            videoRef.current.volume = newVol;
            setVolume(newVol);
          }
          break;
        case 'KeyF':
          toggleFullscreen();
          break;
        case 'KeyM':
          toggleMute();
          break;
      }
    };

    const handleSpaceDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        spaceTimer.current = setTimeout(() => {
          isLongPress.current = true;
          if (videoRef.current) videoRef.current.playbackRate = 2.0;
          setIsHoldingSpace(true);
        }, 200); 
      }
    };

    const handleSpaceUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        if (spaceTimer.current) clearTimeout(spaceTimer.current);
        
        if (isLongPress.current) {
          // Was holding
          if (videoRef.current) videoRef.current.playbackRate = playbackRate;
          setIsHoldingSpace(false);
          isLongPress.current = false;
        } else {
          // Was a tap
          togglePlay();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown); 
    window.addEventListener('keydown', handleSpaceDown); 
    window.addEventListener('keyup', handleSpaceUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keydown', handleSpaceDown);
      window.removeEventListener('keyup', handleSpaceUp);
    };
  }, [volume, playbackRate, togglePlay, skip, toggleMute]);

  // Format time
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div 
      ref={containerRef}
      className={`relative bg-black group overflow-hidden ${isFullscreen ? 'w-full h-full' : 'w-full aspect-video rounded-xl shadow-xl'}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain cursor-pointer"
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        poster={poster}
        playsInline
      />

      {/* Error Overlay */}
      {errorMsg && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-950/95 z-20 flex-col gap-3 p-6 text-center">
          <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <p className="text-red-400 font-semibold">Playback Error</p>
          <p className="text-sm text-gray-400">{errorMsg}</p>
        </div>
      )}

      {/* Loading Spinner */}
      {loading && !errorMsg && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-20 pointer-events-none">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
        </div>
      )}

      {/* 2x Speed Overlay */}
      {isHoldingSpace && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-1 rounded-full text-sm font-bold backdrop-blur-sm animate-in fade-in zoom-in duration-200">
          2x Speed
        </div>
      )}

      {/* Dynamic Watermark */}
      {watermarkText && (
        <div
          style={{
            position: 'absolute',
            top: wmPos.top,
            left: wmPos.left,
            color: 'white',
            fontSize: '11px',
            fontFamily: 'monospace',
            opacity: wmOpacity,
            pointerEvents: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,1)',
            transition: 'top 3s ease, left 3s ease, opacity 2s ease',
            zIndex: 40,
            whiteSpace: 'nowrap',
            letterSpacing: '0.03em',
          }}
          aria-hidden="true"
        >
          {watermarkText}
        </div>
      )}

      {/* Title Overlay */}
      {showControls && title && (
        <div className="absolute top-0 left-0 p-4 bg-gradient-to-b from-black/80 to-transparent w-full z-10 pointer-events-none">
          <h2 className="text-white font-bold text-lg drop-shadow-md">{title}</h2>
        </div>
      )}

      {/* Next Video Overlay */}
      {showNextOverlay && nextTitle && onNext && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-40 animate-in fade-in duration-300">
          <div className="text-center p-8">
            <p className="text-gray-400 text-sm uppercase tracking-widest mb-2">Up Next</p>
            <h3 className="text-white text-2xl font-bold mb-6">{nextTitle}</h3>
            <div className="flex gap-4 justify-center">
              <button 
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.currentTime = 0;
                    videoRef.current.play();
                  }
                  setShowNextOverlay(false);
                }}
                className="px-6 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
              >
                Replay
              </button>
              <button 
                onClick={onNext}
                className="px-6 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors flex items-center gap-2"
              >
                Play Next <SkipForward className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Center Play Button */}
      {!isPlaying && showControls && !loading && !showNextOverlay && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/40 p-4 rounded-full backdrop-blur-sm animate-in zoom-in duration-200">
            <Play className="w-12 h-12 text-white fill-white" />
          </div>
        </div>
      )}

      {/* Resources Overlay */}
      {showResources && (
        <div className="absolute inset-y-0 right-0 w-80 bg-black/90 backdrop-blur-md p-6 z-30 animate-in slide-in-from-right duration-300 border-l border-white/10">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-white font-bold text-lg">Resources</h3>
            <button onClick={() => setShowResources(false)} className="text-white/70 hover:text-white">
              <Minimize className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-3">
            {resources.map((res, idx) => (
              <a 
                key={idx} 
                href={res.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white group"
              >
                <div className="p-2 bg-indigo-500/20 rounded text-indigo-400 group-hover:text-indigo-300">
                  {res.type === 'pdf' ? <FileText className="w-5 h-5" /> : <ExternalLink className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{res.title}</p>
                  <p className="text-xs text-white/50 uppercase">{res.type}</p>
                </div>
              </a>
            ))}
            {resources.length === 0 && (
              <p className="text-white/50 text-sm italic">No resources available for this lesson.</p>
            )}
          </div>
        </div>
      )}

      {/* Control Bar */}
      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-4 pb-4 pt-12 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'} z-20`}>
        
        {/* Progress Bar */}
        <div className="relative group mb-4 h-1.5 cursor-pointer">
          <div className="absolute inset-0 bg-white/30 rounded-full"></div>
          <div 
            className="absolute top-0 left-0 h-full bg-indigo-500 rounded-full relative"
            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full scale-0 group-hover:scale-100 transition-transform shadow-lg"></div>
          </div>
          <input 
            type="range" 
            min="0" 
            max={duration || 100} 
            value={currentTime} 
            onChange={handleSeek}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Play/Pause */}
            <button onClick={togglePlay} className="text-white hover:text-indigo-400 transition-colors">
              {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
            </button>

            {/* Next/Prev */}
            <div className="flex items-center gap-2">
              <button onClick={onPrev} disabled={!onPrev} className="text-white/70 hover:text-white disabled:opacity-30">
                <SkipBack className="w-5 h-5" />
              </button>
              <button onClick={onNext} disabled={!onNext} className="text-white/70 hover:text-white disabled:opacity-30">
                <SkipForward className="w-5 h-5" />
              </button>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-2 group/vol">
              <button onClick={toggleMute} className="text-white hover:text-indigo-400">
                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <div className="w-0 overflow-hidden group-hover/vol:w-24 transition-all duration-300">
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.1" 
                  value={isMuted ? 0 : volume} 
                  onChange={handleVolumeChange}
                  className="w-20 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
            </div>

            {/* Time */}
            <div className="text-xs font-mono font-medium text-white/90">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Resources Toggle */}
            <button 
              onClick={() => setShowResources(!showResources)} 
              className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${showResources ? 'bg-indigo-600 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Resources</span>
            </button>

            {/* Settings */}
            <div className="relative">
              <button 
                onClick={() => setShowSettings(!showSettings)} 
                className={`text-white hover:text-indigo-400 transition-transform ${showSettings ? 'rotate-45' : ''}`}
              >
                <Settings className="w-5 h-5" />
              </button>
              
              {showSettings && (
                <div className="absolute bottom-full right-0 mb-4 w-48 bg-black/90 backdrop-blur-md rounded-xl overflow-hidden border border-white/10 animate-in slide-in-from-bottom-2 duration-200">
                  <div className="p-2 space-y-1">
                    <p className="px-3 py-2 text-xs font-bold text-white/50 uppercase tracking-wider">Playback Speed</p>
                    {[0.5, 1, 1.5, 2].map(rate => (
                      <button
                        key={rate}
                        onClick={() => {
                          if (videoRef.current) videoRef.current.playbackRate = rate;
                          setPlaybackRate(rate);
                          setShowSettings(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-white/10 rounded flex justify-between ${playbackRate === rate ? 'text-indigo-400 font-bold' : 'text-white'}`}
                      >
                        {rate}x
                        {playbackRate === rate && <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>}
                      </button>
                    ))}
                    
                    {qualityLevels.length > 0 && (
                      <>
                        <div className="h-px bg-white/10 my-2"></div>
                        <p className="px-3 py-2 text-xs font-bold text-white/50 uppercase tracking-wider">Quality</p>
                        <button
                          onClick={() => changeQuality(-1)}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-white/10 rounded flex justify-between ${currentQuality === -1 ? 'text-indigo-400 font-bold' : 'text-white'}`}
                        >
                          Auto
                          {currentQuality === -1 && <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>}
                        </button>
                        {qualityLevels.map((q) => (
                          <button
                            key={q.level}
                            onClick={() => changeQuality(q.level)}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-white/10 rounded flex justify-between ${currentQuality === q.level ? 'text-indigo-400 font-bold' : 'text-white'}`}
                          >
                            {q.height}p
                            {currentQuality === q.level && <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Fullscreen */}
            <button onClick={toggleFullscreen} className="text-white hover:text-indigo-400">
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomVideoPlayer;