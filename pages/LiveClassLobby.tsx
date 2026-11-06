import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { 
  Video, 
  Calendar, 
  Clock, 
  ArrowLeft, 
  ShieldCheck, 
  Radio, 
  Sparkles,
  ExternalLink,
  Download,
  Share2,
  BookOpen
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PreflightDeviceCheck from '../components/live/PreflightDeviceCheck';
import LiveCountdown from '../components/live/LiveCountdown';
import { getGoogleCalendarUrl, downloadIcsFile } from '../components/live/CalendarUtils';

const LiveClassLobby: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [liveClass, setLiveClass] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [copiedInvite, setCopiedInvite] = useState(false);

    useEffect(() => {
        const fetchClassDetails = async () => {
            try {
                if (id) {
                    const res = await api.getLiveClassDetails(id);
                    setLiveClass(res);
                    if (res?.status === 'live') {
                        navigate(`/live-class/${id}`, { replace: true });
                    }
                }
            } catch (err) {
                console.error("Failed to fetch live class details", err);
            } finally {
                setLoading(false);
            }
        };
        fetchClassDetails();
    }, [id, navigate]);

    const handleCopyInvite = () => {
        const link = `${window.location.origin}/live-class/${id}`;
        navigator.clipboard.writeText(link).then(() => {
            setCopiedInvite(true);
            setTimeout(() => setCopiedInvite(false), 2500);
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0B0F19] text-white flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#1F81FC] to-[#7F26FE] flex items-center justify-center animate-pulse shadow-lg shadow-blue-500/20">
                        <Radio className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xs text-slate-400">Loading classroom lobby...</span>
                </div>
            </div>
        );
    }

    if (!liveClass) {
        return (
            <div className="min-h-screen bg-[#0B0F19] text-white flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-[#131A3F] border border-slate-800 p-8 rounded-2xl text-center shadow-2xl">
                    <h2 className="text-xl font-bold text-white mb-2">Class Not Found</h2>
                    <p className="text-xs text-slate-400 mb-6">
                        This live session might have concluded or the link has expired.
                    </p>
                    <button 
                        onClick={() => navigate('/dashboard')} 
                        className="w-full py-2.5 px-4 rounded-xl bg-[#1F81FC] hover:bg-blue-600 text-xs font-bold text-white transition-colors"
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const scheduledTarget = liveClass.scheduledStartTime || liveClass.scheduledAt || Date.now();
    const isLive = liveClass.status === 'live';

    const calEvent = {
        title: liveClass.title || 'UniEval Live Class',
        description: `Interactive live session for ${liveClass.courseTitle || 'UniEval Course'}. Instructor: ${liveClass.teacherName || 'Faculty'}.`,
        startTime: scheduledTarget,
        location: `${window.location.origin}/live-class/${id}`
    };

    return (
        <main className="min-h-screen bg-[#0B0F19] text-white py-8 sm:py-12 px-4 sm:px-6 relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#1F81FC]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#7F26FE]/10 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-4xl mx-auto space-y-6 relative z-10">
                {/* Top Navigation */}
                <div className="flex items-center justify-between">
                    <button 
                        onClick={() => navigate(-1)} 
                        className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-xs font-medium"
                    >
                        <ArrowLeft className="w-4 h-4" /> 
                        <span>Back to Dashboard</span>
                    </button>

                    <button
                        onClick={handleCopyInvite}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#131A3F] text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700 transition-colors"
                    >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>{copiedInvite ? 'Link Copied!' : 'Share Lobby'}</span>
                    </button>
                </div>

                {/* Hero Classroom Card */}
                <div className="bg-[#131A3F]/90 backdrop-blur-xl rounded-2xl border border-slate-700/70 shadow-2xl overflow-hidden">
                    {/* Header Banner */}
                    <div className="bg-gradient-to-r from-[#131A3F] via-[#1a2350] to-[#251b4a] p-6 sm:p-8 border-b border-slate-800/80">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-[#1F81FC]/15 text-[#1F81FC] border border-[#1F81FC]/30">
                                <Radio className="w-3.5 h-3.5 animate-pulse" />
                                <span>UniEval Live Session</span>
                            </div>

                            {isLive && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">
                                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                                    BROADCASTING LIVE NOW
                                </span>
                            )}
                        </div>

                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-2">
                            {liveClass.title}
                        </h1>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300 mt-2">
                            {liveClass.courseTitle && (
                                <span className="flex items-center gap-1.5">
                                    <BookOpen className="w-3.5 h-3.5 text-[#1F81FC]" />
                                    <span>Course: <strong className="text-white">{liveClass.courseTitle}</strong></span>
                                </span>
                            )}
                            {liveClass.teacherName && (
                                <span>Instructor: <strong className="text-white">{liveClass.teacherName}</strong></span>
                            )}
                        </div>
                    </div>

                    {/* Class Details & Countdown */}
                    <div className="p-6 sm:p-8 flex flex-col md:flex-row gap-6 md:gap-8 items-start md:items-center justify-between">
                        <div className="space-y-4 flex-1 w-full">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="p-3 rounded-xl bg-[#0B0F19]/80 border border-slate-800 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-[#1F81FC] flex items-center justify-center shrink-0">
                                        <Calendar className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Scheduled Date</p>
                                        <p className="font-bold text-xs sm:text-sm text-white">
                                            {new Date(scheduledTarget).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                        </p>
                                    </div>
                                </div>

                                <div className="p-3 rounded-xl bg-[#0B0F19]/80 border border-slate-800 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                                        <Clock className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Start Time</p>
                                        <p className="font-bold text-xs sm:text-sm text-white">
                                            {new Date(scheduledTarget).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Calendar Export Buttons */}
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                <a
                                    href={getGoogleCalendarUrl(calEvent)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-xs text-blue-400 hover:text-blue-300 border border-slate-700 transition-colors"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    <span>Add to Google Calendar</span>
                                </a>

                                <button
                                    onClick={() => downloadIcsFile(calEvent)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-xs text-slate-300 hover:text-white border border-slate-700 transition-colors"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Download .ics file</span>
                                </button>
                            </div>
                        </div>

                        {/* CTA Button Box */}
                        <div className="w-full md:w-auto flex flex-col gap-3 min-w-full sm:min-w-[260px]">
                            <button 
                                onClick={() => navigate(`/live-class/${id}`)}
                                className="w-full bg-gradient-to-r from-[#1F81FC] to-[#7F26FE] hover:opacity-95 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 active:scale-95 text-sm sm:text-base"
                            >
                                <Video className="w-5 h-5" />
                                <span>{isLive ? 'Join Live Stream Now' : 'Enter Classroom Waiting Lobby'}</span>
                            </button>

                            <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-400 font-medium bg-emerald-500/10 py-2 px-3 rounded-lg border border-emerald-500/20">
                                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                <span>End-to-End Encrypted HD Stream</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Pre-flight Hardware Check Component */}
                <div className="w-full">
                    <PreflightDeviceCheck />
                </div>
            </div>
        </main>
    );
};

export default LiveClassLobby;
