import React from 'react';
import { User } from '../../types';
import { Play, X, Loader2, Clock, RefreshCw, AlertCircle } from 'lucide-react';
import CustomVideoPlayer from '../CustomVideoPlayer';

export interface RecordingPlayerModalProps {
  activeRecording: any;
  user: User | null;
  playbackLoading: boolean;
  playbackProcessing: boolean;
  processingMessage: string;
  playbackError: string;
  playbackStreamUrl: string | null;
  onClose: () => void;
  onRetry: () => void;
}

export const RecordingPlayerModal: React.FC<RecordingPlayerModalProps> = ({
  activeRecording,
  user,
  playbackLoading,
  playbackProcessing,
  processingMessage,
  playbackError,
  playbackStreamUrl,
  onClose,
  onRetry
}) => {
  if (!activeRecording) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="w-full max-w-5xl bg-[#131A3F] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="h-14 px-4 sm:px-6 bg-[#0B0F19] border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
              <Play className="w-3.5 h-3.5 fill-current" />
              RECORDING
            </span>
            <h3 className="text-sm sm:text-base font-bold text-white truncate max-w-sm sm:max-w-md md:max-w-lg">
              {activeRecording.title}
            </h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close recording player"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Embedded Video Surface */}
        <div className="aspect-video w-full bg-black relative flex items-center justify-center overflow-hidden flex-1">
          {playbackLoading ? (
            <div className="flex flex-col items-center gap-3 text-slate-300">
              <Loader2 className="w-10 h-10 text-[#1F81FC] animate-spin" />
              <span className="text-sm font-semibold text-white">Fetching Class Recording...</span>
              <span className="text-xs text-slate-400">Verifying video stream access</span>
            </div>
          ) : playbackProcessing ? (
            <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center max-w-lg mx-auto">
              <div className="relative mb-5">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
                  <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
                </div>
                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full animate-ping" />
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 mb-3 uppercase tracking-wider">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Recording Under Processing
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Replay Will Be Available in a Few Minutes</h3>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-6">
                {processingMessage || 'The live stream just ended and the recording is currently being processed by Webinar.gg. Please wait a few moments — it will be available to watch shortly.'}
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={onRetry}
                  disabled={playbackLoading}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-xs font-bold text-white transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${playbackLoading ? 'animate-spin' : ''}`} />
                  <span>Check If Ready</span>
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          ) : playbackError ? (
            <div className="flex flex-col items-center gap-3 p-6 text-center max-w-md">
              <AlertCircle className="w-10 h-10 text-rose-400" />
              <span className="text-sm font-bold text-white">Playback Error</span>
              <span className="text-xs text-slate-300 leading-relaxed">{playbackError}</span>
              <button
                onClick={onRetry}
                className="px-5 py-2.5 rounded-xl bg-[#1F81FC] hover:bg-blue-600 text-xs font-bold text-white transition-all shadow-md"
              >
                Retry Loading Replay
              </button>
            </div>
          ) : playbackStreamUrl ? (
            playbackStreamUrl.match(/\.(mp4|webm|ogg|m4v|m3u8)(\?.*)?$/i) || !playbackStreamUrl.includes('webinar.gg') ? (
              <div className="w-full h-full flex items-center justify-center p-2">
                <CustomVideoPlayer
                  src={playbackStreamUrl}
                  title={activeRecording.title || "Class Recording"}
                  poster={activeRecording.thumbnail}
                  autoPlay={true}
                  watermarkText={user ? `${user.phoneNumber || user.email} | ${user.id.slice(-6).toUpperCase()}` : undefined}
                  className="w-full max-w-5xl aspect-video rounded-xl shadow-2xl"
                />
              </div>
            ) : (
              <iframe
                src={playbackStreamUrl}
                allow="camera; microphone; fullscreen; display-capture; autoplay; encrypted-media"
                className="w-full h-full border-none"
                title={activeRecording.title || "Class Recording"}
              />
            )
          ) : null}
        </div>

        {/* Info Footer */}
        <div className="px-4 sm:px-6 py-3 bg-[#131A3F] border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-4">
            {activeRecording.course && (
              <span>Course: <strong className="text-slate-200">{activeRecording.course}</strong></span>
            )}
            {activeRecording.teacherName && (
              <span>Instructor: <strong className="text-slate-200">{activeRecording.teacherName}</strong></span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Close Player
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecordingPlayerModal;
