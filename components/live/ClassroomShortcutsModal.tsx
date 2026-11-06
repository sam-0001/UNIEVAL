import React from 'react';
import { HelpCircle, X, Maximize, Hand, Mic, Monitor, Smartphone, Wifi } from 'lucide-react';

export interface ClassroomShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isInstructor?: boolean;
}

export const ClassroomShortcutsModal: React.FC<ClassroomShortcutsModalProps> = ({
  isOpen,
  onClose,
  isInstructor = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div 
        className="w-full max-w-lg bg-[#131A3F] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-[#0B0F19] border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-[#7F26FE] flex items-center justify-center">
              <HelpCircle className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Classroom Guide & Shortcuts</h3>
              <p className="text-[11px] text-slate-400">Tips for an optimal interactive session</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto text-xs text-slate-300">
          {/* Shortcuts section */}
          <div>
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              Keyboard Shortcuts & Navigation
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl bg-[#0B0F19]/80 border border-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Maximize className="w-3.5 h-3.5 text-[#1F81FC]" />
                  <span>Toggle Fullscreen</span>
                </span>
                <kbd className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono font-bold text-white border border-slate-700">F</kbd>
              </div>

              <div className="p-2.5 rounded-xl bg-[#0B0F19]/80 border border-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Maximize className="w-3.5 h-3.5 text-slate-400" />
                  <span>Exit Fullscreen</span>
                </span>
                <kbd className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono font-bold text-white border border-slate-700">ESC</kbd>
              </div>
            </div>
          </div>

          {/* Interactive features */}
          <div>
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              Live Classroom Controls
            </h4>
            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-[#0B0F19]/60 border border-slate-800 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Hand className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white">Ask Doubts & Raise Hand</div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    Click the <strong>Raise Hand</strong> button in the bottom studio toolbar. The instructor will invite you onto the live stage with voice and video.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#0B0F19]/60 border border-slate-800 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-[#1F81FC] flex items-center justify-center shrink-0 mt-0.5">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white">Mobile Landscape Auto-Lock</div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    Tapping the Fullscreen button on smartphones automatically locks into horizontal landscape orientation for an immersive chalkboard view.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#0B0F19]/60 border border-slate-800 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Wifi className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white">Adaptive Low Latency Stream</div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    WebRTC adjusts automatically to your connection. For the highest quality 1080p stream, connect to stable Wi-Fi or 5G.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-[#0B0F19] border-t border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#1F81FC] to-[#7F26FE] hover:opacity-95 text-white text-xs font-bold transition-all shadow-md active:scale-95"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClassroomShortcutsModal;
