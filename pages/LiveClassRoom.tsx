import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Users, MessageSquare, Hand, MoreVertical, Search, Send, X, ShieldAlert, Heart, BarChart2, CheckCircle, Maximize, Minimize } from 'lucide-react';
import PreJoinLobby from '../components/LiveClass/PreJoinLobby';
import TeacherControls from '../components/LiveClass/TeacherControls';
import { useParams, useNavigate } from 'react-router-dom';
import DailyIframe, { DailyCall } from '@daily-co/daily-js';
import { DailyProvider, useLocalParticipant, useParticipantIds, useVideoTrack, useAudioTrack, useParticipantProperty, useDaily, useScreenVideoTrack, useDailyEvent } from '@daily-co/daily-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { api } from '../services/api';
import { io, Socket } from 'socket.io-client';

const ParticipantName = ({ id }: { id: string }) => {
  const name = useParticipantProperty(id, 'user_name');
  return <>{name || 'Student'}</>;
};

const ParticipantVideo = React.memo(({ id, isLocal = false }: { id: string, isLocal?: boolean }) => {
  const videoTrack = useVideoTrack(id);
  const audioTrack = useAudioTrack(id);
  const videoRef = useRef<HTMLVideoElement>(null);

  // isVideoOn is false when camera is explicitly turned off
  const isVideoOn = videoTrack.state !== 'off' && !!videoTrack.persistentTrack;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!isVideoOn) {
      // Clear srcObject so the frozen last-frame is removed
      video.srcObject = null;
      return;
    }

    const tracks: MediaStreamTrack[] = [videoTrack.persistentTrack!];
    if (!isLocal && audioTrack.persistentTrack) tracks.push(audioTrack.persistentTrack);
    video.srcObject = new MediaStream(tracks);
  }, [videoTrack.persistentTrack, videoTrack.state, audioTrack.persistentTrack, isLocal, isVideoOn]);

  if (!isVideoOn) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#0f1115]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center">
            <Users className="w-9 h-9 text-slate-500" />
          </div>
          <span className="text-xs text-slate-500 font-medium">Camera off</span>
        </div>
      </div>
    );
  }

  return (
    <video
      autoPlay
      muted={isLocal}
      playsInline
      ref={videoRef}
      className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''}`}
    />
  );
});

const ScreenShareVideo = React.memo(({ id }: { id: string }) => {
  const videoTrack = useScreenVideoTrack(id);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (videoTrack.persistentTrack && videoTrack.state !== 'off') {
      video.srcObject = new MediaStream([videoTrack.persistentTrack]);
    } else {
      video.srcObject = null;
    }
  }, [videoTrack.persistentTrack, videoTrack.state]);

  return (
    <video
      autoPlay
      muted
      playsInline
      ref={videoRef}
      className="w-full h-full object-contain bg-black"
    />
  );
});

const LiveClassRoomContent: React.FC<{ callObject: DailyCall, classId?: string }> = ({ callObject, classId }) => {
  const [hasJoined, setHasJoined] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'participants' | 'qa' | 'polls'>('chat');
  const [raisedHands, setRaisedHands] = useState<string[]>([]);
  const daily = useDaily();
  // Track active screen sharers via Daily events — more reliable than useScreenShare().screens for remote participants
  const [screenSharerSessionId, setScreenSharerSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const socketRef = useRef<Socket | null>(null);
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);

  // Sync state with native browser fullscreen changes (e.g. when user presses ESC)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await fullscreenContainerRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Error toggling fullscreen', err);
    }
  };

  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [liveClassData, setLiveClassData] = useState<any>(null);

  const [chatMessages, setChatMessages] = useState<{ sender: string, userId?: string, text: string, time: Date }[]>([]);
  const [chatInput, setChatInput] = useState('');

  const [questions, setQuestions] = useState<any[]>([]);
  const [qaInput, setQaInput] = useState('');

  const [polls, setPolls] = useState<any[]>([]);
  const [activePoll, setActivePoll] = useState<any>(null);
  const [pollForm, setPollForm] = useState({ question: '', options: ['', ''], correctOptionId: '0' });
  const [pollAnswers, setPollAnswers] = useState<any[]>([]);

  const isTeacher = user?.role === UserRole.TEACHER || user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN;

  useDailyEvent('app-message', useCallback((ev: any) => {
    if (ev.data?.type === 'raise-hand') {
      setRaisedHands(prev => prev.includes(ev.fromId) ? prev : [...prev, ev.fromId]);
    } else if (ev.data?.type === 'lower-hand') {
      setRaisedHands(prev => prev.filter(id => id !== ev.fromId));
    }
  }, []));

  // Screen share: listen to track events — works for both local and remote participants
  useDailyEvent('track-started', useCallback((ev: any) => {
    if (ev.track?.kind === 'video' && ev.type === 'screenVideo') {
      setScreenSharerSessionId(ev.participant?.session_id ?? null);
    }
  }, []));

  useDailyEvent('track-stopped', useCallback((ev: any) => {
    if (ev.track?.kind === 'video' && ev.type === 'screenVideo') {
      setScreenSharerSessionId(prev =>
        prev === ev.participant?.session_id ? null : prev
      );
    }
  }, []));

  // Log Daily.co errors — DO NOT auto-rejoin here, it causes infinite error→join→error loops
  useDailyEvent('error', useCallback((ev: any) => {
    console.error('Daily.co error:', ev?.errorMsg || ev);
  }, []));

  useDailyEvent('network-connection', useCallback((ev: any) => {
    if (ev.event === 'interrupted') {
      console.warn('Daily.co network interrupted — Daily will auto-reconnect');
    } else if (ev.event === 'connected') {
      console.info('Daily.co network reconnected');
    }
  }, []));

  useEffect(() => {
    if (!classId || !user) return;
    const socketUrl = import.meta.env.VITE_API_URL || '';
    const socket = io(socketUrl);
    socketRef.current = socket;

    socket.emit('join-room', { roomId: classId, userId: user.id, userName: user.name });

    socket.on('force-disconnect', () => {
      alert("You have joined from another location. This session has been disconnected.");
      if (callObject) callObject.leave();
      navigate(isTeacher ? '/admin' : '/profile');
    });

    socket.on('chat-history', (history) => {
      setChatMessages(history.map((msg: any) => ({
        sender: msg.senderName,
        userId: msg.senderId,
        text: msg.text,
        time: new Date(msg.timestamp || Date.now())
      })));
    });

    socket.on('qa-history', (history) => {
      setQuestions(history);
    });

    socket.on('poll-history', (history) => {
      setPollAnswers(history);
    });

    socket.on('chat-message', (data) => {
      setChatMessages(prev => [...prev, { 
        sender: data.userName, 
        userId: data.userId, // Added userId for alignment
        text: data.text, 
        time: new Date(data.timestamp || Date.now()) // Fallback to avoid Invalid Date
      }]);
    });

    socket.on('new-question', (data) => {
      setQuestions(prev => [...prev, data]);
    });

    socket.on('upvote-question', (data) => {
      // Server sends back the full authoritative upvotes array
      setQuestions(prev => prev.map(q =>
        q.id === data.id ? { ...q, upvotes: data.upvotes } : q
      ));
    });

    socket.on('poll-start', (data) => {
      setActivePoll(data);
      if (!isTeacher) setActiveTab('polls');
      setPollAnswers([]);
    });

    socket.on('poll-answer', (data) => {
      setPollAnswers(prev => [...prev, data]);
    });

    socket.on('poll-end', (data) => {
      setActivePoll(prev => prev ? { ...prev, status: 'closed' } : null);
    });

    return () => {
      socket.disconnect();
    };
  }, [classId, user?.id, user?.name, isTeacher]);

  const sendChatMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || !socketRef.current) return;
    socketRef.current.emit('chat-message', { text: chatInput });
    setChatInput('');
  };

  const sendQuestion = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!qaInput.trim() || !socketRef.current) return;
    socketRef.current.emit('new-question', { id: Date.now().toString(), content: qaInput });
    setQaInput('');
  };

  const upvoteQuestion = (id: string) => {
    if (!socketRef.current) return;
    socketRef.current.emit('upvote-question', { id });
  };

  const handleCreatePoll = () => {
    if (!pollForm.question.trim() || !socketRef.current) return;
    const poll = {
      id: Date.now().toString(),
      question: pollForm.question,
      options: pollForm.options.map((text, i) => ({ id: i.toString(), text })),
      correctOptionId: pollForm.correctOptionId,
      status: 'active',
      createdAt: new Date().toISOString()
    };
    socketRef.current.emit('poll-start', poll);
    setPollForm({ question: '', options: ['', ''], correctOptionId: '0' });
  };

  const handleEndPoll = () => {
    if (!activePoll || !socketRef.current) return;
    socketRef.current.emit('poll-end', { id: activePoll.id });
  };

  const handleAnswerPoll = (optionId: string) => {
    if (!activePoll || !socketRef.current || isTeacher) return;
    socketRef.current.emit('poll-answer', { pollId: activePoll.id, selectedOptionId: optionId, responseTime: Date.now(), studentName: user?.name });
    setPollAnswers([{ studentId: user?.id, studentName: user?.name, selectedOptionId: optionId, responseTime: Date.now() }]);
  };

  const localParticipant = useLocalParticipant();
  const remoteParticipantIds = useParticipantIds({ filter: 'remote' });

  const toggleRaiseHand = useCallback(() => {
    if (!daily || !localParticipant) return;
    const isRaised = raisedHands.includes(localParticipant.session_id);
    const type = isRaised ? 'lower-hand' : 'raise-hand';
    daily.sendAppMessage({ type }, '*');
    if (isRaised) {
      setRaisedHands(prev => prev.filter(id => id !== localParticipant.session_id));
    } else {
      setRaisedHands(prev => [...prev, localParticipant.session_id]);
    }
  }, [daily, localParticipant, raisedHands]);

  const teacherId = React.useMemo(() => {
    if (!daily) return null;
    const ps = daily.participants();
    const owner = Object.values(ps).find(p => (p as any).owner);
    if (owner) return owner.session_id;
    if (isTeacher && localParticipant) return localParticipant.session_id;
    return remoteParticipantIds.length > 0 ? remoteParticipantIds[0] : null;
  }, [daily, isTeacher, localParticipant, remoteParticipantIds]);

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
        fetchedRef.current = false;
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



  return (
    <div className="h-screen w-full bg-[#0a0a0a] text-slate-200 flex flex-col overflow-hidden font-sans">
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

      <div className="flex-1 flex overflow-hidden relative">
        <main className={`flex-1 flex flex-col relative transition-all duration-300 ${sidebarOpen ? 'mr-96' : ''}`}>
          <div className="flex-1 p-4 flex flex-col min-h-0">
            <div 
              ref={fullscreenContainerRef}
              className={`w-full flex-1 bg-slate-900 shadow-2xl overflow-hidden relative flex items-center justify-center transition-all min-h-0 ${isFullscreen ? 'rounded-none border-none' : 'rounded-2xl border border-slate-800'}`}
            >
              <button
                onClick={toggleFullscreen}
                className="absolute top-4 right-4 z-50 p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white transition-all backdrop-blur-sm group"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </button>

              <div className="absolute inset-0 bg-[#0f1115] flex flex-col items-center justify-center">
                 {screenSharerSessionId ? (
                   <ScreenShareVideo id={screenSharerSessionId} />
                 ) : teacherId ? (
                   <ParticipantVideo id={teacherId} isLocal={teacherId === localParticipant?.session_id} />
                 ) : (
                   <div className="w-32 h-32 rounded-full bg-slate-800 flex items-center justify-center border-4 border-slate-700">
                      <Users className="w-12 h-12 text-slate-500" />
                   </div>
                 )}
              </div>
              
              {/* PiP: show teacher cam when screen sharing is active */}
              {screenSharerSessionId && teacherId && !isFullscreen && (
                <div className="absolute bottom-4 right-4 w-48 aspect-video bg-slate-800 rounded-xl border-2 border-slate-700 shadow-2xl overflow-hidden z-10">
                  <div className="absolute inset-0">
                    <ParticipantVideo id={teacherId} isLocal={teacherId === localParticipant?.session_id} />
                  </div>
                  <div className="absolute bottom-1 left-1 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-medium truncate max-w-[90%] text-white">
                    {teacherId === localParticipant?.session_id ? 'You' : <ParticipantName id={teacherId} />}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Horizontal Student Strip for Teacher */}
          {isTeacher && !isFullscreen && (
            <div className="w-full h-32 px-4 pb-4 shrink-0 flex gap-4 overflow-x-auto snap-x scrollbar-hide">
              {remoteParticipantIds.map((id) => (
                <div key={id} className="h-full aspect-video bg-slate-900 rounded-xl border border-slate-800 shadow-lg overflow-hidden shrink-0 relative snap-start group hover:border-blue-500/50 transition-colors">
                  <ParticipantVideo id={id} />
                  <div className="absolute bottom-1 left-1 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-medium truncate max-w-[90%] text-white">
                    <ParticipantName id={id} />
                  </div>
                  {/* Highlight raised hand */}
                  {raisedHands.includes(id) && (
                    <div className="absolute top-1 right-1 bg-amber-500/90 p-1 rounded-full text-white shadow-sm">
                      <Hand className="w-3 h-3" />
                    </div>
                  )}
                </div>
              ))}
              {remoteParticipantIds.length === 0 && (
                <div className="h-full flex-1 flex items-center justify-center text-sm text-slate-500 border border-dashed border-slate-700/50 rounded-xl">
                  Waiting for students to join...
                </div>
              )}
            </div>
          )}

          <TeacherControls onEndClass={handleEndClass} isTeacher={isTeacher} onRaiseHand={toggleRaiseHand} isHandRaised={localParticipant ? raisedHands.includes(localParticipant.session_id) : false} />
        </main>

        <aside className={`absolute top-0 right-0 h-full w-96 bg-slate-900 border-l border-slate-800 flex flex-col transition-transform duration-300 z-20 shadow-2xl ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex border-b border-slate-800 p-2 gap-1 bg-slate-900/50">
            <button onClick={() => setActiveTab('chat')} className={`flex-1 py-2 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-all ${activeTab === 'chat' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}>
              <MessageSquare className="w-4 h-4" /> Chat
            </button>
            <button onClick={() => setActiveTab('participants')} className={`flex-1 py-2 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-all ${activeTab === 'participants' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}>
              <Users className="w-4 h-4" /> Users
            </button>
            <button onClick={() => setActiveTab('qa')} className={`flex-1 py-2 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-all ${activeTab === 'qa' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}>
              <Hand className="w-4 h-4" /> Q&A
            </button>
            <button onClick={() => setActiveTab('polls')} className={`flex-1 py-2 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-all ${activeTab === 'polls' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}>
              <BarChart2 className="w-4 h-4" /> Polls
            </button>
            <button onClick={() => setSidebarOpen(false)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-1">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden p-4">
            {activeTab === 'chat' && (
              <div className="h-full flex flex-col">
                <div className="flex-1 overflow-y-auto space-y-4 pb-4">
                  {chatMessages.map((msg, idx) => {
                    const isMe = (msg.userId && user?.id && msg.userId === user.id) || msg.sender === (user?.name || 'You');
                    return (
                      <div key={idx} className={`flex flex-col gap-1 ${isMe ? 'items-end' : ''}`}>
                        <span className="text-xs text-slate-500 font-medium">{msg.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <div className={`${isMe ? 'bg-blue-600 rounded-tr-sm text-white shadow-md' : 'bg-slate-800 rounded-tl-sm text-slate-200 border border-slate-700/50'} rounded-2xl p-3 text-sm max-w-[90%] w-fit`}>
                          {!isMe && <span className="font-semibold text-blue-400 text-xs block mb-1">{msg.sender}</span>}
                          {msg.text}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <form onSubmit={sendChatMessage} className="pt-3 border-t border-slate-800 mt-auto bg-slate-900 relative">
                  <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Type a message..." className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-4 pr-12 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50" />
                  <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 mt-1.5 p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"><Send className="w-4 h-4" /></button>
                </form>
              </div>
            )}

            {activeTab === 'participants' && (
              <div className="h-full flex flex-col">
                <div className="flex-1 overflow-y-auto space-y-2 pb-4">
                  {[...(localParticipant ? [localParticipant.session_id] : []), ...remoteParticipantIds].map(id => (
                    <div key={id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700/50">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                           <Users className="w-4 h-4 text-slate-300" />
                         </div>
                         <div className="flex flex-col">
                           <span className="text-sm font-medium text-slate-200">
                             {id === localParticipant?.session_id ? 'You' : <ParticipantName id={id} />}
                             {id === teacherId && ' (Teacher)'}
                           </span>
                         </div>
                      </div>
                      <div className="flex items-center gap-2">
                         {raisedHands.includes(id) && (
                            <Hand className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                         )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'qa' && (
              <div className="h-full flex flex-col">
                <div className="flex-1 overflow-y-auto space-y-4 pb-4">
                  {[...questions].sort((a, b) => (b.upvotes?.length || 0) - (a.upvotes?.length || 0)).map((q, idx) => (
                    <div key={idx} className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-semibold text-blue-400">{q.studentName}</span>
                        <button onClick={() => upvoteQuestion(q.id)} className={`flex items-center gap-1 text-xs ${q.upvotes?.includes(user?.id) ? 'text-red-400' : 'text-slate-400 hover:text-slate-300'}`}>
                          <Heart className="w-3 h-3" fill={q.upvotes?.includes(user?.id) ? 'currentColor' : 'none'} /> {q.upvotes?.length || 0}
                        </button>
                      </div>
                      <p className="text-sm text-slate-200">{q.content}</p>
                    </div>
                  ))}
                </div>
                {!isTeacher && (
                  <form onSubmit={sendQuestion} className="pt-3 border-t border-slate-800 mt-auto bg-slate-900 relative">
                    <input type="text" value={qaInput} onChange={(e) => setQaInput(e.target.value)} placeholder="Ask a question..." className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-4 pr-12 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50" />
                    <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 mt-1.5 p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"><Send className="w-4 h-4" /></button>
                  </form>
                )}
              </div>
            )}

            {activeTab === 'polls' && (
              <div className="h-full flex flex-col">
                {isTeacher ? (
                  <div className="space-y-4">
                    {activePoll ? (
                      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                        <h3 className="text-sm font-semibold mb-2">Active Poll: {activePoll.question}</h3>
                        <div className="space-y-2 mb-4">
                          {activePoll.options.map((opt: any) => {
                            const count = pollAnswers.filter(a => a.selectedOptionId === opt.id).length;
                            const percentage = pollAnswers.length ? Math.round((count / pollAnswers.length) * 100) : 0;
                            return (
                              <div key={opt.id} className="relative bg-slate-900 rounded-lg p-2 text-sm border border-slate-700 overflow-hidden">
                                <div className="absolute top-0 left-0 h-full bg-blue-900/30" style={{ width: `${percentage}%` }}></div>
                                <div className="relative flex justify-between z-10">
                                  <span>{opt.text}</span>
                                  <span>{count} ({percentage}%)</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {activePoll.status === 'active' ? (
                          <button onClick={handleEndPoll} className="w-full py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-semibold">End Poll</button>
                        ) : (
                          <button onClick={() => setActivePoll(null)} className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-semibold">Clear Poll</button>
                        )}
                      </div>
                    ) : (
                      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 space-y-4">
                        <h3 className="text-sm font-semibold">Create New Poll</h3>
                        <input type="text" placeholder="Poll Question" value={pollForm.question} onChange={e => setPollForm({...pollForm, question: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-slate-200" />
                        {pollForm.options.map((opt, i) => (
                          <div key={i} className="flex gap-2">
                            <input type="text" placeholder={`Option ${i+1}`} value={opt} onChange={e => { const newOpts = [...pollForm.options]; newOpts[i] = e.target.value; setPollForm({...pollForm, options: newOpts}); }} className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-slate-200" />
                            <input type="radio" name="correctOpt" checked={pollForm.correctOptionId === i.toString()} onChange={() => setPollForm({...pollForm, correctOptionId: i.toString()})} />
                          </div>
                        ))}
                        <button onClick={() => setPollForm({...pollForm, options: [...pollForm.options, '']})} className="text-xs text-blue-400 hover:text-blue-300">+ Add Option</button>
                        <button onClick={handleCreatePoll} className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold">Launch Poll</button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activePoll ? (
                      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                        <h3 className="text-sm font-semibold mb-4">{activePoll.question}</h3>
                        <div className="space-y-2 mb-4">
                          {activePoll.options.map((opt: any) => {
                            const isAnswered = pollAnswers.some(a => a.studentId === user?.id);
                            const myAnswer = pollAnswers.find(a => a.studentId === user?.id)?.selectedOptionId;
                            const isCorrect = opt.id === activePoll.correctOptionId;
                            
                            return (
                              <button 
                                key={opt.id} 
                                onClick={() => handleAnswerPoll(opt.id)}
                                disabled={isAnswered || activePoll.status === 'closed'}
                                className={`w-full p-3 rounded-lg text-sm border text-left flex justify-between items-center transition-colors ${
                                  myAnswer === opt.id ? 'border-blue-500 bg-blue-900/30' : 'border-slate-700 bg-slate-900 hover:bg-slate-800'
                                } ${isAnswered && 'opacity-70 cursor-not-allowed'}`}
                              >
                                <span>{opt.text}</span>
                                {activePoll.status === 'closed' && isCorrect && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                              </button>
                            );
                          })}
                        </div>
                        {activePoll.status === 'closed' && (
                          <div className="mt-4 p-3 bg-slate-900 rounded-lg border border-slate-800">
                            <h4 className="text-xs font-semibold text-slate-400 mb-2 uppercase">Leaderboard (Fastest Correct)</h4>
                            <div className="space-y-1">
                              {pollAnswers
                                .filter(a => a.selectedOptionId === activePoll.correctOptionId)
                                .sort((a, b) => a.responseTime - b.responseTime)
                                .slice(0, 3)
                                .map((a, i) => (
                                  <div key={i} className="flex justify-between text-sm">
                                    <span>{i+1}. {a.studentName}</span>
                                  </div>
                                ))}
                              {pollAnswers.filter(a => a.selectedOptionId === activePoll.correctOptionId).length === 0 && (
                                <span className="text-sm text-slate-500">No correct answers.</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-sm text-slate-500">
                        Waiting for teacher to launch a poll...
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

        {!sidebarOpen && (
          <button onClick={() => setSidebarOpen(true)} className="absolute top-4 right-4 bg-slate-800/80 hover:bg-slate-700 backdrop-blur-md p-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white transition-all shadow-lg z-10">
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
    let co: DailyCall | null = null;

    const init = async () => {
      // Always destroy any stale existing instance first —
      // reusing it causes "wss is stale, need to reconnect"
      const existing = DailyIframe.getCallInstance();
      if (existing) {
        try {
          await existing.destroy();
        } catch (_) { /* ignore destroy errors */ }
      }
      try {
        co = DailyIframe.createCallObject({
          videoSource: true,
          audioSource: true,
          dailyConfig: {
            camVideoSendSettings: { maxQuality: 'high' },
            // Prioritize higher framerates for screen shares to avoid jitter
            screenVideoSendSettings: { 
              maxQuality: 'high',
            }
          }
        });
        setCallObject(co);
      } catch (e) {
        console.error('Failed to create call object', e);
      }
    };

    init();

    return () => {
      // Cleanup on unmount: leave and destroy
      if (co) {
        co.leave().catch(() => {}).finally(() => co!.destroy().catch(() => {}));
      }
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
