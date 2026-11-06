import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Camera, 
  CameraOff, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Settings2, 
  CheckCircle2, 
  AlertTriangle,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { playClassStartChime } from './CalendarUtils';

export interface PreflightDeviceCheckProps {
  onReady?: (devices: { videoEnabled: boolean; audioEnabled: boolean }) => void;
  className?: string;
  compact?: boolean;
}

export const PreflightDeviceCheck: React.FC<PreflightDeviceCheckProps> = ({
  onReady,
  className = '',
  compact = false
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [micActive, setMicActive] = useState<boolean>(false);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [hasPermissionError, setHasPermissionError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);

  // Available devices
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');
  const [selectedAudioId, setSelectedAudioId] = useState<string>('');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [speakerTesting, setSpeakerTesting] = useState<boolean>(false);

  // Stop active media stream tracks
  const stopTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  // Enumerate connected media devices
  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const vDevs = devices.filter(d => d.kind === 'videoinput');
      const aDevs = devices.filter(d => d.kind === 'audioinput');
      setVideoDevices(vDevs);
      setAudioDevices(aDevs);

      if (!selectedVideoId && vDevs.length > 0) setSelectedVideoId(vDevs[0].deviceId);
      if (!selectedAudioId && aDevs.length > 0) setSelectedAudioId(aDevs[0].deviceId);
    } catch (err) {
      // Ignore
    }
  }, [selectedVideoId, selectedAudioId]);

  // Start media preview stream
  const startPreview = useCallback(async (wantVideo = true, wantAudio = true) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setHasPermissionError('Camera/Microphone access is not supported on this browser.');
      return;
    }

    setIsInitializing(true);
    setHasPermissionError(null);
    stopTracks();

    try {
      const constraints: MediaStreamConstraints = {
        video: wantVideo
          ? selectedVideoId
            ? { deviceId: { exact: selectedVideoId }, width: { ideal: 640 }, height: { ideal: 360 } }
            : { width: { ideal: 640 }, height: { ideal: 360 } }
          : false,
        audio: wantAudio
          ? selectedAudioId
            ? { deviceId: { exact: selectedAudioId }, echoCancellation: true, noiseSuppression: true }
            : { echoCancellation: true, noiseSuppression: true }
          : false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Attach video stream
      if (videoRef.current && wantVideo) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      setCameraActive(wantVideo);
      setMicActive(wantAudio);

      // Setup audio analyzer for microphone volume meter
      if (wantAudio) {
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length > 0) {
          try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const audioCtx = new AudioContextClass();
            audioContextRef.current = audioCtx;
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64;
            analyserRef.current = analyser;

            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const checkAudioLevel = () => {
              if (!analyserRef.current) return;
              analyserRef.current.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < bufferLength; i++) {
                sum += dataArray[i];
              }
              const average = sum / bufferLength;
              // Map 0-255 to percentage 0-100
              const percentage = Math.min(100, Math.round((average / 128) * 100));
              setAudioLevel(percentage);
              animationFrameRef.current = requestAnimationFrame(checkAudioLevel);
            };

            checkAudioLevel();
          } catch (audioErr) {
            console.warn('Audio meter initialization skipped:', audioErr);
          }
        }
      }

      await refreshDevices();
    } catch (err: any) {
      console.warn('Media preview error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setHasPermissionError('Permission denied. Please allow camera and microphone permissions in browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setHasPermissionError('No camera or microphone device found.');
      } else {
        setHasPermissionError('Could not connect to camera or microphone. It might be in use by another app.');
      }
      setCameraActive(false);
      setMicActive(false);
    } finally {
      setIsInitializing(false);
    }
  }, [selectedVideoId, selectedAudioId, refreshDevices, stopTracks]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      stopTracks();
    };
  }, [stopTracks]);

  // Toggle Camera
  const handleToggleCamera = () => {
    if (cameraActive) {
      if (streamRef.current) {
        streamRef.current.getVideoTracks().forEach(t => t.stop());
      }
      setCameraActive(false);
    } else {
      startPreview(true, micActive);
    }
  };

  // Toggle Microphone
  const handleToggleMic = () => {
    if (micActive) {
      if (streamRef.current) {
        streamRef.current.getAudioTracks().forEach(t => t.stop());
      }
      setMicActive(false);
      setAudioLevel(0);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    } else {
      startPreview(cameraActive, true);
    }
  };

  // Test Speaker
  const handleTestSpeaker = () => {
    setSpeakerTesting(true);
    playClassStartChime();
    setTimeout(() => setSpeakerTesting(false), 900);
  };

  return (
    <div className={`w-full bg-[#131A3F]/80 backdrop-blur-xl border border-slate-700/60 rounded-2xl overflow-hidden shadow-2xl flex flex-col ${className}`}>
      {/* Header bar */}
      <div className="px-4 py-3 bg-[#0B0F19]/90 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#1F81FC]" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Device Pre-flight Check</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Configure Devices"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Preview Surface */}
      <div className="p-4 sm:p-5 flex flex-col md:flex-row gap-4 sm:gap-6 items-center">
        {/* Video Canvas Box */}
        <div className="relative w-full md:w-64 aspect-video rounded-xl bg-black border border-slate-800 overflow-hidden flex items-center justify-center shrink-0 shadow-inner group">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover -scale-x-100 ${cameraActive ? 'block' : 'hidden'}`}
          />
          {!cameraActive && (
            <div className="flex flex-col items-center justify-center p-4 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center mb-2 text-slate-400">
                <CameraOff className="w-6 h-6" />
              </div>
              <span className="text-xs font-medium text-slate-400">Camera is off</span>
              <span className="text-[10px] text-slate-500 mt-0.5">Click Start Camera to preview</span>
            </div>
          )}

          {isInitializing && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center gap-2 text-xs text-white">
              <RefreshCw className="w-4 h-4 animate-spin text-[#1F81FC]" />
              <span>Connecting device...</span>
            </div>
          )}

          {/* Overlay Pill with device state */}
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 z-10">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border backdrop-blur-md ${
              cameraActive 
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                : 'bg-slate-900/80 text-slate-400 border-slate-700'
            }`}>
              {cameraActive ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <CameraOff className="w-3 h-3" />}
              {cameraActive ? 'Camera Live' : 'Cam Muted'}
            </span>
          </div>
        </div>

        {/* Device Controls & Audio Meter */}
        <div className="flex-1 w-full space-y-4">
          {/* Permission error banner */}
          {hasPermissionError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="leading-snug">{hasPermissionError}</div>
            </div>
          )}

          {/* Action toggle buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button
              onClick={handleToggleCamera}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all active:scale-95 ${
                cameraActive
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {cameraActive ? <Camera className="w-3.5 h-3.5 text-emerald-400" /> : <CameraOff className="w-3.5 h-3.5 text-slate-400" />}
              <span>{cameraActive ? 'Stop Video' : 'Test Camera'}</span>
            </button>

            <button
              onClick={handleToggleMic}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all active:scale-95 ${
                micActive
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {micActive ? <Mic className="w-3.5 h-3.5 text-emerald-400" /> : <MicOff className="w-3.5 h-3.5 text-slate-400" />}
              <span>{micActive ? 'Mute Mic' : 'Test Mic'}</span>
            </button>

            <button
              onClick={handleTestSpeaker}
              disabled={speakerTesting}
              className="col-span-2 sm:col-span-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-50"
            >
              <Volume2 className={`w-3.5 h-3.5 ${speakerTesting ? 'text-[#1F81FC] animate-bounce' : 'text-slate-400'}`} />
              <span>{speakerTesting ? 'Playing Chime...' : 'Test Speaker'}</span>
            </button>
          </div>

          {/* Real-time Microphone Input Level Indicator */}
          <div className="bg-[#0B0F19]/80 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-slate-400" />
                <span>Microphone Volume Level</span>
              </span>
              <span className="font-mono text-[11px] text-slate-400">{audioLevel}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-blue-500 to-indigo-500 transition-all duration-75 rounded-full"
                style={{ width: `${micActive ? audioLevel : 0}%` }}
              />
            </div>
            {!micActive && (
              <p className="text-[10px] text-slate-400 mt-1.5">
                Click <strong>Test Mic</strong> to speak and verify your audio levels.
              </p>
            )}
            {micActive && (
              <p className="text-[10px] text-emerald-400 mt-1.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Listening to microphone input • Speak into your mic to test levels.
              </p>
            )}
          </div>

          {/* Device Selection dropdowns (expandable) */}
          {showSettings && (
            <div className="pt-2 border-t border-slate-800/80 space-y-2 animate-fadeIn text-xs">
              {videoDevices.length > 0 && (
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 mb-1 block">Video Input Device</label>
                  <select
                    value={selectedVideoId}
                    onChange={(e) => {
                      setSelectedVideoId(e.target.value);
                      if (cameraActive) startPreview(true, micActive);
                    }}
                    className="w-full bg-[#0B0F19] border border-slate-700 rounded-lg p-2 text-white text-xs outline-none focus:border-[#1F81FC]"
                  >
                    {videoDevices.map(d => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Camera ${d.deviceId.slice(0, 5)}...`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {audioDevices.length > 0 && (
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 mb-1 block">Audio Input Device</label>
                  <select
                    value={selectedAudioId}
                    onChange={(e) => {
                      setSelectedAudioId(e.target.value);
                      if (micActive) startPreview(cameraActive, true);
                    }}
                    className="w-full bg-[#0B0F19] border border-slate-700 rounded-lg p-2 text-white text-xs outline-none focus:border-[#1F81FC]"
                  >
                    {audioDevices.map(d => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Microphone ${d.deviceId.slice(0, 5)}...`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PreflightDeviceCheck;
