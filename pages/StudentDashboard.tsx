import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth, useCredits } from '../context/AuthContext';
import { api } from '../services/api';
import { Course, Note, UserRole, PurchaseRecord } from '../types';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { 
  LayoutDashboard, BookOpen, FileText, Video, VideoOff,
  Settings, CreditCard, Sparkles, GraduationCap, ChevronRight, CheckCircle, Clock, LogOut, Menu, X, Brain, Wrench, Search, Bell, ArrowRight, Play, Zap, Compass, Rocket, Calendar, Download, Bookmark, Star, Navigation, Radio, Eye, Users, MonitorPlay, AlertCircle, Database, Globe, Loader2, RefreshCw, Layers, Filter
} from 'lucide-react';
import { BuyCreditsModal } from './QuizDetail';
import CustomVideoPlayer from '../components/CustomVideoPlayer';

type Tab = 'overview' | 'courses' | 'notes' | 'live' | 'billing' | 'settings';

const StudentDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { credits, freeLeft, freeQuizLimit, freeQuizUsed, isUnlimited, unlimitedPlan, refresh: refreshCredits } = useCredits();

  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const tabParam = searchParams.get('tab') as Tab;
    if (tabParam && ['overview', 'courses', 'notes', 'live', 'billing', 'settings'].includes(tabParam)) {
      return tabParam;
    }
    return (localStorage.getItem('studentDashboardTab') as Tab) || 'overview';
  });

  useEffect(() => {
    const tabParam = searchParams.get('tab') as Tab;
    if (tabParam && ['overview', 'courses', 'notes', 'live', 'billing', 'settings'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  useEffect(() => {
    localStorage.setItem('studentDashboardTab', activeTab);
  }, [activeTab]);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [allCoursesState, setAllCoursesState] = useState<Course[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [allNotesState, setAllNotesState] = useState<Note[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [liveClasses, setLiveClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [myPurchases, setMyPurchases] = useState<Record<string, PurchaseRecord>>({});
  const [loading, setLoading] = useState(true);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNoteYearFilter, setSelectedNoteYearFilter] = useState<number | 'all'>('all');
  const [noteSearchQuery, setNoteSearchQuery] = useState('');
  const [selectedCourseYearFilter, setSelectedCourseYearFilter] = useState<number | 'all'>('all');
  const [courseSearchQuery, setCourseSearchQuery] = useState('');
  const [liveTabFilter, setLiveTabFilter] = useState<'upcoming' | 'live' | 'my-classes' | 'recordings'>('upcoming');
  const [activeRecording, setActiveRecording] = useState<any | null>(null);
  const [playbackStreamUrl, setPlaybackStreamUrl] = useState<string | null>(null);
  const [playbackLoading, setPlaybackLoading] = useState(false);
  const [playbackProcessing, setPlaybackProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [playbackError, setPlaybackError] = useState('');

  const handleOpenRecording = async (lc: any) => {
    setActiveRecording(lc);
    setPlaybackLoading(true);
    setPlaybackError('');
    setPlaybackProcessing(false);
    setProcessingMessage('');
    setPlaybackStreamUrl(null);

    // If direct MP4 / external video URL
    if (lc.recordingUrl && !lc.recordingUrl.includes('webinar.gg') && !lc.recordingUrl.endsWith(lc.dailyRoomName || '')) {
      setPlaybackStreamUrl(lc.recordingUrl);
      setPlaybackLoading(false);
      return;
    }

    try {
      const res = await api.getLiveClassPlayback(lc.id);
      if (res.status === 'processing') {
        setPlaybackProcessing(true);
        setProcessingMessage(res.message || 'The live session has ended and the recording is currently being processed. It will be available here in a few minutes — please check back shortly.');
      } else if (res.playbackUrl) {
        setPlaybackStreamUrl(res.playbackUrl);
        setLiveClasses(prev => prev.map(item => item.id === lc.id ? { ...item, recordingUrl: res.playbackUrl, recordingStatus: 'ready' } : item));
      } else {
        throw new Error('Playback URL unavailable');
      }
    } catch (err: any) {
      console.error('Error opening recording:', err);
      const fallback = lc.recordingUrl;
      if (fallback && !fallback.endsWith(lc.dailyRoomName || '')) {
        setPlaybackStreamUrl(fallback);
      } else {
        setPlaybackError(err.message || 'Failed to initialize secure recording replay session');
      }
    } finally {
      setPlaybackLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === UserRole.STUDENT) {
      const fetchPurchases = async () => {
        try {
          // 1. Fetch core catalog & subjects first so dashboard renders instantly in ~200ms
          const [allCourses, allNotes, allSubjects] = await Promise.all([
            api.getCourses(), 
            api.getNotes(), 
            api.getSubjects(),
          ]);
          setAllCoursesState(allCourses);
          setCourses(allCourses.filter(c => user.purchasedCourseIds?.includes(c.id)));
          setAllNotesState(allNotes);
          setNotes(allNotes.filter(n => user.purchasedNoteIds?.includes(n.id)));
          setSubjects(allSubjects || []);
          setLoading(false); // Dashboard unlocks immediately without waiting for secondary APIs!

          // 2. Fetch purchases & live class schedule in parallel in background
          Promise.all([
            api.getMyPurchases().catch(() => []),
            api.getMyLiveClassSchedule().catch(() => ({ liveClasses: [] }))
          ]).then(([purchasesList, scheduleRes]) => {
            if (Array.isArray(purchasesList)) {
              const pMap: Record<string, PurchaseRecord> = {};
              purchasesList.forEach(p => { pMap[p.productId] = p; });
              setMyPurchases(pMap);
            }
            if (scheduleRes && Array.isArray(scheduleRes.liveClasses)) {
              setLiveClasses(scheduleRes.liveClasses);
            }
          }).catch(err => {
            console.warn('[Dashboard] Background metadata fetch:', err);
          });
        } catch (error) {
          console.error('Failed to fetch dashboard content', error);
          setLoading(false);
        }
      };
      fetchPurchases();
    } else {
      setLoading(false);
    }
  }, [user]);

  const refreshLiveSchedule = useCallback(async () => {
    try {
      const scheduleRes = await api.getMyLiveClassSchedule();
      if (Array.isArray(scheduleRes?.liveClasses)) {
        setLiveClasses(scheduleRes.liveClasses);
      }
    } catch (e) {
      // Ignore background refresh errors
    }
  }, []);

  // Real-time synchronization for live classes
  useEffect(() => {
    if (!user || user.role !== UserRole.STUDENT) return;

    let socket: any = null;
    try {
      socket = io(window.location.origin, {
        transports: ['polling', 'websocket'],
        reconnectionAttempts: 3,
        timeout: 5000,
      });

      socket.on('connect_error', () => {
        // Silently handled; polling fallback below ensures schedule stays updated
      });

      socket.on('live-class-status-changed', () => {
        refreshLiveSchedule();
      });

      socket.on('live-class-ended', () => {
        refreshLiveSchedule();
      });

      socket.on('class-ended', () => {
        refreshLiveSchedule();
      });
    } catch (e) {
      // Fallback to polling
    }

    // Auto-poll live class schedule: every 4 seconds when viewing live tab, every 15 seconds otherwise
    const pollInterval = setInterval(() => {
      refreshLiveSchedule();
    }, activeTab === 'live' ? 4000 : 15000);

    return () => {
      if (socket) {
        socket.disconnect();
      }
      clearInterval(pollInterval);
    };
  }, [user, activeTab, refreshLiveSchedule]);

  useEffect(() => {
    if (activeTab === 'live') {
      refreshLiveSchedule();
    }
  }, [activeTab, refreshLiveSchedule]);

  if (!user) return <Navigate to="/login" replace />;
  if (user.role === UserRole.SUPER_ADMIN) return <Navigate to="/super-admin" replace />;
  if (user.role === UserRole.ADMIN || user.role === UserRole.TEACHER) return <Navigate to="/admin" replace />;

  const freeUsedCount = freeQuizUsed;
  const unlimitedExpiry = unlimitedPlan?.expiresAt ? new Date(unlimitedPlan.expiresAt) : null;
  const unlimitedActive = isUnlimited;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'courses', label: 'My Courses', icon: BookOpen },
    { id: 'notes', label: 'My Notes', icon: FileText },
    { id: 'live', label: 'Live Classes', icon: Video },
    { id: 'billing', label: 'Credits & Plans', icon: CreditCard },
  ];

  const getItemYear = useCallback((subjectId: string): number => {
    const subject = subjects.find(s => s.id === subjectId);
    if (subject?.year && typeof subject.year === 'number') {
      return subject.year;
    }
    const lower = (subjectId || '').toLowerCase();
    if (lower.startsWith('fe') || lower.includes('fe-') || lower.includes('first')) return 1;
    if (lower.startsWith('se') || lower.includes('se-') || lower.includes('second')) return 2;
    if (lower.startsWith('te') || lower.includes('te-') || lower.includes('third')) return 3;
    if (lower.startsWith('be') || lower.includes('be-') || lower.includes('final')) return 4;
    return 1;
  }, [subjects]);

  const getYearMeta = useCallback((yearNumber: number) => {
    switch (yearNumber) {
      case 1:
        return {
          code: 'FE',
          name: 'First Year Engineering',
          shortName: 'FE (First Year)',
          badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
          dotColor: 'bg-[#1F81FC]',
          accentText: 'text-[#1F81FC]',
          pillActive: 'bg-[#1F81FC] text-white shadow-sm',
          pillInactive: 'bg-white text-slate-700 border border-slate-200 hover:bg-blue-50/50',
          gradientBadge: 'from-blue-600 to-indigo-600',
          borderColor: 'border-blue-100',
          subtext: 'Common foundational subjects & first year engineering curriculum'
        };
      case 2:
        return {
          code: 'SE',
          name: 'Second Year Engineering',
          shortName: 'SE (Second Year)',
          badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          dotColor: 'bg-indigo-600',
          accentText: 'text-indigo-600',
          pillActive: 'bg-indigo-600 text-white shadow-sm',
          pillInactive: 'bg-white text-slate-700 border border-slate-200 hover:bg-indigo-50/50',
          gradientBadge: 'from-indigo-600 to-purple-600',
          borderColor: 'border-indigo-100',
          subtext: 'Department-specific core engineering subjects & lab courses'
        };
      case 3:
        return {
          code: 'TE',
          name: 'Third Year Engineering',
          shortName: 'TE (Third Year)',
          badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
          dotColor: 'bg-purple-600',
          accentText: 'text-purple-600',
          pillActive: 'bg-purple-600 text-white shadow-sm',
          pillInactive: 'bg-white text-slate-700 border border-slate-200 hover:bg-purple-50/50',
          gradientBadge: 'from-purple-600 to-pink-600',
          borderColor: 'border-purple-100',
          subtext: 'Advanced specialization & applied engineering coursework'
        };
      case 4:
      default:
        return {
          code: 'BE',
          name: 'Final Year Engineering',
          shortName: 'BE (Final Year)',
          badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dotColor: 'bg-emerald-600',
          accentText: 'text-emerald-700',
          pillActive: 'bg-emerald-600 text-white shadow-sm',
          pillInactive: 'bg-white text-slate-700 border border-slate-200 hover:bg-emerald-50/50',
          gradientBadge: 'from-emerald-600 to-teal-600',
          borderColor: 'border-emerald-100',
          subtext: 'Final year electives, capstone projects & industry topics'
        };
    }
  }, []);

  const notesByYear = useMemo(() => {
    const groups: Record<number, Note[]> = { 1: [], 2: [], 3: [], 4: [] };
    for (const n of notes) {
      const yr = getItemYear(n.subjectId);
      if (!groups[yr]) groups[yr] = [];
      groups[yr].push(n);
    }
    return groups;
  }, [notes, getItemYear]);

  const studentNoteYears = useMemo(() => {
    const years = new Set<number>();
    for (const n of notes) {
      years.add(getItemYear(n.subjectId));
    }
    return Array.from(years).sort((a, b) => a - b);
  }, [notes, getItemYear]);

  const coursesByYear = useMemo(() => {
    const groups: Record<number, Course[]> = { 1: [], 2: [], 3: [], 4: [] };
    for (const c of courses) {
      const yr = getItemYear(c.subjectId);
      if (!groups[yr]) groups[yr] = [];
      groups[yr].push(c);
    }
    return groups;
  }, [courses, getItemYear]);

  const studentCourseYears = useMemo(() => {
    const years = new Set<number>();
    for (const c of courses) {
      years.add(getItemYear(c.subjectId));
    }
    return Array.from(years).sort((a, b) => a - b);
  }, [courses, getItemYear]);

  const getSubjectBadge = (subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return subjectId.replace(/[0-9]/g, '').toUpperCase();
    return subject.year === 1 ? 'FE' : subject.year === 2 ? 'SE' : subject.year === 3 ? 'TE' : 'BE';
  };

  const getSubjectName = (subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject ? subject.name : '';
  };

  const formatSubjectLabel = (rawSubject?: string, rawCourse?: string) => {
    const sFound = subjects.find(s => s.id === rawSubject || (rawSubject && s.name.toLowerCase() === rawSubject.toLowerCase()));
    if (sFound) return sFound.name;
    const cFound = subjects.find(s => s.id === rawCourse || (rawCourse && s.name.toLowerCase() === rawCourse.toLowerCase()));
    if (cFound) return cFound.name;

    const parseText = (t: string) => {
      if (/^fe[-_ ]?1$/i.test(t)) return 'First Year (FE) • Sem 1';
      if (/^fe[-_ ]?2$/i.test(t)) return 'First Year (FE) • Sem 2';
      if (/^se[-_ ]?1$/i.test(t)) return 'Second Year (SE) • Sem 1';
      if (/^se[-_ ]?2$/i.test(t)) return 'Second Year (SE) • Sem 2';
      if (/^te[-_ ]?1$/i.test(t)) return 'Third Year (TE) • Sem 1';
      if (/^te[-_ ]?2$/i.test(t)) return 'Third Year (TE) • Sem 2';
      if (/^be[-_ ]?1$/i.test(t)) return 'Final Year (BE) • Sem 1';
      if (/^be[-_ ]?2$/i.test(t)) return 'Final Year (BE) • Sem 2';
      if (/^fe$/i.test(t)) return 'First Year (FE)';
      if (/^se$/i.test(t)) return 'Second Year (SE)';
      if (/^te$/i.test(t)) return 'Third Year (TE)';
      if (/^be$/i.test(t)) return 'Final Year (BE)';
      return '';
    };

    if (rawSubject) {
      const parsed = parseText(rawSubject.trim());
      if (parsed) return parsed;
    }
    if (rawCourse) {
      const parsed = parseText(rawCourse.trim());
      if (parsed) return parsed;
    }
    return rawCourse || rawSubject || 'Pune University';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
        {/* Mobile Header */}
        <div className="md:hidden bg-[#131A3F] text-white p-4 flex items-center justify-between shadow-md z-20 sticky top-0">
            <div className="flex items-center gap-2.5">
                <img src="/img/logo.jpeg" alt="UNIEVAL" className="w-7 h-7 rounded-lg object-cover shadow-sm" />
                <span className="font-bold text-base tracking-tight">Student Dashboard</span>
            </div>
            <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
                className="p-2 -mr-2 text-slate-300 hover:text-white rounded-lg active:bg-white/10"
                aria-label="Toggle navigation drawer"
            >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
        </div>

        {/* Mobile Drawer Backdrop */}
        {isMobileMenuOpen && (
            <div 
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
                onClick={() => setIsMobileMenuOpen(false)}
            />
        )}

        {/* Sidebar */}
        <aside className={`
            fixed inset-y-0 left-0 z-50 w-72 md:w-64 bg-[#131A3F] text-slate-300 transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:flex-shrink-0
            ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
            flex flex-col shadow-2xl md:shadow-xl
        `}>
            {/* Logo / Header Area */}
            <div className="p-5 md:p-6 flex items-center justify-between border-b border-white/10 shrink-0">
                <div className="flex items-center gap-3">
                    <img src="/img/logo.jpeg" alt="UNIEVAL" className="w-9 h-9 md:w-10 md:h-10 rounded-lg object-cover shadow-lg" />
                    <div className="flex flex-col">
                        <span className="font-extrabold text-white tracking-tight leading-none text-lg">UNIEVAL</span>
                        <span className="text-[10px] text-[#1F81FC] font-bold uppercase tracking-widest mt-0.5">Student Dashboard</span>
                    </div>
                </div>
                <button 
                    onClick={() => setIsMobileMenuOpen(false)} 
                    className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg"
                    aria-label="Close menu"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Profile Area */}
            <div className="p-4 md:p-6 flex items-center gap-3 border-b border-white/10 shrink-0 bg-white/[0.02]">
                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-white font-bold text-xl shadow-inner border border-slate-700 shrink-0">
                    {user.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                    <h2 className="font-bold text-white text-sm truncate">{user.name}</h2>
                    <p className="text-xs text-slate-400 truncate">{user.email}</p>
                </div>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-4">My Learning</div>
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => { setActiveTab(item.id as Tab); setIsMobileMenuOpen(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors border ${
                                isActive 
                                ? 'bg-[#1F81FC]/10 text-[#1F81FC] shadow-inner border-[#1F81FC]/30' 
                                : 'border-transparent text-slate-300 hover:bg-white/5 hover:text-white'
                            }`}
                        >
                            <Icon className={`w-5 h-5 ${isActive ? 'text-[#1F81FC]' : 'text-slate-400'}`} />
                            {item.label}
                        </button>
                    )
                })}
                
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-4 mt-8">Tools & Resources</div>
                <Link to="/exam-intelligence" className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-white/5 hover:text-white text-slate-300">
                    <Brain className="w-5 h-5 text-purple-400" /> Exam Prep
                </Link>
                <Link to="/be-toolkit" className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-white/5 hover:text-white text-slate-300">
                    <Wrench className="w-5 h-5 text-amber-400" /> BE Toolkit
                </Link>

                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-4 mt-8">Discover Content</div>
                <Link to="/browse" className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-white/5 hover:text-white text-slate-300">
                    <BookOpen className="w-5 h-5 text-indigo-400" /> Browse Courses
                </Link>
                <Link to="/notes" className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-white/5 hover:text-white text-slate-300">
                    <FileText className="w-5 h-5 text-blue-400" /> Browse Notes
                </Link>
            </nav>

            <div className="p-4 border-t border-white/10 space-y-2">
                <button
                    onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors border ${
                        activeTab === 'settings' 
                        ? 'bg-[#1F81FC]/10 text-[#1F81FC] shadow-inner border-[#1F81FC]/30' 
                        : 'border-transparent hover:bg-white/5 hover:text-white text-slate-300'
                    }`}
                >
                    <Settings className={`w-5 h-5 ${activeTab === 'settings' ? 'text-[#1F81FC]' : 'text-slate-400'}`} />
                    Settings
                </button>
                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-400 hover:bg-red-400/10 transition-colors">
                    <LogOut className="w-5 h-5" />
                    Logout
                </button>
            </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-10 overflow-y-auto w-full max-w-7xl mx-auto min-h-screen md:h-screen relative">
            {loading ? (
                <div className="flex flex-col items-center justify-center h-64 space-y-4">
                    <div className="w-10 h-10 border-4 border-slate-200 border-t-[#1F81FC] rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium">Loading your dashboard...</p>
                </div>
            ) : (
                <div key={activeTab} className="space-y-8 fade-in pb-20">
                    {/* Header */}
                    {activeTab === 'overview' ? (
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-20">
                            <div>
                                <h1 className="text-3xl font-bold text-[#131A3F] mb-1 flex items-center gap-2">
                                    Welcome back, {user.name.split(' ')[0]}! <span className="animate-wave origin-bottom-right">👋</span>
                                </h1>
                                <p className="text-slate-500 text-sm">
                                    Here is what is happening with your learning journey.
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="relative hidden md:block">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input type="text" placeholder="Search for courses, notes, subjects..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-full text-sm w-72 focus:outline-none focus:ring-2 focus:ring-[#1F81FC]/20 shadow-sm" />
                                </div>
                                <button onClick={() => alert('Feature coming soon!')} className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-50 relative shadow-sm transition-colors">
                                    <Bell className="w-5 h-5" />
                                    <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                                </button>
                                <div className="w-10 h-10 bg-[#131A3F] rounded-full flex items-center justify-center text-white font-bold shadow-sm">
                                    {user.name.charAt(0)}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                            <div>
                                <h1 className="text-3xl font-bold text-[#131A3F] mb-2">
                                    {activeTab === 'courses' && 'My Courses'}
                                    {activeTab === 'notes' && 'My Notes Library'}
                                    {activeTab === 'live' && 'Live Classes'}
                                    {activeTab === 'billing' && 'Credits & Plans'}
                                    {activeTab === 'settings' && 'Account Settings'}
                                </h1>
                                <p className="text-slate-500">
                                    {activeTab === 'courses' && 'Access and resume your purchased courses.'}
                                    {activeTab === 'notes' && 'Your premium and unlocked study materials.'}
                                    {activeTab === 'live' && 'Attend live interactive classes with expert teachers.'}
                                    {activeTab === 'billing' && 'Manage your AI credits and premium subscriptions.'}
                                    {activeTab === 'settings' && 'Update your profile and preferences.'}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Tab Content */}
                    <div className="mt-8">
                        {searchQuery.trim() !== '' ? (
                            <div className="space-y-8">
                                <h2 className="text-xl font-bold text-slate-800">Search Results for "{searchQuery}"</h2>
                                
                                {/* Courses Results */}
                                <div>
                                    <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2"><BookOpen className="w-5 h-5 text-blue-500" /> Courses</h3>
                                    {courses.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()) || (c.description || '').toLowerCase().includes(searchQuery.toLowerCase()) || getSubjectName(c.subjectId).toLowerCase().includes(searchQuery.toLowerCase()) || getSubjectBadge(c.subjectId).toLowerCase().includes(searchQuery.toLowerCase())).length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {courses.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()) || (c.description || '').toLowerCase().includes(searchQuery.toLowerCase()) || getSubjectName(c.subjectId).toLowerCase().includes(searchQuery.toLowerCase()) || getSubjectBadge(c.subjectId).toLowerCase().includes(searchQuery.toLowerCase())).map(c => (
                                                <Link key={c.id} to={`/course/${c.id}`} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md hover:-translate-y-1 transition-all group flex flex-col">
                                                    <div className="aspect-video bg-slate-200 relative overflow-hidden">
                                                        {c.thumbnailUrl ? <img src={c.thumbnailUrl} className="w-full h-full object-contain bg-slate-900 group-hover:scale-105 transition-transform duration-500" /> : <div className="w-full h-full bg-indigo-100"></div>}
                                                    </div>
                                                    <div className="p-5 flex-1 flex flex-col">
                                                        <div className="text-xs font-bold text-[#1F81FC] mb-1 uppercase tracking-wide">
                                                            {getSubjectBadge(c.subjectId)}
                                                            {getSubjectName(c.subjectId) && <span className="text-slate-400 font-medium ml-1 tracking-normal normal-case">• {getSubjectName(c.subjectId)}</span>}
                                                        </div>
                                                        <h3 className="font-bold text-slate-900 mb-2 line-clamp-2">{c.title}</h3>
                                                        <p className="text-sm text-slate-500 line-clamp-2 mb-4">{c.description}</p>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-slate-500 text-sm">No matching courses found.</p>
                                    )}
                                </div>

                                {/* Notes Results */}
                                <div>
                                    <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2 mt-8"><FileText className="w-5 h-5 text-purple-500" /> Notes</h3>
                                    {notes.filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase()) || (n.description || '').toLowerCase().includes(searchQuery.toLowerCase()) || getSubjectName(n.subjectId).toLowerCase().includes(searchQuery.toLowerCase()) || getSubjectBadge(n.subjectId).toLowerCase().includes(searchQuery.toLowerCase())).length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {notes.filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase()) || (n.description || '').toLowerCase().includes(searchQuery.toLowerCase()) || getSubjectName(n.subjectId).toLowerCase().includes(searchQuery.toLowerCase()) || getSubjectBadge(n.subjectId).toLowerCase().includes(searchQuery.toLowerCase())).map(n => (
                                                <Link key={n.id} to={`/note/${n.id}`} className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 hover:shadow-md hover:-translate-y-1 transition-all group flex flex-col h-full">
                                                    <div className="flex items-start gap-4 mb-4">
                                                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center shrink-0 text-blue-600 group-hover:bg-[#1F81FC] group-hover:text-white transition-colors">
                                                            <FileText className="w-6 h-6" />
                                                        </div>
                                                        <div>
                                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                                <div className="text-xs font-bold text-[#1F81FC] uppercase tracking-wide">
                                                                    {getSubjectBadge(n.subjectId)}
                                                                    {getSubjectName(n.subjectId) && <span className="text-slate-400 font-medium ml-1 tracking-normal normal-case">• {getSubjectName(n.subjectId)}</span>}
                                                                </div>
                                                                {myPurchases[n.id] && (
                                                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1 ${
                                                                        (myPurchases[n.id].daysRemaining ?? 999) <= 7 
                                                                            ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                                                                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                                    }`}>
                                                                        <Clock className="w-2.5 h-2.5" />
                                                                        {myPurchases[n.id].daysRemaining !== null 
                                                                            ? `${myPurchases[n.id].daysRemaining}d left` 
                                                                            : 'Active'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <h3 className="font-bold text-slate-900 line-clamp-2">{n.title}</h3>
                                                        </div>
                                                    </div>
                                                    <p className="text-sm text-slate-500 line-clamp-2 mb-4 flex-1">{n.description}</p>
                                                </Link>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-slate-500 text-sm">No matching notes found.</p>
                                    )}
                                </div>

                                {/* Live Classes Results */}
                                <div>
                                    <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2 mt-8"><Video className="w-5 h-5 text-red-500" /> Live Classes</h3>
                                    {liveClasses.filter(lc => lc.title.toLowerCase().includes(searchQuery.toLowerCase()) || (lc.subject || '').toLowerCase().includes(searchQuery.toLowerCase()) || (lc.course || '').toLowerCase().includes(searchQuery.toLowerCase())).length > 0 ? (
                                        <div className="space-y-4">
                                            {liveClasses.filter(lc => lc.title.toLowerCase().includes(searchQuery.toLowerCase()) || (lc.subject || '').toLowerCase().includes(searchQuery.toLowerCase()) || (lc.course || '').toLowerCase().includes(searchQuery.toLowerCase())).map((lc: any) => {
                                                const dateObj = new Date(lc.scheduledStartTime);
                                                const isToday = new Date().toDateString() === dateObj.toDateString();
                                                const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                                const dayStr = isToday ? 'Today' : dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                                                const timeStr = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                                                
                                                return (
                                                    <div key={lc.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-col md:flex-row items-start md:items-center gap-6 hover:shadow-md transition-shadow">
                                                        <div className="flex items-center gap-4 w-full md:w-48 shrink-0">
                                                            <div className={`px-4 py-2 rounded-lg text-center border ${isToday ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                                                <div className="text-sm font-bold">{dateStr}</div>
                                                                <div className="text-xs font-medium">{dayStr}</div>
                                                            </div>
                                                            <div>
                                                                <div className="text-sm font-bold text-slate-900">{timeStr}</div>
                                                                {(() => {
                                                                    const durationMinutes = lc.scheduledEndTime && lc.scheduledStartTime
                                                                        ? Math.max(15, Math.round((new Date(lc.scheduledEndTime).getTime() - new Date(lc.scheduledStartTime).getTime()) / 60000))
                                                                        : 60;
                                                                    const durHrs = Math.floor(durationMinutes / 60);
                                                                    const durMins = durationMinutes % 60;
                                                                    const durStr = durHrs > 0 ? (durMins > 0 ? `${durHrs}h ${durMins}m` : `${durHrs}h`) : `${durMins}m`;
                                                                    return <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3" /> {durStr}</div>;
                                                                })()}
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="flex-1 flex items-start gap-4">
                                                            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 shrink-0 flex flex-col items-center justify-center shadow-sm">
                                                                <Video className="w-5 h-5" />
                                                                <span className="text-[9px] font-bold uppercase tracking-wider mt-0.5">Live</span>
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-slate-900 text-base mb-1">{lc.title}</h4>
                                                                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-1.5">
                                                                    <span className="flex items-center gap-1.5 font-medium text-slate-700">
                                                                        <div className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[8px] text-slate-700 font-bold">
                                                                            {(lc.teacherName || 'Faculty')[0].toUpperCase()}
                                                                        </div> 
                                                                        {lc.teacherName || 'Faculty'}
                                                                    </span>
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full font-semibold text-[11px] bg-blue-50 text-blue-700 border border-blue-100">
                                                                        {formatSubjectLabel(lc.subject, lc.course)}
                                                                    </span>
                                                                </div>
                                                                <p className="text-xs text-slate-500">Live Interactive Classroom with Faculty</p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
                                                            <button onClick={() => alert('Feature coming soon!')} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors">
                                                                <Calendar className="w-4 h-4" /> Add to Calendar
                                                            </button>
                                                            <button onClick={() => navigate(`/live-class/${lc.id}`)} className="flex-1 md:flex-none bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center gap-2">
                                                                Join Class <ArrowRight className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="text-slate-500 text-sm">No matching live classes found.</p>
                                    )}
                                </div>
                            </div>
                        ) : activeTab === 'overview' && (
                            <div className="space-y-6">
                                {/* Floating Get Credits Button (aligned to right, above grid) */}
                                <div className="flex justify-end mt-[-10px] mb-2 hidden md:flex">
                                     <button onClick={() => setActiveTab('billing')} className="flex items-center gap-2 bg-gradient-to-r from-[#1F81FC] to-[#7F26FE] text-white px-5 py-2 rounded-lg font-bold shadow-md shadow-indigo-500/20 hover:scale-105 transition-transform text-sm">
                                        <Sparkles className="w-4 h-4" /> Get More Credits
                                     </button>
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
                                    <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 flex flex-col relative overflow-hidden group cursor-pointer hover:bg-blue-50 transition-colors" onClick={() => setActiveTab('courses')}>
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-white rounded-lg text-blue-600 shadow-sm"><BookOpen className="w-5 h-5" /></div>
                                            <span className="text-xs font-bold text-slate-600">Enrolled Courses</span>
                                        </div>
                                        <div className="flex items-end justify-between mt-2 z-10">
                                            <h3 className="text-3xl font-extrabold text-slate-800">{courses.length}</h3>
                                            <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm text-blue-500 group-hover:translate-x-1 transition-transform">
                                                <ArrowRight className="w-3 h-3" />
                                            </div>
                                        </div>
                                        <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-blue-100 rounded-full opacity-30 pointer-events-none"></div>
                                    </div>
                                    
                                    <div className="bg-purple-50/50 p-5 rounded-2xl border border-purple-100 flex flex-col relative overflow-hidden group cursor-pointer hover:bg-purple-50 transition-colors" onClick={() => setActiveTab('notes')}>
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-white rounded-lg text-purple-600 shadow-sm"><FileText className="w-5 h-5" /></div>
                                            <span className="text-xs font-bold text-slate-600">Notes Unlocked</span>
                                        </div>
                                        <div className="flex items-end justify-between mt-2 z-10">
                                            <h3 className="text-3xl font-extrabold text-slate-800">{notes.length}</h3>
                                            <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm text-purple-500 group-hover:translate-x-1 transition-transform">
                                                <ArrowRight className="w-3 h-3" />
                                            </div>
                                        </div>
                                        <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-purple-100 rounded-full opacity-30 pointer-events-none"></div>
                                    </div>

                                    <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100 flex flex-col relative overflow-hidden group cursor-pointer hover:bg-emerald-50 transition-colors" onClick={() => setActiveTab('live')}>
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-white rounded-lg text-emerald-600 shadow-sm"><Video className="w-5 h-5" /></div>
                                            <span className="text-xs font-bold text-slate-600">Upcoming Live</span>
                                        </div>
                                        <div className="flex items-end justify-between mt-2 z-10">
                                            <h3 className="text-3xl font-extrabold text-slate-800">{liveClasses.length}</h3>
                                            <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm text-emerald-500 group-hover:translate-x-1 transition-transform">
                                                <ArrowRight className="w-3 h-3" />
                                            </div>
                                        </div>
                                        <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-emerald-100 rounded-full opacity-30 pointer-events-none"></div>
                                    </div>

                                    <div className="bg-orange-50/50 p-5 rounded-2xl border border-orange-100 flex flex-col relative overflow-hidden group cursor-pointer hover:bg-orange-50 transition-colors" onClick={() => setActiveTab('billing')}>
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-white rounded-lg text-orange-500 shadow-sm"><Sparkles className="w-5 h-5" /></div>
                                            <span className="text-xs font-bold text-slate-600">AI Credits</span>
                                        </div>
                                        <div className="flex items-end justify-between mt-2 z-10">
                                            <h3 className="text-3xl font-extrabold text-slate-800">{isUnlimited ? '∞' : credits}</h3>
                                            <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm text-orange-500 group-hover:translate-x-1 transition-transform">
                                                <ArrowRight className="w-3 h-3" />
                                            </div>
                                        </div>
                                        <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-orange-100 rounded-full opacity-30 pointer-events-none"></div>
                                    </div>
                                </div>

                                {/* Middle Section: Continue Learning & Keep Growing */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col">
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><BookOpen className="w-5 h-5 text-blue-500" /> Continue Learning</h3>
                                            <button onClick={() => setActiveTab('courses')} className="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1">View All <ChevronRight className="w-4 h-4"/></button>
                                        </div>
                                        {courses.length > 0 ? (
                                            <div className="flex-1 flex flex-col justify-center">
                                                {courses.slice(0, 1).map(c => (
                                                    <div key={c.id} className="flex flex-col md:flex-row items-center gap-6 p-5 bg-slate-50 rounded-xl border border-slate-100">
                                                        <div className="w-full md:w-48 aspect-video bg-slate-200 rounded-lg overflow-hidden shrink-0 shadow-sm">
                                                            {c.thumbnailUrl ? <img src={c.thumbnailUrl} className="w-full h-full object-contain bg-slate-900" /> : <div className="w-full h-full bg-indigo-100"></div>}
                                                        </div>
                                                        <div className="flex-1 w-full">
                                                            <h4 className="font-bold text-slate-800 text-lg mb-1 line-clamp-1">{c.title}</h4>
                                                            <p className="text-xs text-slate-500 font-medium mb-4 uppercase">
                                                                {getSubjectBadge(c.subjectId)}
                                                            </p>
                                                            <div className="flex items-center gap-4 w-full">
                                                                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                                                                    <div className="h-full bg-blue-500 rounded-full" style={{ width: '0%' }}></div>
                                                                </div>
                                                                <span className="text-xs font-bold text-slate-600">0%</span>
                                                            </div>
                                                        </div>
                                                        <Link to={`/course/${c.id}`} className="w-full md:w-auto mt-4 md:mt-0 shrink-0 bg-blue-50 text-blue-600 px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 border border-blue-100">
                                                            Continue <ArrowRight className="w-4 h-4" />
                                                        </Link>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200 p-6">
                                                No courses enrolled yet. <br/>
                                                <Link to="/browse" className="text-blue-600 font-bold mt-3 inline-block hover:underline">Browse Courses</Link>
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-[#131A3F] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col justify-center">
                                        <div className="absolute right-0 bottom-0 pointer-events-none opacity-20">
                                            <GraduationCap className="w-40 h-40 text-blue-400 transform translate-x-10 translate-y-10" />
                                        </div>
                                        <div className="relative z-10 flex-1 flex flex-col justify-center">
                                            <h3 className="text-2xl font-bold text-white mb-3 leading-tight">Keep Learning,<br/>Keep Growing! <Rocket className="inline w-6 h-6 text-red-400" /></h3>
                                            <p className="text-slate-300 text-sm mb-6 pr-8">Explore new courses, attend live classes, and boost your preparation.</p>
                                            <div>
                                                <Link to="/browse" className="inline-flex items-center gap-2 bg-white text-[#131A3F] px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-100 transition-colors shadow-sm">
                                                    Browse Courses <ArrowRight className="w-4 h-4" />
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom Section 1: Upcoming Live & Quick Actions */}
                                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                                    <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col">
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Video className="w-5 h-5 text-emerald-500" /> Upcoming Live Classes</h3>
                                            <button onClick={() => setActiveTab('live')} className="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1">View All <ChevronRight className="w-4 h-4"/></button>
                                        </div>
                                        <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-slate-100 p-8 text-center min-h-[220px]">
                                            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 mb-4 border border-blue-100 shadow-sm relative">
                                                <Play className="w-8 h-8 fill-current" />
                                                <div className="absolute -top-2 -right-2 w-5 h-5 bg-white rounded-full flex items-center justify-center border border-slate-200"><Calendar className="w-3 h-3 text-slate-400"/></div>
                                            </div>
                                            <h4 className="font-bold text-slate-800 mb-1">No upcoming live classes.</h4>
                                            <p className="text-sm text-slate-500 mb-6">Stay tuned for new live sessions!</p>
                                            <button onClick={() => setActiveTab('live')} className="bg-blue-50 text-blue-600 px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors flex items-center gap-2 border border-blue-100">
                                                Browse Live Classes <ArrowRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6"><Zap className="w-5 h-5 text-blue-500" /> Quick Actions</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <button onClick={() => setActiveTab('courses')} className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors border border-slate-100 group">
                                                <div className="flex items-center gap-3 text-left">
                                                    <div className="p-2.5 bg-blue-100 rounded-lg text-blue-600"><BookOpen className="w-5 h-5" /></div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-800 text-sm">My Courses</h4>
                                                        <p className="text-[10px] text-slate-500 mt-0.5">Continue learning</p>
                                                    </div>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                                            </button>
                                            <button onClick={() => setActiveTab('notes')} className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors border border-slate-100 group">
                                                <div className="flex items-center gap-3 text-left">
                                                    <div className="p-2.5 bg-purple-100 rounded-lg text-purple-600"><FileText className="w-5 h-5" /></div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-800 text-sm">My Notes</h4>
                                                        <p className="text-[10px] text-slate-500 mt-0.5">View purchased notes</p>
                                                    </div>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                                            </button>
                                            <button onClick={() => setActiveTab('live')} className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors border border-slate-100 group">
                                                <div className="flex items-center gap-3 text-left">
                                                    <div className="p-2.5 bg-emerald-100 rounded-lg text-emerald-600"><Video className="w-5 h-5" /></div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-800 text-sm">Live Classes</h4>
                                                        <p className="text-[10px] text-slate-500 mt-0.5">Join upcoming sessions</p>
                                                    </div>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                                            </button>
                                            <button onClick={() => setActiveTab('billing')} className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors border border-slate-100 group">
                                                <div className="flex items-center gap-3 text-left">
                                                    <div className="p-2.5 bg-orange-100 rounded-lg text-orange-500"><CreditCard className="w-5 h-5" /></div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-800 text-sm">Credits & Plans</h4>
                                                        <p className="text-[10px] text-slate-500 mt-0.5">Get more credits</p>
                                                    </div>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom Section 2: Explore More */}
                                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6"><Compass className="w-5 h-5 text-blue-500" /> Explore More</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <Link to="/exam-intelligence" className="flex items-center justify-between p-5 bg-slate-50 hover:bg-purple-50 rounded-xl transition-colors border border-slate-100 hover:border-purple-200 group">
                                            <div className="flex items-center gap-4 text-left">
                                                <div className="p-3 bg-purple-100 rounded-lg text-purple-600"><Brain className="w-5 h-5" /></div>
                                                <div>
                                                    <h4 className="font-bold text-slate-800 text-sm">Exam Prep</h4>
                                                    <p className="text-[11px] text-slate-500 mt-0.5">Syllabus, PYQs, important topics</p>
                                                </div>
                                            </div>
                                            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-colors" />
                                        </Link>
                                        <Link to="/be-toolkit" className="flex items-center justify-between p-5 bg-slate-50 hover:bg-yellow-50 rounded-xl transition-colors border border-slate-100 hover:border-yellow-200 group">
                                            <div className="flex items-center gap-4 text-left">
                                                <div className="p-3 bg-yellow-100 rounded-lg text-yellow-600"><Wrench className="w-5 h-5" /></div>
                                                <div>
                                                    <h4 className="font-bold text-slate-800 text-sm">BE Toolkit</h4>
                                                    <p className="text-[11px] text-slate-500 mt-0.5">Useful tools for engineering students</p>
                                                </div>
                                            </div>
                                            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-yellow-600 transition-colors" />
                                        </Link>
                                        <Link to="/notes" className="flex items-center justify-between p-5 bg-slate-50 hover:bg-blue-50 rounded-xl transition-colors border border-slate-100 hover:border-blue-200 group">
                                            <div className="flex items-center gap-4 text-left">
                                                <div className="p-3 bg-blue-100 rounded-lg text-blue-600"><FileText className="w-5 h-5" /></div>
                                                <div>
                                                    <h4 className="font-bold text-slate-800 text-sm">Browse Notes</h4>
                                                    <p className="text-[11px] text-slate-500 mt-0.5">Explore subject wise notes</p>
                                                </div>
                                            </div>
                                            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'courses' && (
                            <div className="space-y-8 relative z-10">
                                {/* Courses Header (New Design) */}
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div>
                                        <h1 className="text-3xl font-bold text-[#131A3F] mb-1">My Courses</h1>
                                        <p className="text-slate-500 text-sm">Your enrolled courses and learning progress</p>
                                    </div>
                                    <Link to="/browse" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-5 py-2.5 rounded-xl font-medium hover:opacity-90 transition-opacity flex items-center gap-2 shadow-sm text-sm">
                                        Browse More Courses <ArrowRight className="w-4 h-4" />
                                    </Link>
                                </div>

                                {/* Filter Row */}
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                                    <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 no-scrollbar">
                                        <button 
                                            onClick={() => setSelectedCourseYearFilter('all')} 
                                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                                                selectedCourseYearFilter === 'all'
                                                    ? 'bg-[#131A3F] text-white shadow-sm'
                                                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                                            }`}
                                        >
                                            <Layers className="w-4 h-4" /> All Courses <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                selectedCourseYearFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                                            }`}>{courses.length}</span>
                                        </button>

                                        {studentCourseYears.map(yearNum => {
                                            const meta = getYearMeta(yearNum);
                                            const count = (coursesByYear[yearNum] || []).length;
                                            const isSelected = selectedCourseYearFilter === yearNum;
                                            return (
                                                <button
                                                    key={yearNum}
                                                    onClick={() => setSelectedCourseYearFilter(isSelected ? 'all' : yearNum)}
                                                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                                                        isSelected
                                                            ? meta.pillActive
                                                            : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                                                    }`}
                                                >
                                                    <span className={`w-2 h-2 rounded-full ${meta.dotColor}`}></span>
                                                    <span>{meta.code} • {meta.name}</span>
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                                                    }`}>
                                                        {count}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="relative w-full md:w-72 shrink-0">
                                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="text"
                                            placeholder="Search courses..."
                                            value={courseSearchQuery}
                                            onChange={(e) => setCourseSearchQuery(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F81FC]/30 text-slate-800 placeholder-slate-400"
                                        />
                                    </div>
                                </div>

                                {/* My Courses List */}
                                {(() => {
                                    const filteredCourses = courses.filter(c => {
                                        const yr = getItemYear(c.subjectId);
                                        if (selectedCourseYearFilter !== 'all' && yr !== selectedCourseYearFilter) return false;
                                        if (courseSearchQuery.trim()) {
                                            const q = courseSearchQuery.toLowerCase();
                                            const titleMatch = c.title.toLowerCase().includes(q);
                                            const descMatch = (c.description || '').toLowerCase().includes(q);
                                            const subjMatch = getSubjectName(c.subjectId).toLowerCase().includes(q);
                                            const badgeMatch = getSubjectBadge(c.subjectId).toLowerCase().includes(q);
                                            if (!titleMatch && !descMatch && !subjMatch && !badgeMatch) return false;
                                        }
                                        return true;
                                    });

                                    const renderCourseItem = (c: Course) => {
                                        const lectureCount = c.modules?.reduce((acc: number, m: any) => acc + (m.videos?.length || (m.videoUrl ? 1 : 0)), 0) || (c.modules?.length ?? 0);
                                        const noteCount = c.modules?.reduce((acc: number, m: any) => acc + (m.resources?.length || 0) + (m.videos?.reduce((vacc: number, v: any) => vacc + (v.resources?.length || 0), 0) || 0), 0) || 0;
                                        return (
                                            <div key={c.id} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row gap-6 relative">
                                                <div className="w-full md:w-[280px] aspect-video bg-slate-100 rounded-xl overflow-hidden shrink-0">
                                                    {c.thumbnailUrl ? <img src={c.thumbnailUrl} className="w-full h-full object-contain bg-slate-900" /> : <div className="w-full h-full bg-indigo-100"></div>}
                                                </div>
                                                <div className="flex-1 flex flex-col py-1">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md uppercase tracking-wide">
                                                                    {getSubjectBadge(c.subjectId)}
                                                                </span>
                                                                {myPurchases[c.id] && (
                                                                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                                                                        (myPurchases[c.id].daysRemaining ?? 999) <= 7 
                                                                            ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                                                                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                                    }`}>
                                                                        <Clock className="w-3 h-3" />
                                                                        {myPurchases[c.id].daysRemaining !== null 
                                                                            ? `${myPurchases[c.id].daysRemaining}d access left` 
                                                                            : 'Access active'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <h3 className="font-bold text-slate-900 text-xl mt-3 mb-4">{c.title}</h3>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-6 text-sm text-slate-500 mb-6">
                                                        <span className="flex items-center gap-1.5"><Video className="w-4 h-4" /> {lectureCount} {lectureCount === 1 ? 'Lecture' : 'Lectures'}</span>
                                                        {noteCount > 0 && <span className="flex items-center gap-1.5"><FileText className="w-4 h-4" /> {noteCount} {noteCount === 1 ? 'Note' : 'Notes'}</span>}
                                                        {c.modules && c.modules.length > 0 && <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4" /> {c.modules.length} {c.modules.length === 1 ? 'Module' : 'Modules'}</span>}
                                                    </div>
                                                    <div className="flex items-center gap-4 mt-auto">
                                                        <div className="flex-1 flex items-center gap-3">
                                                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                                <div className="h-full bg-blue-600 rounded-full" style={{ width: '0%' }}></div>
                                                            </div>
                                                            <span className="text-xs font-bold text-slate-500">0%</span>
                                                        </div>
                                                        <div className="flex flex-col sm:flex-row gap-2 shrink-0 ml-4">
                                                            <Link to={`/course/${c.id}`} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                                                                Continue Learning <ArrowRight className="w-4 h-4" />
                                                            </Link>
                                                            <Link to={`/course/${c.id}`} className="bg-blue-50 text-blue-600 px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors text-center">
                                                                View Course Details
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    };

                                    if (courses.length === 0) {
                                        return (
                                            <div className="bg-slate-50 rounded-2xl border border-indigo-100 p-12 flex flex-col items-center justify-center text-center relative overflow-hidden">
                                                <div className="absolute right-10 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none hidden md:block">
                                                    <Compass className="w-32 h-32 text-indigo-400 rotate-12" />
                                                </div>
                                                <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 relative z-10 shadow-sm border border-white">
                                                    <BookOpen className="w-8 h-8" />
                                                </div>
                                                <h3 className="text-lg font-bold text-slate-900 mb-2 relative z-10">You haven't enrolled in any courses yet.</h3>
                                                <p className="text-sm text-slate-500 mb-6 relative z-10 max-w-sm">Discover high-quality courses from expert teachers and start your learning journey.</p>
                                                <Link to="/browse" className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors shadow-md relative z-10 flex items-center gap-2">
                                                    Browse Catalog <ArrowRight className="w-4 h-4" />
                                                </Link>
                                            </div>
                                        );
                                    }

                                    if (selectedCourseYearFilter === 'all' && studentCourseYears.length > 1) {
                                        return (
                                            <div className="space-y-10">
                                                {studentCourseYears.map(yearNum => {
                                                    const meta = getYearMeta(yearNum);
                                                    const yearCourses = filteredCourses.filter(c => getItemYear(c.subjectId) === yearNum);
                                                    if (yearCourses.length === 0) return null;
                                                    return (
                                                        <div key={yearNum} className="space-y-4">
                                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200/80 gap-2">
                                                                <div className="flex items-center gap-3">
                                                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-extrabold uppercase tracking-wider border ${meta.badgeColor}`}>
                                                                        {meta.code}
                                                                    </span>
                                                                    <div>
                                                                        <h2 className="text-lg font-bold text-slate-900 leading-tight">
                                                                            {meta.name}
                                                                        </h2>
                                                                        <p className="text-xs text-slate-500 mt-0.5">{meta.subtext}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2 self-start sm:self-auto">
                                                                    <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                                                                        {yearCourses.length} {yearCourses.length === 1 ? 'Course' : 'Courses'}
                                                                    </span>
                                                                    <button
                                                                        onClick={() => setSelectedCourseYearFilter(yearNum)}
                                                                        className="text-xs font-bold text-[#1F81FC] hover:underline flex items-center gap-1 ml-2"
                                                                    >
                                                                        Focus on {meta.code} <ArrowRight className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <div className="space-y-4">
                                                                {yearCourses.map(renderCourseItem)}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {filteredCourses.length === 0 && (
                                                    <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center">
                                                        <p className="text-sm text-slate-500">No courses found matching "{courseSearchQuery}".</p>
                                                        <button onClick={() => setCourseSearchQuery('')} className="text-xs font-bold text-blue-600 hover:underline mt-2">Clear search</button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="space-y-4">
                                            {selectedCourseYearFilter !== 'all' && (
                                                <div className="flex items-center justify-between bg-blue-50/60 border border-blue-100 rounded-xl p-3 px-4">
                                                    <span className="text-sm font-semibold text-slate-900">
                                                        Showing {getYearMeta(selectedCourseYearFilter).name} ({filteredCourses.length})
                                                    </span>
                                                    <button
                                                        onClick={() => setSelectedCourseYearFilter('all')}
                                                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                                                    >
                                                        Show all academic years
                                                    </button>
                                                </div>
                                            )}
                                            {filteredCourses.length > 0 ? (
                                                <div className="space-y-4">
                                                    {filteredCourses.map(renderCourseItem)}
                                                </div>
                                            ) : (
                                                <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center">
                                                    <p className="text-sm text-slate-500">No courses found for this filter.</p>
                                                    <button
                                                        onClick={() => { setSelectedCourseYearFilter('all'); setCourseSearchQuery(''); }}
                                                        className="text-xs font-bold text-blue-600 hover:underline mt-2"
                                                    >
                                                        Reset filters
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                {/* Recommended for You */}
                                <div className="pt-8 border-t border-slate-100">
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">Recommended for You <span className="text-2xl">🔥</span></h2>
                                            <p className="text-sm text-slate-500 mt-1">Based on your branch and year</p>
                                        </div>
                                        <Link to="/browse" className="text-blue-600 text-sm font-bold flex items-center gap-1 hover:underline">View All <ArrowRight className="w-4 h-4" /></Link>
                                    </div>
                                    
                                    {(() => {
                                        const recommendedCourses = allCoursesState.filter(c => !user.purchasedCourseIds?.includes(c.id)).slice(0, 4);
                                        if (recommendedCourses.length === 0) {
                                            return (
                                                <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-10 flex flex-col items-center justify-center text-center">
                                                    <BookOpen className="w-10 h-10 text-slate-300 mb-3" />
                                                    <h3 className="text-sm font-bold text-slate-700 mb-1">You're all caught up!</h3>
                                                    <p className="text-sm text-slate-500 max-w-sm">You have enrolled in all recommended courses for your branch and year. Browse the catalog for more topics.</p>
                                                </div>
                                            );
                                        }
                                        return (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                                {recommendedCourses.map((c, i) => (
                                                    <div key={c.id} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex flex-col group">
                                                        <div className="aspect-video bg-slate-900 relative">
                                                            {c.thumbnailUrl && <img src={c.thumbnailUrl} className="w-full h-full object-contain opacity-90 group-hover:opacity-100 transition-opacity" />}
                                                            <div className="absolute top-3 left-3 bg-white/20 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded">
                                                                {getSubjectBadge(c.subjectId)}
                                                            </div>
                                                            <div className="absolute top-3 right-3 text-white/70 hover:text-white cursor-pointer">
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>
                                                            </div>
                                                        </div>
                                                        <div className="p-4 flex-1 flex flex-col">
                                                            <h3 className="font-bold text-slate-900 mb-3 line-clamp-2 leading-snug">{c.title}</h3>
                                                            {(() => {
                                                                const recLectures = c.modules?.reduce((acc: number, m: any) => acc + (m.videos?.length || (m.videoUrl ? 1 : 0)), 0) || (c.modules?.length ?? 0);
                                                                const recNotes = c.modules?.reduce((acc: number, m: any) => acc + (m.resources?.length || 0) + (m.videos?.reduce((vacc: number, v: any) => vacc + (v.resources?.length || 0), 0) || 0), 0) || 0;
                                                                return (
                                                                    <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                                                                        <span className="flex items-center gap-1"><Video className="w-3.5 h-3.5" /> {recLectures} {recLectures === 1 ? 'Lecture' : 'Lectures'}</span>
                                                                        {recNotes > 0 && <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> {recNotes} {recNotes === 1 ? 'Note' : 'Notes'}</span>}
                                                                    </div>
                                                                );
                                                            })()}
                                                            <div className="mt-auto flex items-center justify-between">
                                                                <span className="font-bold text-slate-900">₹{c.price}</span>
                                                                <Link to={`/course/${c.id}`} className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors flex items-center gap-1">
                                                                    View Course <ArrowRight className="w-3 h-3" />
                                                                </Link>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* Bottom Banner */}
                                <div className="mt-8 bg-purple-50 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 border border-purple-100 relative overflow-hidden">
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shrink-0 shadow-sm text-purple-600">
                                            <GraduationCap className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-900 mb-1">Explore More Courses</h3>
                                            <p className="text-slate-600 text-sm">Discover high quality courses for all subjects from expert teachers.</p>
                                        </div>
                                    </div>
                                    <div className="relative z-10 shrink-0">
                                        <Link to="/browse" className="bg-blue-600 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-md">
                                            Browse Courses <ArrowRight className="w-4 h-4" />
                                        </Link>
                                    </div>
                                    {/* Decorative Books Icon Placeholder */}
                                    <div className="absolute right-0 bottom-0 pointer-events-none opacity-20 hidden md:block">
                                        <BookOpen className="w-48 h-48 text-purple-400 transform translate-x-12 translate-y-12" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'notes' && (
                            <div className="space-y-8 relative z-10">
                                {/* Notes Header (New Design) */}
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div>
                                        <h1 className="text-3xl font-bold text-[#131A3F] mb-1">My Notes</h1>
                                        <p className="text-slate-500 text-sm">Your purchased notes and study material</p>
                                    </div>
                                    <Link to="/notes" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-5 py-2.5 rounded-xl font-medium hover:opacity-90 transition-opacity flex items-center gap-2 shadow-sm text-sm">
                                        Browse More Notes <ArrowRight className="w-4 h-4" />
                                    </Link>
                                </div>

                                {/* Top Stats Row */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-[#1F81FC] shrink-0">
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-slate-500">Total Notes</p>
                                            <div className="flex items-baseline gap-2">
                                                <h3 className="text-2xl font-bold text-slate-900 leading-none mt-1">{notes.length}</h3>
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-1">Purchased packages</p>
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 font-extrabold text-sm border border-blue-100">
                                            FE
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-slate-500">First Year (FE)</p>
                                            <div className="flex items-baseline gap-2">
                                                <h3 className="text-2xl font-bold text-slate-900 leading-none mt-1">
                                                    {notesByYear[1]?.length || 0}
                                                </h3>
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-1">Foundation notes</p>
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 font-extrabold text-sm border border-indigo-100">
                                            SE
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-slate-500">Second Year (SE)</p>
                                            <div className="flex items-baseline gap-2">
                                                <h3 className="text-2xl font-bold text-slate-900 leading-none mt-1">
                                                    {notesByYear[2]?.length || 0}
                                                </h3>
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-1">Department core</p>
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
                                            <Layers className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-slate-500">Curriculum Scope</p>
                                            <div className="flex items-baseline gap-2">
                                                <h3 className="text-base font-bold text-slate-900 leading-none mt-1">
                                                    {studentNoteYears.length > 0 
                                                        ? studentNoteYears.map(y => getYearMeta(y).code).join(' & ') 
                                                        : 'None'}
                                                </h3>
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-1">Active academic years</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Year Filter Tabs & Search Row */}
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                                    <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 no-scrollbar">
                                        <button 
                                            onClick={() => setSelectedNoteYearFilter('all')} 
                                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                                                selectedNoteYearFilter === 'all'
                                                    ? 'bg-[#131A3F] text-white shadow-sm'
                                                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                                            }`}
                                        >
                                            <Layers className="w-4 h-4" /> All Academic Years <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                selectedNoteYearFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                                            }`}>{notes.length}</span>
                                        </button>

                                        {studentNoteYears.map(yearNum => {
                                            const meta = getYearMeta(yearNum);
                                            const count = (notesByYear[yearNum] || []).length;
                                            const isSelected = selectedNoteYearFilter === yearNum;
                                            return (
                                                <button
                                                    key={yearNum}
                                                    onClick={() => setSelectedNoteYearFilter(isSelected ? 'all' : yearNum)}
                                                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                                                        isSelected
                                                            ? meta.pillActive
                                                            : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                                                    }`}
                                                >
                                                    <span className={`w-2 h-2 rounded-full ${meta.dotColor}`}></span>
                                                    <span>{meta.code} • {meta.name}</span>
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                                                    }`}>
                                                        {count}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <div className="relative w-full md:w-72 shrink-0">
                                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="text"
                                            placeholder="Search notes or subjects..."
                                            value={noteSearchQuery}
                                            onChange={(e) => setNoteSearchQuery(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F81FC]/30 text-slate-800 placeholder-slate-400"
                                        />
                                    </div>
                                </div>

                                {/* Notes Presentation: Grouped by Year or Filtered */}
                                {(() => {
                                    const filteredNotes = notes.filter(n => {
                                        const yr = getItemYear(n.subjectId);
                                        if (selectedNoteYearFilter !== 'all' && yr !== selectedNoteYearFilter) return false;
                                        if (noteSearchQuery.trim()) {
                                            const q = noteSearchQuery.toLowerCase();
                                            const titleMatch = n.title.toLowerCase().includes(q);
                                            const descMatch = (n.description || '').toLowerCase().includes(q);
                                            const subjMatch = getSubjectName(n.subjectId).toLowerCase().includes(q);
                                            const badgeMatch = getSubjectBadge(n.subjectId).toLowerCase().includes(q);
                                            if (!titleMatch && !descMatch && !subjMatch && !badgeMatch) return false;
                                        }
                                        return true;
                                    });

                                    const renderNoteCard = (n: Note) => {
                                        const purchase = myPurchases[n.id];
                                        const fileCount = n.sections?.reduce((acc: number, s: any) => acc + (s.files?.length || 0), 0) || 0;
                                        const yr = getItemYear(n.subjectId);
                                        const meta = getYearMeta(yr);
                                        const subjName = getSubjectName(n.subjectId);

                                        return (
                                            <Link 
                                                key={n.id} 
                                                to={`/note/${n.id}`} 
                                                className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all overflow-hidden flex flex-col group relative"
                                            >
                                                <div className="aspect-video bg-slate-900 relative overflow-hidden">
                                                    {n.thumbnailUrl ? (
                                                        <img 
                                                            src={n.thumbnailUrl} 
                                                            alt={n.title} 
                                                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" 
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full bg-gradient-to-br from-[#131A3F] via-slate-900 to-[#1F81FC]/40 flex flex-col items-center justify-center text-white/80 p-4 text-center select-none group-hover:scale-105 transition-transform duration-300">
                                                            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-2 shadow-inner border border-white/10">
                                                                <FileText className="w-5 h-5 text-blue-400" />
                                                            </div>
                                                            <span className="text-xs font-bold text-white line-clamp-1">{n.title}</span>
                                                            <span className="text-[10px] text-blue-200/80 font-medium mt-0.5">{fileCount > 0 ? `${fileCount} PDFs` : 'Study Material'}</span>
                                                        </div>
                                                    )}
                                                    
                                                    {/* Year badge pill */}
                                                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-[#131A3F]/90 backdrop-blur-md text-white text-[10px] font-extrabold px-2.5 py-1 rounded-lg border border-white/10 shadow-sm">
                                                        <span className={`w-1.5 h-1.5 rounded-full ${meta.dotColor}`}></span>
                                                        <span>{meta.code}</span>
                                                    </div>

                                                    {/* Expiry / Days remaining */}
                                                    {purchase && (
                                                        <div className="absolute top-2.5 right-2.5">
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-md shadow-sm flex items-center gap-1 ${
                                                                (purchase.daysRemaining ?? 999) <= 7 
                                                                    ? 'bg-amber-500/90 text-white' 
                                                                    : 'bg-emerald-600/90 text-white'
                                                            }`}>
                                                                <Clock className="w-2.5 h-2.5" />
                                                                {purchase.daysRemaining !== null 
                                                                    ? `${purchase.daysRemaining}d left` 
                                                                    : 'Active'}
                                                            </span>
                                                        </div>
                                                    )}

                                                    <div className="absolute bottom-2.5 right-2.5 bg-white/95 backdrop-blur-sm text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded shadow-sm flex items-center gap-1">
                                                        <FileText className="w-3 h-3 text-[#1F81FC]" /> PDF Notes
                                                    </div>
                                                </div>

                                                <div className="p-4 flex-1 flex flex-col">
                                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1F81FC] mb-1.5 truncate">
                                                        <span className="uppercase tracking-wider text-[11px] font-extrabold">{meta.code}</span>
                                                        {subjName && <span className="text-slate-400 font-normal truncate">• {subjName}</span>}
                                                    </div>

                                                    <h3 className="font-bold text-slate-900 mb-2 line-clamp-2 leading-snug group-hover:text-[#1F81FC] transition-colors">
                                                        {n.title}
                                                    </h3>

                                                    <div className="flex items-center gap-3 text-xs text-slate-500 mb-4">
                                                        <span className="flex items-center gap-1">
                                                            <FileText className="w-3.5 h-3.5 text-slate-400" /> 
                                                            {fileCount > 0 ? `${fileCount} ${fileCount === 1 ? 'PDF' : 'PDFs'}` : `${n.sections?.length || 0} Sections`}
                                                        </span>
                                                    </div>

                                                    <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
                                                        <span className="text-xs font-medium text-slate-500">
                                                            {purchase?.amountPaid === 0 ? 'Free Access' : 'Enrolled'}
                                                        </span>
                                                        <span className="bg-blue-50 text-blue-600 group-hover:bg-[#1F81FC] group-hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1">
                                                            Open Notes <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                                                        </span>
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    };

                                    if (notes.length === 0) {
                                        return (
                                            <div className="bg-slate-50 rounded-2xl border border-blue-100 p-12 flex flex-col items-center justify-center text-center relative overflow-hidden">
                                                <div className="absolute right-10 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none hidden md:block">
                                                    <Navigation className="w-32 h-32 text-blue-400 rotate-45" />
                                                </div>
                                                <div className="w-16 h-16 bg-blue-100 text-blue-500 rounded-2xl flex items-center justify-center mb-4 relative z-10 shadow-sm border border-white">
                                                    <FileText className="w-8 h-8" />
                                                </div>
                                                <h3 className="text-lg font-bold text-slate-900 mb-2 relative z-10">You haven't purchased any notes yet.</h3>
                                                <p className="text-sm text-slate-500 mb-6 relative z-10 max-w-sm">Explore high quality notes prepared by expert teachers.</p>
                                                <Link to="/notes" className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-md relative z-10 flex items-center gap-2">
                                                    Browse Notes <ArrowRight className="w-4 h-4" />
                                                </Link>
                                            </div>
                                        );
                                    }

                                    // If student has notes across multiple academic years and viewing "All", group them into distinct year sections
                                    if (selectedNoteYearFilter === 'all' && studentNoteYears.length > 1) {
                                        return (
                                            <div className="space-y-10">
                                                {studentNoteYears.map(yearNum => {
                                                    const meta = getYearMeta(yearNum);
                                                    const yearNotes = filteredNotes.filter(n => getItemYear(n.subjectId) === yearNum);
                                                    if (yearNotes.length === 0) return null;

                                                    return (
                                                        <div key={yearNum} className="space-y-4">
                                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200/80 gap-2">
                                                                <div className="flex items-center gap-3">
                                                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-extrabold uppercase tracking-wider border ${meta.badgeColor}`}>
                                                                        {meta.code}
                                                                    </span>
                                                                    <div>
                                                                        <h2 className="text-lg font-bold text-slate-900 leading-tight">
                                                                            {meta.name}
                                                                        </h2>
                                                                        <p className="text-xs text-slate-500 mt-0.5">{meta.subtext}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2 self-start sm:self-auto">
                                                                    <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                                                                        {yearNotes.length} {yearNotes.length === 1 ? 'Package' : 'Packages'}
                                                                    </span>
                                                                    <button
                                                                        onClick={() => setSelectedNoteYearFilter(yearNum)}
                                                                        className="text-xs font-bold text-[#1F81FC] hover:underline flex items-center gap-1 ml-2"
                                                                    >
                                                                        Focus on {meta.code} <ArrowRight className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                                                {yearNotes.map(renderNoteCard)}
                                                            </div>
                                                        </div>
                                                    );
                                                })}

                                                {filteredNotes.length === 0 && (
                                                    <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center">
                                                        <p className="text-sm text-slate-500">No notes found matching "{noteSearchQuery}".</p>
                                                        <button onClick={() => setNoteSearchQuery('')} className="text-xs font-bold text-blue-600 hover:underline mt-2">Clear search</button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }

                                    // Single year view or when only 1 year of notes exists
                                    return (
                                        <div className="space-y-4">
                                            {selectedNoteYearFilter !== 'all' && (
                                                <div className="flex items-center justify-between bg-blue-50/60 border border-blue-100 rounded-xl p-3 px-4">
                                                    <span className="text-sm font-semibold text-slate-900">
                                                        Showing {getYearMeta(selectedNoteYearFilter).name} ({filteredNotes.length})
                                                    </span>
                                                    <button
                                                        onClick={() => setSelectedNoteYearFilter('all')}
                                                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                                                    >
                                                        Show all academic years
                                                    </button>
                                                </div>
                                            )}

                                            {filteredNotes.length > 0 ? (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                                    {filteredNotes.map(renderNoteCard)}
                                                </div>
                                            ) : (
                                                <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center">
                                                    <p className="text-sm text-slate-500">No notes found for this filter.</p>
                                                    <button
                                                        onClick={() => { setSelectedNoteYearFilter('all'); setNoteSearchQuery(''); }}
                                                        className="text-xs font-bold text-blue-600 hover:underline mt-2"
                                                    >
                                                        Reset filters
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                {/* Recommended for You */}
                                <div className="pt-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Sparkles className="w-5 h-5 text-orange-500" /> Recommended for You</h2>
                                            <p className="text-sm text-slate-500">Popular notes based on your branch and year</p>
                                        </div>
                                        <Link to="/notes" className="text-blue-600 text-sm font-bold flex items-center gap-1 hover:underline">View All <ArrowRight className="w-4 h-4" /></Link>
                                    </div>
                                    
                                    {(() => {
                                        const recommendedNotes = allNotesState.filter(n => !user.purchasedNoteIds?.includes(n.id) && n.price !== 0).slice(0, 4);
                                        if (recommendedNotes.length === 0) {
                                            return (
                                                <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-10 flex flex-col items-center justify-center text-center">
                                                    <FileText className="w-10 h-10 text-slate-300 mb-3" />
                                                    <h3 className="text-sm font-bold text-slate-700 mb-1">You've got everything!</h3>
                                                    <p className="text-sm text-slate-500 max-w-sm">You have unlocked all recommended notes for your branch and year. Browse the catalog for more topics.</p>
                                                </div>
                                            );
                                        }
                                        return (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                                {recommendedNotes.map((n, i) => (
                                                    <Link key={n.id} to={`/note/${n.id}`} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex flex-col group">
                                                        <div className="aspect-video bg-slate-900 relative">
                                                            {n.thumbnailUrl ? (
                                                                <img src={n.thumbnailUrl} alt={n.title} className="w-full h-full object-contain opacity-90 group-hover:opacity-100 transition-opacity" />
                                                            ) : (
                                                                <div className="w-full h-full bg-gradient-to-br from-[#131A3F] via-slate-900 to-indigo-950 flex flex-col items-center justify-center text-white/80 p-4 text-center select-none">
                                                                    <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-1.5 border border-white/10">
                                                                        <FileText className="w-4 h-4 text-indigo-400" />
                                                                    </div>
                                                                    <span className="text-xs font-bold text-white line-clamp-1">{n.title}</span>
                                                                </div>
                                                            )}
                                                            <div className="absolute top-3 left-3 bg-white/20 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded">
                                                                {getSubjectBadge(n.subjectId)}
                                                            </div>
                                                            <div className="absolute top-3 right-3 text-white/70 hover:text-white cursor-pointer">
                                                                <Bookmark className="w-5 h-5" />
                                                            </div>
                                                            <div className="absolute bottom-3 right-3 bg-white text-red-600 text-[10px] font-bold px-2 py-1 rounded shadow-md flex items-center gap-1">
                                                                <FileText className="w-3 h-3" /> PDF
                                                            </div>
                                                        </div>
                                                        <div className="p-4 flex-1 flex flex-col">
                                                            <h3 className="font-bold text-slate-900 mb-2 line-clamp-2 leading-snug">{n.title}</h3>
                                                            {(() => {
                                                                const fileCount = n.sections?.reduce((acc: number, s: any) => acc + (s.files?.length || 0), 0) || 0;
                                                                return (
                                                                    <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                                                                        <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> {fileCount > 0 ? `${fileCount} ${fileCount === 1 ? 'PDF' : 'PDFs'}` : `${n.sections?.length || 0} Sections`}</span>
                                                                    </div>
                                                                );
                                                            })()}
                                                            <div className="mt-auto flex items-center justify-between">
                                                                <span className="font-bold text-slate-900">₹{n.price}</span>
                                                                <span className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold group-hover:bg-blue-100 transition-colors flex items-center gap-1">
                                                                    View Notes <ArrowRight className="w-3 h-3" />
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </Link>
                                                ))}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        )}

                        {activeTab === 'live' && (() => {
                            const upcomingClasses = liveClasses.filter((lc: any) => lc.status === 'scheduled');
                            const activeLiveClasses = liveClasses.filter((lc: any) => lc.status === 'live' || lc.status === 'in-progress');
                            const recordedClasses = liveClasses.filter((lc: any) => lc.status === 'completed' || lc.recordingUrl);

                            const currentFilteredClasses = (() => {
                                if (liveTabFilter === 'upcoming') return upcomingClasses;
                                if (liveTabFilter === 'live') return activeLiveClasses;
                                if (liveTabFilter === 'recordings') return recordedClasses;
                                return liveClasses; // 'my-classes'
                            })();

                            return (
                             <div className="space-y-8 relative z-10">
                                 {/* Filter Tabs */}
                                 <div className="flex items-center gap-2.5 sm:gap-3 overflow-x-auto pb-2 md:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar">
                                     <button 
                                         onClick={() => setLiveTabFilter('upcoming')} 
                                         className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors border ${
                                             liveTabFilter === 'upcoming' 
                                                 ? 'bg-blue-600 border-blue-600 text-white shadow-sm' 
                                                 : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                         }`}
                                     >
                                         <Calendar className="w-4 h-4" /> 
                                         <span>Upcoming</span> 
                                         <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                                             liveTabFilter === 'upcoming' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                                         }`}>
                                             {upcomingClasses.length}
                                         </span>
                                     </button>

                                     <button 
                                         onClick={() => setLiveTabFilter('live')} 
                                         className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors border ${
                                             liveTabFilter === 'live' 
                                                 ? 'bg-red-600 border-red-600 text-white shadow-sm' 
                                                 : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                         }`}
                                     >
                                         <Radio className={`w-4 h-4 ${liveTabFilter === 'live' ? 'text-white' : 'text-red-500 animate-pulse'}`} /> 
                                         <span>Live Now</span> 
                                         <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                                             liveTabFilter === 'live' ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'
                                         }`}>
                                             {activeLiveClasses.length}
                                         </span>
                                     </button>

                                     <button 
                                         onClick={() => setLiveTabFilter('my-classes')} 
                                         className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors border ${
                                             liveTabFilter === 'my-classes' 
                                                 ? 'bg-blue-600 border-blue-600 text-white shadow-sm' 
                                                 : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                         }`}
                                     >
                                         <BookOpen className="w-4 h-4" /> 
                                         <span>My Classes</span> 
                                         <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                                             liveTabFilter === 'my-classes' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                                         }`}>
                                             {liveClasses.length}
                                         </span>
                                     </button>

                                     <button 
                                         onClick={() => setLiveTabFilter('recordings')} 
                                         className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors border ${
                                             liveTabFilter === 'recordings' 
                                                 ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' 
                                                 : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                         }`}
                                     >
                                         <Play className={`w-4 h-4 ${liveTabFilter === 'recordings' ? 'fill-current' : ''}`} /> 
                                         <span>Recordings</span> 
                                         <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                                             liveTabFilter === 'recordings' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                                         }`}>
                                             {recordedClasses.length}
                                         </span>
                                     </button>
                                 </div>

                                 {/* Dynamic Live Classes / Recordings List Section */}
                                 <div>
                                     <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                         <div className="flex items-center gap-3">
                                             <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                                 liveTabFilter === 'recordings' 
                                                     ? 'bg-indigo-50 text-indigo-600' 
                                                     : liveTabFilter === 'live' 
                                                     ? 'bg-red-50 text-red-600' 
                                                     : 'bg-blue-50 text-blue-600'
                                             }`}>
                                                 {liveTabFilter === 'recordings' ? (
                                                     <Play className="w-5 h-5 fill-current" />
                                                 ) : liveTabFilter === 'live' ? (
                                                     <Radio className="w-5 h-5" />
                                                 ) : (
                                                     <Calendar className="w-5 h-5" />
                                                 )}
                                             </div>
                                             <div>
                                                 <h3 className="text-xl font-bold text-slate-900">
                                                     {liveTabFilter === 'recordings' 
                                                         ? 'Class Recordings & Replays' 
                                                         : liveTabFilter === 'live' 
                                                         ? 'Classes Happening Live Now' 
                                                         : liveTabFilter === 'my-classes' 
                                                         ? 'All Enrolled Course Sessions' 
                                                         : 'Upcoming Live Classes'}
                                                 </h3>
                                                 <p className="text-sm text-slate-500">
                                                     {liveTabFilter === 'recordings' 
                                                         ? 'Replay completed lectures and interactive recordings anytime' 
                                                         : liveTabFilter === 'live' 
                                                         ? 'Join directly to participate with audio, video, and live chat' 
                                                         : liveTabFilter === 'my-classes' 
                                                         ? 'Full history of upcoming schedules and past recordings' 
                                                         : 'Your scheduled live classes and upcoming live broadcasts'}
                                                 </p>
                                             </div>
                                         </div>
                                     </div>
                                     
                                     {currentFilteredClasses.length === 0 ? (
                                         <div className="bg-slate-50 border border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                                             <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                                                 liveTabFilter === 'recordings' 
                                                     ? 'bg-indigo-100 text-indigo-600' 
                                                     : liveTabFilter === 'live' 
                                                     ? 'bg-red-100 text-red-600' 
                                                     : 'bg-blue-100 text-blue-600'
                                             }`}>
                                                 {liveTabFilter === 'recordings' ? (
                                                     <Play className="w-8 h-8 fill-current" />
                                                 ) : liveTabFilter === 'live' ? (
                                                     <Radio className="w-8 h-8" />
                                                 ) : (
                                                     <Calendar className="w-8 h-8" />
                                                 )}
                                             </div>
                                             <h3 className="text-xl font-bold text-slate-800 mb-2">
                                                 {liveTabFilter === 'recordings' 
                                                     ? 'No recordings available yet' 
                                                     : liveTabFilter === 'live' 
                                                     ? 'No classes live right now' 
                                                     : 'No live classes found'}
                                             </h3>
                                             <p className="text-slate-500 max-w-sm">
                                                 {liveTabFilter === 'recordings' 
                                                     ? 'Recordings will automatically become available once live classes conclude.' 
                                                     : liveTabFilter === 'live' 
                                                     ? 'Check the Upcoming tab to see scheduled lecture dates and times.' 
                                                     : 'Check back later for new class sessions scheduled by instructors.'}
                                             </p>
                                         </div>
                                     ) : (
                                         <div className="space-y-4">
                                             {currentFilteredClasses.map((lc: any) => {
                                                 const dateObj = new Date(lc.scheduledStartTime);
                                                 const isToday = new Date().toDateString() === dateObj.toDateString();
                                                 const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                                 const dayStr = isToday ? 'Today' : dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                                                 const timeStr = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                                                 const isLive = lc.status === 'live' || lc.status === 'in-progress';
                                                 const isCompleted = lc.status === 'completed';
                                                 const hasRealRecording = Boolean(
                                                     lc.recordingUrl &&
                                                     lc.recordingUrl.trim().length > 0 &&
                                                     lc.recordingUrl !== lc.dailyRoomUrl &&
                                                     !lc.recordingUrl.endsWith(lc.dailyRoomName || '')
                                                 );
                                                 
                                                 return (
                                                     <div key={lc.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-col md:flex-row items-start md:items-center gap-6 hover:shadow-md transition-shadow">
                                                         <div className="flex items-center gap-4 w-full md:w-48 shrink-0">
                                                             <div className={`px-4 py-2 rounded-lg text-center border ${
                                                                 isLive 
                                                                     ? 'bg-red-50 text-red-600 border-red-200' 
                                                                     : isCompleted 
                                                                     ? 'bg-indigo-50 text-indigo-600 border-indigo-100' 
                                                                     : isToday 
                                                                     ? 'bg-blue-50 text-blue-600 border-blue-100' 
                                                                     : 'bg-slate-50 text-slate-600 border-slate-200'
                                                             }`}>
                                                                 <div className="text-sm font-bold">{dateStr}</div>
                                                                 <div className="text-xs font-medium">{dayStr}</div>
                                                             </div>
                                                             <div>
                                                                 <div className="text-sm font-bold text-slate-900">{timeStr}</div>
                                                                 <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                                                     {isLive ? (
                                                                         <span className="text-red-600 font-semibold flex items-center gap-1">
                                                                             <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" />
                                                                             Broadcasting
                                                                         </span>
                                                                     ) : isCompleted ? (
                                                                         <span className="text-indigo-600 font-medium">Recorded Session</span>
                                                                     ) : (
                                                                         <><Clock className="w-3 h-3" /> Scheduled</>
                                                                     )}
                                                                 </div>
                                                             </div>
                                                         </div>
                                                         
                                                         <div className="flex-1 flex items-start gap-4">
                                                             <div className={`w-12 h-12 rounded-xl shrink-0 flex flex-col items-center justify-center shadow-sm border ${
                                                                isLive 
                                                                    ? "bg-rose-50 text-rose-600 border-rose-200" 
                                                                    : isCompleted 
                                                                    ? "bg-indigo-50 text-indigo-600 border-indigo-200" 
                                                                    : "bg-blue-50 text-blue-600 border-blue-200"
                                                            }`}>
                                                                 {isLive ? (
                                                                     <>
                                                                         <Radio className="w-5 h-5 animate-pulse" />
                                                                         <span className="text-[9px] font-bold uppercase tracking-wider mt-0.5">Live</span>
                                                                     </>
                                                                 ) : isCompleted ? (
                                                                     <>
                                                                         <Play className="w-5 h-5 fill-current" />
                                                                         <span className="text-[9px] font-bold uppercase tracking-wider mt-0.5">Replay</span>
                                                                     </>
                                                                 ) : (
                                                                     <>
                                                                         <Video className="w-5 h-5" />
                                                                         <span className="text-[9px] font-bold uppercase tracking-wider mt-0.5">Class</span>
                                                                     </>
                                                                 )}
                                                             </div>
                                                             <div>
                                                                 <h4 className="font-bold text-slate-900 text-base mb-1">{lc.title}</h4>
                                                                 <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-1.5">
                                                                     <span className="flex items-center gap-1.5 font-medium text-slate-700">
                                                                         <div className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[8px] text-slate-700 font-bold">
                                                                             {(lc.teacherName || 'Faculty')[0].toUpperCase()}
                                                                         </div> 
                                                                         {lc.teacherName || 'Faculty'}
                                                                     </span>
                                                                     <span className="inline-flex items-center px-2 py-0.5 rounded-full font-semibold text-[11px] bg-blue-50 text-blue-700 border border-blue-100">
                                                                         {formatSubjectLabel(lc.subject, lc.course)}
                                                                     </span>
                                                                 </div>
                                                                 <p className="text-xs text-slate-500">
                                                                     {isCompleted 
                                                                         ? (hasRealRecording ? 'Class concluded • Interactive recording replay available' : 'Class concluded • Recording archived') 
                                                                         : isLive 
                                                                         ? 'Interactive broadcast in progress • Join with audio & chat' 
                                                                         : 'Scheduled live lecture session'}
                                                                 </p>
                                                             </div>
                                                         </div>

                                                         <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
                                                             {isCompleted || liveTabFilter === 'recordings' ? (
                                                                 hasRealRecording || lc.recordingStatus === 'ready' ? (
                                                                     <button 
                                                                         onClick={() => handleOpenRecording(lc)} 
                                                                         className="flex-1 md:flex-none bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                                                                         title="Watch interactive recording replay"
                                                                     >
                                                                         <Play className="w-3.5 h-3.5 fill-current" />
                                                                         <span>Watch Recording</span>
                                                                     </button>
                                                                 ) : (
                                                                     <button 
                                                                         onClick={() => handleOpenRecording(lc)} 
                                                                         className="flex-1 md:flex-none bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700/60 px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all"
                                                                         title="Live stream ended • Video recording is currently processing"
                                                                     >
                                                                         <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                                                                         <span>Processing Recording</span>
                                                                     </button>
                                                                 )
                                                             ) : isLive ? (
                                                                 <button 
                                                                     onClick={() => navigate(`/live-class/${lc.id}`)} 
                                                                     className="flex-1 md:flex-none bg-gradient-to-r from-red-600 to-rose-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:opacity-95 transition-all shadow-md shadow-red-500/20 flex items-center justify-center gap-2 active:scale-95 animate-pulse"
                                                                 >
                                                                     <Radio className="w-4 h-4" />
                                                                     <span>Join Live Now</span>
                                                                 </button>
                                                             ) : (
                                                                 <button 
                                                                     onClick={() => navigate(`/live-class/${lc.id}`)} 
                                                                     className="flex-1 md:flex-none bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center gap-2"
                                                                 >
                                                                     Join Class <ArrowRight className="w-4 h-4" />
                                                                 </button>
                                                             )}
                                                         </div>
                                                     </div>
                                                 );
                                             })}
                                         </div>
                                     )}
                                 </div>
                             </div>
                            );
                        })()}

                        {activeTab === 'billing' && (
                            <div className="max-w-2xl">
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#1F81FC]/10 to-[#7F26FE]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                                <Sparkles className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-slate-900">AI Credits</h3>
                                                <p className="text-sm text-slate-500">Use credits for AI Vivas and Exam Intelligence</p>
                                            </div>
                                        </div>

                                        <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
                                            <div>
                                                <p className="text-sm font-medium text-slate-500 mb-1">Current Balance</p>
                                                <div className="flex items-end gap-2">
                                                    <span className="text-4xl font-extrabold text-slate-900">{isUnlimited ? 'Unlimited' : credits}</span>
                                                    {!isUnlimited && <span className="text-slate-500 font-medium mb-1">credits</span>}
                                                </div>
                                            </div>
                                            {isUnlimited ? (
                                                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2 rounded-lg font-medium flex items-center gap-2">
                                                    <CheckCircle className="w-5 h-5" /> Active until {unlimitedExpiry?.toLocaleDateString()}
                                                </div>
                                            ) : (
                                                <button onClick={() => setShowBuyModal(true)} className="bg-[#131A3F] text-white px-6 py-3 rounded-lg font-bold hover:bg-slate-800 transition-colors w-full md:w-auto shadow-sm">
                                                    Buy Credits
                                                </button>
                                            )}
                                        </div>

                                        {!isUnlimited && freeUsedCount < freeQuizLimit && (
                                            <p className="text-sm text-slate-600 flex items-center gap-2 bg-blue-50 text-blue-800 px-4 py-3 rounded-lg border border-blue-100">
                                                <Sparkles className="w-4 h-4 shrink-0" />
                                                You have {freeQuizLimit - freeUsedCount} free trial credits remaining.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'settings' && (
                            <div className="max-w-2xl">
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-8">
                                    <div className="flex items-center gap-6 pb-8 border-b border-slate-100">
                                        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#1F81FC] to-[#7F26FE] flex items-center justify-center text-white font-bold text-4xl shadow-lg shrink-0">
                                            {user.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold text-slate-900">{user.name}</h3>
                                            <p className="text-slate-500 text-sm mt-1">{user.email}</p>
                                            <span className="inline-block mt-3 text-xs font-bold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-md border border-indigo-100 uppercase tracking-wide">STUDENT</span>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="font-bold text-slate-800 mb-4 text-lg">Account Information</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                                <p className="text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Phone Number</p>
                                                <p className="font-medium text-slate-900">{user.phoneNumber || 'Not provided'}</p>
                                            </div>
                                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                                <p className="text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Account ID</p>
                                                <p className="font-mono text-xs text-slate-900 truncate">{user.id}</p>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </main>
        {showBuyModal && <BuyCreditsModal onClose={() => setShowBuyModal(false)} />}
        
        {/* In-App Live Class Recording Player Modal */}
        {activeRecording && (
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
                    onClick={() => setActiveRecording(null)}
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
                        onClick={() => handleOpenRecording(activeRecording)}
                        disabled={playbackLoading}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-xs font-bold text-white transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${playbackLoading ? 'animate-spin' : ''}`} />
                        <span>Check If Ready</span>
                      </button>
                      <button
                        onClick={() => setActiveRecording(null)}
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
                      onClick={() => handleOpenRecording(activeRecording)}
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
                  onClick={() => setActiveRecording(null)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                >
                  Close Player
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default StudentDashboard;
