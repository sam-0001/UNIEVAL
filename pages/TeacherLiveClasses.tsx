import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getDashboardRoute } from '../types';
import { 
    Video, 
    Calendar, 
    Clock, 
    Plus, 
    MonitorPlay, 
    Copy, 
    Play, 
    Trash2, 
    ArrowLeft, 
    Loader2, 
    CheckCircle2, 
    Radio, 
    BookOpen,
    Users,
    Share2,
    X,
    Sparkles,
    Check
} from 'lucide-react';
import LiveCountdown from '../components/live/LiveCountdown';

export const TeacherLiveClasses: React.FC = () => {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();
    const { user, isLoading } = useAuth();
    
    const [courses, setCourses] = useState<any[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<string>(courseId || '');
    
    const [liveClasses, setLiveClasses] = useState<any[]>([]);
    const [viewMode, setViewMode] = useState<'upcoming' | 'completed'>('upcoming');
    const [isCreatingInstant, setIsCreatingInstant] = useState(false);
    const [isFetchingClasses, setIsFetchingClasses] = useState(true);

    const [isScheduling, setIsScheduling] = useState(false);
    const [title, setTitle] = useState('');
    const [scheduledAt, setScheduledAt] = useState('');
    const [durationHours, setDurationHours] = useState<number>(2);
    const [showScheduleModal, setShowScheduleModal] = useState(false);

    // Recording management states
    const [editingRecordingClass, setEditingRecordingClass] = useState<any | null>(null);
    const [recordingUrlInput, setRecordingUrlInput] = useState('');
    const [isSavingRecording, setIsSavingRecording] = useState(false);

    // Toast feedback for copying links
    const [copiedClassId, setCopiedClassId] = useState<string | null>(null);

    useEffect(() => {
        if (isLoading) return;
        if (!user) {
            navigate('/login', { replace: true });
            return;
        }
        if (user.role === 'STUDENT') {
            navigate('/dashboard', { replace: true });
            return;
        }
        
        // Fetch all courses for this teacher
        const fetchCourses = async () => {
            try {
                const allCourses = await api.getCourses();
                setCourses(allCourses);
                if (!selectedCourse && allCourses.length > 0) {
                    setSelectedCourse(allCourses[0].id);
                }
            } catch (err) {
                console.error(err);
            }
        };
        fetchCourses();
    }, [user, navigate]);

    useEffect(() => {
        if (!selectedCourse) return;
        
        const fetchLiveClasses = async () => {
            setIsFetchingClasses(true);
            try {
                const endpoint = selectedCourse === 'all' 
                    ? '/api/live-classes/teacher-schedule'
                    : `/api/live-classes/course/${selectedCourse}`;
                    
                const res = await fetch(`${endpoint}?status=${viewMode}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
                const data = await res.json();
                if (data.liveClasses) {
                    setLiveClasses(data.liveClasses);
                }
            } catch (error) {
                console.error('Error fetching live classes', error);
            } finally {
                setIsFetchingClasses(false);
            }
        };
        fetchLiveClasses();
        
        // Update URL to match selected course
        if (selectedCourse !== courseId) {
            navigate(`/teacher/live-classes/${selectedCourse}`, { replace: true });
        }
    }, [selectedCourse, navigate, viewMode]);

    const handleSchedule = async () => {
        if (!title || !scheduledAt || isScheduling || !selectedCourse || selectedCourse === 'all') {
            alert('Please select a specific course from the dropdown to schedule.');
            return;
        }
        setIsScheduling(true);
        try {
            const startTime = new Date(scheduledAt);
            const res = await fetch('/api/live-classes/schedule', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    courseId: selectedCourse, 
                    title, 
                    scheduledStartTime: startTime.toISOString(),
                    scheduledEndTime: new Date(startTime.getTime() + durationHours * 60 * 60 * 1000).toISOString()
                })
            });
            
            if (res.ok) {
                setTitle('');
                setScheduledAt('');
                setShowScheduleModal(false);
                
                // Refetch
                const data = await res.json();
                const freshRes = await fetch(`/api/live-classes/course/${selectedCourse}?status=${viewMode}`, { 
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
                const freshData = await freshRes.json();
                setLiveClasses(freshData.liveClasses || []);
            } else {
                alert('Failed to schedule class');
            }
        } catch (error) {
            console.error('Error scheduling class', error);
            alert('Failed to schedule class');
        } finally {
            setIsScheduling(false);
        }
    };

    const handleDelete = async (classId: string) => {
        if (!window.confirm("Are you sure you want to cancel this meeting?")) return;
        try {
            const res = await fetch(`/api/live-classes/${classId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                setLiveClasses(prev => prev.filter(c => c.id !== classId));
            }
        } catch (error) {
            console.error('Error deleting class', error);
        }
    };

    const handleSaveRecording = async () => {
        if (!editingRecordingClass) return;
        setIsSavingRecording(true);
        try {
            const res = await api.updateLiveClassRecording(editingRecordingClass.id, recordingUrlInput);
            if (res.liveClass) {
                setLiveClasses(prev => prev.map(c => c.id === editingRecordingClass.id ? { ...c, recordingUrl: res.liveClass.recordingUrl } : c));
            }
            alert('Recording URL saved successfully!');
            setEditingRecordingClass(null);
            setRecordingUrlInput('');
        } catch (err: any) {
            console.error('Save recording error:', err);
            alert(err.message || 'Failed to save recording URL');
        } finally {
            setIsSavingRecording(false);
        }
    };

    const startInstantMeeting = async () => {
        if (isCreatingInstant) return;
        if (!selectedCourse || selectedCourse === 'all') {
            alert('Please select a specific course first to start an instant meeting.');
            return;
        }
        setIsCreatingInstant(true);
        const instantTitle = `Instant Meeting - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        try {
            const res = await fetch('/api/live-classes/schedule', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    courseId: selectedCourse, 
                    title: instantTitle, 
                    scheduledStartTime: new Date().toISOString(),
                    scheduledEndTime: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
                })
            });
            if (res.ok) {
                const data = await res.json();
                navigate(`/live-class/${data.liveClass.id}`);
            } else {
                alert('Failed to start instant meeting.');
            }
        } catch (e) {
            console.error(e);
            alert('An error occurred.');
        } finally {
            setIsCreatingInstant(false);
        }
    };

    const handleCopyInviteLink = (classId: string) => {
        const link = `${window.location.origin}/live-class/${classId}`;
        navigator.clipboard.writeText(link).then(() => {
            setCopiedClassId(classId);
            setTimeout(() => setCopiedClassId(null), 2500);
        });
    };

    // Live clock for instructor banner
    const [now, setNow] = useState(new Date());
    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 30000);
        return () => clearInterval(interval);
    }, []);

    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateString = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const selectedCourseObj = courses.find(c => c.id === selectedCourse);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
            {/* Top Navigation Bar */}
            <header className="bg-[#131A3F] text-white px-4 sm:px-6 py-3.5 flex items-center justify-between border-b border-slate-800 shadow-md">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#1F81FC] to-[#7F26FE] flex items-center justify-center shadow-sm">
                        <Radio className="w-5 h-5 text-white animate-pulse" />
                    </div>
                    <div>
                        <h1 className="text-base sm:text-lg font-bold tracking-tight text-white leading-tight">
                            Live Studio & Classes
                        </h1>
                        <p className="text-[11px] text-slate-400">Instructor Management Hub</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-4">
                    <button 
                        onClick={() => navigate(getDashboardRoute(user?.role))} 
                        className="text-xs sm:text-sm text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 px-3.5 py-1.5 rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors font-medium"
                    >
                        <ArrowLeft className="w-4 h-4" /> 
                        <span className="hidden xs:inline">Back to Dashboard</span>
                        <span className="xs:hidden">Dashboard</span>
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Desktop Sidebar Course Picker */}
                <aside className="hidden md:flex w-72 bg-white p-6 flex-col border-r border-slate-200 shrink-0">
                    <div className="mb-6">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                            Filter by Course
                        </label>
                        <select 
                            value={selectedCourse} 
                            onChange={(e) => setSelectedCourse(e.target.value)}
                            className="w-full bg-slate-50 text-slate-900 rounded-xl p-3 outline-none border border-slate-200 focus:border-[#1F81FC] text-xs font-semibold"
                        >
                            <option value="all">-- All Authored Courses --</option>
                            {courses.map(c => (
                                <option key={c.id} value={c.id}>{c.title}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <button 
                            onClick={() => setViewMode('upcoming')}
                            className={`w-full text-left px-4 py-3 rounded-xl font-bold text-xs flex items-center justify-between transition-all ${
                                viewMode === 'upcoming'
                                    ? 'bg-blue-50 text-[#1F81FC] border border-blue-200'
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                        >
                            <span className="flex items-center gap-2.5">
                                <Calendar className="w-4 h-4" />
                                <span>Upcoming Sessions</span>
                            </span>
                            {viewMode === 'upcoming' && <span className="w-2 h-2 rounded-full bg-[#1F81FC]" />}
                        </button>

                        <button 
                            onClick={() => setViewMode('completed')}
                            className={`w-full text-left px-4 py-3 rounded-xl font-bold text-xs flex items-center justify-between transition-all ${
                                viewMode === 'completed'
                                    ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                        >
                            <span className="flex items-center gap-2.5">
                                <Video className="w-4 h-4" />
                                <span>Recordings & Past</span>
                            </span>
                            {viewMode === 'completed' && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                        </button>
                    </div>

                    {selectedCourseObj && (
                        <div className="mt-auto p-4 rounded-xl bg-slate-50 border border-slate-200">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                Active Course
                            </span>
                            <p className="text-xs font-bold text-slate-800 truncate">
                                {selectedCourseObj.title}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                                {selectedCourseObj.category || 'Engineering'}
                            </p>
                        </div>
                    )}
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
                    {/* Mobile Course Selector */}
                    <div className="md:hidden mb-6 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                            Select Course
                        </label>
                        <select 
                            value={selectedCourse} 
                            onChange={(e) => setSelectedCourse(e.target.value)}
                            className="w-full bg-slate-50 text-slate-900 rounded-xl p-2.5 outline-none border border-slate-200 focus:border-[#1F81FC] text-xs font-semibold"
                        >
                            <option value="all">-- All Authored Courses --</option>
                            {courses.map(c => (
                                <option key={c.id} value={c.id}>{c.title}</option>
                            ))}
                        </select>
                    </div>

                    {/* Hero Banner with Clock */}
                    <div className="rounded-2xl bg-gradient-to-br from-[#131A3F] via-[#1a2350] to-[#251b4a] p-6 sm:p-8 flex flex-col justify-between mb-8 shadow-xl text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-80 h-80 bg-[#1F81FC]/15 rounded-full blur-3xl pointer-events-none" />
                        
                        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 mb-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white border border-white/20 backdrop-blur-md">
                                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                                <span>Instructor Studio Active</span>
                            </div>

                            <div className="text-xs text-slate-300 font-mono">
                                {liveClasses.length > 0 ? `${liveClasses.length} sessions listed` : 'Ready to broadcast'}
                            </div>
                        </div>

                        <div className="relative z-10 my-2">
                            <h2 className="text-4xl sm:text-6xl font-extrabold tracking-tight drop-shadow-md font-mono">
                                {timeString}
                            </h2>
                            <p className="text-slate-300 text-xs sm:text-sm font-medium mt-1">
                                {dateString}
                            </p>
                        </div>
                    </div>

                    {/* Quick Action Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                        {/* 1. Start Instant Meeting */}
                        <div 
                            onClick={startInstantMeeting} 
                            className={`bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between min-h-[140px] shadow-sm hover:shadow-md transition-all ${
                                isCreatingInstant ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:border-[#1F81FC]'
                            }`}
                        >
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1F81FC] flex items-center justify-center">
                                {isCreatingInstant ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Play className="w-5 h-5 fill-current" />
                                )}
                            </div>
                            <div className="mt-4">
                                <h3 className="text-sm sm:text-base font-bold text-slate-900">Instant Meeting</h3>
                                <p className="text-slate-500 text-xs mt-0.5">
                                    {isCreatingInstant ? 'Launching studio...' : 'Start a live room immediately'}
                                </p>
                            </div>
                        </div>

                        {/* 2. Schedule Future Session */}
                        <div 
                            onClick={() => setShowScheduleModal(true)} 
                            className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between min-h-[140px] shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-indigo-400"
                        >
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <Calendar className="w-5 h-5" />
                            </div>
                            <div className="mt-4">
                                <h3 className="text-sm sm:text-base font-bold text-slate-900">Schedule Class</h3>
                                <p className="text-slate-500 text-xs mt-0.5">Plan lecture date & time</p>
                            </div>
                        </div>

                        {/* 3. Recordings / Replays */}
                        <div 
                            onClick={() => setViewMode(viewMode === 'upcoming' ? 'completed' : 'upcoming')} 
                            className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between min-h-[140px] shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-emerald-400"
                        >
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <Video className="w-5 h-5" />
                            </div>
                            <div className="mt-4">
                                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                                    {viewMode === 'upcoming' ? 'View Recordings' : 'View Upcoming'}
                                </h3>
                                <p className="text-slate-500 text-xs mt-0.5">
                                    {viewMode === 'upcoming' ? 'Switch to completed sessions' : 'Switch to scheduled sessions'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Classes Grid */}
                    <div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">
                                    {viewMode === 'upcoming' ? 'Upcoming Live Sessions' : 'Session Recordings & History'}
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {viewMode === 'upcoming' 
                                        ? 'Start broadcasting or share student invite links' 
                                        : 'Manage recorded replays and video attachments'}
                                </p>
                            </div>

                            <button 
                                onClick={() => setViewMode(viewMode === 'upcoming' ? 'completed' : 'upcoming')} 
                                className="text-xs font-bold text-[#1F81FC] bg-blue-50 hover:bg-blue-100 px-3.5 py-1.5 rounded-xl border border-blue-200 transition-colors self-start sm:self-auto"
                            >
                                Switch to {viewMode === 'upcoming' ? 'Recordings' : 'Upcoming'}
                            </button>
                        </div>
                        
                        {isFetchingClasses ? (
                            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
                                <Loader2 className="w-6 h-6 animate-spin text-[#1F81FC]" />
                                <span>Loading live sessions...</span>
                            </div>
                        ) : liveClasses.length === 0 ? (
                            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-sm">
                                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                                    <Calendar className="w-6 h-6" />
                                </div>
                                <h3 className="text-sm font-bold text-slate-800 mb-1">
                                    No {viewMode} sessions found
                                </h3>
                                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                                    {viewMode === 'upcoming' 
                                        ? 'Schedule a new lecture or launch an instant meeting for your students.'
                                        : 'Past sessions and replays will appear here once lectures conclude.'}
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {liveClasses.map(lc => {
                                    const dateObj = new Date(lc.scheduledStartTime || lc.scheduledAt || lc.createdAt || Date.now());
                                    const isScheduled = lc.status === 'scheduled';
                                    const isLive = lc.status === 'live' || lc.status === 'in-progress';
                                    const isCopied = copiedClassId === lc.id;

                                    return (
                                        <div 
                                            key={lc.id} 
                                            className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between min-h-[200px]"
                                        >
                                            <div>
                                                <div className="flex items-center justify-between gap-2 mb-3">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                        isLive
                                                            ? 'bg-rose-50 text-rose-600 border border-rose-200'
                                                            : viewMode === 'completed'
                                                            ? 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                                                            : 'bg-blue-50 text-[#1F81FC] border border-blue-200'
                                                    }`}>
                                                        {isLive && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />}
                                                        {isLive ? 'LIVE NOW' : viewMode === 'completed' ? 'CONCLUDED' : 'SCHEDULED'}
                                                    </span>

                                                    <button 
                                                        onClick={() => handleDelete(lc.id)}
                                                        className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                                                        title="Delete or cancel class"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>

                                                <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate mb-1">
                                                    {lc.title}
                                                </h3>

                                                <p className="text-xs text-slate-500 mb-3 flex items-center gap-1.5">
                                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                    <span>{dateObj.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                                                </p>

                                                {isScheduled && (
                                                    <div className="mb-4">
                                                        <LiveCountdown targetTime={dateObj} compact={true} />
                                                    </div>
                                                )}
                                            </div>

                                            {viewMode === 'completed' ? (
                                                <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                                                    <button
                                                        onClick={() => navigate(`/live-class/${lc.id}`)}
                                                        className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                                                    >
                                                        <Play className="w-3.5 h-3.5 fill-current" />
                                                        <span>View Replay</span>
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setEditingRecordingClass(lc);
                                                            setRecordingUrlInput(lc.recordingUrl || '');
                                                        }}
                                                        className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs"
                                                        title="Attach or replace video URL"
                                                    >
                                                        Attach
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                                                    <button 
                                                        onClick={() => navigate(`/live-class/${lc.id}`)}
                                                        className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#1F81FC] to-[#7F26FE] hover:opacity-95 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-95"
                                                    >
                                                        <Play className="w-3.5 h-3.5 fill-current" />
                                                        <span>Start Studio</span>
                                                    </button>

                                                    <button 
                                                        onClick={() => handleCopyInviteLink(lc.id)}
                                                        className={`p-2.5 rounded-xl border transition-all text-xs font-semibold flex items-center gap-1 ${
                                                            isCopied
                                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-300'
                                                                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                                                        }`}
                                                        title="Copy Student Invite Link"
                                                    >
                                                        {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* Schedule Modal */}
            {showScheduleModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-scaleUp">
                        <div className="px-6 py-4 bg-[#131A3F] text-white flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-[#1F81FC]" />
                                <h3 className="text-sm font-bold">Schedule Lecture Session</h3>
                            </div>
                            <button
                                onClick={() => setShowScheduleModal(false)}
                                className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4 text-xs">
                            <div>
                                <label className="block text-slate-700 font-bold mb-1.5">Lecture Topic</label>
                                <input 
                                    type="text" 
                                    value={title} 
                                    onChange={e => setTitle(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-[#1F81FC] outline-none text-xs font-medium"
                                    placeholder="e.g. Unit 3 - Heat Exchangers & Numerical Analysis"
                                />
                            </div>

                            <div>
                                <label className="block text-slate-700 font-bold mb-1.5">Date & Start Time</label>
                                <input 
                                    type="datetime-local" 
                                    value={scheduledAt} 
                                    onChange={e => setScheduledAt(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-[#1F81FC] outline-none text-xs font-medium"
                                />
                            </div>

                            <div>
                                <label className="block text-slate-700 font-bold mb-1.5">Maximum Class Duration</label>
                                <select
                                    value={durationHours}
                                    onChange={e => setDurationHours(Number(e.target.value))}
                                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-[#1F81FC] outline-none text-xs font-medium"
                                >
                                    <option value={1}>1 Hour (Standard Lecture)</option>
                                    <option value={2}>2 Hours (Standard Session)</option>
                                    <option value={3}>3 Hours (Extended Workshop)</option>
                                    <option value={4}>4 Hours (Exam Marathon)</option>
                                    <option value={6}>6 Hours (Deep Dive Mega-Session)</option>
                                </select>
                            </div>

                            <div className="flex gap-2.5 pt-3">
                                <button 
                                    onClick={() => setShowScheduleModal(false)}
                                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleSchedule}
                                    disabled={!title || !scheduledAt || isScheduling}
                                    className="flex-1 py-2.5 bg-gradient-to-r from-[#1F81FC] to-[#7F26FE] hover:opacity-95 text-white disabled:opacity-50 rounded-xl font-bold transition-all shadow-md shadow-blue-500/20"
                                >
                                    {isScheduling ? 'Scheduling...' : 'Schedule Class'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Attach Recording Modal */}
            {editingRecordingClass && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-scaleUp">
                        <div className="px-6 py-4 bg-[#131A3F] text-white flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Video className="w-4 h-4 text-[#1F81FC]" />
                                <h3 className="text-sm font-bold">Attach Lecture Video Recording</h3>
                            </div>
                            <button
                                onClick={() => {
                                    setEditingRecordingClass(null);
                                    setRecordingUrlInput('');
                                }}
                                className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4 text-xs">
                            <p className="text-slate-600 leading-relaxed">
                                Paste the genuine video recording replay URL for <strong>{editingRecordingClass.title}</strong>. Students will be able to replay it directly.
                            </p>

                            <div>
                                <label className="block text-slate-700 font-bold mb-1.5 uppercase tracking-wider text-[11px]">
                                    Video Recording URL
                                </label>
                                <input 
                                    type="url" 
                                    value={recordingUrlInput} 
                                    onChange={e => setRecordingUrlInput(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-[#1F81FC] outline-none text-xs font-mono"
                                    placeholder="https://.../recording.mp4"
                                />
                            </div>

                            <div className="flex gap-2.5 pt-2">
                                <button 
                                    onClick={() => {
                                        setEditingRecordingClass(null);
                                        setRecordingUrlInput('');
                                    }}
                                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleSaveRecording}
                                    disabled={isSavingRecording}
                                    className="flex-1 py-2.5 bg-gradient-to-r from-[#1F81FC] to-[#7F26FE] hover:opacity-95 text-white disabled:opacity-50 rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
                                >
                                    {isSavingRecording ? 'Saving...' : 'Save Recording'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherLiveClasses;
