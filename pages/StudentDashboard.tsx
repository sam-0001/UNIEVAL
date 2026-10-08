import React, { useState, useEffect } from 'react';
import { useAuth, useCredits } from '../context/AuthContext';
import { api } from '../services/api';
import { Course, Note, UserRole } from '../types';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, BookOpen, FileText, Video, 
  Settings, CreditCard, Sparkles, GraduationCap, ChevronRight, CheckCircle, Clock, LogOut, Menu, X, Brain, Wrench, Search, Bell, ArrowRight, Play, Zap, Compass, Rocket, Calendar, Download, Bookmark, Star, Navigation
} from 'lucide-react';
import { BuyCreditsModal } from './QuizDetail';

type Tab = 'overview' | 'courses' | 'notes' | 'live' | 'billing' | 'settings';

const StudentDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { credits, freeLeft, freeQuizLimit, freeQuizUsed, isUnlimited, unlimitedPlan, refresh: refreshCredits } = useCredits();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [allCoursesState, setAllCoursesState] = useState<Course[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [allNotesState, setAllNotesState] = useState<Note[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [liveClasses, setLiveClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user && user.role === UserRole.STUDENT) {
      const fetchPurchases = async () => {
        try {
          const [allCourses, allNotes, scheduleRes, allSubjects] = await Promise.all([
              api.getCourses(), 
              api.getNotes(), 
              api.getMyLiveClassSchedule().catch(() => ({ liveClasses: [] })),
              api.getSubjects()
          ]);
          setAllCoursesState(allCourses);
          setCourses(allCourses.filter(c => user.purchasedCourseIds?.includes(c.id) || c.price === 0));
          setAllNotesState(allNotes);
          setNotes(allNotes.filter(n =>
            user.purchasedNoteIds?.includes(n.id) ||
            n.price === 0 ||
            (n.collegeConfig && user.email.endsWith(n.collegeConfig.emailDomain.trim()))
          ));
          setLiveClasses(scheduleRes.liveClasses || []);
          setSubjects(allSubjects || []);
        } catch (error) {
          console.error('Failed to fetch purchases', error);
        } finally {
          setLoading(false);
        }
      };
      fetchPurchases();
    } else {
        setLoading(false);
    }
  }, [user]);

  if (!user) return <Navigate to="/" replace />;
  if (user.role !== UserRole.STUDENT) return <Navigate to="/" replace />;

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

  const getSubjectBadge = (subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return subjectId.replace(/[0-9]/g, '').toUpperCase();
    return subject.year === 1 ? 'FE' : subject.year === 2 ? 'SE' : subject.year === 3 ? 'TE' : 'BE';
  };

  const getSubjectName = (subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject ? subject.name : '';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
        {/* Mobile Header */}
        <div className="md:hidden bg-[#131A3F] text-white p-4 flex items-center justify-between shadow-md z-20 sticky top-0">
            <div className="flex items-center gap-2">
                <GraduationCap className="w-6 h-6 text-[#1F81FC]" />
                <span className="font-bold text-lg tracking-tight">Student Dashboard</span>
            </div>
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2">
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
        </div>

        {/* Sidebar */}
        <aside className={`
            fixed inset-y-0 left-0 z-10 w-64 bg-[#131A3F] text-slate-300 transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:flex-shrink-0
            ${isMobileMenuOpen ? 'translate-x-0 pt-20 md:pt-0' : '-translate-x-full'}
            flex flex-col shadow-xl
        `}>
            {/* Logo Area */}
            <div className="p-6 hidden md:flex items-center gap-3 border-b border-white/10 shrink-0">
                <img src="/img/logo.jpeg" alt="UNIEVAL" className="w-10 h-10 rounded-lg object-cover shadow-lg" />
                <div className="flex flex-col">
                    <span className="font-extrabold text-white tracking-tight leading-none text-lg">UNIEVAL</span>
                    <span className="text-[10px] text-[#1F81FC] font-bold uppercase tracking-widest mt-0.5">Student Dashboard</span>
                </div>
            </div>

            {/* Profile Area */}
            <div className="p-6 hidden md:flex items-center gap-3 border-b border-white/10 shrink-0">
                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-white font-bold text-xl shadow-inner border border-slate-700">
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
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                                isActive 
                                ? 'bg-[#1F81FC]/10 text-[#1F81FC] shadow-inner border border-[#1F81FC]/20' 
                                : 'hover:bg-white/5 hover:text-white'
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
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                        activeTab === 'settings' 
                        ? 'bg-[#1F81FC]/10 text-[#1F81FC] shadow-inner border border-[#1F81FC]/20' 
                        : 'hover:bg-white/5 hover:text-white text-slate-300'
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
        <main className="flex-1 p-6 lg:p-10 overflow-y-auto w-full max-w-7xl mx-auto h-screen relative">
            {loading ? (
                <div className="flex flex-col items-center justify-center h-64 space-y-4">
                    <div className="w-10 h-10 border-4 border-slate-200 border-t-[#1F81FC] rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium">Loading your dashboard...</p>
                </div>
            ) : (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
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
                                <button className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-50 relative shadow-sm transition-colors">
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
                                    {activeTab === 'live' && 'Join your upcoming live sessions.'}
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
                                                            <div className="text-xs font-bold text-[#1F81FC] mb-1 uppercase tracking-wide">
                                                                {getSubjectBadge(n.subjectId)}
                                                                {getSubjectName(n.subjectId) && <span className="text-slate-400 font-medium ml-1 tracking-normal normal-case">• {getSubjectName(n.subjectId)}</span>}
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
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
                                    <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
                                        <button className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap">
                                            <LayoutDashboard className="w-4 h-4" /> All Courses <span className="bg-white text-blue-600 px-1.5 py-0.5 rounded text-xs ml-1 shadow-sm">{courses.length}</span>
                                        </button>
                                        <button className="flex items-center gap-2 text-slate-500 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors">
                                            <Clock className="w-4 h-4" /> In Progress <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-xs ml-1">1</span>
                                        </button>
                                        <button className="flex items-center gap-2 text-slate-500 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors">
                                            <CheckCircle className="w-4 h-4" /> Completed <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-xs ml-1">0</span>
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 px-2 text-sm text-slate-500">
                                        <Menu className="w-4 h-4" /> Sort by
                                        <select className="bg-transparent font-medium text-slate-800 focus:outline-none cursor-pointer">
                                            <option>Recently Enrolled</option>
                                            <option>Name (A-Z)</option>
                                        </select>
                                    </div>
                                </div>

                                {/* My Courses List (Horizontal Cards) */}
                                <div className="space-y-4">
                                    {courses.map(c => (
                                        <div key={c.id} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row gap-6 relative">
                                            {/* Thumbnail */}
                                            <div className="w-full md:w-[280px] aspect-video bg-slate-100 rounded-xl overflow-hidden shrink-0">
                                                {c.thumbnailUrl ? <img src={c.thumbnailUrl} className="w-full h-full object-contain bg-slate-900" /> : <div className="w-full h-full bg-indigo-100"></div>}
                                            </div>
                                            
                                            {/* Content */}
                                            <div className="flex-1 flex flex-col py-1">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md uppercase tracking-wide">
                                                            {getSubjectBadge(c.subjectId)}
                                                        </span>
                                                        <h3 className="font-bold text-slate-900 text-xl mt-3 mb-4">{c.title}</h3>
                                                    </div>
                                                    <button className="text-slate-400 hover:text-slate-600 p-1">
                                                        <span className="flex flex-col gap-0.5">
                                                            <span className="w-1 h-1 bg-current rounded-full"></span>
                                                            <span className="w-1 h-1 bg-current rounded-full"></span>
                                                            <span className="w-1 h-1 bg-current rounded-full"></span>
                                                        </span>
                                                    </button>
                                                </div>

                                                <div className="flex items-center gap-6 text-sm text-slate-500 mb-6">
                                                    <span className="flex items-center gap-1.5"><Video className="w-4 h-4" /> {c.modules?.length || 12} Lectures</span>
                                                    <span className="flex items-center gap-1.5"><FileText className="w-4 h-4" /> 8 Notes</span>
                                                    <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> 4h 20m</span>
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
                                    ))}
                                    {courses.length === 0 && (
                                         <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300">
                                             <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                             <h3 className="text-lg font-bold text-slate-700 mb-1">No Courses Yet</h3>
                                             <p className="text-slate-500 mb-6">You haven't enrolled in any courses.</p>
                                             <Link to="/browse" className="bg-[#131A3F] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-slate-800 transition-colors">Browse Catalog</Link>
                                         </div>
                                    )}
                                </div>

                                {/* Recommended for You */}
                                <div className="pt-8 border-t border-slate-100">
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">Recommended for You <span className="text-2xl">🔥</span></h2>
                                            <p className="text-sm text-slate-500 mt-1">Based on your branch and year</p>
                                        </div>
                                        <Link to="/browse" className="text-blue-600 text-sm font-bold flex items-center gap-1 hover:underline">View All <ArrowRight className="w-4 h-4" /></Link>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {allCoursesState.filter(c => !user.purchasedCourseIds?.includes(c.id) && c.price !== 0).slice(0, 4).map((c, i) => (
                                            <div key={c.id} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex flex-col group">
                                                <div className="aspect-[4/3] bg-slate-900 relative">
                                                    {c.thumbnailUrl && <img src={c.thumbnailUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />}
                                                    <div className="absolute top-3 left-3 bg-white/20 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded">
                                                        {getSubjectBadge(c.subjectId)}
                                                    </div>
                                                    <div className="absolute top-3 right-3 text-white/70 hover:text-white cursor-pointer">
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>
                                                    </div>
                                                </div>
                                                <div className="p-4 flex-1 flex flex-col">
                                                    <h3 className="font-bold text-slate-900 mb-3 line-clamp-2 leading-snug">{c.title}</h3>
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-600">P</div>
                                                        <span className="text-xs text-slate-500">Prof. Name</span>
                                                    </div>
                                                    <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                                                        <span className="flex items-center gap-1"><Video className="w-3.5 h-3.5" /> 32 Lectures</span>
                                                        <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> 18 Notes</span>
                                                    </div>
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
                                        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-slate-500">Total Notes</p>
                                            <div className="flex items-baseline gap-2">
                                                <h3 className="text-2xl font-bold text-slate-900 leading-none mt-1">{notes.length}</h3>
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-1">Purchased by you</p>
                                        </div>
                                    </div>
                                    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-green-600 shrink-0">
                                            <Download className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-slate-500">Downloads</p>
                                            <div className="flex items-baseline gap-2">
                                                <h3 className="text-2xl font-bold text-slate-900 leading-none mt-1">0</h3>
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-1">Notes downloaded</p>
                                        </div>
                                    </div>
                                    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
                                            <Bookmark className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-slate-500">Saved Notes</p>
                                            <div className="flex items-baseline gap-2">
                                                <h3 className="text-2xl font-bold text-slate-900 leading-none mt-1">0</h3>
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-1">Marked for later</p>
                                        </div>
                                    </div>
                                    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 shrink-0">
                                            <Star className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-slate-500">Free Notes</p>
                                            <div className="flex items-baseline gap-2">
                                                <h3 className="text-2xl font-bold text-slate-900 leading-none mt-1">0</h3>
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-1">Accessed for free</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Filter Row */}
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
                                        <button className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-semibold whitespace-nowrap shadow-sm">
                                            All Notes
                                        </button>
                                        <button className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors">
                                            My Purchased
                                        </button>
                                        <button className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors">
                                            Free Notes
                                        </button>
                                        <button className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors">
                                            Saved
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-3 overflow-x-auto w-full md:w-auto">
                                        <div className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 flex flex-col shrink-0">
                                            <span className="text-[10px] text-slate-400 font-medium leading-none mb-1">Branch</span>
                                            <select className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer">
                                                <option>All Branches</option>
                                            </select>
                                        </div>
                                        <div className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 flex flex-col shrink-0">
                                            <span className="text-[10px] text-slate-400 font-medium leading-none mb-1">Year</span>
                                            <select className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer">
                                                <option>All Years</option>
                                            </select>
                                        </div>
                                        <div className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 flex flex-col shrink-0">
                                            <span className="text-[10px] text-slate-400 font-medium leading-none mb-1">Subject</span>
                                            <select className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer">
                                                <option>All Subjects</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Recently Purchased Notes */}
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Clock className="w-5 h-5 text-blue-500" /> Recently Purchased Notes</h2>
                                            <p className="text-sm text-slate-500 ml-7">Your latest notes and study material</p>
                                        </div>
                                        <Link to="/notes" className="text-blue-600 text-sm font-bold flex items-center gap-1 hover:underline">View All <ArrowRight className="w-4 h-4" /></Link>
                                    </div>
                                    
                                    {notes.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                            {notes.slice(0,4).map(n => (
                                                <Link key={n.id} to={`/note/${n.id}`} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex flex-col group">
                                                    <div className="aspect-[4/3] bg-slate-900 relative">
                                                        {n.thumbnailUrl ? <img src={n.thumbnailUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" /> : <div className="w-full h-full bg-indigo-900"></div>}
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
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-600">P</div>
                                                            <span className="text-xs text-slate-500">Prof. Name</span>
                                                        </div>
                                                        <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                                                            <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> 120 Pages</span>
                                                            <span className="flex items-center gap-1"><Download className="w-3.5 h-3.5" /> 2.4k+</span>
                                                        </div>
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
                                    ) : (
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
                                    )}
                                </div>

                                {/* Recommended for You */}
                                <div className="pt-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Sparkles className="w-5 h-5 text-orange-500" /> Recommended for You</h2>
                                            <p className="text-sm text-slate-500">Popular notes based on your branch and year</p>
                                        </div>
                                        <Link to="/notes" className="text-blue-600 text-sm font-bold flex items-center gap-1 hover:underline">View All <ArrowRight className="w-4 h-4" /></Link>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {allNotesState.filter(n => !user.purchasedNoteIds?.includes(n.id) && n.price !== 0).slice(0, 4).map((n, i) => (
                                            <Link key={n.id} to={`/note/${n.id}`} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex flex-col group">
                                                <div className="aspect-[4/3] bg-slate-900 relative">
                                                    {n.thumbnailUrl ? <img src={n.thumbnailUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" /> : <div className="w-full h-full bg-purple-900"></div>}
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
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-600">P</div>
                                                        <span className="text-xs text-slate-500">Prof. Name</span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                                                        <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> 130 Pages</span>
                                                        <span className="flex items-center gap-1"><Download className="w-3.5 h-3.5" /> 2.1k+</span>
                                                    </div>
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
                                </div>
                            </div>
                        )}

                        {activeTab === 'live' && (
                             <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                                {liveClasses.length > 0 ? (
                                    <div className="divide-y divide-slate-100">
                                        {liveClasses.map((lc, i) => (
                                            <div key={i} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                                                <div className="flex items-start gap-4">
                                                    <div className="w-14 h-14 bg-emerald-50 rounded-xl border border-emerald-100 flex flex-col items-center justify-center shrink-0">
                                                        <span className="text-sm font-bold text-emerald-700">{new Date(lc.scheduledAt).getDate()}</span>
                                                        <span className="text-xs font-medium text-emerald-600 uppercase">{new Date(lc.scheduledAt).toLocaleString('default', {month: 'short'})}</span>
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-slate-900 text-lg">{lc.topic}</h3>
                                                        <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
                                                            <Clock className="w-4 h-4 text-slate-400" />
                                                            {new Date(lc.scheduledAt).toLocaleString([], {weekday: 'long', hour: '2-digit', minute:'2-digit'})}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Link to={`/live-class/lobby/${lc.id}`} className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-medium transition-colors text-center shadow-sm">
                                                    Join Class
                                                </Link>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-16">
                                        <Video className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                        <h3 className="text-lg font-bold text-slate-700 mb-1">No Scheduled Classes</h3>
                                        <p className="text-slate-500">There are no upcoming live classes for your enrolled courses.</p>
                                    </div>
                                )}
                             </div>
                        )}

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
    </div>
  );
};

export default StudentDashboard;
