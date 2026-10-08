import fs from 'fs';

const code = `
import React, { useState, useEffect } from 'react';
import { useAuth, useCredits } from '../context/AuthContext';
import { api } from '../services/api';
import { Course, Note, UserRole } from '../types';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, BookOpen, FileText, Video, 
  Settings, CreditCard, Sparkles, GraduationCap, ChevronRight, CheckCircle, Clock, LogOut, Menu, X
} from 'lucide-react';
import { BuyCreditsModal } from './QuizDetail';

type Tab = 'overview' | 'courses' | 'notes' | 'live' | 'billing' | 'settings';

const StudentDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { credits, freeLeft, freeQuizLimit, freeQuizUsed, isUnlimited, unlimitedPlan, refresh: refreshCredits } = useCredits();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [courses, setCourses] = useState<Course[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [liveClasses, setLiveClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuyModal, setShowBuyModal] = useState(false);

  useEffect(() => {
    if (user && user.role === UserRole.STUDENT) {
      const fetchPurchases = async () => {
        try {
          const [allCourses, allNotes, scheduleRes] = await Promise.all([
              api.getCourses(), 
              api.getNotes(), 
              api.getMyLiveClassSchedule().catch(() => ({ liveClasses: [] }))
          ]);
          setCourses(allCourses.filter(c => user.purchasedNoteIds.includes(c.id) || c.price === 0));
          setNotes(allNotes.filter(n =>
            user.purchasedNoteIds.includes(n.id) ||
            n.price === 0 ||
            (n.collegeConfig && user.email.endsWith(n.collegeConfig.emailDomain.trim()))
          ));
          setLiveClasses(scheduleRes.liveClasses || []);
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
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

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
        <aside className={\`
            fixed inset-y-0 left-0 z-10 w-64 bg-[#131A3F] text-slate-300 transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:flex-shrink-0
            \${isMobileMenuOpen ? 'translate-x-0 pt-20 md:pt-0' : '-translate-x-full'}
            flex flex-col shadow-xl
        \`}>
            <div className="p-6 hidden md:flex items-center gap-3 border-b border-white/10">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1F81FC] to-[#7F26FE] flex items-center justify-center text-white font-bold text-xl shadow-lg">
                    {user.name.charAt(0)}
                </div>
                <div>
                    <h2 className="font-bold text-white text-sm truncate w-40">{user.name}</h2>
                    <p className="text-xs text-slate-400">Student Account</p>
                </div>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => { setActiveTab(item.id as Tab); setIsMobileMenuOpen(false); }}
                            className={\`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 \${
                                isActive 
                                ? 'bg-[#1F81FC]/10 text-[#1F81FC] shadow-inner border border-[#1F81FC]/20' 
                                : 'hover:bg-white/5 hover:text-white'
                            }\`}
                        >
                            <Icon className={\`w-5 h-5 \${isActive ? 'text-[#1F81FC]' : 'text-slate-400'}\`} />
                            {item.label}
                        </button>
                    )
                })}
            </nav>

            <div className="p-4 border-t border-white/10">
                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-400 hover:bg-red-400/10 transition-colors">
                    <LogOut className="w-5 h-5" />
                    Logout
                </button>
            </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-10 overflow-y-auto w-full max-w-7xl mx-auto">
            {loading ? (
                <div className="flex flex-col items-center justify-center h-64 space-y-4">
                    <div className="w-10 h-10 border-4 border-slate-200 border-t-[#1F81FC] rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium">Loading your dashboard...</p>
                </div>
            ) : (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-[#131A3F] mb-2">
                                {activeTab === 'overview' && 'Welcome back, ' + user.name.split(' ')[0] + '! 👋'}
                                {activeTab === 'courses' && 'My Courses'}
                                {activeTab === 'notes' && 'My Notes Library'}
                                {activeTab === 'live' && 'Live Classes'}
                                {activeTab === 'billing' && 'Credits & Plans'}
                                {activeTab === 'settings' && 'Account Settings'}
                            </h1>
                            <p className="text-slate-500">
                                {activeTab === 'overview' && 'Here is what is happening with your learning journey.'}
                                {activeTab === 'courses' && 'Access and resume your purchased courses.'}
                                {activeTab === 'notes' && 'Your premium and unlocked study materials.'}
                                {activeTab === 'live' && 'Join your upcoming live sessions.'}
                                {activeTab === 'billing' && 'Manage your AI credits and premium subscriptions.'}
                                {activeTab === 'settings' && 'Update your profile and preferences.'}
                            </p>
                        </div>
                        {activeTab === 'overview' && (
                             <button onClick={() => setActiveTab('billing')} className="flex items-center gap-2 bg-gradient-to-r from-[#1F81FC] to-[#7F26FE] text-white px-5 py-2.5 rounded-lg font-medium shadow-md shadow-indigo-500/20 hover:scale-105 transition-transform">
                                <Sparkles className="w-4 h-4" /> Get More Credits
                             </button>
                        )}
                    </div>

                    {/* Tab Content */}
                    <div className="mt-8">
                        {activeTab === 'overview' && (
                            <div className="space-y-8">
                                {/* Stats Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start gap-4">
                                        <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600"><BookOpen className="w-6 h-6" /></div>
                                        <div>
                                            <p className="text-sm text-slate-500 font-medium">Enrolled Courses</p>
                                            <h3 className="text-2xl font-bold text-slate-800 mt-1">{courses.length}</h3>
                                        </div>
                                    </div>
                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start gap-4">
                                        <div className="p-3 bg-blue-50 rounded-xl text-blue-600"><FileText className="w-6 h-6" /></div>
                                        <div>
                                            <p className="text-sm text-slate-500 font-medium">Notes Unlocked</p>
                                            <h3 className="text-2xl font-bold text-slate-800 mt-1">{notes.length}</h3>
                                        </div>
                                    </div>
                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start gap-4">
                                        <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600"><Video className="w-6 h-6" /></div>
                                        <div>
                                            <p className="text-sm text-slate-500 font-medium">Upcoming Live</p>
                                            <h3 className="text-2xl font-bold text-slate-800 mt-1">{liveClasses.length}</h3>
                                        </div>
                                    </div>
                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start gap-4">
                                        <div className="p-3 bg-purple-50 rounded-xl text-purple-600"><Sparkles className="w-6 h-6" /></div>
                                        <div>
                                            <p className="text-sm text-slate-500 font-medium">AI Credits</p>
                                            <h3 className="text-2xl font-bold text-slate-800 mt-1">{isUnlimited ? '∞' : credits}</h3>
                                        </div>
                                    </div>
                                </div>

                                {/* Quick Access */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><BookOpen className="w-5 h-5 text-indigo-500" /> Recent Courses</h3>
                                            <button onClick={() => setActiveTab('courses')} className="text-sm text-[#1F81FC] font-medium hover:underline">View All</button>
                                        </div>
                                        {courses.length > 0 ? (
                                            <div className="space-y-4">
                                                {courses.slice(0, 3).map(c => (
                                                    <Link key={c.id} to={\`/course/\${c.id}\`} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100">
                                                        <div className="w-16 h-12 bg-slate-200 rounded-lg overflow-hidden shrink-0">
                                                            {c.thumbnailUrl ? <img src={c.thumbnailUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-indigo-100"></div>}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-semibold text-slate-800 text-sm truncate">{c.title}</h4>
                                                            <p className="text-xs text-slate-500 truncate">{c.subject}</p>
                                                        </div>
                                                        <ChevronRight className="w-4 h-4 text-slate-400" />
                                                    </Link>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 text-slate-500 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                                No courses enrolled yet. <br/>
                                                <Link to="/browse" className="text-[#1F81FC] font-medium mt-2 inline-block hover:underline">Browse Courses</Link>
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Video className="w-5 h-5 text-emerald-500" /> Live Classes</h3>
                                            <button onClick={() => setActiveTab('live')} className="text-sm text-[#1F81FC] font-medium hover:underline">View All</button>
                                        </div>
                                        {liveClasses.length > 0 ? (
                                            <div className="space-y-4">
                                                {liveClasses.slice(0, 3).map((lc, i) => (
                                                    <Link key={i} to={\`/live-class/lobby/\${lc.id}\`} className="flex items-center gap-4 p-3 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors border border-emerald-100">
                                                        <div className="w-12 h-12 bg-white rounded-lg flex flex-col items-center justify-center shrink-0 shadow-sm">
                                                            <span className="text-xs font-bold text-emerald-600">{new Date(lc.scheduledAt).getDate()}</span>
                                                            <span className="text-[10px] font-medium text-slate-500 uppercase">{new Date(lc.scheduledAt).toLocaleString('default', {month: 'short'})}</span>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-semibold text-emerald-900 text-sm truncate">{lc.topic}</h4>
                                                            <p className="text-xs text-emerald-700 truncate flex items-center gap-1"><Clock className="w-3 h-3"/> {new Date(lc.scheduledAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                                        </div>
                                                        <span className="text-xs font-bold bg-emerald-500 text-white px-2 py-1 rounded-full animate-pulse">Join</span>
                                                    </Link>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 text-slate-500 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                                No upcoming live classes.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'courses' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {courses.map(c => (
                                    <Link key={c.id} to={\`/course/\${c.id}\`} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md hover:-translate-y-1 transition-all group">
                                        <div className="aspect-video bg-slate-200 relative">
                                            {c.thumbnailUrl ? <img src={c.thumbnailUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-indigo-100"></div>}
                                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <div className="bg-white text-[#131A3F] px-4 py-2 rounded-lg font-bold text-sm shadow-lg flex items-center gap-2">
                                                    Resume <ChevronRight className="w-4 h-4"/>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-5">
                                            <div className="text-xs font-bold text-[#1F81FC] mb-1">{c.subject}</div>
                                            <h3 className="font-bold text-slate-900 line-clamp-2">{c.title}</h3>
                                        </div>
                                    </Link>
                                ))}
                                {courses.length === 0 && (
                                     <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
                                         <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                         <h3 className="text-lg font-bold text-slate-700 mb-1">No Courses Yet</h3>
                                         <p className="text-slate-500 mb-4">You haven't enrolled in any courses.</p>
                                         <Link to="/browse" className="bg-[#131A3F] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-slate-800 transition-colors">Browse Catalog</Link>
                                     </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'notes' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {notes.map(n => (
                                    <Link key={n.id} to={\`/note/\${n.id}\`} className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 hover:shadow-md hover:-translate-y-1 transition-all group">
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center shrink-0 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                <FileText className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-[#1F81FC] mb-1">{n.subject}</div>
                                                <h3 className="font-bold text-slate-900 line-clamp-2">{n.title}</h3>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                                {notes.length === 0 && (
                                     <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
                                         <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                         <h3 className="text-lg font-bold text-slate-700 mb-1">No Notes Yet</h3>
                                         <p className="text-slate-500 mb-4">You don't have access to any note packages.</p>
                                         <Link to="/notes" className="bg-[#131A3F] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-slate-800 transition-colors">Browse Notes</Link>
                                     </div>
                                )}
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
                                                <Link to={\`/live-class/lobby/\${lc.id}\`} className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-medium transition-colors text-center shadow-sm">
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
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#1F81FC]/10 to-[#7F26FE]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
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
                                                <button onClick={() => setShowBuyModal(true)} className="bg-[#131A3F] text-white px-6 py-3 rounded-lg font-bold hover:bg-slate-800 transition-colors w-full md:w-auto">
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
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-6">
                                    <div className="flex items-center gap-6 pb-6 border-b border-slate-100">
                                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#1F81FC] to-[#7F26FE] flex items-center justify-center text-white font-bold text-3xl shadow-lg">
                                            {user.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-900">{user.name}</h3>
                                            <p className="text-slate-500">{user.email}</p>
                                            <span className="inline-block mt-2 text-xs font-bold bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md border border-indigo-100">STUDENT</span>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="font-bold text-slate-800 mb-4">Account Information</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                                <p className="text-xs font-medium text-slate-500 mb-1">Phone Number</p>
                                                <p className="font-medium text-slate-900">{user.phoneNumber || 'Not provided'}</p>
                                            </div>
                                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                                <p className="text-xs font-medium text-slate-500 mb-1">Account ID</p>
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
`
fs.writeFileSync('pages/StudentDashboard.tsx', code);
