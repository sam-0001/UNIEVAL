import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { Video, Calendar, Clock, Plus, MonitorPlay, Copy, Play, Trash2, ArrowLeft, Sun, Moon, Loader2, VideoOff, Link, CheckCircle2 } from 'lucide-react';

const TeacherLiveClasses: React.FC = () => {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();
    const { user, isLoading } = useAuth();
    
    const [courses, setCourses] = useState<any[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<string>(courseId || '');
    
    const [liveClasses, setLiveClasses] = useState<any[]>([]);
    const [viewMode, setViewMode] = useState<'upcoming' | 'completed'>('upcoming');
    const [isDarkMode, setIsDarkMode] = useState(false);
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
                const freshRes = await fetch(`/api/live-classes/course/${selectedCourse}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }});
                const freshData = await freshRes.json();
                setLiveClasses(freshData.liveClasses);
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
            alert('Please select a course first');
            return;
        }
        setIsCreatingInstant(true);
        const instantTitle = `Instant Meeting - ${new Date().toLocaleTimeString()}`;
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
                    // Support long classes up to 6 hours so it never cuts off
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

    // Current Time for Banner
    const [now, setNow] = useState(new Date());
    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);

    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateString = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div className={`min-h-screen bg-slate-50 dark:bg-[#161925] text-slate-900 dark:text-white flex flex-col ${isDarkMode ? 'dark' : ''}`}>
            <header className="bg-white dark:bg-[#1C1F2E] px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between border-b border-slate-200 dark:border-[#2A2E3D]">
                <div className="flex items-center gap-2.5 sm:gap-3">
                    <img src="/img/logo.jpeg" alt="UNIEVAL Logo" className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg object-cover shadow-md" />
                    <h1 className="text-lg sm:text-xl font-bold tracking-tight">UniEval Live Class</h1>
                </div>
                <div className="flex items-center gap-2 sm:gap-4">
                    <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-full bg-slate-100 dark:bg-[#252A41] text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-[#2A2E3D] transition-colors" title="Toggle theme">
                        {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </button>
                    <button onClick={() => navigate('/teacher/upload')} className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 hover:text-indigo-600 dark:text-blue-400 flex items-center gap-1.5 transition-colors font-medium">
                        <ArrowLeft className="w-4 h-4" /> <span className="hidden xs:inline">Back to App</span><span className="xs:hidden">Back</span>
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Desktop Sidebar */}
                <aside className="hidden md:flex w-72 bg-white dark:bg-[#1C1F2E] p-6 flex-col border-r border-slate-200 dark:border-[#2A2E3D] shrink-0">
                    <div className="mb-6">
                        <label className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">Select Course</label>
                        <select 
                            value={selectedCourse} 
                            onChange={(e) => setSelectedCourse(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-[#161925] text-slate-900 dark:text-white rounded-lg p-3 outline-none border border-slate-200 dark:border-[#2A2E3D] focus:border-indigo-500"
                        >
                            <option value="all">-- All My Courses --</option>
                            {courses.map(c => (
                                <option key={c.id} value={c.id}>{c.title}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <button className="w-full text-left px-4 py-3 bg-indigo-50 dark:bg-[#252A41] text-indigo-700 dark:text-blue-300 rounded-lg font-bold flex items-center gap-3">
                            <MonitorPlay className="w-5 h-5" /> Home
                        </button>
                        <button className="w-full text-left px-4 py-3 text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:bg-[#161925] hover:text-slate-900 dark:text-white rounded-lg font-medium flex items-center gap-3 transition-colors">
                            <Calendar className="w-5 h-5" /> Upcoming
                        </button>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-4 sm:p-6 md:p-10 overflow-y-auto">
                    {/* Mobile Course Selector */}
                    <div className="md:hidden mb-6 bg-white dark:bg-[#1C1F2E] p-4 rounded-xl border border-slate-200 dark:border-[#2A2E3D] shadow-sm">
                        <label className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">Select Course</label>
                        <select 
                            value={selectedCourse} 
                            onChange={(e) => setSelectedCourse(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-[#161925] text-slate-900 dark:text-white rounded-lg p-2.5 outline-none border border-slate-200 dark:border-[#2A2E3D] focus:border-indigo-500 text-sm"
                        >
                            <option value="all">-- All My Courses --</option>
                            {courses.map(c => (
                                <option key={c.id} value={c.id}>{c.title}</option>
                            ))}
                        </select>
                    </div>

                    {/* Hero Banner */}
                    <div className="min-h-[160px] sm:h-64 rounded-2xl sm:rounded-[20px] bg-gradient-to-br from-indigo-600 to-purple-700 p-5 sm:p-8 flex flex-col justify-between mb-6 sm:mb-10 shadow-xl relative overflow-hidden text-white">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                        <h2 className="relative z-10 bg-white/20 text-white w-fit px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-xs sm:text-sm font-bold border border-white/20 backdrop-blur-md shadow-sm">
                            Upcoming Meeting at: {liveClasses.length > 0 ? new Date(liveClasses[0].scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'None'}
                        </h2>
                        <div className="relative z-10 my-auto sm:my-0">
                            <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tighter drop-shadow-md">{timeString}</h1>
                            <p className="text-indigo-100 text-sm sm:text-lg md:text-xl font-medium mt-1 sm:mt-2 drop-shadow-sm">{dateString}</p>
                        </div>
                    </div>

                    {/* Action Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-8 sm:mb-12">
                        <div onClick={startInstantMeeting} className={`bg-white dark:bg-[#1C1F2E] border border-slate-200 dark:border-[#2A2E3D] rounded-2xl p-5 sm:p-6 min-h-[130px] sm:min-h-[140px] flex flex-col justify-between ${isCreatingInstant ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:border-orange-500 hover:shadow-md'} transition-all`}>
                            <div className="w-10 h-10 rounded-[10px] bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center">
                                {isCreatingInstant ? (
                                    <Loader2 className="w-5 h-5 text-orange-600 dark:text-orange-400 animate-spin" />
                                ) : (
                                    <Plus className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                                )}
                            </div>
                            <div className="mt-3 sm:mt-4">
                                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">New Meeting</h3>
                                <p className="text-slate-500 dark:text-gray-400 text-xs sm:text-sm">
                                    {isCreatingInstant ? 'Starting...' : 'Start an instant meeting'}
                                </p>
                            </div>
                        </div>

                        <div onClick={() => setShowScheduleModal(true)} className="bg-white dark:bg-[#1C1F2E] border border-slate-200 dark:border-[#2A2E3D] rounded-2xl p-5 sm:p-6 min-h-[130px] sm:min-h-[140px] flex flex-col justify-between cursor-pointer hover:border-blue-500 hover:shadow-md transition-all">
                            <div className="w-10 h-10 rounded-[10px] bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="mt-3 sm:mt-4">
                                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Schedule Meeting</h3>
                                <p className="text-slate-500 dark:text-gray-400 text-xs sm:text-sm">Plan your meeting</p>
                            </div>
                        </div>

                        <div onClick={() => setViewMode(viewMode === 'upcoming' ? 'completed' : 'upcoming')} className="bg-white dark:bg-[#1C1F2E] border border-slate-200 dark:border-[#2A2E3D] rounded-2xl p-5 sm:p-6 min-h-[130px] sm:min-h-[140px] flex flex-col justify-between cursor-pointer hover:border-indigo-500 hover:shadow-md transition-all">
                            <div className="w-10 h-10 rounded-[10px] bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
                                <Video className="w-5 h-5 text-indigo-600 dark:text-blue-400" />
                            </div>
                            <div className="mt-3 sm:mt-4">
                                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">View Recordings</h3>
                                <p className="text-slate-500 dark:text-gray-400 text-xs sm:text-sm">Check out your recordings</p>
                            </div>
                        </div>
                    </div>

                    {/* Upcoming Meetings List */}
                    <div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                            <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                                {viewMode === 'upcoming' ? 'Upcoming Classes' : 'Completed Classes / Recordings'}
                            </h2>
                            <button onClick={() => setViewMode(viewMode === 'upcoming' ? 'completed' : 'upcoming')} className="text-xs sm:text-sm font-bold text-indigo-600 dark:text-blue-400 bg-indigo-50 dark:bg-[#252A41] hover:bg-indigo-100 dark:hover:bg-[#3A3F58] px-3.5 sm:px-4 py-2 rounded-lg transition-colors border border-indigo-100 self-start sm:self-auto">
                                Switch to {viewMode === 'upcoming' ? 'Completed' : 'Upcoming'}
                            </button>
                        </div>
                        
                        {isFetchingClasses ? (
                            <div className="text-slate-500 dark:text-gray-400">Loading classes...</div>
                        ) : liveClasses.length === 0 ? (
                            <div className="bg-white dark:bg-[#1C1F2E] border border-slate-200 dark:border-[#2A2E3D] rounded-xl p-8 text-center shadow-sm">
                                <p className="text-slate-500 dark:text-gray-400">No {viewMode} meetings for this course.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
                                {liveClasses.map(lc => (
                                    <div key={lc.id} className="bg-white dark:bg-[#1C1F2E] border border-slate-200 dark:border-[#2A2E3D] shadow-sm rounded-2xl p-6 hover:border-indigo-300 dark:hover:border-[#3A3F58] hover:shadow-md transition-all flex flex-col justify-between min-h-[200px]">
                                        <div>
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-[#252A41] flex items-center justify-center">
                                                    <Calendar className="w-5 h-5 text-indigo-600 dark:text-blue-400" />
                                                </div>
                                                <h3 className="text-xl font-semibold truncate text-slate-900 dark:text-white">{lc.title}</h3>
                                            </div>
                                            <p className="text-slate-500 dark:text-gray-400 text-sm mb-6 flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-slate-400" />
                                                {new Date(lc.scheduledStartTime || lc.scheduledAt || lc.createdAt || Date.now()).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                            </p>
                                        </div>
                                        {viewMode === 'completed' ? (
                                            <div className="flex flex-col gap-2.5 mt-auto">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-slate-500 dark:text-gray-400 font-medium">Session Status:</span>
                                                    <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Completed
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {(lc.recordingStatus === 'ready' || (lc.recordingUrl && !lc.recordingUrl.endsWith(lc.dailyRoomName || ''))) ? (
                                                        <button
                                                            onClick={() => navigate(`/live-class/${lc.id}`)}
                                                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                                                            title="Watch recording replay"
                                                        >
                                                            <Play className="w-3.5 h-3.5 fill-current" /> Watch Recording
                                                        </button>
                                                    ) : lc.recordingStatus === 'processing' ? (
                                                        <button
                                                            onClick={() => navigate(`/live-class/${lc.id}`)}
                                                            className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-700/60 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                                                            title="Recording is currently being processed by Webinar.gg"
                                                        >
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" /> Processing Recording
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => navigate(`/live-class/${lc.id}`)}
                                                            className="flex-1 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                                                            title="Check or view session recording"
                                                        >
                                                            <Play className="w-3.5 h-3.5" /> View Session
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={() => handleDelete(lc.id)}
                                                        className="p-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/40 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-lg transition-colors"
                                                        title="Delete Meeting"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 mt-auto">
                                                <button 
                                                    onClick={() => navigate(`/live-class/${lc.id}`)}
                                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <Play className="w-4 h-4" /> Start
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(`${window.location.origin}/live-class/lobby/${lc.id}`);
                                                        alert('Link copied!');
                                                    }}
                                                    className="px-4 py-2 bg-slate-100 dark:bg-[#252A41] hover:bg-slate-200 dark:hover:bg-[#2A2E3D] text-slate-600 dark:text-gray-300 rounded-lg transition-colors"
                                                    title="Copy Student Link"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(lc.id)}
                                                    className="px-4 py-2 bg-red-50 hover:bg-red-100 border border-red-100 text-red-600 rounded-lg transition-colors"
                                                    title="Delete Meeting"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* Schedule Modal */}
            {showScheduleModal && (
                <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-[#1C1F2E] w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-[#2A2E3D] overflow-hidden">
                        <div className="p-6 text-slate-900 dark:text-white">
                            <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">Schedule Meeting</h2>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 dark:text-gray-300 mb-2">Topic</label>
                                    <input 
                                        type="text" 
                                        value={title} 
                                        onChange={e => setTitle(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-[#161925] border border-slate-200 dark:border-[#2A2E3D] rounded-lg p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="e.g. Chapter 1 Discussion"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 dark:text-gray-300 mb-2">Date & Time</label>
                                    <input 
                                        type="datetime-local" 
                                        value={scheduledAt} 
                                        onChange={e => setScheduledAt(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-[#161925] border border-slate-200 dark:border-[#2A2E3D] rounded-lg p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 dark:text-gray-300 mb-2">Class Duration</label>
                                    <select
                                        value={durationHours}
                                        onChange={e => setDurationHours(Number(e.target.value))}
                                        className="w-full bg-slate-50 dark:bg-[#161925] border border-slate-200 dark:border-[#2A2E3D] rounded-lg p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                    >
                                        <option value={1}>1 Hour (Standard lecture)</option>
                                        <option value={2}>2 Hours (Standard session)</option>
                                        <option value={3}>3 Hours (Extended marathon)</option>
                                        <option value={4}>4 Hours (Deep-dive workshop)</option>
                                        <option value={6}>6 Hours (Long mega-session)</option>
                                    </select>
                                    <p className="text-xs text-slate-400 dark:text-gray-500 mt-1">Class can run continuously for up to this duration without auto-terminating.</p>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-8">
                                <button 
                                    onClick={() => setShowScheduleModal(false)}
                                    className="flex-1 py-3 bg-slate-100 dark:bg-[#252A41] hover:bg-slate-200 dark:hover:bg-[#2A2E3D] text-slate-700 dark:text-gray-200 rounded-lg font-bold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleSchedule}
                                    disabled={!title || !scheduledAt || isScheduling}
                                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white disabled:opacity-50 rounded-lg font-bold transition-colors"
                                >
                                    {isScheduling ? 'Scheduling...' : 'Schedule'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit / Attach Recording Modal */}
            {editingRecordingClass && (
                <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-[#1C1F2E] w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-[#2A2E3D] overflow-hidden">
                        <div className="p-6 text-slate-900 dark:text-white">
                            <h2 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">Attach Video Recording</h2>
                            <p className="text-xs text-slate-500 dark:text-gray-400 mb-4">
                                Paste the genuine video recording replay URL (e.g., Cloudflare R2 / MP4 / Vimeo / Webinar replay stream) for <strong>{editingRecordingClass.title}</strong>. Students will be able to watch it directly.
                            </p>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-1">Video Recording URL</label>
                                    <input 
                                        type="url" 
                                        value={recordingUrlInput} 
                                        onChange={e => setRecordingUrlInput(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-[#161925] border border-slate-200 dark:border-[#2A2E3D] rounded-lg p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                        placeholder="https://.../recording.mp4"
                                    />
                                    <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-1">
                                        Leave empty and save if you wish to clear or remove the recording link.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button 
                                    onClick={() => {
                                        setEditingRecordingClass(null);
                                        setRecordingUrlInput('');
                                    }}
                                    className="flex-1 py-2.5 bg-slate-100 dark:bg-[#252A41] hover:bg-slate-200 dark:hover:bg-[#2A2E3D] text-slate-700 dark:text-gray-200 rounded-lg font-bold text-sm transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleSaveRecording}
                                    disabled={isSavingRecording}
                                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white disabled:opacity-50 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2"
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
