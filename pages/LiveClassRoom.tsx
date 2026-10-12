import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
    Radio, 
    LogOut, 
    PhoneOff, 
    Shield, 
    Sparkles, 
    LogIn, 
    UserPlus, 
    Lock, 
    GraduationCap, 
    Calendar, 
    Clock, 
    RefreshCw, 
    ArrowRight, 
    BookOpen, 
    CheckCircle2, 
    AlertCircle,
    Maximize,
    Minimize,
    MonitorPlay,
    Users,
    Play,
    ExternalLink,
    Loader2,
    VideoOff
} from 'lucide-react';

export const LiveClassRoom: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [sessionKey, setSessionKey] = useState('');
    const [streamUrl, setStreamUrl] = useState('');
    const [classDetails, setClassDetails] = useState<any>(null);

    // Player presentation & immersion states
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [controlsVisible, setControlsVisible] = useState(true);
    const [watchingRecording, setWatchingRecording] = useState(false);
    const [recordingPlaybackUrl, setRecordingPlaybackUrl] = useState<string | null>(null);
    const [playbackLoading, setPlaybackLoading] = useState(false);
    const [isProcessingRecording, setIsProcessingRecording] = useState(false);
    const [processingMessage, setProcessingMessage] = useState('');
    const [playbackError, setPlaybackError] = useState('');
    const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Real-time broadcast and participant states (No fake mock users!)
    const [realAttendees, setRealAttendees] = useState<Array<{ id: string; name: string }>>([]);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [isHostVideoActive, setIsHostVideoActive] = useState(false);
    const [autoPinNotice, setAutoPinNotice] = useState<string | null>(null);
    const autoPinTimerRef = useRef<NodeJS.Timeout | null>(null);
    const socketRef = useRef<any>(null);

    // Gateway states
    const [requiresAuth, setRequiresAuth] = useState(false);
    const [notEnrolled, setNotEnrolled] = useState(false);
    const [enrollmentCourse, setEnrollmentCourse] = useState<{ courseId: string; courseTitle: string } | null>(null);
    const [statusNotice, setStatusNotice] = useState<{ type: 'scheduled' | 'completed'; message: string; scheduledTime?: string } | null>(null);

    const isTeacher = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'TEACHER';

    const initCall = useCallback(async () => {
        if (!id) {
            setError('Invalid Live Class session ID');
            setLoading(false);
            return;
        }

        setError('');
        setRequiresAuth(false);
        setNotEnrolled(false);
        setStatusNotice(null);

        // Case 1: Visitor is NOT logged in
        if (!user) {
            try {
                const details = await api.getLiveClassDetails(id);
                setClassDetails(details);
                setRequiresAuth(true);
            } catch (err: any) {
                console.error("Public class info lookup error:", err);
                setError(err.message || 'Live class not found or session expired.');
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
            return;
        }

        // Case 2: Visitor IS logged in (Teacher or Student)
        try {
            const res = isTeacher ? await api.startLiveClass(id) : await api.joinLiveClass(id);

            if (res.liveClass) {
                setClassDetails(res.liveClass);
            }
            if (res.streamUrl) {
                setStreamUrl(res.streamUrl);
            }
            if (res.sessionKey) {
                setSessionKey(res.sessionKey);
            }
            if (!res.streamUrl && !res.sessionKey) {
                throw new Error("Failed to generate secure stream session token");
            }
        } catch (err: any) {
            console.error("Live classroom join error:", err);

            // Handle un-enrolled student error (403 or code: NOT_ENROLLED)
            if (err.status === 403 || err.code === 'NOT_ENROLLED' || err.data?.code === 'NOT_ENROLLED') {
                setNotEnrolled(true);
                const courseId = err.data?.courseId || classDetails?.courseId || '';
                const courseTitle = err.data?.courseTitle || classDetails?.courseTitle || 'UniEval Course';
                setEnrollmentCourse({ courseId, courseTitle });

                // Try fetching public class info if not yet cached
                if (!classDetails) {
                    api.getLiveClassDetails(id).then(details => {
                        setClassDetails(details);
                        if (details?.courseId) {
                            setEnrollmentCourse({
                                courseId: details.courseId,
                                courseTitle: details.courseTitle
                            });
                        }
                    }).catch(() => {});
                }
            } 
            // Handle scheduled state (class not yet started by teacher)
            else if (err.code === 'CLASS_SCHEDULED' || err.data?.code === 'CLASS_SCHEDULED') {
                setStatusNotice({
                    type: 'scheduled',
                    message: err.message || 'The instructor has scheduled this class and will start broadcasting shortly.',
                    scheduledTime: err.data?.scheduledStartTime
                });
                if (!classDetails) {
                    api.getLiveClassDetails(id).then(setClassDetails).catch(() => {});
                }
            } 
            // Handle completed state
            else if (err.code === 'CLASS_COMPLETED' || err.data?.code === 'CLASS_COMPLETED') {
                setStatusNotice({
                    type: 'completed',
                    message: 'This live class has concluded.'
                });
                if (!classDetails) {
                    api.getLiveClassDetails(id).then(setClassDetails).catch(() => {});
                }
            } 
            else {
                setError(err.message || 'Failed to connect to the classroom');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [id, user, isTeacher, classDetails]);

    useEffect(() => {
        initCall();
    }, [id, user, isTeacher]);

    const showAutoPinNotice = useCallback((message: string) => {
        setAutoPinNotice(message);
        if (autoPinTimerRef.current) clearTimeout(autoPinTimerRef.current);
        autoPinTimerRef.current = setTimeout(() => {
            setAutoPinNotice(null);
        }, 4000);
    }, []);

    // Real-time synchronization via Socket.io
    useEffect(() => {
        if (!id || !user) return;

        const socketBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, '') || window.location.origin;
        const socket = io(socketBase, {
            transports: ['websocket', 'polling'],
            autoConnect: true,
        });
        socketRef.current = socket;

        const userId = user.id || (user as any)._id || 'student';
        const userName = user.name || (isTeacher ? 'Instructor' : 'Student');

        socket.on('connect', () => {
            socket.emit('join-room', {
                roomId: id,
                userId,
                userName,
            });
        });

        // Current real roster in this room
        socket.on('room-participants', (roster: Array<{ userId: string; userName: string }>) => {
            if (Array.isArray(roster)) {
                const peers = roster
                    .filter(m => m.userId !== userId)
                    .map(m => ({ id: m.userId, name: m.userName }));
                setRealAttendees(peers);
            }
        });

        // Real peer joined
        socket.on('user-joined', ({ userId: peerId, userName: peerName }: { userId: string; userName: string }) => {
            if (peerId && peerId !== userId) {
                setRealAttendees(prev => {
                    if (prev.some(p => p.id === peerId)) return prev;
                    return [...prev, { id: peerId, name: peerName }];
                });
            }
        });

        // Real peer left
        socket.on('user-left', ({ userId: peerId }: { userId: string }) => {
            if (peerId) {
                setRealAttendees(prev => prev.filter(p => p.id !== peerId));
            }
        });

        // Screen share state broadcast from teacher
        socket.on('screen-share-changed', ({ isSharing, userName: presenterName }: { isSharing: boolean; userName: string }) => {
            setIsScreenSharing(isSharing);
            if (isSharing) {
                showAutoPinNotice(`${presenterName || 'Instructor'} started sharing screen`);
            } else {
                showAutoPinNotice('Screen share stopped');
            }
        });

        // Video state broadcast from teacher
        socket.on('video-state-changed', ({ isVideoOn, userName: presenterName }: { isVideoOn: boolean; userName: string }) => {
            setIsHostVideoActive(isVideoOn);
            if (isVideoOn) {
                showAutoPinNotice(`${presenterName || 'Instructor'} turned on camera`);
            }
        });

        // Teacher ended class broadcast
        socket.on('class-ended', (data: { message?: string }) => {
            setStatusNotice({
                type: 'completed',
                message: data?.message || 'This live class has been ended by the teacher.'
            });
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [id, user, isTeacher, isScreenSharing, showAutoPinNotice]);

    useEffect(() => {
        // Listen for postMessage from Webinar.gg iframe to handle class end or navigation
        const handleMessage = (event: MessageEvent) => {
            const data = event.data;
            if (!data) return;

            const msgType = String(data.type || data.event || data.action || '');

            if (
                msgType === 'webinar-ended' || 
                msgType === 'webinar-user-left' ||
                msgType === 'webinar.ended' || 
                msgType === 'webinar.leave' ||
                msgType === 'session-ended' ||
                /webinar.*(ended|leave)/i.test(msgType)
            ) {
                if (isTeacher) {
                    api.endLiveClass(id!).catch(console.error);
                    socketRef.current?.emit('end-live-class');
                    navigate('/teacher/upload');
                } else {
                    setStatusNotice({
                        type: 'completed',
                        message: 'This live class has concluded.'
                    });
                }
                return;
            }

            // Automatic Screen Share / Video Start detection from Webinar.gg iframe
            const isScreenShareStart = 
                /screen[-_]?share.*(start|publish|on|active|true)/i.test(msgType) ||
                /share[-_]?screen.*(start|publish|on|active|true)/i.test(msgType) ||
                (data.type === 'track-published' && data.trackType === 'screen') ||
                (data.type === 'user-published' && (data.mediaType === 'video' || data.trackType === 'screen'));

            const isVideoStart = 
                /video.*(start|publish|on|active|enabled|true)/i.test(msgType) ||
                /camera.*(start|on|active|enabled|true)/i.test(msgType);

            if (isScreenShareStart || isVideoStart) {
                if (isScreenShareStart) {
                    setIsScreenSharing(true);
                    showAutoPinNotice('Screen share active');
                    if (isTeacher) {
                        socketRef.current?.emit('screen-share-changed', { isSharing: true });
                    }
                }
                if (isVideoStart) {
                    setIsHostVideoActive(true);
                    showAutoPinNotice('Host camera active');
                    if (isTeacher) {
                        socketRef.current?.emit('video-state-changed', { isVideoOn: true });
                    }
                }
                return;
            }

            // Automatic Screen Share / Video Stop detection
            const isScreenShareStop = 
                /screen[-_]?share.*(stop|unpublish|off|end|false|close)/i.test(msgType) ||
                /share[-_]?screen.*(stop|unpublish|off|end|false|close)/i.test(msgType) ||
                (data.type === 'track-unpublished' && data.trackType === 'screen');

            const isVideoStop = 
                /video.*(stop|unpublish|off|end|disabled|false)/i.test(msgType) ||
                /camera.*(stop|off|end|disabled|false)/i.test(msgType);

            if (isScreenShareStop || isVideoStop) {
                if (isScreenShareStop) {
                    setIsScreenSharing(false);
                    if (isTeacher) {
                        socketRef.current?.emit('screen-share-changed', { isSharing: false });
                    }
                }
                if (isVideoStop) {
                    setIsHostVideoActive(false);
                    if (isTeacher) {
                        socketRef.current?.emit('video-state-changed', { isVideoOn: false });
                    }
                }
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [id, navigate, isTeacher, showAutoPinNotice]);

    // Real-time polling: immediately detect when teacher ends or cancels class
    useEffect(() => {
        if (!id || statusNotice?.type === 'completed') return;

        const interval = setInterval(async () => {
            try {
                const details = await api.getLiveClassDetails(id);
                if (details && (details.status === 'completed' || details.status === 'cancelled')) {
                    setClassDetails(details);
                    setStatusNotice({
                        type: 'completed',
                        message: 'This live class has been ended by the teacher.'
                    });
                }
            } catch (e) {
                // Ignore transient network errors
            }
        }, 4000);

        return () => clearInterval(interval);
    }, [id, statusNotice]);

    // Fullscreen handling
    const toggleFullscreen = () => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch(err => console.error("Fullscreen request failed:", err));
        } else {
            document.exitFullscreen().catch(err => console.error("Exit fullscreen failed:", err));
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // YouTube-style auto-hiding controls on inactivity
    const resetControlsTimer = useCallback(() => {
        setControlsVisible(true);
        if (hideControlsTimerRef.current) {
            clearTimeout(hideControlsTimerRef.current);
        }
        hideControlsTimerRef.current = setTimeout(() => {
            setControlsVisible(false);
        }, 3500);
    }, []);

    const handleMouseMove = () => {
        resetControlsTimer();
    };

    useEffect(() => {
        resetControlsTimer();
        return () => {
            if (hideControlsTimerRef.current) {
                clearTimeout(hideControlsTimerRef.current);
            }
        };
    }, [resetControlsTimer]);

    // Google Meet style participant roster (Real participants only, zero mock users)
    const handleEndClass = async () => {
        if (window.confirm("End live class for everyone?")) {
            try {
                await api.endLiveClass(id!);
                socketRef.current?.emit('end-live-class');
                iframeRef.current?.contentWindow?.postMessage({ type: 'webinar.end' }, '*');
                navigate('/teacher/upload');
            } catch (err) {
                console.error("Failed to end class:", err);
            }
        }
    };

    const handleLeave = () => {
        if (window.confirm("Leave classroom? You can rejoin anytime while the class is live.")) {
            navigate(isTeacher ? '/teacher/upload' : '/profile');
        }
    };

    const handleLoginRedirect = () => {
        if (id) {
            sessionStorage.setItem('redirect_after_login', `/live-class/${id}`);
        }
        navigate('/login', { state: { from: `/live-class/${id}`, view: 'LOGIN' } });
    };

    const handleSignupRedirect = () => {
        if (id) {
            sessionStorage.setItem('redirect_after_login', `/live-class/${id}`);
        }
        navigate('/login?mode=signup', { state: { from: `/live-class/${id}`, view: 'SIGNUP' } });
    };

    const handleEnrollRedirect = () => {
        const targetCourseId = enrollmentCourse?.courseId || classDetails?.courseId;
        if (targetCourseId) {
            navigate(`/course/${targetCourseId}`);
        } else {
            navigate('/browse');
        }
    };

    const handleManualRefresh = () => {
        setRefreshing(true);
        initCall();
    };

    // ── 1. LOADING STATE ──
    if (loading && !refreshing) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-[#0B0F19] text-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#1F81FC] to-[#7F26FE] flex items-center justify-center shadow-lg shadow-blue-500/30 animate-pulse">
                            <Radio className="w-8 h-8 text-white" />
                        </div>
                    </div>
                    <div className="text-center">
                        <h3 className="text-lg font-semibold text-white">Connecting to UniEval Classroom</h3>
                        <p className="text-sm text-slate-400 mt-1">Verifying secure stream access...</p>
                    </div>
                </div>
            </div>
        );
    }

    // ── 2. UNAUTHENTICATED VISITOR GATEWAY ──
    if (requiresAuth && !user) {
        return (
            <main className="min-h-screen w-full bg-[#0B0F19] text-white flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
                {/* Background Ambient Glows */}
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#1F81FC]/15 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-[#7F26FE]/15 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 w-full max-w-lg bg-[#131A3F]/90 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/80 flex flex-col items-center text-center">
                    {/* Live Broadcast Badge */}
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 mb-5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        UniEval Live Session
                    </div>

                    {/* Glowing Header Icon */}
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#1F81FC] to-[#7F26FE] flex items-center justify-center mb-5 shadow-lg shadow-indigo-500/25">
                        <Radio className="w-8 h-8 text-white animate-pulse" />
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                        Please Log In to Join
                    </h1>
                    <p className="text-slate-300 text-sm mt-2 leading-relaxed">
                        To participate in this interactive live classroom, ask questions, and view shared notes, please log in or create your UniEval student account.
                    </p>

                    {/* Class Details Card */}
                    {classDetails && (
                        <div className="w-full bg-[#0B0F19]/80 border border-slate-700/80 rounded-xl p-4 my-5 text-left space-y-2">
                            <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
                                <BookOpen className="w-3.5 h-3.5 text-[#1F81FC]" />
                                Class Overview
                            </div>
                            <h2 className="text-base font-bold text-white leading-snug">
                                {classDetails.title || 'UniEval Live Class'}
                            </h2>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300 pt-1 border-t border-slate-800">
                                {classDetails.courseTitle && (
                                    <span>Course: <strong className="text-slate-100">{classDetails.courseTitle}</strong></span>
                                )}
                                {classDetails.teacherName && (
                                    <span>Instructor: <strong className="text-slate-100">{classDetails.teacherName}</strong></span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Action CTAs */}
                    <div className="w-full space-y-3 mt-1">
                        <button
                            onClick={handleLoginRedirect}
                            className="w-full py-3.5 px-6 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#1F81FC] to-[#7F26FE] hover:opacity-95 shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                        >
                            <LogIn className="w-4 h-4" />
                            <span>Log In & Enter Classroom</span>
                        </button>

                        <button
                            onClick={handleSignupRedirect}
                            className="w-full py-3 px-6 rounded-xl text-sm font-semibold text-slate-200 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                        >
                            <UserPlus className="w-4 h-4 text-slate-400" />
                            <span>New Student? Create Account</span>
                        </button>
                    </div>

                    {/* Reassurance text */}
                    <p className="text-xs text-slate-400 mt-5 flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span>Instant automatic redirection right back here after sign in.</span>
                    </p>
                </div>
            </main>
        );
    }

    // ── 3. STUDENT NOT ENROLLED GATEWAY ──
    if (notEnrolled) {
        const courseTitle = enrollmentCourse?.courseTitle || classDetails?.courseTitle || 'this course';
        return (
            <main className="min-h-screen w-full bg-[#0B0F19] text-white flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#7F26FE]/15 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 w-full max-w-lg bg-[#131A3F]/90 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/80 flex flex-col items-center text-center">
                    {/* Access Restricted Badge */}
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 mb-5">
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        Enrolled Students Only
                    </div>

                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-[#7F26FE] flex items-center justify-center mb-5 shadow-lg shadow-indigo-500/25">
                        <GraduationCap className="w-8 h-8 text-white" />
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                        Enroll in Course First
                    </h1>
                    <p className="text-slate-300 text-sm mt-2 leading-relaxed">
                        This live session is exclusively reserved for students enrolled in <strong className="text-white">{courseTitle}</strong>.
                    </p>

                    {/* Benefits Card */}
                    <div className="w-full bg-[#0B0F19]/80 border border-slate-700/80 rounded-xl p-4 my-5 text-left space-y-2.5">
                        <div className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                            What Enrollment Unlocks:
                        </div>
                        <ul className="text-xs text-slate-300 space-y-2">
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#1F81FC]" />
                                Direct Live HD Video Stream & Interactive Voice Chat
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#1F81FC]" />
                                Live Q&A, Classroom Polls & Teacher Doubt Solving
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#1F81FC]" />
                                Full Course Materials, PDF Notes & Session Recordings
                            </li>
                        </ul>
                    </div>

                    {/* Direct Course CTA Button */}
                    <div className="w-full space-y-3">
                        <button
                            onClick={handleEnrollRedirect}
                            className="w-full py-3.5 px-6 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#1F81FC] to-[#7F26FE] hover:opacity-95 shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                        >
                            <span>Enroll in Course to Join</span>
                            <ArrowRight className="w-4 h-4" />
                        </button>

                        <button
                            onClick={() => navigate('/dashboard')}
                            className="w-full py-2.5 px-4 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                        >
                            Return to Student Dashboard
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    // ── 4. CLASS SCHEDULED OR COMPLETED NOTICE ──
    if (statusNotice) {
        const isScheduled = statusNotice.type === 'scheduled';
        const hasRealRecording = !isScheduled && Boolean(
            (classDetails?.recordingUrl &&
            classDetails.recordingUrl.trim().length > 0 &&
            classDetails.recordingUrl !== classDetails.dailyRoomUrl &&
            !classDetails.recordingUrl.endsWith(classDetails.dailyRoomName || '')) ||
            classDetails?.recordingStatus === 'ready'
        );

        const handleStartWatchingRecording = async () => {
            setWatchingRecording(true);
            setPlaybackLoading(true);
            setPlaybackError('');
            setIsProcessingRecording(false);
            setRecordingPlaybackUrl(null);

            if (classDetails?.recordingUrl && !classDetails.recordingUrl.includes('webinar.gg') && !classDetails.recordingUrl.endsWith(classDetails.dailyRoomName || '')) {
                setRecordingPlaybackUrl(classDetails.recordingUrl);
                setPlaybackLoading(false);
                return;
            }

            try {
                const res = await api.getLiveClassPlayback(id!);
                if (res.status === 'processing') {
                    setIsProcessingRecording(true);
                    setProcessingMessage(res.message || 'The live session has ended and the recording is currently being processed. It will be available here in a few minutes — please check back shortly.');
                    setWatchingRecording(false);
                } else if (res.playbackUrl) {
                    setRecordingPlaybackUrl(res.playbackUrl);
                } else {
                    throw new Error(res.message || 'Playback URL unavailable');
                }
            } catch (err: any) {
                console.error("Playback load error:", err);
                const fallback = classDetails?.recordingUrl;
                if (fallback && fallback !== classDetails?.dailyRoomUrl && !fallback.endsWith(classDetails?.dailyRoomName || '')) {
                    setRecordingPlaybackUrl(fallback);
                } else {
                    setPlaybackError(err.message || 'Failed to initialize secure recording playback');
                }
            } finally {
                setPlaybackLoading(false);
            }
        };

        // If student clicked to watch recording, play it in-app directly
        if (watchingRecording && (hasRealRecording || recordingPlaybackUrl || playbackLoading)) {
            return (
                <main 
                    ref={containerRef}
                    onMouseMove={handleMouseMove}
                    className="h-screen w-full bg-[#0B0F19] flex flex-col overflow-hidden relative"
                >
                    {/* Header */}
                    <header className="h-14 bg-[#131A3F] border-b border-slate-800 px-4 md:px-6 flex items-center justify-between shrink-0 z-20">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-[#1F81FC] flex items-center justify-center shadow-sm">
                                <Play className="w-4 h-4 text-white fill-white" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-white tracking-tight">
                                        {classDetails?.title || 'Class Recording'}
                                    </span>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                        RECORDING REPLAY
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {recordingPlaybackUrl && (
                                <a
                                    href={recordingPlaybackUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800/90 text-slate-200 hover:text-white hover:bg-slate-700 border border-slate-700 transition-all"
                                    title="Open recording in separate tab"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Pop-out</span>
                                </a>
                            )}
                            <button
                                onClick={toggleFullscreen}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800/90 text-slate-200 hover:text-white hover:bg-slate-700 border border-slate-700 transition-all"
                                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                            >
                                {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
                                <span className="hidden sm:inline">{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
                            </button>
                            <button 
                                onClick={() => setWatchingRecording(false)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors border border-slate-700"
                            >
                                Back to Details
                            </button>
                            <button 
                                onClick={() => navigate('/dashboard')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Exit</span>
                            </button>
                        </div>
                    </header>

                    {/* Embedded In-App Player */}
                    <div className="flex-1 relative w-full bg-black flex items-center justify-center overflow-hidden">
                        {playbackLoading ? (
                            <div className="flex flex-col items-center gap-3 text-slate-300">
                                <Loader2 className="w-10 h-10 text-[#1F81FC] animate-spin" />
                                <span className="text-sm font-semibold text-white">Minting Authenticated Replay Token...</span>
                                <span className="text-xs text-slate-400">Verifying secure student enrollment</span>
                            </div>
                        ) : playbackError ? (
                            <div className="flex flex-col items-center gap-3 p-6 text-center max-w-md">
                                <AlertCircle className="w-10 h-10 text-rose-400" />
                                <span className="text-sm font-bold text-white">Playback Error</span>
                                <span className="text-xs text-slate-300 leading-relaxed">{playbackError}</span>
                                <button
                                    onClick={handleStartWatchingRecording}
                                    className="px-5 py-2.5 rounded-xl bg-[#1F81FC] hover:bg-blue-600 text-xs font-bold text-white transition-all shadow-md"
                                >
                                    Retry Loading Replay
                                </button>
                            </div>
                        ) : recordingPlaybackUrl ? (
                            recordingPlaybackUrl.match(/\.(mp4|webm|ogg|m4v)(\?.*)?$/i) ? (
                                <video 
                                    src={recordingPlaybackUrl}
                                    controls
                                    autoPlay
                                    className="w-full h-full max-h-[85vh] object-contain bg-black"
                                />
                            ) : (
                                <iframe 
                                    src={recordingPlaybackUrl}
                                    allow="camera; microphone; fullscreen; display-capture; autoplay; encrypted-media"
                                    className="w-full h-full border-none"
                                    title={classDetails?.title || "UniEval Class Recording"}
                                />
                            )
                        ) : null}
                    </div>
                </main>
            );
        }

        return (
            <main className="min-h-screen w-full bg-[#0B0F19] text-white flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
                <div className="relative z-10 w-full max-w-md bg-[#131A3F]/90 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
                        isScheduled ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                        {isScheduled ? <Clock className="w-7 h-7" /> : <CheckCircle2 className="w-7 h-7" />}
                    </div>

                    <h2 className="text-xl font-bold text-white mb-2">
                        {isScheduled ? 'Class is Scheduled' : 'Class Has Ended'}
                    </h2>
                    <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                        {statusNotice.message}
                    </p>

                    {isScheduled && statusNotice.scheduledTime && (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 mb-6 font-mono">
                            <Calendar className="w-3.5 h-3.5 text-blue-400" />
                            {new Date(statusNotice.scheduledTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                        </div>
                    )}

                    <div className="w-full space-y-3">
                        {isScheduled ? (
                            <button
                                onClick={handleManualRefresh}
                                disabled={refreshing}
                                className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-[#1F81FC] hover:bg-blue-600 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                            >
                                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                                <span>{refreshing ? 'Checking status...' : 'Check If Started'}</span>
                            </button>
                        ) : (
                            <>
                                {(hasRealRecording || classDetails?.recordingStatus === 'ready' || recordingPlaybackUrl) ? (
                                    <button
                                        onClick={handleStartWatchingRecording}
                                        disabled={playbackLoading}
                                        className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                    >
                                        <Play className="w-4 h-4 fill-white text-white" />
                                        <span>{playbackLoading ? 'Preparing Replay...' : 'Watch Session Recording'}</span>
                                    </button>
                                ) : (classDetails?.recordingStatus === 'processing' || isProcessingRecording || (!hasRealRecording && !isScheduled)) ? (
                                    <div className="w-full p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-left space-y-3">
                                        <div className="flex items-center gap-2">
                                            <span className="relative flex h-3 w-3">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                                            </span>
                                            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Processing Recording</span>
                                        </div>
                                        <p className="text-xs text-amber-100/90 leading-relaxed">
                                            {processingMessage || 'The live session has ended and the recording is currently being processed. It will be available here in a few minutes — please check back shortly.'}
                                        </p>
                                        <button
                                            onClick={handleStartWatchingRecording}
                                            disabled={playbackLoading}
                                            className="w-full py-2.5 px-3 rounded-lg text-xs font-bold text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                        >
                                            <RefreshCw className={`w-3.5 h-3.5 ${playbackLoading ? 'animate-spin' : ''}`} />
                                            <span>{playbackLoading ? 'Checking Recording Status...' : 'Check If Ready'}</span>
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        disabled
                                        className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-slate-500 bg-slate-900/60 border border-slate-800 flex items-center justify-center gap-2 cursor-not-allowed select-none"
                                        title="Recording is currently unavailable"
                                    >
                                        <VideoOff className="w-4 h-4 text-slate-500" />
                                        <span>Recording Unavailable</span>
                                    </button>
                                )}
                                <button
                                    onClick={handleEnrollRedirect}
                                    className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all flex items-center justify-center gap-2"
                                >
                                    <BookOpen className="w-4 h-4 text-blue-400" />
                                    <span>View Course Materials</span>
                                </button>
                            </>
                        )}

                        <button
                            onClick={() => navigate('/dashboard')}
                            className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                        >
                            Return to Student Dashboard
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    // ── 5. CONNECTION ERROR ──
    if (error) {
        return (
            <main className="min-h-screen w-full bg-[#0B0F19] text-white flex flex-col items-center justify-center p-4">
                <div className="bg-[#131A3F] p-8 rounded-2xl max-w-md w-full text-center border border-slate-700/60 shadow-2xl">
                    <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-bold mb-2 text-white">Connection Error</h2>
                    <p className="text-slate-300 text-sm mb-6 leading-relaxed">{error}</p>
                    <div className="space-y-3">
                        <button 
                            onClick={handleManualRefresh}
                            className="w-full bg-[#1F81FC] hover:bg-blue-600 px-6 py-2.5 rounded-lg font-medium transition-colors text-sm shadow-md"
                        >
                            Try Again
                        </button>
                        <button 
                            onClick={() => navigate('/dashboard')} 
                            className="w-full text-slate-400 hover:text-white text-xs py-2 font-medium transition-colors"
                        >
                            Return to Dashboard
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    // ── 6. ACTIVE LIVE CLASSROOM ──
    const iframeSrc = streamUrl || (sessionKey ? `${import.meta.env.VITE_API_BASE_URL || '/api'}/live-classes/stream/${sessionKey}` : '');

    return (
        <main 
            ref={containerRef}
            onMouseMove={handleMouseMove}
            className="h-screen w-full bg-[#0B0F19] flex flex-col overflow-hidden relative"
        >
            {/* UniEval Branded Top Header (YouTube style auto-hiding when idle in fullscreen) */}
            <header className={`${
                isFullscreen 
                    ? 'absolute top-0 inset-x-0 z-30 bg-[#131A3F]/95 backdrop-blur-md shadow-2xl' 
                    : 'relative z-20 bg-[#131A3F]'
            } h-14 border-b border-slate-800 px-3 sm:px-6 flex items-center justify-between shrink-0 transition-all duration-300 ${
                controlsVisible ? 'opacity-100 translate-y-0' : isFullscreen ? 'opacity-0 -translate-y-full pointer-events-none' : 'opacity-100'
            }`}>
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#1F81FC] to-[#7F26FE] flex items-center justify-center shadow-sm shrink-0">
                        <Radio className="w-4 h-4 text-white animate-pulse" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white tracking-tight truncate max-w-[160px] sm:max-w-xs md:max-w-md">
                                {classDetails?.title || 'UniEval Live Class'}
                            </span>
                            <span className="hidden xs:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                LIVE
                            </span>
                            {isScreenSharing && (
                                <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 shrink-0">
                                    <MonitorPlay className="w-3 h-3 text-blue-400 animate-pulse" />
                                    Screen Share Active
                                </span>
                            )}
                            <span className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                                <Users className="w-3 h-3 text-blue-400" />
                                {realAttendees.length + 1} Connected
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {streamUrl && (
                        <a
                            href={streamUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hidden md:inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800/90 text-slate-200 hover:text-white hover:bg-slate-700 border border-slate-700 transition-all"
                            title="Open classroom in separate window"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Pop-out</span>
                        </a>
                    )}

                    {/* YouTube Fullscreen Toggle Button */}
                    <button
                        onClick={toggleFullscreen}
                        className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800/90 text-slate-200 hover:text-white hover:bg-slate-700 border border-slate-700 transition-all"
                        title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Player'}
                    >
                        {isFullscreen ? (
                            <>
                                <Minimize className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Exit</span>
                            </>
                        ) : (
                            <>
                                <Maximize className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Fullscreen</span>
                            </>
                        )}
                    </button>

                    <button 
                        onClick={handleLeave}
                        className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700"
                        title="Leave class"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Leave</span>
                    </button>

                    {isTeacher && (
                        <button 
                            onClick={handleEndClass}
                            className="inline-flex items-center gap-1.5 bg-red-600/90 hover:bg-red-600 text-white px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm active:scale-95"
                            title="End class for all participants"
                        >
                            <PhoneOff className="w-3.5 h-3.5" />
                            <span>End Class</span>
                        </button>
                    )}
                </div>
            </header>

            {/* Floating Auto-Pin Notification Banner */}
            {autoPinNotice && (
                <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-[#131A3F]/95 backdrop-blur-md text-white text-xs font-semibold px-4 py-2 rounded-full shadow-2xl border border-indigo-500/40 flex items-center gap-2 animate-bounce">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>{autoPinNotice}</span>
                </div>
            )}

            {/* Context Notice Banner (Only shown outside fullscreen or when controls are active) */}
            {!isFullscreen && (
                <div className={`transition-all duration-300 ${
                    controlsVisible ? 'opacity-100 max-h-12' : 'opacity-0 max-h-0 overflow-hidden'
                }`}>
                    {isTeacher ? (
                        <div className="bg-blue-950/40 border-b border-blue-900/30 px-4 py-2 text-xs text-blue-200 flex items-center justify-between shrink-0 shadow-inner">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
                                <span>
                                    <strong>Instructor Studio:</strong> Check camera & mic below, then click <strong>"Start Webinar"</strong> in the studio dialog to broadcast live to enrolled students.
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-2 shrink-0">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span>
                                    <strong>UniEval Classroom:</strong> Welcome, {user?.name || 'Student'}! Live audio & chat are connected.
                                </span>
                            </div>
                            <span className="text-[11px] text-blue-300/90 bg-blue-950/50 px-2.5 py-0.5 rounded-full border border-blue-800/50">
                                ✋ <strong>To share your screen or speak:</strong> Click "Raise Hand" in the toolbar below.
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Embedded Live Classroom Surface */}
            <div className="flex-1 relative w-full bg-black overflow-hidden">
                <iframe 
                    ref={iframeRef}
                    src={iframeSrc}
                    allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write; speaker-selection; encrypted-media"
                    className="w-full h-full border-none"
                    title="UniEval Live Classroom"
                />

                {/* Ambient Status Pill when screen share & camera are idle */}
                {!isScreenSharing && !isHostVideoActive && (
                    <div className="absolute top-4 left-4 z-20 pointer-events-none bg-[#131A3F]/90 backdrop-blur-md border border-slate-700/80 rounded-xl px-3.5 py-2.5 shadow-2xl flex items-center gap-3 max-w-sm">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                            <Radio className="w-4 h-4 animate-pulse" />
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                                <span className="text-xs font-bold text-white">Live Audio & Chat Active</span>
                            </div>
                            <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                                {isTeacher 
                                    ? 'Camera & screen share are currently off. Turn on camera or share screen below.' 
                                    : 'Screen & camera are currently idle. You can hear live audio & chat.'}
                            </p>
                        </div>
                    </div>
                )}

                {/* Floating Fullscreen Button (Fades out when mouse is idle) */}
                <div className={`absolute bottom-5 right-5 z-20 flex items-center gap-2 transition-all duration-300 ${
                    controlsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
                }`}>
                    <button
                        onClick={toggleFullscreen}
                        className="bg-slate-900/90 hover:bg-slate-800 text-white p-2.5 rounded-xl border border-slate-700/80 shadow-xl backdrop-blur-md transition-all active:scale-95"
                        title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                    >
                        {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </main>
    );
};

export default LiveClassRoom;
