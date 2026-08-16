import React, { useState, useEffect, useCallback } from 'react';
import { Users, MessageSquare, Hand, MoreVertical, Search, Send, X, ShieldAlert } from 'lucide-react';
import PreJoinLobby from '../components/LiveClass/PreJoinLobby';
import TeacherControls from '../components/LiveClass/TeacherControls';
import { useParams, useNavigate } from 'react-router-dom';
import DailyIframe, { DailyCall } from '@daily-co/daily-js';
import { DailyProvider, useLocalParticipant, useParticipantIds, useVideoTrack, useAudioTrack, useParticipantProperty, useAppMessage } from '@daily-co/daily-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { api } from '../services/api';

const ParticipantName = ({ id }: { id: string }) => {
  const name = useParticipantProperty(id, 'user_name');
  return <>{name || 'Student'}</>;
};

const ParticipantVideo = ({ id, isLocal = false }: { id: string, isLocal?: boolean }) => {
  const videoTrack = useVideoTrack(id);
  const audioTrack = useAudioTrack(id);
  
  return (
    <video
      autoPlay
      muted={isLocal}
      playsInline
      ref={(video) => {
        if (!video) return;
        const tracks = [];
        if (videoTrack.persistentTrack) tracks.push(videoTrack.persistentTrack);
        if (!isLocal && audioTrack.persistentTrack) tracks.push(audioTrack.persistentTrack);
        
        if (tracks.length > 0) {
          video.srcObject = new MediaStream(tracks);
        } else {
          video.srcObject = null;
        }
      }}
      className={`w-full h-full object-cover ${isLocal ? 'transform scale-x-[-1]' : ''}`}
    />
  );
};

const LiveClassRoomContent: React.FC<{ callObject: DailyCall, classId?: string }> = ({ callObject, classId }) => {
  const [hasJoined, setHasJoined] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'participants'>('participants');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user } = useAuth();

  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [liveClassData, setLiveClassData] = useState<any>(null);

  const [chatMessages, setChatMessages] = useState<{ sender: string, text: string, time: Date }[]>([]);
  const [chatInput, setChatInput] = useState('');

  const sendChatMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;
    callObject.sendAppMessage({ text: chatInput }, '*');
    setChatMessages(prev => [...prev, { sender: user?.name || 'You', text: chatInput, time: new Date() }]);
    setChatInput('');
  };

  useAppMessage({
    onAppMessage: useCallback((ev: any) => {
      const p = callObject.participants()[ev.fromId];
      const sender = p?.user_name || 'Student';
      setChatMessages(prev => [...prev, { sender, text: ev.data.text, time: new Date() }]);
    }, [callObject])
  });

  const localParticipant = useLocalParticipant();
  const remoteParticipantIds = useParticipantIds({ filter: 'remote' });
  const isTeacher = user?.role === UserRole.TEACHER || user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN;

  const fetchedRef = React.useRef(false);

  useEffect(() => {
    if (!classId || !user || fetchedRef.current) return;
    
    const fetchToken = async () => {
      fetchedRef.current = true;
      try {
        const res = isTeacher ? await api.startLiveClass(classId) : await api.joinLiveClass(classId);
        setRoomUrl(res.roomUrl);
        setToken(res.token);
        setLiveClassData(res.liveClass);
      } catch (err) {
        console.error("Failed to fetch live class token", err);
        fetchedRef.current = false; // allow retry
      }
    };
    fetchToken();
  }, [classId, user, isTeacher]);

  const handleJoin = useCallback(async () => {
    if (!roomUrl) return;
    try {
      await callObject.join({ url: roomUrl, token: token || undefined });
      setHasJoined(true);
    } catch (e) {
      console.error(e);
      alert('Failed to join');
    }
  }, [callObject, roomUrl, token]);

  const navigate = useNavigate();

  const handleEndClass = useCallback(async () => {
    try {
      await callObject.leave();
      if (isTeacher && classId) {
        await api.endLiveClass(classId);
        navigate('/admin');
      } else {
        navigate('/profile');
      }
    } catch (e) {
      console.error('Failed to end/leave class', e);
      if (isTeacher) navigate('/admin');
      else navigate('/profile');
    }
  }, [callObject, isTeacher, classId, navigate]);

  if (!hasJoined) {
    return <PreJoinLobby onJoin={handleJoin} isReady={!!roomUrl} />;
  }

  const mainVideoId = isTeacher ? localParticipant?.session_id : (remoteParticipantIds.length > 0 ? remoteParticipantIds[0] : null);

  return (
    <div className="h-screen w-full bg-[#0a0a0a] text-slate-200 flex flex-col overflow-hidden font-sans">
      
      {/* Top Header */}
      <header className="h-14 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>
          <h1 className="text-lg font-semibold text-white tracking-tight">{liveClassData?.title || 'Live Class'}</h1>
          <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded-md font-medium border border-blue-500/20">LIVE</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-700/50">
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400">End-to-End Encrypted</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Left Pane - Main Stage */}
        <main className={`flex-1 flex flex-col relative transition-all duration-300 ${sidebarOpen ? 'mr-80' : ''}`}>
          
          {/* Main Video Area */}
          <div className="flex-1 p-4 flex flex-col">
            <div className="w-full flex-1 bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden relative flex items-center justify-center">
              
              {/* Main Camera */}
              <div className="absolute inset-0 bg-[#0f1115] flex flex-col items-center justify-center">
                 {mainVideoId ? (
                   <ParticipantVideo id={mainVideoId} isLocal={mainVideoId === localParticipant?.session_id} />
                 ) : (
                   <div className="w-32 h-32 rounded-full bg-slate-800 flex items-center justify-center text-4xl font-bold text-slate-500 border-4 border-slate-700">
                      <Users className="w-12 h-12" />
                   </div>
                 )}
              </div>

              {/* Floating Student PIP Grid */}
              <div className="absolute top-4 right-4 flex flex-col gap-3 z-10">
                {(isTeacher ? remoteParticipantIds : (localParticipant ? [localParticipant.session_id, ...remoteParticipantIds.slice(0, 4)] : [])).map((studentId) => {
                  if (!studentId) return null;
                  return (
                    <div key={studentId} className="w-40 aspect-video bg-slate-800 rounded-xl border-2 border-slate-700 shadow-lg overflow-hidden relative group">
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                        <ParticipantVideo id={studentId} isLocal={studentId === localParticipant?.session_id} />
                      </div>
                      <div className="absolute bottom-1 left-1 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-medium truncate max-w-[90%]">
                        {studentId === localParticipant?.session_id ? 'You' : <ParticipantName id={studentId} />}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Badges Overlay */}
              <div className="absolute bottom-4 left-4 flex gap-2">
                 <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 border border-white/10">
                   <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                   Speaking
                 </div>
              </div>
            </div>
          </div>

          {/* Bottom Control Bar */}
          <TeacherControls onEndClass={handleEndClass} isTeacher={isTeacher} />
        </main>

        {/* Right Sidebar (Collapsible) */}
        <aside 
          className={`absolute top-0 right-0 h-full w-80 bg-slate-900 border-l border-slate-800 flex flex-col transition-transform duration-300 z-20 shadow-2xl ${
            sidebarOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Sidebar Tabs */}
          <div className="flex border-b border-slate-800 p-2 gap-1 bg-slate-900/50">
            <button 
              onClick={() => setActiveTab('participants')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${
                activeTab === 'participants' 
                  ? 'bg-slate-800 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Users className="w-4 h-4" /> Participants
            </button>
            <button 
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${
                activeTab === 'chat' 
                  ? 'bg-slate-800 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <MessageSquare className="w-4 h-4" /> Chat
            </button>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-4">
            
            {activeTab === 'participants' ? (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Search participants..." 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-9 pr-3 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-slate-600"
                  />
                </div>
                
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1 mt-6">Participants ({remoteParticipantIds.length + (localParticipant ? 1 : 0)})</p>
                  
                  {localParticipant && (
                    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/50 group transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-medium text-white shadow-inner">
                          {user?.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-200">{user?.name || 'You'} (You)</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {remoteParticipantIds.map((studentId) => (
                    <div key={studentId} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/50 group transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-medium text-slate-300 border border-slate-600">
                          <ParticipantName id={studentId} />
                        </div>
                        <p className="text-sm font-medium text-slate-300"><ParticipantName id={studentId} /></p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col">
                <div className="flex-1 overflow-y-auto space-y-4 pb-4">
                  {chatMessages.map((msg, idx) => {
                    const isMe = msg.sender === (user?.name || 'You');
                    return (
                      <div key={idx} className={`flex flex-col gap-1 ${isMe ? 'items-end' : ''}`}>
                        <span className="text-xs text-slate-500 font-medium">
                          {msg.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <div className={`${isMe ? 'bg-blue-600 rounded-tr-sm text-white shadow-md' : 'bg-slate-800 rounded-tl-sm text-slate-200 border border-slate-700/50'} rounded-2xl p-3 text-sm w-[90%]`}>
                          {!isMe && <span className="font-semibold text-blue-400 text-xs block mb-1">{msg.sender}</span>}
                          {msg.text}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <form onSubmit={sendChatMessage} className="pt-3 border-t border-slate-800 mt-auto bg-slate-900 relative">
                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type a message..." 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-4 pr-12 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-slate-600 shadow-inner"
                  />
                  <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 mt-1.5 p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}
          </div>
        </aside>

        {/* Toggle Sidebar Button (when closed) */}
        {!sidebarOpen && (
          <button 
            onClick={() => setSidebarOpen(true)}
            className="absolute top-4 right-4 bg-slate-800/80 hover:bg-slate-700 backdrop-blur-md p-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white transition-all shadow-lg z-10"
          >
            <Users className="w-5 h-5" />
          </button>
        )}

      </div>
    </div>
  );
};

export const LiveClassRoom: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [callObject, setCallObject] = useState<DailyCall | null>(null);

  useEffect(() => {
    let co = DailyIframe.getCallInstance();
    if (!co) {
      try {
        co = DailyIframe.createCallObject({
          videoSource: true,
          audioSource: true,
        });
      } catch (e) {
        console.error('Failed to create call object', e);
      }
    }
    setCallObject(co);
    
    return () => {
      // Do not destroy the call object here to survive React Strict Mode.
      // It will be cleaned up when the user explicitly leaves.
    };
  }, []);

  if (!callObject) return null;

  return (
    <DailyProvider callObject={callObject}>
      <LiveClassRoomContent callObject={callObject} classId={id} />
    </DailyProvider>
  );
};

export default LiveClassRoom;
