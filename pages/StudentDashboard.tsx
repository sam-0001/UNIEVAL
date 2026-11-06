import React, { useState, useEffect } from 'react';
import { useAuth, useCredits } from '../context/AuthContext';
import { UserRole } from '../types';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  LayoutDashboard, BookOpen, FileText, Radio, Coins, Brain, Wrench, Search, Bell, Settings, LogOut, Menu, X
} from 'lucide-react';
import { BuyCreditsModal } from './QuizDetail';
import { useStudentDashboardData } from '../hooks/useStudentDashboardData';
import {
  OverviewTab,
  CoursesTab,
  NotesTab,
  LiveClassesTab,
  BillingTab,
  SettingsTab
} from '../components/student/tabs';
import { SearchResultsView } from '../components/student/SearchResultsView';
import { RecordingPlayerModal } from '../components/student/RecordingPlayerModal';

export type StudentDashboardTab = 'overview' | 'courses' | 'notes' | 'live' | 'billing' | 'settings';

const StudentDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { credits, freeQuizLimit, freeQuizUsed, isUnlimited, unlimitedPlan } = useCredits();

  const [activeTab, setActiveTab] = useState<StudentDashboardTab>(() => {
    const tabParam = searchParams.get('tab') as StudentDashboardTab;
    if (tabParam && ['overview', 'courses', 'notes', 'live', 'billing', 'settings'].includes(tabParam)) {
      return tabParam;
    }
    return (localStorage.getItem('studentDashboardTab') as StudentDashboardTab) || 'overview';
  });

  useEffect(() => {
    const tabParam = searchParams.get('tab') as StudentDashboardTab;
    if (tabParam && ['overview', 'courses', 'notes', 'live', 'billing', 'settings'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  useEffect(() => {
    localStorage.setItem('studentDashboardTab', activeTab);
  }, [activeTab]);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [liveTabFilter, setLiveTabFilter] = useState<'upcoming' | 'live' | 'my-classes' | 'recordings'>('upcoming');

  const {
    courses,
    allCoursesState,
    notes,
    allNotesState,
    myPurchases,
    liveClasses,
    loading,
    activeRecording,
    playbackStreamUrl,
    playbackLoading,
    playbackProcessing,
    processingMessage,
    playbackError,
    studentProgressMap,
    notesByYear,
    coursesByYear,
    studentNoteYears,
    studentCourseYears,
    getItemYear,
    getSubjectBadge,
    getSubjectName,
    formatSubjectLabel,
    isCollegeFreeItem,
    handleOpenRecording,
    setActiveRecording
  } = useStudentDashboardData(activeTab);

  if (!user) return <Navigate to="/login" replace />;
  if (user.role === UserRole.SUPER_ADMIN) return <Navigate to="/super-admin" replace />;
  if (user.role === UserRole.ADMIN || user.role === UserRole.TEACHER) return <Navigate to="/admin" replace />;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'courses', label: 'My Courses', icon: BookOpen },
    { id: 'notes', label: 'My Notes', icon: FileText },
    { id: 'live', label: 'Live Classes', icon: Radio },
    { id: 'billing', label: 'Credits & Plans', icon: Coins },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      {/* Mobile Header */}
      <div className="md:hidden bg-white/95 backdrop-blur-md border-b border-slate-200/80 p-3.5 flex items-center justify-between shadow-2xs z-20 sticky top-0">
        <div className="flex items-center gap-2.5">
          <img src="/img/logo.jpeg" alt="UNIEVAL" className="w-7 h-7 rounded-lg object-contain shadow-xs border border-slate-200/80" />
          <div className="flex flex-col">
            <span className="font-bold text-sm text-slate-900 tracking-tight leading-none">UNIEVAL</span>
            <span className="text-[10px] text-blue-600 font-semibold tracking-wider uppercase mt-0.5">Student Dashboard</span>
          </div>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          className="p-2 -mr-1 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="Toggle navigation drawer"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
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
        fixed inset-y-0 left-0 z-50 w-72 md:w-64 bg-white text-slate-700 border-r border-slate-200/80 transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:flex-shrink-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        flex flex-col shadow-xl md:shadow-none
      `}>
        {/* Logo / Header Area */}
        <div className="p-4 md:p-5 flex items-center justify-between border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <img src="/img/logo.jpeg" alt="UNIEVAL" className="w-8 h-8 rounded-lg object-contain shadow-xs border border-slate-200/80" />
            <div className="flex flex-col">
              <span className="font-bold text-slate-900 tracking-tight leading-none text-base">UNIEVAL</span>
              <span className="text-[10px] text-blue-600 font-semibold tracking-wider uppercase mt-0.5">Student Dashboard</span>
            </div>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(false)} 
            className="md:hidden text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Area */}
        <div className="p-3 mx-3.5 mt-3 flex items-center gap-2.5 rounded-xl bg-slate-50 border border-slate-200/60 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-slate-900 text-xs truncate">{user.name}</h2>
            <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-3">My Learning</div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id as StudentDashboardTab); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  isActive 
                  ? 'bg-blue-50 text-blue-700 font-semibold border-l-4 border-blue-600 rounded-l-none' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
          
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-3 mt-6">Academic Tools</div>
          <Link to="/exam-intelligence" className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
            <Brain className="w-4 h-4 text-purple-500 shrink-0" />
            <span>Exam Intelligence</span>
          </Link>
          <Link to="/be-toolkit" className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
            <Wrench className="w-4 h-4 text-amber-500 shrink-0" />
            <span>BE Project Toolkit</span>
          </Link>

          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-3 mt-6">Explore Catalog</div>
          <Link to="/browse" className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
            <BookOpen className="w-4 h-4 text-blue-500 shrink-0" />
            <span>Browse Courses</span>
          </Link>
          <Link to="/notes" className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
            <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Notes Library</span>
          </Link>
        </nav>

        <div className="p-3 border-t border-slate-100 space-y-1">
          <button
            onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'settings' 
              ? 'bg-blue-50 text-blue-700 font-semibold border-l-4 border-blue-600 rounded-l-none' 
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Settings className={`w-4 h-4 shrink-0 ${activeTab === 'settings' ? 'text-blue-600' : 'text-slate-400'}`} />
            <span>Account Settings</span>
          </button>
          <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Sign Out</span>
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
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-20 pb-2">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-1">
                    Welcome back, {user.name.split(' ')[0]}
                  </h1>
                  <p className="text-slate-500 text-xs sm:text-sm">
                    Track your SPPU engineering course progress, notes, and live classes.
                  </p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="relative flex-1 md:w-72">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Filter courses, notes, subjects..." 
                      value={searchQuery} 
                      onChange={(e) => setSearchQuery(e.target.value)} 
                      className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs text-slate-800 placeholder-slate-400" 
                    />
                  </div>
                  <button 
                    onClick={() => setActiveTab('live')} 
                    title={liveClasses.length > 0 ? `${liveClasses.length} Live session(s) scheduled` : "Live Studio"}
                    className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:text-blue-600 relative shadow-2xs transition-colors shrink-0"
                  >
                    <Bell className="w-4 h-4" />
                    {liveClasses.length > 0 && (
                      <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full"></span>
                    )}
                  </button>
                  <div className="w-10 h-10 bg-blue-100 border border-blue-200 rounded-xl flex items-center justify-center text-blue-700 font-bold text-sm shadow-2xs shrink-0">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-1">
                    {activeTab === 'courses' && 'My Courses'}
                    {activeTab === 'notes' && 'Study Notes Library'}
                    {activeTab === 'live' && 'Live Classroom Studio'}
                    {activeTab === 'billing' && 'Practice Credits & Plans'}
                    {activeTab === 'settings' && 'Account Settings'}
                  </h1>
                  <p className="text-slate-500 text-xs sm:text-sm">
                    {activeTab === 'courses' && 'Access and resume your purchased video courses.'}
                    {activeTab === 'notes' && 'Your premium and unlocked handwritten & digital study packages.'}
                    {activeTab === 'live' && 'Attend real-time live interactive classes and replay recordings.'}
                    {activeTab === 'billing' && 'Manage your quiz practice wallet and active validity plans.'}
                    {activeTab === 'settings' && 'Update your profile, university branch, and account preferences.'}
                  </p>
                </div>
              </div>
            )}

            {/* Tab Content */}
            <div className="mt-8">
              {searchQuery.trim() !== '' ? (
                <SearchResultsView
                  searchQuery={searchQuery}
                  courses={courses}
                  notes={notes}
                  liveClasses={liveClasses}
                  myPurchases={myPurchases}
                  getSubjectName={getSubjectName}
                  getSubjectBadge={getSubjectBadge}
                  formatSubjectLabel={formatSubjectLabel}
                  navigate={navigate}
                />
              ) : (
                <>
                  {activeTab === 'overview' && (
                    <OverviewTab
                      courses={courses}
                      notes={notes}
                      liveClasses={liveClasses}
                      credits={credits}
                      isUnlimited={isUnlimited}
                      studentProgressMap={studentProgressMap}
                      getSubjectBadge={getSubjectBadge}
                      setActiveTab={setActiveTab}
                    />
                  )}

                  {activeTab === 'courses' && (
                    <CoursesTab
                      courses={courses}
                      allCoursesState={allCoursesState}
                      user={user}
                      studentCourseYears={studentCourseYears}
                      coursesByYear={coursesByYear}
                      myPurchases={myPurchases}
                      studentProgressMap={studentProgressMap}
                      getItemYear={getItemYear}
                      getSubjectBadge={getSubjectBadge}
                      getSubjectName={getSubjectName}
                      isCollegeFreeItem={isCollegeFreeItem}
                    />
                  )}

                  {activeTab === 'notes' && (
                    <NotesTab
                      notes={notes}
                      allNotesState={allNotesState}
                      user={user}
                      studentNoteYears={studentNoteYears}
                      notesByYear={notesByYear}
                      myPurchases={myPurchases}
                      getItemYear={getItemYear}
                      getSubjectBadge={getSubjectBadge}
                      getSubjectName={getSubjectName}
                      isCollegeFreeItem={isCollegeFreeItem}
                    />
                  )}

                  {activeTab === 'live' && (
                    <LiveClassesTab
                      liveClasses={liveClasses}
                      liveTabFilter={liveTabFilter}
                      setLiveTabFilter={setLiveTabFilter}
                      handleOpenRecording={handleOpenRecording}
                      formatSubjectLabel={formatSubjectLabel}
                      navigate={navigate}
                    />
                  )}

                  {activeTab === 'billing' && (
                    <BillingTab
                      credits={credits}
                      isUnlimited={isUnlimited}
                      unlimitedPlan={unlimitedPlan}
                      freeUsedCount={freeQuizUsed}
                      freeQuizLimit={freeQuizLimit}
                      setShowBuyModal={setShowBuyModal}
                    />
                  )}

                  {activeTab === 'settings' && (
                    <SettingsTab user={user} />
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </main>

      {showBuyModal && <BuyCreditsModal onClose={() => setShowBuyModal(false)} />}
      
      {/* In-App Live Class Recording Player Modal */}
      {activeRecording && (
        <RecordingPlayerModal
          activeRecording={activeRecording}
          user={user}
          playbackLoading={playbackLoading}
          playbackProcessing={playbackProcessing}
          processingMessage={processingMessage}
          playbackError={playbackError}
          playbackStreamUrl={playbackStreamUrl}
          onClose={() => setActiveRecording(null)}
          onRetry={() => handleOpenRecording(activeRecording)}
        />
      )}
    </div>
  );
};

export default StudentDashboard;
