import React, { useState, useEffect } from 'react';

const LiveTimer = () => {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(timer);
  }, []);
  
  const h = Math.floor(elapsed / 3600).toString().padStart(2, '0');
  const m = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
  const s = (elapsed % 60).toString().padStart(2, '0');
  
  return <span>{h}:{m}:{s}</span>;
};
import { Mic, MicOff, Camera, CameraOff, MonitorUp, Circle as Record, Square, Users, MessageSquare, Hand, X, Settings } from 'lucide-react';
import { useLocalParticipant, useDaily, useScreenShare } from '@daily-co/daily-react';

interface TeacherControlsProps {
  onEndClass: () => void;
  isTeacher?: boolean;
  className?: string;
  onRaiseHand?: () => void;
  isHandRaised?: boolean;
}

export const TeacherControls: React.FC<TeacherControlsProps> = ({ onEndClass, isTeacher = false, className = '', onRaiseHand, isHandRaised = false }) => {
  const localParticipant = useLocalParticipant();
  const daily = useDaily();
  const { isSharingScreen, startScreenShare, stopScreenShare } = useScreenShare();
  
  const micEnabled = localParticipant?.audio;
  const camEnabled = localParticipant?.video;
  const isScreenSharing = isSharingScreen;

  const toggleMic = () => {
    if (daily) daily.setLocalAudio(!micEnabled);
  };

  const toggleCam = () => {
    if (daily) daily.setLocalVideo(!camEnabled);
  };

  const toggleScreenShare = () => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  };

  return (
    <div className={`w-full bg-slate-900/95 backdrop-blur-md border-t border-slate-800 p-2 md:p-4 flex flex-wrap md:flex-nowrap items-center justify-between gap-3 ${className}`}>
      
      {/* Left: Class Info / Quick Settings */}
      <div className="flex items-center gap-2 md:gap-4 w-auto md:w-1/3 order-2 md:order-1">
        <div className="flex items-center gap-2 text-slate-300 bg-slate-800/50 px-2 md:px-3 py-1 md:py-1.5 rounded-lg border border-slate-700/50">
          <Record className="w-4 h-4 text-emerald-500 animate-pulse" />
          <span className="text-xs md:text-sm font-medium"><LiveTimer /></span>
        </div>
        <button className="hidden md:block text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-800">
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Center: Core Controls */}
      <div className="flex items-center justify-center gap-2 md:gap-3 w-full md:w-1/3 order-1 md:order-2">
        <button 
          onClick={toggleMic}
          className={`p-2.5 md:p-3.5 rounded-full transition-all ${
            micEnabled 
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700' 
              : 'bg-red-500/20 hover:bg-red-500/30 text-red-500 border border-red-500/30'
          }`}
          title={micEnabled ? 'Mute' : 'Unmute'}
        >
          {micEnabled ? <Mic className="w-4 h-4 md:w-5 md:h-5" /> : <MicOff className="w-4 h-4 md:w-5 md:h-5" />}
        </button>

        <button 
          onClick={toggleCam}
          className={`p-2.5 md:p-3.5 rounded-full transition-all ${
            camEnabled 
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700' 
              : 'bg-red-500/20 hover:bg-red-500/30 text-red-500 border border-red-500/30'
          }`}
          title={camEnabled ? 'Stop Video' : 'Start Video'}
        >
          {camEnabled ? <Camera className="w-4 h-4 md:w-5 md:h-5" /> : <CameraOff className="w-4 h-4 md:w-5 md:h-5" />}
        </button>

        <button 
          onClick={toggleScreenShare}
          className={`p-2.5 md:p-3.5 rounded-full transition-all ${
            isScreenSharing 
              ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' 
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
          }`}
          title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
        >
          <MonitorUp className="w-4 h-4 md:w-5 md:h-5" />
        </button>
        
        {!isTeacher && (
          <button 
            onClick={onRaiseHand}
            className={`p-2.5 md:p-3.5 rounded-full transition-all ${
              isHandRaised 
                ? 'bg-yellow-500 hover:bg-yellow-400 text-white shadow-[0_0_15px_rgba(234,179,8,0.4)]' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
            title={isHandRaised ? 'Lower Hand' : 'Raise Hand'}
          >
            <Hand className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        )}
      </div>

      {/* Right: End Class & Sidebar Toggles */}
      <div className="flex items-center justify-end gap-2 md:gap-3 w-auto md:w-1/3 order-3">
        <button 
          onClick={onEndClass}
          className={`${isTeacher ? 'bg-red-500 hover:bg-red-600' : 'bg-slate-700 hover:bg-slate-600'} text-white font-medium px-3 md:px-5 py-2 md:py-2.5 text-sm md:text-base rounded-lg transition-all flex items-center gap-1 md:gap-2 shadow-lg`}
        >
          <X className="w-4 h-4 md:w-5 md:h-5" />
          <span className="hidden sm:inline">{isTeacher ? 'End Class for All' : 'Leave Class'}</span>
          <span className="sm:hidden">{isTeacher ? 'End' : 'Leave'}</span>
        </button>
      </div>
    </div>
  );
};

export default TeacherControls;
