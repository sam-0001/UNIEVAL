import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Course, Note, Quiz, Viva, UserRole, Combo, Subject } from '../types';
import {
  Loader2, CheckCircle, AlertCircle, Trash2, Video, Users, ExternalLink,
  Plus, Calendar, Clock, Copy, Check, BookOpen, Brain, Filter, Search,
  Layers, Package, CheckSquare, Square, Tag, FileText, HelpCircle,
  MessageSquareQuote, GraduationCap, BarChart3, CreditCard, RefreshCw,
  Edit3, TrendingUp, Radio
} from 'lucide-react';
import CouponManager from '../components/CouponManager';
import { TeacherLogin } from '../components/admin/TeacherLogin';
import { BEToolkitTab, ExamPrepTab } from '../components/admin/tabs';
import {
  CreateCourseModal,
  CreateNoteModal,
  CreateQuizModal,
  CreateVivaModal,
  CreateComboModal,
  LiveModal
} from '../components/admin/modals';

type DashboardTab = 'courses' | 'live' | 'notes' | 'combos' | 'quizzes' | 'viva' | 'be-toolkit' | 'exam-prep' | 'analytics' | 'payout';

const AdminDashboard: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<DashboardTab>('courses');
  const [payoutUpi, setPayoutUpi] = useState(user?.upiId || '');
  
  // Data State
  const [courses, setCourses] = useState<Course[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [viva, setViva] = useState<Viva[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);

  // Analytics state — loaded from Purchase ledger via /teachers/:id/stats
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<{
    totalProducts: number;
    totalRevenue: number;
    totalUnitsSold: number;
    products: { productId: string; title: string; type: string; unitsSold: number; grossRevenue: number }[];
  } | null>(null);

  // Payout history state
  const [payoutHistory, setPayoutHistory] = useState<{
    payouts: { id: string; amount: number; status: string; transactionId?: string; createdAt: string; completedAt?: string }[];
    stats: { totalSales: number; platformFee: number; netPayable: number; totalPaid: number; pendingPayout: number };
  } | null>(null);
  const [payoutHistoryLoading, setPayoutHistoryLoading] = useState(false);
  
  // Modal Visibility State
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showComboModal, setShowComboModal] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [showVivaModal, setShowVivaModal] = useState(false);

  // Edit State (To populate modals)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editingCombo, setEditingCombo] = useState<Combo | null>(null);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [editingViva, setEditingViva] = useState<Viva | null>(null);
  const [expandedCouponProduct, setExpandedCouponProduct] = useState<string | null>(null);

  const navigate = useNavigate();
  const [showLiveModal, setShowLiveModal] = useState(false);
  const [liveCourseId, setLiveCourseId] = useState<string | null>(null);
  const [liveTitle, setLiveTitle] = useState('');
  const [liveScheduledAt, setLiveScheduledAt] = useState('');
  const [liveClasses, setLiveClasses] = useState<any[]>([]);
  const [globalLiveClasses, setGlobalLiveClasses] = useState<any[]>([]);
  const [isScheduling, setIsScheduling] = useState(false);

  const [courseStudentsMap, setCourseStudentsMap] = useState<Record<string, Array<{ id: string; name: string; email: string; phoneNumber?: string; createdAt?: string }>>>({});
  const [expandedStudentsCourse, setExpandedStudentsCourse] = useState<string | null>(null);
  const [studentsLoadingCourse, setStudentsLoadingCourse] = useState<string | null>(null);

  const toggleCourseStudents = async (courseId: string) => {
    if (expandedStudentsCourse === courseId) {
      setExpandedStudentsCourse(null);
      return;
    }
    setExpandedStudentsCourse(courseId);
    if (!courseStudentsMap[courseId]) {
      setStudentsLoadingCourse(courseId);
      try {
        const students = await api.getCourseStudents(courseId);
        setCourseStudentsMap(prev => ({ ...prev, [courseId]: students || [] }));
      } catch (err) {
        console.error('Failed to fetch course students', err);
      } finally {
        setStudentsLoadingCourse(null);
      }
    }
  };

  const [liveClassFilter, setLiveClassFilter] = useState<'all' | 'upcoming' | 'completed'>('all');
  const [copiedClassId, setCopiedClassId] = useState<string | null>(null);

  const handleCopyClassLink = (classId: string) => {
    const url = `${window.location.origin}/live-class/${classId}`;
    navigator.clipboard.writeText(url);
    setCopiedClassId(classId);
    setTimeout(() => setCopiedClassId(null), 2500);
  };

  const fetchGlobalLiveClasses = async () => {
      try {
          const res = await fetch('/api/live-classes/teacher-schedule', {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          if (res.ok) {
              const data = await res.json();
              setGlobalLiveClasses(data.liveClasses || []);
          }
      } catch (e) { console.error(e); }
  };

  const fetchLiveClasses = async (courseId: string) => {
      try {
          const res = await fetch(`/api/live-classes/course/${courseId}`, {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          if (res.ok) {
              const data = await res.json();
              setLiveClasses((data.liveClasses || []).filter((lc: any) => lc.status !== 'completed'));
          }
      } catch (e) { console.error(e); }
  };

  const openLiveModal = (courseId: string) => {
      setLiveCourseId(courseId);
      setShowLiveModal(true);
      fetchLiveClasses(courseId);
  };

  const handleScheduleLive = async () => {
      if (!liveCourseId || !liveTitle || !liveScheduledAt || isScheduling) return;
      setIsScheduling(true);
      try {
          const startTime = new Date(liveScheduledAt);
          const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour later
          const res = await fetch('/api/live-classes/schedule', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
              body: JSON.stringify({ 
                  courseId: liveCourseId, 
                  title: liveTitle, 
                  scheduledStartTime: startTime.toISOString(),
                  scheduledEndTime: endTime.toISOString() 
              })
          });
          if (res.ok) {
              fetchLiveClasses(liveCourseId);
              setLiveTitle('');
              setLiveScheduledAt('');
          }
      } catch (e) { console.error(e); } finally {
          setIsScheduling(false);
      }
  };

  const handleDeleteLiveClass = async (classId: string) => {
      if (!confirm('Are you sure you want to delete this scheduled class?')) return;
      try {
          const res = await fetch(`/api/live-classes/${classId}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          if (res.ok) {
              if (liveCourseId) fetchLiveClasses(liveCourseId);
              fetchGlobalLiveClasses();
          }
      } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (user && user.role !== 'STUDENT') {
        const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
        api.getCourses().then(all => setCourses(isAdmin ? all : all.filter(c => c.teacherId === user.id))).catch(err => console.error('[Dashboard] getCourses error:', err));
        api.getNotes().then(all => setNotes(isAdmin ? all : all.filter(n => n.teacherId === user.id))).catch(err => console.error('[Dashboard] getNotes error:', err));
        api.getCombos().then(all => setCombos(isAdmin ? all : all.filter(c => c.teacherId === user.id))).catch(err => console.error('[Dashboard] getCombos error:', err));
        api.getQuizzes().then(all => setQuizzes(isAdmin ? all : all.filter(q => q.teacherId === user.id))).catch(err => console.error('[Dashboard] getQuizzes error:', err));
        api.getViva().then(all => setViva(isAdmin ? all : all.filter(v => v.teacherId === user.id))).catch(err => console.error('[Dashboard] getViva error:', err));
        api.getSubjects().then(setAllSubjects).catch(err => console.error('[Dashboard] getSubjects error:', err));
        fetchGlobalLiveClasses();
    }
  }, [user]);

  // Load analytics fresh every time the tab is opened
  useEffect(() => {
    if (activeTab === 'analytics' && user) {
        setAnalyticsLoading(true);
        api.getTeacherStats(user.id)
            .then(data => setAnalyticsData(data as any))
            .catch(console.error)
            .finally(() => setAnalyticsLoading(false));
    }
  }, [activeTab, user]);

  // Load payout history when payout tab is opened
  useEffect(() => {
    if (activeTab === 'payout' && user) {
        setPayoutHistoryLoading(true);
        api.getTeacherPayoutHistory(user.id)
            .then(data => setPayoutHistory(data))
            .catch(console.error)
            .finally(() => setPayoutHistoryLoading(false));
    }
  }, [activeTab, user]);

  if (!user) return <TeacherLogin />;

  if (user.role === 'STUDENT') {
      return <Navigate to="/dashboard" replace />;
  }

  const handleCreateCourse = () => { setEditingCourse(null); setShowCourseModal(true); };
  const handleEditCourse = (course: Course) => { setEditingCourse(course); setShowCourseModal(true); };
  const handleCreateNote = () => { setEditingNote(null); setShowNoteModal(true); };
  const handleEditNote = (note: Note) => { setEditingNote(note); setShowNoteModal(true); };
  const handleCreateCombo = () => { setEditingCombo(null); setShowComboModal(true); };
  const handleEditCombo = (combo: Combo) => { setEditingCombo(combo); setShowComboModal(true); };
  const handleCreateQuiz = () => { setEditingQuiz(null); setShowQuizModal(true); };
  const handleEditQuiz = (quiz: Quiz) => { setEditingQuiz(quiz); setShowQuizModal(true); };
  const handleCreateViva = () => { setEditingViva(null); setShowVivaModal(true); };
  const handleEditViva = (v: Viva) => { setEditingViva(v); setShowVivaModal(true); };

  const handleSaveCourse = async (courseData: Course) => {
      if (courseData.id) {
          const updated = await api.updateCourse(courseData);
          setCourses(courses.map(c => c.id === updated.id ? updated : c));
      } else {
          const created = await api.createCourse(courseData);
          setCourses([...courses, created]);
      }
      setShowCourseModal(false);
  };

  const handleSaveNote = async (noteData: Note) => {
      if (noteData.id) {
          const updated = await api.updateNote(noteData);
          setNotes(notes.map(n => n.id === updated.id ? updated : n));
      } else {
          const created = await api.createNote(noteData);
          setNotes([...notes, created]);
      }
      setShowNoteModal(false);
  };

  const handleSaveCombo = async (comboData: Combo) => {
      if (comboData.id) {
          const updated = await api.updateCombo(comboData);
          setCombos(combos.map(c => c.id === updated.id ? updated : c));
      } else {
          const created = await api.createCombo(comboData);
          setCombos([created, ...combos]);
      }
      setShowComboModal(false);
  };

  const handleSaveQuiz = async (quizData: Quiz) => {
      if (quizData.id) {
          const updated = await api.updateQuiz(quizData);
          setQuizzes(quizzes.map(q => q.id === updated.id ? updated : q));
      } else {
          const created = await api.createQuiz(quizData);
          setQuizzes([...quizzes, created]);
      }
      setShowQuizModal(false);
  };

  const handleSaveViva = async (vivaData: Viva) => {
      if (vivaData.id) {
          const updated = await api.updateViva(vivaData);
          setViva(viva.map(v => v.id === updated.id ? updated : v));
      } else {
          const created = await api.createViva(vivaData);
          setViva([...viva, created]);
      }
      setShowVivaModal(false);
  };

  const handleDeleteCourse = async (course: Course) => {
      if (!window.confirm(`WARNING: Are you sure you want to delete the course "${course.title}"?\n\nThis will permanently delete all associated videos and thumbnails from the database and Cloudflare R2 storage. This action CANNOT be undone and data CANNOT be restored.`)) return;
      try {
          const urlsToDelete: string[] = [];
          if (course.thumbnailUrl) urlsToDelete.push(course.thumbnailUrl);
          course.modules?.forEach(m => {
              if (m.videoUrl && m.videoUrl !== '#') urlsToDelete.push(m.videoUrl);
              if (m.videoKey) urlsToDelete.push(m.videoKey);
              m.resources?.forEach(r => { if (r.url) urlsToDelete.push(r.url); });
              m.videos?.forEach(v => {
                  if (v.videoUrl && v.videoUrl !== '#') urlsToDelete.push(v.videoUrl);
                  if (v.videoKey) urlsToDelete.push(v.videoKey);
                  if (v.videoId) urlsToDelete.push(v.videoId);
                  if ((v as any).thumbnailUrl) urlsToDelete.push((v as any).thumbnailUrl);
                  v.resources?.forEach(r => { if (r.url) urlsToDelete.push(r.url); });
              });
          });
          if (urlsToDelete.length > 0) {
              try { await api.deleteFiles(urlsToDelete); } catch (e) { console.warn('deleteFiles warning:', e); }
          }
          if (api.deleteCourse) { await api.deleteCourse(course.id); } else { await fetch(`/api/courses/${course.id}`, { method: 'DELETE' }); }
          setCourses(courses.filter(c => c.id !== course.id));
      } catch (error) { console.error('Failed to delete course:', error); alert('Failed to delete course'); }
  };

  const handleDeleteNote = async (note: Note) => {
      if (!window.confirm(`WARNING: Are you sure you want to delete the note package "${note.title}"?\n\nThis will permanently delete all associated PDF files from the database and Cloudflare R2 storage. This action CANNOT be undone and data CANNOT be restored.`)) return;
      try {
          const urlsToDelete: string[] = [];
          if (note.thumbnailUrl) urlsToDelete.push(note.thumbnailUrl);
          note.sections?.forEach(s => { s.files?.forEach(f => { if (f.url && f.url !== '#') urlsToDelete.push(f.url); }); });
          if (urlsToDelete.length > 0) {
              try { await api.deleteFiles(urlsToDelete); } catch (e) { console.warn('deleteFiles warning:', e); }
          }
          if (api.deleteNote) { await api.deleteNote(note.id); } else { await fetch(`/api/notes/${note.id}`, { method: 'DELETE' }); }
          setNotes(notes.filter(n => n.id !== note.id));
      } catch (error) { console.error('Failed to delete note:', error); alert('Failed to delete note'); }
  };

  const handleDeleteCombo = async (combo: Combo) => {
      if (!window.confirm(`Are you sure you want to delete the combo "${combo.title}"?\n\nThis will remove the combo offer. Existing students who already unlocked the combo will keep their active access.`)) return;
      try {
          if (combo.thumbnailUrl) {
              try { await api.deleteFiles([combo.thumbnailUrl]); } catch (e) { console.warn('deleteFiles warning:', e); }
          }
          await api.deleteCombo(combo.id);
          setCombos(combos.filter(c => c.id !== combo.id));
      } catch (error) { console.error('Failed to delete combo:', error); alert('Failed to delete combo'); }
  };

  const handleDeleteQuiz = async (quiz: Quiz) => {
      if (!window.confirm(`WARNING: Are you sure you want to delete the quiz "${quiz.title}"?\n\nThis will permanently delete the quiz and all student progress data. This action CANNOT be undone and data CANNOT be restored.`)) return;
      try {
          if (api.deleteQuiz) { await api.deleteQuiz(quiz.id); } else { await fetch(`/api/quizzes/${quiz.id}`, { method: 'DELETE' }); }
          setQuizzes(quizzes.filter(q => q.id !== quiz.id));
      } catch (error) { console.error('Failed to delete quiz:', error); alert('Failed to delete quiz'); }
  };

  const handleDeleteViva = async (vivaItem: Viva) => {
      if (!window.confirm(`WARNING: Are you sure you want to delete the viva set "${vivaItem.title}"?\n\nThis will permanently delete this viva and all associated data. This action CANNOT be undone and data CANNOT be restored.`)) return;
      try {
          if (api.deleteViva) { await api.deleteViva(vivaItem.id); } else { await fetch(`/api/viva/${vivaItem.id}`, { method: 'DELETE' }); }
          setViva(viva.filter(v => v.id !== vivaItem.id));
      } catch (error) { console.error('Failed to delete viva:', error); alert('Failed to delete viva'); }
  };

  const renderAnalytics = () => (
      <div className="space-y-6 animate-in fade-in duration-300">
          {analyticsLoading ? (
              <div className="flex items-center justify-center py-20 text-slate-400 text-sm gap-2">
                  <span className="w-5 h-5 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
                  Loading analytics...
              </div>
          ) : (
          <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Products</p>
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <BookOpen className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">{analyticsData?.totalProducts ?? (courses.length + notes.length + quizzes.length + viva.length)}</p>
                  <p className="text-xs text-slate-400 mt-1">Across all published media</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Units Sold</p>
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">{analyticsData?.totalUnitsSold ?? 0}</p>
                  <p className="text-xs text-slate-400 mt-1">Student purchases & enrollments</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Gross Revenue</p>
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <CreditCard className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-blue-600 mt-2">₹{(analyticsData?.totalRevenue ?? 0).toLocaleString()}</p>
                  <p className="text-xs text-slate-400 mt-1">Before platform deductions</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Est. Net Earning (90%)</p>
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 mt-2">₹{((analyticsData?.totalRevenue ?? 0) * 0.9).toLocaleString()}</p>
                  <p className="text-xs text-slate-400 mt-1">Educator net entitlement</p>
              </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Product Performance Breakdown</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Real-time revenue and enrollment distribution</p>
                  </div>
                  <button onClick={() => {
                      setAnalyticsLoading(true);
                      api.getTeacherStats(user!.id)
                          .then(data => setAnalyticsData(data as any))
                          .catch(console.error)
                          .finally(() => setAnalyticsLoading(false));
                  }} className="text-blue-600 hover:text-blue-700 text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
                      <RefreshCw className="w-3.5 h-3.5" /> Refresh Stats
                  </button>
              </div>
              <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50/70 text-slate-500 font-semibold border-b border-slate-100 text-xs uppercase tracking-wider">
                      <tr>
                          <th className="px-6 py-3.5">Product Name</th>
                          <th className="px-6 py-3.5">Type</th>
                          <th className="px-6 py-3.5 text-right">Units Sold</th>
                          <th className="px-6 py-3.5 text-right">Gross Revenue</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {(!analyticsData?.products || analyticsData.products.length === 0) ? (
                          <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">No sales recorded yet.</td></tr>
                      ) : analyticsData.products.map(p => (
                          <tr key={p.productId} className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-6 py-4 font-semibold text-slate-900">{p.title}</td>
                              <td className="px-6 py-4">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                      p.type === 'COURSE' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                      p.type === 'QUIZ'   ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                      p.type === 'VIVA'   ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                      'bg-purple-50 text-purple-700 border border-purple-100'
                                  }`}>{p.type}</span>
                              </td>
                              <td className="px-6 py-4 text-right font-medium text-slate-700">{p.unitsSold}</td>
                              <td className="px-6 py-4 text-right font-bold text-slate-900">₹{p.grossRevenue.toLocaleString()}</td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
          </>
          )}
      </div>
  );

  const renderLiveClassesTab = () => {
    const upcoming = globalLiveClasses.filter(c => c.status !== 'completed');
    const completed = globalLiveClasses.filter(c => c.status === 'completed');
    const displayed = liveClassFilter === 'upcoming' 
      ? upcoming 
      : liveClassFilter === 'completed' 
        ? completed 
        : globalLiveClasses;

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Radio className="w-5 h-5 text-blue-600" />
              Live Classrooms ({globalLiveClasses.length})
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Host interactive live webinars, share your screen, and automatically record sessions for your enrolled students.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (courses.length > 0) {
                  openLiveModal(courses[0].id);
                } else {
                  alert('Please create a course first before scheduling a live class.');
                }
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Schedule Live Class
            </button>
            <button
              onClick={() => navigate('/teacher/live-classes')}
              className="bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl transition border border-slate-200/80 shadow-2xs flex items-center gap-1.5"
            >
              <ExternalLink className="w-4 h-4 text-slate-400" /> Full Studio Manager
            </button>
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 border-b border-slate-200/80 pb-3">
          {[
            { id: 'all', label: `All Classes (${globalLiveClasses.length})` },
            { id: 'upcoming', label: `Upcoming & Active (${upcoming.length})` },
            { id: 'completed', label: `Completed / Recordings (${completed.length})` }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setLiveClassFilter(f.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                liveClassFilter === f.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Classes grid */}
        {displayed.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Radio className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-base mb-1">No live classes in this view</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              Schedule a new session for your course to stream live with WebRTC audio, video, and screen sharing.
            </p>
            <button
              onClick={() => {
                if (courses.length > 0) openLiveModal(courses[0].id);
                else alert('Please create a course first.');
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-xs"
            >
              + Schedule First Class
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayed.map(lc => {
              const course = courses.find(c => c.id === lc.courseId);
              const isLive = lc.status === 'live';
              const isCompleted = lc.status === 'completed';

              return (
                <div key={lc.id} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs hover:shadow-xs transition flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-blue-600 truncate max-w-[180px]">
                        {course?.title || 'Course'}
                      </span>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        isLive 
                          ? 'bg-red-50 text-red-700 border border-red-200 animate-pulse' 
                          : isCompleted 
                            ? 'bg-slate-100 text-slate-600' 
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {isLive ? '● Live Now' : isCompleted ? 'Completed' : 'Scheduled'}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-base mb-1 line-clamp-2">{lc.title}</h3>
                    <div className="text-xs text-slate-500 space-y-1.5 mt-3">
                      <p className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(lc.scheduledStartTime).toLocaleDateString('en-IN', {
                          weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
                        })}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(lc.scheduledStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/live-class/${lc.id}`)}
                      className={`flex-1 text-xs font-semibold py-2 px-3 rounded-xl transition text-center ${
                        isCompleted 
                          ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          : 'bg-blue-600 text-white hover:bg-blue-700 shadow-xs'
                      }`}
                    >
                      {isCompleted ? 'View Recording' : isLive ? 'Join Live Room' : 'Start Studio'}
                    </button>
                    <button
                      onClick={() => handleCopyClassLink(lc.id)}
                      className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 text-xs transition"
                      title="Copy Student Invite Link"
                    >
                      {copiedClassId === lc.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                    {!isCompleted && (
                      <button
                        onClick={() => handleDeleteLiveClass(lc.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-200 rounded-xl transition text-xs"
                        title="Cancel Class"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderCoursesList = () => (
      <div className="space-y-6 animate-in fade-in duration-300">
          {/* Dashboard Global Live Classes */}
          {globalLiveClasses.length > 0 && (
              <div className="mb-8">
                  <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                      My Upcoming Live Classes
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {globalLiveClasses.map(lc => {
                          const course = courses.find(c => c.id === lc.courseId);
                          return (
                              <div key={lc.id} className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex flex-col gap-3">
                                  <div>
                                      <div className="text-xs font-semibold text-blue-600 mb-1">{course?.title || 'Course'}</div>
                                      <h3 className="font-bold text-slate-900">{lc.title}</h3>
                                      <p className="text-xs text-slate-500 mt-1">{new Date(lc.scheduledStartTime).toLocaleString()}</p>
                                  </div>
                                  <div className="flex items-center gap-2 mt-auto pt-2 border-t border-slate-100">
                                      <button onClick={() => navigate(`/live-class/${lc.id}`)} className="flex-1 bg-blue-600 text-white text-xs font-semibold px-3 py-2 rounded-xl hover:bg-blue-700 transition text-center shadow-xs">
                                          Start Class
                                      </button>
                                      <button onClick={() => handleDeleteLiveClass(lc.id)} className="bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-200 text-xs font-bold p-2 rounded-xl transition flex items-center justify-center" title="Cancel Class">
                                          <Trash2 className="w-4 h-4" />
                                      </button>
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              </div>
          )}

          <div className="flex justify-between items-center">
              <div>
                  <h2 className="text-xl font-bold text-slate-900">Published Courses ({courses.length})</h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Manage syllabus structure, video modules, and access pricing</p>
              </div>
              <button onClick={handleCreateCourse} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-xs">
                  <Plus className="w-4 h-4" /> Create Course
              </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map(course => (
                  <div key={course.id} className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs hover:shadow-xs transition-all group flex flex-col">
                      <div className="aspect-video bg-slate-950 relative overflow-hidden flex items-center justify-center cursor-pointer">
                          <img 
                              src={course.thumbnailUrl} 
                              alt={course.title} 
                              className="w-full h-full object-contain transform group-hover:scale-105 transition-transform duration-500" 
                              onError={(e) => { e.currentTarget.src = 'https://picsum.photos/800/600?random=' + course.id; }}
                          />
                          <span className="absolute top-2.5 right-2.5 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md border border-white/10 uppercase tracking-wider">Engineering</span>
                      </div>
                      <div className="p-5 flex-1 flex flex-col">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h3 className="font-bold text-slate-900 text-base line-clamp-2">{course.title}</h3>
                              {course.collegeConfig?.name && course.collegeConfig?.emailDomain && (
                                  <span className="bg-purple-50 text-purple-700 border border-purple-100 text-[10px] font-bold px-2 py-0.5 rounded-md">Free for {course.collegeConfig.name}</span>
                              )}
                          </div>
                          <div className="flex justify-between items-center mt-auto pt-4 border-t border-slate-100">
                              <div>
                                {course.originalPrice && course.originalPrice > (course.price || 0) ? (
                                    <div className="flex flex-col">
                                        <span className="text-[11px] text-slate-400 line-through">₹{course.originalPrice.toFixed(2)}</span>
                                        <span className="font-extrabold text-slate-900 text-base">₹{course.price?.toFixed(2) || '0.00'}</span>
                                    </div>
                                ) : (
                                    <span className="font-extrabold text-slate-900 text-base">₹{course.price?.toFixed(2) || '0.00'}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                  <button onClick={() => toggleCourseStudents(course.id)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors">
                                      <Users className="w-3.5 h-3.5" /> Students
                                  </button>
                                  <button onClick={() => navigate(`/teacher/live-classes/${course.id}`)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
                                      <Radio className="w-3.5 h-3.5" /> Live
                                  </button>
                                  <button onClick={() => setExpandedCouponProduct(prev => prev === course.id ? null : course.id)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
                                      <Tag className="w-3.5 h-3.5" /> Coupons
                                  </button>
                                  <button onClick={() => handleEditCourse(course)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors">
                                      <Edit3 className="w-3.5 h-3.5" /> Edit
                                  </button>
                                  <button onClick={() => handleDeleteCourse(course)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete Course">
                                      <Trash2 className="w-4 h-4" />
                                  </button>
                              </div>
                          </div>
                          {expandedCouponProduct === course.id && (
                              <div className="mt-4 pt-4 border-t border-slate-100">
                                  <CouponManager productId={course.id} productType="course" />
                              </div>
                          )}
                          {expandedStudentsCourse === course.id && (
                              <div className="mt-4 pt-4 border-t border-slate-100 animate-in fade-in duration-200">
                                  <div className="flex items-center justify-between mb-3">
                                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                          <Users className="w-4 h-4 text-emerald-600" />
                                          Enrolled Students ({courseStudentsMap[course.id]?.length ?? (studentsLoadingCourse === course.id ? '...' : 0)})
                                      </h4>
                                      <button
                                          onClick={() => {
                                              setStudentsLoadingCourse(course.id);
                                              api.getCourseStudents(course.id)
                                                  .then(students => setCourseStudentsMap(prev => ({ ...prev, [course.id]: students || [] })))
                                                  .catch(console.error)
                                                  .finally(() => setStudentsLoadingCourse(null));
                                          }}
                                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition"
                                      >
                                          ↻ Refresh
                                      </button>
                                  </div>

                                  {studentsLoadingCourse === course.id ? (
                                      <div className="flex items-center justify-center py-6 text-slate-400 text-xs gap-2">
                                          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                                          Loading enrolled students...
                                      </div>
                                  ) : !courseStudentsMap[course.id] || courseStudentsMap[course.id].length === 0 ? (
                                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center text-xs text-slate-500">
                                          <p className="font-semibold text-slate-700">No students enrolled yet</p>
                                          <p className="mt-0.5 text-slate-400">When students purchase or enroll in this course, their name, email, and phone will appear here.</p>
                                      </div>
                                  ) : (
                                      <div className="overflow-x-auto rounded-xl border border-slate-200/80 max-h-60 overflow-y-auto">
                                          <table className="w-full text-xs text-left">
                                              <thead className="bg-slate-50 text-slate-500 font-semibold sticky top-0 border-b border-slate-100">
                                                  <tr>
                                                      <th className="px-3 py-2">Student</th>
                                                      <th className="px-3 py-2">Email</th>
                                                      <th className="px-3 py-2">Phone</th>
                                                      <th className="px-3 py-2">Enrolled</th>
                                                  </tr>
                                              </thead>
                                              <tbody className="divide-y divide-slate-100 bg-white">
                                                  {courseStudentsMap[course.id].map(s => (
                                                      <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                                                          <td className="px-3 py-2 font-medium text-slate-900">{s.name}</td>
                                                          <td className="px-3 py-2 text-slate-600 font-mono text-[11px]">{s.email}</td>
                                                          <td className="px-3 py-2 text-slate-600">{s.phoneNumber || '—'}</td>
                                                          <td className="px-3 py-2 text-slate-400">
                                                              {s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                                          </td>
                                                      </tr>
                                                  ))}
                                              </tbody>
                                          </table>
                                      </div>
                                  )}
                              </div>
                          )}
                      </div>
                  </div>
              ))}
          </div>
      </div>
  );

  const renderNotesList = () => (
      <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex justify-between items-center">
              <div>
                  <h2 className="text-xl font-bold text-slate-900">Published Exam Notes ({notes.length})</h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Manage unit-wise PDF notes, previews, and academic validity</p>
              </div>
              <button onClick={handleCreateNote} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-xs">
                  <Plus className="w-4 h-4" /> Create Note Package
              </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {notes.map(note => {
                  const fileCount = (note.sections || []).reduce((acc, s) => acc + (s.files?.length || 0), 0);
                  return (
                      <div key={note.id} className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs hover:shadow-xs transition-all group flex flex-col">
                          {/* 16:9 Thumbnail or UniEval Branded Card */}
                          <div className="aspect-video bg-slate-950 relative overflow-hidden flex items-center justify-center">
                              {note.thumbnailUrl ? (
                                  <img 
                                      src={note.thumbnailUrl} 
                                      alt={note.title} 
                                      className="w-full h-full object-contain transform group-hover:scale-105 transition-transform duration-500" 
                                  />
                              ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-5 flex flex-col justify-between">
                                      <div className="flex items-center justify-between">
                                          <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                                              SPPU Study Notes
                                          </span>
                                          <FileText className="w-5 h-5 text-blue-400/80" />
                                      </div>
                                      <div>
                                          <p className="text-white font-bold text-sm sm:text-base line-clamp-2">{note.title}</p>
                                          <p className="text-blue-300/80 text-xs mt-1">{fileCount} Document{fileCount === 1 ? '' : 's'} included</p>
                                      </div>
                                  </div>
                              )}
                              <span className="absolute top-2.5 right-2.5 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-md border border-white/10 uppercase tracking-wider">
                                  {fileCount} {fileCount === 1 ? 'PDF' : 'PDFs'}
                              </span>
                          </div>

                          <div className="p-5 flex-1 flex flex-col">
                              <div className="flex items-center gap-2 flex-wrap mb-2">
                                  <h3 className="font-bold text-slate-900 text-base line-clamp-2">{note.title}</h3>
                                  {note.collegeConfig?.name && note.collegeConfig?.emailDomain && (
                                      <span className="bg-purple-50 text-purple-700 border border-purple-100 text-[10px] font-bold px-2 py-0.5 rounded-md">Free for {note.collegeConfig.name}</span>
                                  )}
                              </div>

                              <div className="flex justify-between items-center mt-auto pt-4 border-t border-slate-100">
                                  <div>
                                    {note.originalPrice && note.originalPrice > (note.price || 0) ? (
                                        <div className="flex flex-col">
                                            <span className="text-[11px] text-slate-400 line-through">₹{note.originalPrice.toFixed(2)}</span>
                                            <span className="font-extrabold text-slate-900 text-base">₹{note.price?.toFixed(2)}</span>
                                        </div>
                                    ) : (
                                        <span className="font-extrabold text-slate-900 text-base">{note.price === 0 ? 'FREE' : `₹${note.price?.toFixed(2)}`}</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                      <button onClick={() => setExpandedCouponProduct(prev => prev === note.id ? null : note.id)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
                                          <Tag className="w-3.5 h-3.5" /> Coupons
                                      </button>
                                      <button onClick={() => handleEditNote(note)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors">
                                          <Edit3 className="w-3.5 h-3.5" /> Edit
                                      </button>
                                      <button onClick={() => handleDeleteNote(note)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete Note">
                                          <Trash2 className="w-4 h-4" />
                                      </button>
                                  </div>
                              </div>
                              {expandedCouponProduct === note.id && (
                                  <div className="mt-4 pt-4 border-t border-slate-100">
                                      <CouponManager productId={note.id} productType="note" />
                                  </div>
                              )}
                          </div>
                      </div>
                  );
              })}
          </div>
      </div>
  );

  const renderCombosList = () => (
      <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <Layers className="w-5 h-5 text-blue-600" />
                      Subject Combos ({combos.length})
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                      Multi-subject packages that grant instant access to all included courses and notes upon purchase.
                  </p>
              </div>
              <button onClick={handleCreateCombo} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition shadow-xs flex items-center gap-2 shrink-0">
                  <Plus className="w-4 h-4" /> Create Subject Combo
              </button>
          </div>

          <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-slate-800">
              <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/10">
                      <Package className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                      <h4 className="font-bold text-sm text-white">How Subject Combos Work</h4>
                      <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                          Select the subjects you want to package. Set your combo price. When a student purchases this combo, all courses and notes belonging to those subjects are automatically unlocked in their library!
                      </p>
                  </div>
              </div>
          </div>

          {combos.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center max-w-xl mx-auto shadow-2xs">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                      <Layers className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">No Subject Combos Created Yet</h3>
                  <p className="text-xs sm:text-sm text-slate-500 mb-5 max-w-md mx-auto">
                      Bundle several subjects together at an attractive price. It's the best way to offer complete semester preparation to students.
                  </p>
                  <button onClick={handleCreateCombo} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition shadow-xs inline-flex items-center gap-2">
                      <Plus className="w-4 h-4" /> Create Your First Combo
                  </button>
              </div>
          ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {combos.map(combo => {
                      const subjectNames = (combo.subjectNames && combo.subjectNames.length > 0)
                          ? combo.subjectNames
                          : (combo.subjectIds || []).map(id => allSubjects.find(s => s.id === id)?.name || id);

                      const comboCourses = courses.filter(c => combo.subjectIds?.includes(c.subjectId));
                      const comboNotes = notes.filter(n => combo.subjectIds?.includes(n.subjectId));

                      const coursesCount = combo.coursesCount ?? (combo.comboType === 'notes' ? 0 : comboCourses.length);
                      const notesCount = combo.notesCount ?? (combo.comboType === 'courses' ? 0 : comboNotes.length);

                      const discountPercent = combo.originalPrice && combo.originalPrice > combo.price
                          ? Math.round(((combo.originalPrice - combo.price) / combo.originalPrice) * 100)
                          : null;

                      return (
                          <div key={combo.id} className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs hover:shadow-xs transition-all flex flex-col group relative">
                              {/* Thumbnail preview */}
                              <div className="aspect-video bg-slate-950 relative overflow-hidden flex items-center justify-center">
                                  {combo.thumbnailUrl ? (
                                      <img
                                          src={combo.thumbnailUrl}
                                          alt={combo.title}
                                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                                      />
                                  ) : (
                                      <div className="w-full h-full bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 flex flex-col justify-between">
                                          <div className="flex justify-between items-start">
                                              <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                                                  Subject Combo
                                              </span>
                                              <Layers className="w-6 h-6 text-blue-400/80" />
                                          </div>
                                          <div>
                                              <p className="text-white font-extrabold text-base sm:text-lg line-clamp-2">{combo.title}</p>
                                              <p className="text-blue-300/80 text-xs mt-1">{combo.subjectIds?.length || 0} Subjects Included</p>
                                          </div>
                                      </div>
                                  )}

                                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                                      {discountPercent && (
                                          <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                                              {discountPercent}% OFF
                                          </span>
                                      )}
                                      <span className="bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase border border-white/10">
                                          {combo.comboType === 'notes' ? 'Notes Only' : combo.comboType === 'courses' ? 'Courses Only' : 'All Materials'}
                                      </span>
                                  </div>
                              </div>

                              <div className="p-5 flex-1 flex flex-col">
                                  <div className="flex items-center gap-2 flex-wrap mb-2">
                                      <h3 className="font-bold text-slate-900 text-base line-clamp-1">{combo.title}</h3>
                                  </div>

                                  {combo.description && (
                                      <p className="text-xs text-slate-500 line-clamp-2 mb-3">{combo.description}</p>
                                  )}

                                  {/* Included Subjects Tags */}
                                  <div className="mb-4">
                                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                                          Includes {combo.subjectIds?.length || 0} Subjects:
                                      </p>
                                      <div className="flex flex-wrap gap-1.5 max-h-16 overflow-hidden">
                                          {subjectNames.slice(0, 3).map((name, idx) => (
                                              <span key={idx} className="bg-blue-50 text-blue-700 text-[11px] font-semibold px-2 py-0.5 rounded-md border border-blue-100/60 truncate max-w-[150px]">
                                                  {name}
                                              </span>
                                          ))}
                                          {subjectNames.length > 3 && (
                                              <span className="bg-slate-100 text-slate-600 text-[11px] font-semibold px-1.5 py-0.5 rounded-md">
                                                  +{subjectNames.length - 3} more
                                              </span>
                                          )}
                                      </div>
                                  </div>

                                  {/* Unlocked materials summary */}
                                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 mb-4 text-xs text-slate-600 flex items-center justify-around font-medium">
                                      <span className="flex items-center gap-1.5 text-blue-700 font-bold">
                                          <BookOpen className="w-3.5 h-3.5" />
                                          {coursesCount} Course{coursesCount === 1 ? '' : 's'}
                                      </span>
                                      <span className="text-slate-300">|</span>
                                      <span className="flex items-center gap-1.5 text-purple-700 font-bold">
                                          <Package className="w-3.5 h-3.5" />
                                          {notesCount} Note Pkg{notesCount === 1 ? '' : 's'}
                                      </span>
                                  </div>

                                  {/* College Free Badge */}
                                  {combo.collegeConfig?.name && (
                                      <div className="mb-3">
                                          <span className="bg-purple-50 text-purple-700 border border-purple-100 text-[10px] font-bold px-2 py-0.5 rounded-md">
                                              Free for {combo.collegeConfig.name} ({combo.collegeConfig.emailDomain})
                                          </span>
                                      </div>
                                  )}

                                  <div className="mt-auto pt-3 border-t border-slate-100 flex justify-between items-center">
                                      <div>
                                          {combo.originalPrice && combo.originalPrice > combo.price ? (
                                              <div className="flex flex-col">
                                                  <span className="text-[11px] text-slate-400 line-through">₹{combo.originalPrice.toFixed(2)}</span>
                                                  <span className="font-extrabold text-slate-900 text-base">₹{combo.price.toFixed(2)}</span>
                                              </div>
                                          ) : (
                                              <span className="font-extrabold text-slate-900 text-base">
                                                  {combo.price === 0 ? 'FREE' : `₹${combo.price.toFixed(2)}`}
                                              </span>
                                          )}
                                      </div>

                                      <div className="flex items-center gap-2">
                                          <button
                                              onClick={() => handleEditCombo(combo)}
                                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                                          >
                                              <Edit3 className="w-3.5 h-3.5" /> Edit
                                          </button>
                                          <button
                                              onClick={() => handleDeleteCombo(combo)}
                                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                              title="Delete Combo"
                                          >
                                              <Trash2 className="w-4 h-4" />
                                          </button>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      );
                  })}
              </div>
          )}
      </div>
  );

  const renderQuizzesList = () => (
      <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex justify-between items-center">
              <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <HelpCircle className="w-5 h-5 text-blue-600" />
                      My Quizzes ({quizzes.length})
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">MCQ self-assessment sets with instant score analytics</p>
              </div>
              <button onClick={handleCreateQuiz} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition shadow-xs flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Create Quiz
              </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {quizzes.map(quiz => (
                  <div key={quiz.id} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
                      <div>
                          <div className="flex items-center justify-between mb-3">
                              <span className="bg-blue-50 text-blue-700 border border-blue-100 text-[11px] font-semibold px-2.5 py-0.5 rounded-md flex items-center gap-1.5">
                                  <HelpCircle className="w-3.5 h-3.5" /> {quiz.questionCount} Questions
                              </span>
                              <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" /> {quiz.durationMinutes} Mins
                              </span>
                          </div>
                          <h3 className="font-bold text-slate-900 text-base mb-2 line-clamp-2">{quiz.title}</h3>
                      </div>
                      <div className="flex justify-between items-center mt-5 pt-3 border-t border-slate-100">
                          <div>
                            {quiz.originalPrice && quiz.originalPrice > (quiz.price || 0) ? (
                                <div className="flex flex-col">
                                    <span className="text-[11px] text-slate-400 line-through">₹{quiz.originalPrice.toFixed(2)}</span>
                                    <span className="font-extrabold text-slate-900 text-base">{quiz.price ? `₹${quiz.price}` : 'Free'}</span>
                                </div>
                            ) : (
                                <span className="font-extrabold text-slate-900 text-base">{quiz.price ? `₹${quiz.price}` : 'Free'}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                              <button onClick={() => handleEditQuiz(quiz)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors">
                                  <Edit3 className="w-3.5 h-3.5" /> Edit
                              </button>
                              <button onClick={() => handleDeleteQuiz(quiz)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete Quiz">
                                  <Trash2 className="w-4 h-4" />
                              </button>
                          </div>
                      </div>
                  </div>
              ))}
          </div>
      </div>
  );

  const renderVivaList = () => (
      <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex justify-between items-center">
              <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <MessageSquareQuote className="w-5 h-5 text-blue-600" />
                      Viva Preparations ({viva.length})
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Oral exam Q&A sets, lab viva guides, and examiner tips</p>
              </div>
              <button onClick={handleCreateViva} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition shadow-xs flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Create Viva Set
              </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {viva.map(v => (
                  <div key={v.id} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
                      <div>
                          <div className="flex items-center justify-between mb-3">
                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[11px] font-semibold px-2.5 py-0.5 rounded-md flex items-center gap-1.5">
                                  <MessageSquareQuote className="w-3.5 h-3.5" /> Viva QA Set
                              </span>
                          </div>
                          <h3 className="font-bold text-slate-900 text-base mb-1 line-clamp-2">{v.title}</h3>
                          <p className="text-xs text-slate-500 line-clamp-2 mt-1">{v.description}</p>
                      </div>
                      <div className="flex justify-between items-center mt-5 pt-3 border-t border-slate-100">
                          <div>
                            {v.originalPrice && v.originalPrice > (v.price || 0) ? (
                                <div className="flex flex-col">
                                    <span className="text-[11px] text-slate-400 line-through">₹{v.originalPrice.toFixed(2)}</span>
                                    <span className="font-extrabold text-slate-900 text-base">{v.price ? `₹${v.price}` : 'Free'}</span>
                                </div>
                            ) : (
                                <span className="font-extrabold text-slate-900 text-base">{v.price ? `₹${v.price}` : 'Free'}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                              <button onClick={() => handleEditViva(v)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors">
                                  <Edit3 className="w-3.5 h-3.5" /> Edit
                              </button>
                              <button onClick={() => handleDeleteViva(v)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete Viva">
                                  <Trash2 className="w-4 h-4" />
                              </button>
                          </div>
                      </div>
                  </div>
              ))}
          </div>
      </div>
  );

  const handleSavePayout = async () => {
      if (user && payoutUpi) {
          try {
              const updatedUser = { ...user, upiId: payoutUpi };
              await api.updateUser(updatedUser);
              updateUser(updatedUser);
              alert("Payout details saved successfully!");
          } catch (error) { console.error("Failed to save payout details", error); alert("Failed to save details."); }
      }
  };

  const renderPayout = () => (
      <div className="space-y-6 animate-in fade-in duration-300">

          {/* UPI Settings */}
          <div className="max-w-md bg-white p-6 rounded-2xl shadow-2xs border border-slate-200/80">
              <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-lg">₹</div>
                  <div>
                      <h2 className="text-base font-bold text-slate-900">Payout Destination (UPI)</h2>
                      <p className="text-xs text-slate-500">Your direct royalty remittance VPA</p>
                  </div>
              </div>
              <div className="space-y-4">
                  <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Your UPI ID (VPA)</label>
                      <input type="text" placeholder="username@bank" value={payoutUpi} onChange={(e) => setPayoutUpi(e.target.value)} className="w-full border border-slate-200/80 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm text-slate-800" />
                  </div>
                  <button onClick={handleSavePayout} className="w-full bg-slate-900 text-white font-semibold py-2.5 rounded-xl hover:bg-slate-800 transition shadow-xs text-sm">Save Payout Details</button>
                  <div className="bg-blue-50/70 border border-blue-100/80 p-3.5 rounded-xl text-xs text-blue-900 leading-relaxed">
                      <strong>Direct UPI Settlements:</strong> Platform payouts are batched and remitted to your registered UPI handle every billing cycle with zero remittance charges.
                  </div>
              </div>
          </div>

          {/* Earnings Summary */}
          {payoutHistoryLoading ? (
              <div className="flex items-center justify-center py-10 text-slate-400 text-sm gap-2">
                  <span className="w-5 h-5 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
                  Loading payout history...
              </div>
          ) : payoutHistory && (
          <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                  { label: 'Total Earned',     value: `₹${payoutHistory.stats.totalSales.toLocaleString()}`,      color: 'text-slate-900' },
                  { label: 'Platform Fee (10%)', value: `-₹${payoutHistory.stats.platformFee.toLocaleString()}`,   color: 'text-red-500' },
                  { label: 'Total Paid Out',   value: `₹${payoutHistory.stats.totalPaid.toLocaleString()}`,       color: 'text-emerald-600' },
                  { label: 'Pending Payout',   value: `₹${payoutHistory.stats.pendingPayout.toLocaleString()}`,   color: 'text-amber-600' },
              ].map(s => (
                  <div key={s.label} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{s.label}</p>
                      <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
                  </div>
              ))}
          </div>

          {/* Payment History */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                      <h3 className="font-bold text-slate-900 text-base">Payment History</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Record of UPI remittances and settlement transactions</p>
                  </div>
                  <button onClick={() => {
                      setPayoutHistoryLoading(true);
                      api.getTeacherPayoutHistory(user!.id)
                          .then(d => setPayoutHistory(d))
                          .catch(console.error)
                          .finally(() => setPayoutHistoryLoading(false));
                  }} className="text-blue-600 hover:text-blue-700 text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
                      <RefreshCw className="w-3.5 h-3.5" /> Refresh
                  </button>
              </div>
              {payoutHistory.payouts.length === 0 ? (
                  <div className="px-6 py-12 text-center text-slate-400 italic text-sm">No payments recorded yet.</div>
              ) : (
                  <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50/70 text-slate-500 font-semibold border-b border-slate-100 text-xs uppercase tracking-wider">
                          <tr>
                              <th className="px-6 py-3.5">Date</th>
                              <th className="px-6 py-3.5 text-right">Amount</th>
                              <th className="px-6 py-3.5 text-center">Status</th>
                              <th className="px-6 py-3.5">UPI Transaction ID</th>
                              <th className="px-6 py-3.5">Paid On</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {payoutHistory.payouts.map(p => (
                              <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="px-6 py-4 text-slate-500 text-xs">
                                      {new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </td>
                                  <td className="px-6 py-4 text-right font-extrabold text-slate-900">₹{p.amount.toLocaleString()}</td>
                                  <td className="px-6 py-4 text-center">
                                      <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                                          p.status === 'COMPLETED'
                                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                              : 'bg-amber-50 text-amber-700 border border-amber-100'
                                      }`}>
                                          {p.status === 'COMPLETED' ? '✓ Paid' : '⏳ Pending'}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4 font-mono text-xs text-slate-600">
                                      {p.transactionId || <span className="text-slate-300 italic">—</span>}
                                  </td>
                                  <td className="px-6 py-4 text-slate-500 text-xs">
                                      {p.completedAt
                                          ? new Date(p.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                          : <span className="text-slate-300">—</span>}
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              )}
          </div>
          </>
          )}
      </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/60 pb-20">
      <div className="bg-white border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                      <div className="flex items-center gap-2 mb-1">
                          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Publisher & Educator Studio</h1>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                              Faculty Portal
                          </span>
                      </div>
                      <p className="text-slate-500 text-xs sm:text-sm">Manage curriculum courses, live classes, study notes, question banks, and payouts</p>
                  </div>
                  <div className="flex flex-wrap sm:flex-nowrap gap-2 sm:gap-3 w-full sm:w-auto">
                      <button 
                          onClick={() => navigate('/teacher/live-classes')}
                          className="flex-1 sm:flex-none text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] px-4 py-2.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2"
                      >
                          <Radio className="w-4 h-4 text-white animate-pulse" /> Live Studio
                      </button>
                      <button onClick={async () => {
                          if (!window.confirm("Clear the live server cache? Use this if you just uploaded a video locally and want the live site to see it instantly.")) return;
                          try {
                              await fetch('/api/admin/clear-cache', { method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }});
                              alert('Server cache cleared successfully!');
                              window.location.reload();
                          } catch(e) { alert('Failed to clear cache'); }
                      }} className="flex-1 sm:flex-none text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 px-4 py-2.5 rounded-xl transition-all border border-slate-200/80 shadow-2xs flex items-center justify-center gap-2">
                          <RefreshCw className="w-3.5 h-3.5 text-slate-500" /> Sync Cache
                      </button>
                  </div>
              </div>
              <div className="mt-6 sm:mt-8 flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 py-1">
                  {[
                      { id: 'courses', label: 'Courses', icon: BookOpen, count: courses.length },
                      { id: 'live', label: 'Live Classes', icon: Radio, count: globalLiveClasses.length },
                      { id: 'notes', label: 'Notes', icon: FileText, count: notes.length },
                      { id: 'combos', label: 'Subject Combos', icon: Layers, count: combos.length },
                      { id: 'quizzes', label: 'Quizzes', icon: HelpCircle, count: quizzes.length },
                      { id: 'viva', label: 'Viva Sets', icon: MessageSquareQuote, count: viva.length },
                      { id: 'be-toolkit', label: 'BE Toolkit', icon: GraduationCap },
                      { id: 'exam-prep', label: 'Exam Intelligence', icon: Brain },
                      { id: 'analytics', label: 'Analytics', icon: BarChart3 },
                      { id: 'payout', label: 'Payout Settings', icon: CreditCard }
                  ].map(tab => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;
                      return (
                          <button
                              key={tab.id}
                              onClick={() => setActiveTab(tab.id as DashboardTab)}
                              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                                  isActive
                                      ? 'bg-slate-900 text-white shadow-xs'
                                      : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50'
                              }`}
                          >
                              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                              <span>{tab.label}</span>
                              {typeof tab.count === 'number' && (
                                  <span className={`text-[11px] font-mono px-1.5 py-0.5 rounded-md ${
                                      isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                                  }`}>
                                      {tab.count}
                                  </span>
                              )}
                          </button>
                      );
                  })}
              </div>
          </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === 'analytics' && renderAnalytics()}
          {activeTab === 'courses' && renderCoursesList()}
          {activeTab === 'live' && renderLiveClassesTab()}
          {activeTab === 'notes' && renderNotesList()}
          {activeTab === 'combos' && renderCombosList()}
          {activeTab === 'quizzes' && renderQuizzesList()}
          {activeTab === 'viva' && renderVivaList()}
          {activeTab === 'be-toolkit' && <BEToolkitTab />}
          {activeTab === 'exam-prep' && <ExamPrepTab />}
          {activeTab === 'payout' && renderPayout()}
      </div>

      {showCourseModal && <CreateCourseModal onClose={() => setShowCourseModal(false)} editItem={editingCourse} onSave={handleSaveCourse} />}
      {showNoteModal && <CreateNoteModal onClose={() => setShowNoteModal(false)} editItem={editingNote} onSave={handleSaveNote} />}
      {showComboModal && <CreateComboModal onClose={() => setShowComboModal(false)} editItem={editingCombo} onSave={handleSaveCombo} allCourses={courses} allNotes={notes} allSubjects={allSubjects} />}
      {showQuizModal && <CreateQuizModal onClose={() => setShowQuizModal(false)} editItem={editingQuiz} onSave={handleSaveQuiz} />}
      {showVivaModal && <CreateVivaModal onClose={() => setShowVivaModal(false)} editItem={editingViva} onSave={handleSaveViva} />}
      
      <LiveModal
          isOpen={showLiveModal} onClose={() => setShowLiveModal(false)}
          liveClasses={liveClasses} title={liveTitle} setTitle={setLiveTitle}
          scheduledAt={liveScheduledAt} setScheduledAt={setLiveScheduledAt}
          onSchedule={handleScheduleLive} navigate={navigate} onDelete={handleDeleteLiveClass}
          isScheduling={isScheduling}
      />
    </div>
  );
};


export default AdminDashboard;
