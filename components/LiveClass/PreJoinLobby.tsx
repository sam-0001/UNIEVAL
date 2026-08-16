import React, { useState, useEffect } from 'react';
import { Camera, CameraOff, Mic, MicOff, Settings, AlertCircle, LogOut } from 'lucide-react';
import { useLocalParticipant, useVideoTrack, useDaily } from '@daily-co/daily-react';

interface PreJoinLobbyProps {
  onJoin: () => void;
  className?: string;
  isReady?: boolean;
}

export const PreJoinLobby: React.FC<PreJoinLobbyProps> = ({ onJoin, className = '', isReady = true }) => {
  const [isJoining, setIsJoining] = useState(false);
  const localParticipant = useLocalParticipant();
  const videoTrack = useVideoTrack(localParticipant?.session_id || '');
  const daily = useDaily();

  useEffect(() => {
    if (daily) {
      daily.startCamera();
    }
  }, [daily]);

  const camEnabled = localParticipant?.video;
  const micEnabled = localParticipant?.audio;

  const toggleCam = () => {
    if (daily) daily.setLocalVideo(!camEnabled);
  };

  const toggleMic = () => {
    if (daily) daily.setLocalAudio(!micEnabled);
  };

  const handleJoin = () => {
    setIsJoining(true);
    onJoin();
  };

  return (
    <div className={`min-h-screen bg-[#0f1115] text-slate-200 flex flex-col items-center justify-center p-6 ${className}`}>
      <div className="w-full max-w-4xl grid md:grid-cols-5 gap-8">
        
        {/* Left Side - Video Preview */}
        <div className="md:col-span-3 space-y-4">
          <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center">
            {camEnabled ? (
              <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
                <video
                  autoPlay
                  muted
                  playsInline
                  ref={(video) => {
                    if (video && videoTrack.persistentTrack) {
                      video.srcObject = new MediaStream([videoTrack.persistentTrack]);
                    }
                  }}
                  className="w-full h-full object-cover transform scale-x-[-1]"
                />
              </div>
            ) : (
              <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center space-y-4">
                <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center border-4 border-slate-950">
                  <CameraOff className="w-8 h-8 text-slate-500" />
                </div>
                <p className="text-slate-400 font-medium">Camera is off</p>
              </div>
            )}

            {/* Quick Controls overlay */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/60 backdrop-blur-md px-6 py-3 rounded-full border border-white/10">
              <button 
                onClick={toggleMic}
                className={`p-3 rounded-full transition-all ${
                  micEnabled 
                    ? 'bg-slate-700/50 hover:bg-slate-600/50 text-white' 
                    : 'bg-red-500 hover:bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                }`}
              >
                {micEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>
              <button 
                onClick={toggleCam}
                className={`p-3 rounded-full transition-all ${
                  camEnabled 
                    ? 'bg-slate-700/50 hover:bg-slate-600/50 text-white' 
                    : 'bg-red-500 hover:bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                }`}
              >
                {camEnabled ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
              </button>
              <div className="w-px h-6 bg-white/20 mx-2"></div>
              <button className="p-3 rounded-full bg-slate-700/50 hover:bg-slate-600/50 text-white transition-colors">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Side - Setup & Join */}
        <div className="md:col-span-2 flex flex-col justify-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-white tracking-tight">Ready to join?</h1>
            <p className="text-slate-400">CS101: Introduction to Data Structures</p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <Mic className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-slate-300 font-medium">Default Microphone</p>
                <div className="mt-2 h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full transition-all duration-300" 
                    style={{ width: micEnabled ? '45%' : '0%' }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="h-px w-full bg-slate-700/50"></div>

            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Camera className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-slate-300 font-medium">FaceTime HD Camera</p>
                <p className="text-slate-500 text-xs mt-0.5">720p at 30fps</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-3 pt-2">
            <button 
              onClick={handleJoin}
              disabled={isJoining || !isReady}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3.5 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.25)] hover:shadow-[0_0_25px_rgba(37,99,235,0.4)] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isJoining ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Joining room...
                </>
              ) : 'Join Now'}
            </button>
            <button className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-3.5 px-6 rounded-xl transition-colors flex items-center justify-center gap-2">
              <LogOut className="w-4 h-4" />
              Return to Course
            </button>
          </div>

          <div className="flex items-start gap-2 text-xs text-slate-500 mt-4">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>Make sure you are in a quiet environment. Your microphone will be muted upon entry.</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PreJoinLobby;
