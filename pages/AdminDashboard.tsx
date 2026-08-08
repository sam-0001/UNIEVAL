import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Course, Note, Quiz, Viva, UserRole, Question } from '../types';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { SubjectSelector } from '../components/SubjectSelector';
import { useSubjectSelection } from '../hooks/useSubjectSelection';
import CouponManager from '../components/CouponManager';

type DashboardTab = 'courses' | 'notes' | 'quizzes' | 'viva' | 'analytics' | 'payout';

type TeacherView = 'LOGIN' | 'SIGNUP' | 'FORGOT_PASSWORD';

const TeacherLogin: React.FC = () => {
    const { login, register, sendOtp, verifyOtp, resetPassword, isLoading, error, setError } = useAuth();

    const [view, setView] = useState<TeacherView>('LOGIN');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');

    // OTP / reset flow state
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [resetSuccess, setResetSuccess] = useState(false);

    const switchView = (next: TeacherView) => {
        setView(next);
        setError(null);
        setOtp('');
        setOtpSent(false);
        setNewPassword('');
        setResetSuccess(false);
    };

    // --- LOGIN ---
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            await login(email, password);
        } catch { /* error shown via context */ }
    };

    // --- SIGNUP (step 1: send OTP) ---
    const handleSignupStep1 = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !email || !password) { setError('Please fill in all fields.'); return; }
        setError(null);
        try {
            await sendOtp(email);
            setOtpSent(true);
        } catch { /* error shown via context */ }
    };

    // --- SIGNUP (step 2: verify OTP then register) ---
    const handleSignupStep2 = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            const isValid = await verifyOtp(email, otp);
            if (isValid) {
                await register(name, email, UserRole.TEACHER, password);
            }
        } catch { /* error shown via context */ }
    };

    // --- FORGOT (step 1: send OTP) ---
    const handleForgotStep1 = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) { setError('Please enter your email.'); return; }
        setError(null);
        try {
            await sendOtp(email);
            setOtpSent(true);
        } catch { /* error shown via context */ }
    };

    // --- FORGOT (step 2: verify OTP + set new password) ---
    const handleForgotStep2 = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!otp || !newPassword) { setError('Please enter the OTP and your new password.'); return; }
        setError(null);
        try {
            await resetPassword(email, otp, newPassword);
            setResetSuccess(true);
        } catch { /* error shown via context */ }
    };

    const inputCls = 'w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all bg-gray-50 focus:bg-white';
    const labelCls = 'block text-xs font-bold text-slate-500 uppercase mb-1';

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-8 animate-in fade-in zoom-in-95 duration-300">

                {/* Header */}
                <div className="text-center mb-8">
                    <div className="bg-indigo-600 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
                        <span className="text-2xl">👨‍🏫</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        {view === 'LOGIN' && 'Teacher Login'}
                        {view === 'SIGNUP' && (otpSent ? 'Verify Email' : 'Create Teacher Account')}
                        {view === 'FORGOT_PASSWORD' && (resetSuccess ? 'Password Reset!' : otpSent ? 'Set New Password' : 'Forgot Password')}
                    </h1>
                    <p className="text-slate-500 text-sm mt-2">
                        {view === 'LOGIN' && 'Access your dashboard to manage courses'}
                        {view === 'SIGNUP' && (otpSent ? `OTP sent to ${email}` : 'Join UNIEVAL to start teaching')}
                        {view === 'FORGOT_PASSWORD' && !resetSuccess && (otpSent ? `Enter the OTP sent to ${email}` : 'Enter your registered email to reset')}
                        {view === 'FORGOT_PASSWORD' && resetSuccess && 'Your password has been updated.'}
                    </p>
                </div>

                {/* Error */}
                {error && (
                    <div className="mb-5 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg text-center">
                        {error}
                    </div>
                )}

                {/* ===== LOGIN FORM ===== */}
                {view === 'LOGIN' && (
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className={labelCls}>Email Address</label>
                            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                                className={inputCls} placeholder="teacher@university.edu" />
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className={labelCls} style={{ marginBottom: 0 }}>Password</label>
                                <button
                                    type="button"
                                    onClick={() => switchView('FORGOT_PASSWORD')}
                                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 transition-colors"
                                >
                                    Forgot Password?
                                </button>
                            </div>
                            <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                                className={inputCls} placeholder="••••••••" />
                        </div>
                        <button type="submit" disabled={isLoading}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed mt-2">
                            {isLoading ? 'Signing in…' : 'Login Dashboard'}
                        </button>
                    </form>
                )}

                {/* ===== SIGNUP FORM ===== */}
                {view === 'SIGNUP' && (
                    <form onSubmit={otpSent ? handleSignupStep2 : handleSignupStep1} className="space-y-4">
                        {!otpSent && (
                            <>
                                <div>
                                    <label className={labelCls}>Full Name</label>
                                    <input type="text" required value={name} onChange={e => setName(e.target.value)}
                                        className={inputCls} placeholder="e.g. Prof. Smith" />
                                </div>
                                <div>
                                    <label className={labelCls}>Email Address</label>
                                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                                        className={inputCls} placeholder="teacher@university.edu" />
                                </div>
                                <div>
                                    <label className={labelCls}>Create Password</label>
                                    <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                                        className={inputCls} placeholder="Min 8 chars, upper, lower, number" />
                                </div>
                            </>
                        )}
                        {otpSent && (
                            <div className="space-y-1.5 animate-in slide-in-from-right-4 fade-in duration-300">
                                <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-lg">
                                    OTP sent to <strong>{email}</strong>. Check your inbox.
                                </div>
                                <label className={labelCls}>Enter OTP</label>
                                <input type="text" required value={otp} onChange={e => setOtp(e.target.value)}
                                    className={`${inputCls} tracking-widest font-mono text-center text-lg`} placeholder="123456" maxLength={6} />
                            </div>
                        )}
                        <button type="submit" disabled={isLoading}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed mt-2">
                            {isLoading ? 'Processing…' : (otpSent ? 'Verify & Create Account' : 'Send OTP')}
                        </button>
                    </form>
                )}

                {/* ===== FORGOT PASSWORD FORM ===== */}
                {view === 'FORGOT_PASSWORD' && !resetSuccess && (
                    <form onSubmit={otpSent ? handleForgotStep2 : handleForgotStep1} className="space-y-4">
                        {!otpSent && (
                            <div>
                                <label className={labelCls}>Registered Email</label>
                                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                                    className={inputCls} placeholder="teacher@university.edu" />
                            </div>
                        )}
                        {otpSent && (
                            <>
                                <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-lg">
                                    OTP sent to <strong>{email}</strong>. Check your inbox.
                                </div>
                                <div>
                                    <label className={labelCls}>Enter OTP</label>
                                    <input type="text" required value={otp} onChange={e => setOtp(e.target.value)}
                                        className={`${inputCls} tracking-widest font-mono text-center text-lg`} placeholder="123456" maxLength={6} />
                                </div>
                                <div>
                                    <label className={labelCls}>New Password</label>
                                    <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)}
                                        className={inputCls} placeholder="Min 8 chars, upper, lower, number" />
                                </div>
                            </>
                        )}
                        <button type="submit" disabled={isLoading}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed mt-2">
                            {isLoading ? 'Processing…' : (otpSent ? 'Reset Password' : 'Send OTP')}
                        </button>
                        <button type="button" onClick={() => switchView('LOGIN')}
                            className="w-full text-xs text-slate-400 hover:text-slate-600 mt-1 transition-colors">
                            ← Back to Login
                        </button>
                    </form>
                )}

                {/* ===== RESET SUCCESS ===== */}
                {view === 'FORGOT_PASSWORD' && resetSuccess && (
                    <div className="text-center space-y-4">
                        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                            <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <p className="text-sm text-slate-600">You can now log in with your new password.</p>
                        <button onClick={() => switchView('LOGIN')}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-200 transition-all">
                            Back to Login
                        </button>
                    </div>
                )}

                {/* Toggle Login / Signup */}
                {view !== 'FORGOT_PASSWORD' && (
                    <div className="mt-6 pt-6 border-t border-gray-100 text-center">
                        <p className="text-sm text-slate-600">
                            {view === 'LOGIN' ? "Don't have an account?" : 'Already have an account?'}
                            <button onClick={() => switchView(view === 'LOGIN' ? 'SIGNUP' : 'LOGIN')}
                                className="text-indigo-600 font-bold ml-1 hover:underline">
                                {view === 'LOGIN' ? 'Create Account' : 'Login Here'}
                            </button>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

const AdminDashboard: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<DashboardTab>('courses');
  const [payoutUpi, setPayoutUpi] = useState(user?.upiId || '');
  
  // Data State
  const [courses, setCourses] = useState<Course[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [viva, setViva] = useState<Viva[]>([]);

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
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [showVivaModal, setShowVivaModal] = useState(false);

  // Edit State (To populate modals)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [editingViva, setEditingViva] = useState<Viva | null>(null);
  const [expandedCouponProduct, setExpandedCouponProduct] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.role !== 'STUDENT') {
        api.getCourses().then(all => setCourses(all.filter(c => c.teacherId === user.id)));
        api.getNotes().then(all => setNotes(all.filter(n => n.teacherId === user.id)));
        api.getQuizzes().then(all => setQuizzes(all.filter(q => q.teacherId === user.id)));
        api.getViva().then(all => setViva(all.filter(v => v.teacherId === user.id)));
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
      return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50">
              <div className="bg-white p-8 rounded-xl shadow-md text-center border border-red-100">
                  <span className="text-4xl block mb-4">🛑</span>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
                  <p className="text-slate-500 mb-6">You must be a registered teacher to view this dashboard.</p>
                  <a href="/" className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 transition">
                      Return to Home
                  </a>
              </div>
          </div>
      );
  }

  const handleCreateCourse = () => { setEditingCourse(null); setShowCourseModal(true); };
  const handleEditCourse = (course: Course) => { setEditingCourse(course); setShowCourseModal(true); };
  const handleCreateNote = () => { setEditingNote(null); setShowNoteModal(true); };
  const handleEditNote = (note: Note) => { setEditingNote(note); setShowNoteModal(true); };
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
      if (!window.confirm(`Are you sure you want to delete the course "${course.title}" and all its videos?`)) return;
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
                  v.resources?.forEach(r => { if (r.url) urlsToDelete.push(r.url); });
              });
          });
          if (urlsToDelete.length > 0) {
              await fetch('/api/delete-files', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ urls: urlsToDelete }) });
          }
          if (api.deleteCourse) { await api.deleteCourse(course.id); } else { await fetch(`/api/courses/${course.id}`, { method: 'DELETE' }); }
          setCourses(courses.filter(c => c.id !== course.id));
      } catch (error) { console.error('Failed to delete course:', error); alert('Failed to delete course'); }
  };

  const handleDeleteNote = async (note: Note) => {
      if (!window.confirm(`Are you sure you want to delete the note package "${note.title}" and all its files?`)) return;
      try {
          const urlsToDelete: string[] = [];
          note.sections?.forEach(s => { s.files?.forEach(f => { if (f.url && f.url !== '#') urlsToDelete.push(f.url); }); });
          if (urlsToDelete.length > 0) {
              await fetch('/api/delete-files', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ urls: urlsToDelete }) });
          }
          if (api.deleteNote) { await api.deleteNote(note.id); } else { await fetch(`/api/notes/${note.id}`, { method: 'DELETE' }); }
          setNotes(notes.filter(n => n.id !== note.id));
      } catch (error) { console.error('Failed to delete note:', error); alert('Failed to delete note'); }
  };

  const handleDeleteQuiz = async (quiz: Quiz) => {
      if (!window.confirm(`Are you sure you want to delete the quiz "${quiz.title}"?`)) return;
      try {
          if (api.deleteQuiz) { await api.deleteQuiz(quiz.id); } else { await fetch(`/api/quizzes/${quiz.id}`, { method: 'DELETE' }); }
          setQuizzes(quizzes.filter(q => q.id !== quiz.id));
      } catch (error) { console.error('Failed to delete quiz:', error); alert('Failed to delete quiz'); }
  };

  const handleDeleteViva = async (vivaItem: Viva) => {
      if (!window.confirm(`Are you sure you want to delete the viva set "${vivaItem.title}"?`)) return;
      try {
          if (api.deleteViva) { await api.deleteViva(vivaItem.id); } else { await fetch(`/api/viva/${vivaItem.id}`, { method: 'DELETE' }); }
          setViva(viva.filter(v => v.id !== vivaItem.id));
      } catch (error) { console.error('Failed to delete viva:', error); alert('Failed to delete viva'); }
  };

  const renderAnalytics = () => (
      <div className="space-y-6 animate-in fade-in duration-300">
          {analyticsLoading ? (
              <div className="flex items-center justify-center py-20 text-gray-400 text-sm gap-2">
                  <span className="w-5 h-5 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
                  Loading analytics...
              </div>
          ) : (
          <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                  <p className="text-xs font-bold text-gray-500 uppercase">Total Products</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{analyticsData?.totalProducts ?? (courses.length + notes.length + quizzes.length + viva.length)}</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                  <p className="text-xs font-bold text-gray-500 uppercase">Total Units Sold</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{analyticsData?.totalUnitsSold ?? 0}</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                  <p className="text-xs font-bold text-gray-500 uppercase">Total Gross Revenue</p>
                  <p className="text-3xl font-bold text-indigo-600 mt-2">₹{(analyticsData?.totalRevenue ?? 0).toLocaleString()}</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                  <p className="text-xs font-bold text-gray-500 uppercase">Est. Net Earning (90%)</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">₹{((analyticsData?.totalRevenue ?? 0) * 0.9).toLocaleString()}</p>
              </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <h3 className="font-bold text-gray-800">Product Performance</h3>
                  <button onClick={() => {
                      setAnalyticsLoading(true);
                      api.getTeacherStats(user!.id)
                          .then(data => setAnalyticsData(data as any))
                          .catch(console.error)
                          .finally(() => setAnalyticsLoading(false));
                  }} className="text-indigo-600 hover:text-indigo-800 text-xs font-bold flex items-center gap-1">
                      ↻ Refresh
                  </button>
              </div>
              <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
                      <tr>
                          <th className="px-6 py-3">Product Name</th>
                          <th className="px-6 py-3">Type</th>
                          <th className="px-6 py-3 text-right">Units Sold</th>
                          <th className="px-6 py-3 text-right">Gross Revenue</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                      {(!analyticsData?.products || analyticsData.products.length === 0) ? (
                          <tr><td colSpan={4} className="px-6 py-10 text-center text-gray-400 italic">No sales recorded yet.</td></tr>
                      ) : analyticsData.products.map(p => (
                          <tr key={p.productId} className="hover:bg-gray-50">
                              <td className="px-6 py-4 font-medium text-gray-900">{p.title}</td>
                              <td className="px-6 py-4">
                                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                      p.type === 'COURSE' ? 'bg-blue-100 text-blue-700' :
                                      p.type === 'QUIZ'   ? 'bg-green-100 text-green-700' :
                                      p.type === 'VIVA'   ? 'bg-orange-100 text-orange-700' :
                                      'bg-purple-100 text-purple-700'
                                  }`}>{p.type}</span>
                              </td>
                              <td className="px-6 py-4 text-right">{p.unitsSold}</td>
                              <td className="px-6 py-4 text-right font-bold">₹{p.grossRevenue.toLocaleString()}</td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
          </>
          )}
      </div>
  );

  const renderCoursesList = () => (
      <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-700">My Courses ({courses.length})</h2>
              <button onClick={handleCreateCourse} className="bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-800 transition shadow-sm flex items-center gap-2">
                  <span>+</span> Create Course
              </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map(course => (
                  <div key={course.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                      <div className="aspect-video bg-gray-200 relative overflow-hidden cursor-pointer">
                          <img 
                              src={course.thumbnailUrl} 
                              alt={course.title} 
                              className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500" 
                              onError={(e) => { e.currentTarget.src = 'https://picsum.photos/800/600?random=' + course.id; }}
                          />
                           <span className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded">COMPUTER ENGINEERING</span>
                      </div>
                      <div className="p-4">
                          <h3 className="font-bold text-gray-900 mb-1">{course.title}</h3>
                          <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                              <div>
                                {course.originalPrice && course.originalPrice > (course.price || 0) ? (
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-400 line-through">₹{course.originalPrice.toFixed(2)}</span>
                                        <span className="font-bold text-gray-900">₹{course.price?.toFixed(2) || '0.00'}</span>
                                    </div>
                                ) : (
                                    <span className="font-bold text-gray-900">₹{course.price?.toFixed(2) || '0.00'}</span>
                                )}
                              </div>
                              <div className="flex gap-4">
                                  <button onClick={() => setExpandedCouponProduct(prev => prev === course.id ? null : course.id)} className="text-slate-600 text-sm font-bold hover:underline">Coupons</button>
                                  <button onClick={() => handleEditCourse(course)} className="text-indigo-600 text-sm font-bold hover:underline">Edit</button>
                                  <button onClick={() => handleDeleteCourse(course)} className="text-red-600 text-sm font-bold hover:underline">Delete</button>
                              </div>
                          </div>
                          {expandedCouponProduct === course.id && (
                              <div className="mt-4 pt-4 border-t border-gray-100">
                                  <CouponManager productId={course.id} productType="course" />
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
              <h2 className="text-xl font-bold text-slate-700">My Exam Notes ({notes.length})</h2>
              <button onClick={handleCreateNote} className="bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-800 transition shadow-sm flex items-center gap-2">
                  <span>+</span> Create Note Package
              </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {notes.map(note => (
                  <div key={note.id} className="bg-white rounded-xl border border-indigo-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow relative">
                      <div className="absolute top-0 w-full h-1 bg-indigo-600"></div>
                      <div className="p-6">
                          <h3 className="font-bold text-gray-900 text-lg mb-2">{note.title}</h3>
                          {note.collegeConfig ? (
                              <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-1 rounded">Free for {note.collegeConfig.name}</span>
                          ) : note.price === 49 ? (
                             <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-1 rounded">Free for Sinhgad</span>
                          ) : null}
                          <div className="flex justify-between items-center mt-6">
                              <div>
                                {note.originalPrice && note.originalPrice > (note.price || 0) ? (
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-400 line-through">₹{note.originalPrice.toFixed(2)}</span>
                                        <span className="font-bold text-gray-900 text-lg">₹{note.price?.toFixed(2)}</span>
                                    </div>
                                ) : (
                                    <span className="font-bold text-gray-900 text-lg">₹{note.price?.toFixed(2)}</span>
                                )}
                              </div>
                              <div className="flex gap-4">
                                  <button onClick={() => setExpandedCouponProduct(prev => prev === note.id ? null : note.id)} className="text-slate-600 text-sm font-bold hover:underline">Coupons</button>
                                  <button onClick={() => handleEditNote(note)} className="text-indigo-600 text-sm font-bold hover:underline">Edit</button>
                                  <button onClick={() => handleDeleteNote(note)} className="text-red-600 text-sm font-bold hover:underline">Delete</button>
                              </div>
                          </div>
                          {expandedCouponProduct === note.id && (
                              <div className="mt-4 pt-4 border-t border-gray-100">
                                  <CouponManager productId={note.id} productType="note" />
                              </div>
                          )}
                      </div>
                  </div>
              ))}
          </div>
      </div>
  );

  const renderQuizzesList = () => (
      <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-700">My Quizzes ({quizzes.length})</h2>
              <button onClick={handleCreateQuiz} className="bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-800 transition shadow-sm flex items-center gap-2">
                  <span>+</span> Create Quiz
              </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {quizzes.map(quiz => (
                  <div key={quiz.id} className="bg-white rounded-xl border border-blue-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow relative">
                      <div className="absolute top-0 w-full h-1 bg-blue-500"></div>
                      <div className="p-6">
                          <h3 className="font-bold text-gray-900 text-lg mb-2">{quiz.title}</h3>
                          <p className="text-xs text-gray-500 mb-4">{quiz.questionCount} Questions • {quiz.durationMinutes} Mins</p>
                          <div className="flex justify-between items-center mt-6">
                              <div>
                                {quiz.originalPrice && quiz.originalPrice > (quiz.price || 0) ? (
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-400 line-through">₹{quiz.originalPrice.toFixed(2)}</span>
                                        <span className="font-bold text-gray-900 text-lg">{quiz.price ? `₹${quiz.price}` : 'Free'}</span>
                                    </div>
                                ) : (
                                    <span className="font-bold text-gray-900 text-lg">{quiz.price ? `₹${quiz.price}` : 'Free'}</span>
                                )}
                              </div>
                              <div className="flex gap-4">
                                  <button onClick={() => handleEditQuiz(quiz)} className="text-indigo-600 text-sm font-bold hover:underline">Edit</button>
                                  <button onClick={() => handleDeleteQuiz(quiz)} className="text-red-600 text-sm font-bold hover:underline">Delete</button>
                              </div>
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
              <h2 className="text-xl font-bold text-slate-700">Viva Preparations ({viva.length})</h2>
              <button onClick={handleCreateViva} className="bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-800 transition shadow-sm flex items-center gap-2">
                  <span>+</span> Create Viva Set
              </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {viva.map(v => (
                  <div key={v.id} className="bg-white rounded-xl border border-green-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow relative">
                      <div className="absolute top-0 w-full h-1 bg-green-500"></div>
                      <div className="p-6">
                          <h3 className="font-bold text-gray-900 text-lg mb-2">{v.title}</h3>
                          <p className="text-xs text-gray-500 mb-4 line-clamp-2">{v.description}</p>
                          <div className="flex justify-between items-center mt-6">
                              <div>
                                {v.originalPrice && v.originalPrice > (v.price || 0) ? (
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-400 line-through">₹{v.originalPrice.toFixed(2)}</span>
                                        <span className="font-bold text-gray-900 text-lg">{v.price ? `₹${v.price}` : 'Free'}</span>
                                    </div>
                                ) : (
                                    <span className="font-bold text-gray-900 text-lg">{v.price ? `₹${v.price}` : 'Free'}</span>
                                )}
                              </div>
                              <div className="flex gap-4">
                                  <button onClick={() => handleEditViva(v)} className="text-indigo-600 text-sm font-bold hover:underline">Edit</button>
                                  <button onClick={() => handleDeleteViva(v)} className="text-red-600 text-sm font-bold hover:underline">Delete</button>
                              </div>
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
          <div className="max-w-md bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-5">
                  <div className="bg-green-100 p-2 rounded-full text-green-600"><span className="text-xl">₹</span></div>
                  <h2 className="text-lg font-bold text-gray-900">Payout Settings</h2>
              </div>
              <div className="space-y-4">
                  <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Your UPI ID (VPA)</label>
                      <input type="text" placeholder="username@bank" value={payoutUpi} onChange={(e) => setPayoutUpi(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none bg-white" />
                  </div>
                  <button onClick={handleSavePayout} className="w-full bg-slate-900 text-white font-bold py-3 rounded-lg hover:bg-slate-800 transition">Save Payout Details</button>
                  <div className="bg-blue-50 p-4 rounded-lg text-xs text-blue-800 leading-relaxed">
                      <strong>Note:</strong> Payments are processed manually by Admin via UPI. Make sure your UPI ID is correct.
                  </div>
              </div>
          </div>

          {/* Earnings Summary */}
          {payoutHistoryLoading ? (
              <div className="flex items-center justify-center py-10 text-gray-400 text-sm gap-2">
                  <span className="w-5 h-5 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
                  Loading payout history...
              </div>
          ) : payoutHistory && (
          <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                  { label: 'Total Earned',     value: `₹${payoutHistory.stats.totalSales.toLocaleString()}`,      color: 'text-gray-900' },
                  { label: 'Platform Fee (10%)', value: `-₹${payoutHistory.stats.platformFee.toLocaleString()}`,   color: 'text-red-500' },
                  { label: 'Total Paid Out',   value: `₹${payoutHistory.stats.totalPaid.toLocaleString()}`,       color: 'text-green-600' },
                  { label: 'Pending',          value: `₹${payoutHistory.stats.pendingPayout.toLocaleString()}`,   color: 'text-amber-600' },
              ].map(s => (
                  <div key={s.label} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{s.label}</p>
                      <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  </div>
              ))}
          </div>

          {/* Payment History */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <h3 className="font-bold text-gray-800">Payment History</h3>
                  <button onClick={() => {
                      setPayoutHistoryLoading(true);
                      api.getTeacherPayoutHistory(user!.id)
                          .then(d => setPayoutHistory(d))
                          .catch(console.error)
                          .finally(() => setPayoutHistoryLoading(false));
                  }} className="text-indigo-600 hover:text-indigo-800 text-xs font-bold">↻ Refresh</button>
              </div>
              {payoutHistory.payouts.length === 0 ? (
                  <div className="px-6 py-12 text-center text-gray-400 italic text-sm">No payments yet.</div>
              ) : (
                  <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100 text-xs uppercase">
                          <tr>
                              <th className="px-6 py-3">Date</th>
                              <th className="px-6 py-3 text-right">Amount</th>
                              <th className="px-6 py-3 text-center">Status</th>
                              <th className="px-6 py-3">UPI Transaction ID</th>
                              <th className="px-6 py-3">Paid On</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {payoutHistory.payouts.map(p => (
                              <tr key={p.id} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 text-gray-500 text-xs">
                                      {new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </td>
                                  <td className="px-6 py-4 text-right font-bold text-gray-900">₹{p.amount.toLocaleString()}</td>
                                  <td className="px-6 py-4 text-center">
                                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                                          p.status === 'COMPLETED'
                                              ? 'bg-green-100 text-green-700'
                                              : 'bg-amber-100 text-amber-700'
                                      }`}>
                                          {p.status === 'COMPLETED' ? '✓ Paid' : '⏳ Pending'}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4 font-mono text-xs text-gray-600">
                                      {p.transactionId || <span className="text-gray-300 italic">—</span>}
                                  </td>
                                  <td className="px-6 py-4 text-gray-500 text-xs">
                                      {p.completedAt
                                          ? new Date(p.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                          : <span className="text-gray-300">—</span>}
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
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <h1 className="text-3xl font-bold text-slate-900">Publisher Dashboard</h1>
              <p className="text-slate-500 mt-1">Manage Content, Analytics & Payouts</p>
              <div className="mt-8 flex gap-2 overflow-x-auto no-scrollbar">
                  {[
                      { id: 'courses', label: 'Courses' },
                      { id: 'notes', label: 'Notes' },
                      { id: 'quizzes', label: 'Quizzes' },
                      { id: 'viva', label: 'Viva Sets' },
                      { id: 'analytics', label: 'Analytics' },
                      { id: 'payout', label: 'Payout Settings' }
                  ].map(tab => (
                      <button key={tab.id} onClick={() => setActiveTab(tab.id as DashboardTab)}
                          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-indigo-900 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
                          {tab.label}
                      </button>
                  ))}
              </div>
          </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === 'analytics' && renderAnalytics()}
          {activeTab === 'courses' && renderCoursesList()}
          {activeTab === 'notes' && renderNotesList()}
          {activeTab === 'quizzes' && renderQuizzesList()}
          {activeTab === 'viva' && renderVivaList()}
          {activeTab === 'payout' && renderPayout()}
      </div>

      {showCourseModal && <CreateCourseModal onClose={() => setShowCourseModal(false)} editItem={editingCourse} onSave={handleSaveCourse} />}
      {showNoteModal && <CreateNoteModal onClose={() => setShowNoteModal(false)} editItem={editingNote} onSave={handleSaveNote} />}
      {showQuizModal && <CreateQuizModal onClose={() => setShowQuizModal(false)} editItem={editingQuiz} onSave={handleSaveQuiz} />}
      {showVivaModal && <CreateVivaModal onClose={() => setShowVivaModal(false)} editItem={editingViva} onSave={handleSaveViva} />}
    </div>
  );
};

// --- SUB-COMPONENTS FOR MODALS ---

const INPUT_CLASS = "w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white transition-all";
const LABEL_CLASS = "block text-xs font-bold text-gray-500 uppercase mb-1";

const CreateCourseModal: React.FC<{onClose: () => void; editItem?: Course | null; onSave: (data: Course) => void}> = ({ onClose, editItem, onSave }) => {
    const { user } = useAuth();
    
    const [title, setTitle] = useState(editItem?.title || '');
    const [description, setDescription] = useState(editItem?.description || '');
    const subjectSelection = useSubjectSelection(editItem?.subjectId);
    const [price, setPrice] = useState(editItem?.price?.toString() || '499');
    const [originalPrice, setOriginalPrice] = useState(editItem?.originalPrice?.toString() || '');
    const [discountMode, setDiscountMode] = useState(!!editItem?.originalPrice);
    const [collegeName, setCollegeName] = useState(editItem?.collegeConfig?.name || '');
    const [collegeDomain, setCollegeDomain] = useState(editItem?.collegeConfig?.emailDomain || '');
    
    const [modules, setModules] = useState<{
        id: number;
        title: string;
        videos: {
            id: number;
            title: string;
            fileName?: string;
            videoUrl?: string;
            videoStatus?: 'uploading' | 'processing' | 'finalizing' | 'ready' | 'error';
            videoProgress?: number;
            videoId?: string;
            videoKey?: string;
            resources?: { title: string; url: string; type: 'pdf' | 'link' }[];
            resourceFileName?: string;
        }[];
    }[]>(
        () => editItem?.modules.map(m => ({ 
            id: Math.random(), 
            title: m.title, 
            videos: m.videos ? m.videos.map(v => ({
                id: Math.random(),
                title: v.title,
                fileName: v.videoUrl && v.videoUrl !== '#' ? 'Saved Video File (Ready)' : '',
                videoUrl: v.videoUrl,
                videoStatus: (v.videoStatus === 'processing' || v.videoStatus === 'finalizing')
                    ? 'error' as const
                    : (v.videoStatus || 'ready'),
                videoProgress: 100,
                videoId: v.videoId,
                videoKey: v.videoKey,
                resources: v.resources || [],
                resourceFileName: v.resources?.[0]?.url ? 'Saved Resource' : ''
            })) : (m.videoUrl ? [{
                id: Math.random(),
                title: 'Video 1',
                fileName: m.videoUrl && m.videoUrl !== '#' ? 'Saved Video File (Ready)' : '',
                videoUrl: m.videoUrl,
                videoStatus: (m.videoStatus === 'processing' || m.videoStatus === 'finalizing')
                    ? 'error' as const
                    : (m.videoStatus || 'ready'),
                videoProgress: 100,
                videoId: m.videoId,
                videoKey: m.videoKey,
                resources: m.resources || [],
                resourceFileName: m.resources?.[0]?.url ? 'Saved Resource' : ''
            }] : [])
        })) || []
    );

    const modulesRef = useRef(modules);
    useEffect(() => { modulesRef.current = modules; }, [modules]);

    useEffect(() => {
        const interval = setInterval(async () => {
            const currentModules = modulesRef.current;

            const hasProcessing = currentModules.some(m =>
                m.videos.some(v => v.videoStatus === 'processing' || v.videoStatus === 'finalizing')
            );
            if (!hasProcessing) return;

            for (const module of currentModules) {
                for (const video of module.videos) {
                    if ((video.videoStatus === 'processing' || video.videoStatus === 'finalizing') && video.videoId) {
                        try {
                            const response = await api.getVideoStatus(video.videoId);
                            setModules(prev => prev.map(m => m.id === module.id ? {
                                ...m,
                                videos: m.videos.map(v => v.id === video.id ? {
                                    ...v,
                                    videoStatus: response.status,
                                    videoProgress: response.progress,
                                    videoUrl: response.url || v.videoUrl
                                } : v)
                            } : m));
                        } catch (error) {
                            console.error("Error polling video status — marking as error:", error);
                            setModules(prev => prev.map(m => m.id === module.id ? {
                                ...m,
                                videos: m.videos.map(v => v.id === video.id ? {
                                    ...v,
                                    videoStatus: 'error' as const,
                                } : v)
                            } : m));
                        }
                    }
                }
            }
        }, 2000);

        return () => clearInterval(interval);
    }, []);
    
    const addModule = () => setModules([...modules, { id: Date.now(), title: '', videos: [] }]);
    const removeModule = (id: number) => setModules(modules.filter(m => m.id !== id));
    const updateModule = (id: number, title: string) => setModules(modules.map(m => m.id === id ? { ...m, title } : m));
    const addVideo = (moduleId: number) => setModules(modules.map(m => m.id === moduleId ? { ...m, videos: [...m.videos, { id: Date.now(), title: '' }] } : m));
    const removeVideo = (moduleId: number, videoId: number) => setModules(modules.map(m => m.id === moduleId ? { ...m, videos: m.videos.filter(v => v.id !== videoId) } : m));
    const updateVideoTitle = (moduleId: number, videoId: number, title: string) => setModules(modules.map(m => m.id === moduleId ? { ...m, videos: m.videos.map(v => v.id === videoId ? { ...v, title } : v) } : m));
    
    const handleFileSelect = async (moduleId: number, videoId: number, file: File | null) => {
        if (!file) return;
        const fileType = file.type || 'application/octet-stream';
        setModules(prev => prev.map(m => m.id === moduleId ? { 
            ...m, videos: m.videos.map(v => v.id === videoId ? { ...v, fileName: file.name, videoStatus: 'uploading', videoProgress: 0 } : v)
        } : m));
        try {
            const { uploadUrl, publicUrl, key } = await api.getPresignedUrl(file.name, fileType, file.size, true);
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', uploadUrl, true);
            xhr.setRequestHeader('Content-Type', fileType);
            let lastUpdate = 0;
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const now = Date.now();
                    if (now - lastUpdate > 100 || event.loaded === event.total) {
                        const percentComplete = Math.round((event.loaded / event.total) * 100);
                        setModules(prev => prev.map(m => m.id === moduleId ? {
                            ...m, videos: m.videos.map(v => (v.id === videoId && v.videoStatus === 'uploading') ? { ...v, videoProgress: percentComplete } : v)
                        } : m));
                        lastUpdate = now;
                    }
                }
            };
            xhr.onload = async () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    setModules(prev => prev.map(m => m.id === moduleId ? { 
                        ...m, videos: m.videos.map(v => v.id === videoId ? { ...v, videoStatus: 'processing', videoProgress: 0, videoUrl: publicUrl, videoKey: key } : v)
                    } : m));
                    try {
                        const processResponse = await api.processVideo(publicUrl, key);
                        setModules(prev => prev.map(m => m.id === moduleId ? { 
                            ...m, videos: m.videos.map(v => v.id === videoId ? { ...v, videoId: processResponse.videoId, videoUrl: processResponse.url || v.videoUrl } : v)
                        } : m));
                    } catch (err) {
                        console.error("Video processing failed:", err);
                        setModules(prev => prev.map(m => m.id === moduleId ? { 
                            ...m, videos: m.videos.map(v => v.id === videoId ? { ...v, videoStatus: 'error' } : v)
                        } : m));
                    }
                } else {
                    setModules(prev => prev.map(m => m.id === moduleId ? { 
                        ...m, videos: m.videos.map(v => v.id === videoId ? { ...v, videoStatus: 'error' } : v)
                    } : m));
                }
            };
            xhr.onerror = () => {
                setModules(prev => prev.map(m => m.id === moduleId ? { 
                    ...m, videos: m.videos.map(v => v.id === videoId ? { ...v, videoStatus: 'error' } : v)
                } : m));
            };
            xhr.send(file);
        } catch (error) {
            console.error("File upload failed:", error);
            setModules(prev => prev.map(m => m.id === moduleId ? { 
                ...m, videos: m.videos.map(v => v.id === videoId ? { ...v, videoStatus: 'error' } : v)
            } : m));
        }
    };

    const handleResourceSelect = async (moduleId: number, videoId: number, file: File | null) => {
        if (!file) return;
        const MAX_RESOURCE_MB = 50;
        if (file.size > MAX_RESOURCE_MB * 1024 * 1024) { alert(`Resource file is too large. Maximum allowed size is ${MAX_RESOURCE_MB}MB.`); return; }
        const ext = file.name.toLowerCase().split('.').pop() || 'bin';
        const mimeByExt: Record<string, string> = {
            pdf: 'application/pdf', doc: 'application/msword',
            docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            ppt: 'application/vnd.ms-powerpoint',
            pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            xls: 'application/vnd.ms-excel',
            xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            txt: 'text/plain', md: 'text/plain', csv: 'text/csv',
            epub: 'application/epub+zip',
            odt: 'application/vnd.oasis.opendocument.text',
            odp: 'application/vnd.oasis.opendocument.presentation',
            ods: 'application/vnd.oasis.opendocument.spreadsheet',
            png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
        };
        const fileType = (file.type && file.type !== 'application/octet-stream') ? file.type : (mimeByExt[ext] || 'application/octet-stream');
        setModules(prev => prev.map(m => m.id === moduleId ? { 
            ...m, videos: m.videos.map(v => v.id === videoId ? { ...v, resourceFileName: file.name + ' (Uploading...)' } : v)
        } : m));
        try {
            const { uploadUrl, publicUrl } = await api.getPresignedUrl(file.name, fileType, file.size, false);
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', uploadUrl, true);
            xhr.setRequestHeader('Content-Type', fileType);
            xhr.onload = async () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    setModules(prev => prev.map(m => m.id === moduleId ? { 
                        ...m, videos: m.videos.map(v => v.id === videoId ? { ...v, resourceFileName: file.name, resources: [{ title: file.name, url: publicUrl, type: (ext === 'pdf' ? 'pdf' : 'link') }] } : v)
                    } : m));
                } else {
                    alert('Failed to upload resource');
                    setModules(prev => prev.map(m => m.id === moduleId ? { 
                        ...m, videos: m.videos.map(v => v.id === videoId ? { ...v, resourceFileName: 'Upload failed' } : v)
                    } : m));
                }
            };
            xhr.onerror = () => { alert('Failed to upload resource'); };
            xhr.send(file);
        } catch (error) { console.error("Resource upload failed:", error); alert('Failed to upload resource'); }
    };

    const handleThumbnailSelect = async (moduleId: number, videoId: number, file: File | null) => {
        if (!file) return;
        const fileType = file.type || 'image/jpeg';
        try {
            const { uploadUrl, publicUrl } = await api.getPresignedUrl(file.name, fileType, file.size, false);
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', uploadUrl, true);
            xhr.setRequestHeader('Content-Type', fileType);
            xhr.onload = async () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    setModules(prev => prev.map(m => m.id === moduleId ? {
                        ...m, videos: m.videos.map(v => v.id === videoId ? { ...v, thumbnailUrl: publicUrl } : v)
                    } : m));
                } else {
                    alert('Failed to upload thumbnail');
                }
            };
            xhr.onerror = () => { alert('Failed to upload thumbnail'); };
            xhr.send(file);
        } catch (error) { console.error("Thumbnail upload failed:", error); alert('Failed to upload thumbnail'); }
    };

    const handleRetryProcessing = async (moduleId: number, videoId: number) => {
        const module = modules.find(m => m.id === moduleId);
        const video = module?.videos.find(v => v.id === videoId);
        
        if (!video || !video.videoUrl || !video.videoKey) { 
            alert("Cannot retry: Missing video information. Please re-upload."); 
            return; 
        }
        
        // Set UI to processing state
        setModules(prev => prev.map(m => m.id === moduleId ? { 
            ...m, videos: m.videos.map(v => v.id === videoId ? { ...v, videoStatus: 'processing', videoProgress: 0 } : v)
        } : m));

        try {
            // FIX: Reconstruct the raw video URL from the videoKey instead of using the .m3u8 URL
            let rawUploadUrl = video.videoUrl;
            if (video.videoUrl.includes('.m3u8')) {
                if (video.videoUrl.startsWith('http')) {
                    // For R2: Rebuild the path to the raw-uploads folder using the videoKey
                    const urlObj = new URL(video.videoUrl);
                    rawUploadUrl = `${urlObj.origin}/${video.videoKey}`;
                } else {
                    // For Local: Path to the raw file in the uploads folder
                    rawUploadUrl = `/uploads/${video.videoKey}`;
                }
            }

            // Send the correct RAW video URL to the backend
            const processResponse = await api.processVideo(rawUploadUrl, video.videoKey);
            
            setModules(prev => prev.map(m => m.id === moduleId ? { 
                ...m, videos: m.videos.map(v => v.id === videoId ? { 
                    ...v, 
                    videoId: processResponse.videoId, 
                    videoUrl: processResponse.url || v.videoUrl 
                } : v)
            } : m));
        } catch (err) {
            console.error("Video processing retry failed:", err);
            setModules(prev => prev.map(m => m.id === moduleId ? { 
                ...m, videos: m.videos.map(v => v.id === videoId ? { ...v, videoStatus: 'error' } : v)
            } : m));
        }
    };

    const handleSave = async () => {
        let allReady = true;
        modules.forEach(m => { m.videos.forEach(v => { if (v.fileName && v.videoStatus !== 'ready') { allReady = false; } }); });
        if (!allReady) { alert("Please wait for all videos to finish processing before saving."); return; }
        
        const finalSubjectId = await subjectSelection.getSubjectForSave();
        
        const courseData = {
            id: editItem?.id,
            title, 
            description,
            subjectId: finalSubjectId,
            teacherId: user?.id || '',
            thumbnailUrl: editItem?.thumbnailUrl || 'https://picsum.photos/800/600?random=' + Date.now(),
            createdAt: editItem?.createdAt || new Date().toISOString(),
            price: parseFloat(price) || 0,
            originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
            collegeConfig: collegeName ? { name: collegeName, emailDomain: collegeDomain } : undefined,
            modules: modules.map(m => ({
                id: m.id.toString(), 
                title: m.title,
                videos: m.videos.map(v => ({
                    id: v.id.toString(), 
                    title: v.title,
                    videoUrl: v.videoUrl || '#', 
                    duration: '15:00',
                    videoStatus: v.videoStatus, 
                    videoProgress: v.videoProgress,
                    videoId: v.videoId, 
                    videoKey: v.videoKey, 
                    resources: v.resources
                }))
            }))
        };
        onSave(courseData as unknown as Course);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-bold text-gray-900">{editItem ? 'Edit Course' : 'Create New Course'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-2xl">&times;</button>
                </div>
                
                <div className="p-8 space-y-6">
                    <div>
                        <label className={LABEL_CLASS}>Title</label>
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={INPUT_CLASS} />
                    </div>
                    <div>
                        <label className={LABEL_CLASS}>Description</label>
                        <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={INPUT_CLASS}></textarea>
                    </div>
                    <SubjectSelector {...subjectSelection} inputClass={INPUT_CLASS} labelClass={LABEL_CLASS} />
                    <div className="p-6 border border-gray-200 rounded-xl bg-gray-50/50">
                        <div className="flex items-center gap-2 mb-4">
                            <input type="checkbox" checked={discountMode} onChange={(e) => setDiscountMode(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300" />
                            <label className="text-sm font-bold text-gray-700">Discount Mode</label>
                        </div>
                        <div>
                            <label className={LABEL_CLASS}>Price (₹)</label>
                            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className={INPUT_CLASS} />
                        </div>
                        {discountMode && (
                            <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                                <label className={LABEL_CLASS}>Original Price (₹) <span className="text-gray-400 font-normal normal-case">(Strike-through price)</span></label>
                                <input type="number" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} placeholder="e.g. 999" className={INPUT_CLASS} />
                            </div>
                        )}
                    </div>
                    <div className="p-6 border border-purple-100 bg-purple-50/50 rounded-xl">
                        <h4 className="text-sm font-bold text-purple-800 mb-4">College-Specific Free Access (Optional)</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-purple-600 uppercase mb-1">College Name</label>
                                <input type="text" placeholder="e.g. COEP" value={collegeName} onChange={(e) => setCollegeName(e.target.value)} className={`${INPUT_CLASS} border-purple-200 focus:ring-purple-500 focus:border-purple-500`} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-purple-600 uppercase mb-1">Email Domain</label>
                                <input type="text" placeholder="@coep.ac.in" value={collegeDomain} onChange={(e) => setCollegeDomain(e.target.value)} className={`${INPUT_CLASS} border-purple-200 focus:ring-purple-500 focus:border-purple-500`} />
                            </div>
                        </div>
                        <p className="text-xs text-purple-600 mt-2">Students logging in with emails ending in this domain will get free access.</p>
                    </div>
                    <div className="border-t border-gray-200 pt-6">
                        <div className="flex justify-between items-center mb-4">
                             <h3 className="font-bold text-gray-800">Content</h3>
                             <button onClick={addModule} className="bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded hover:bg-slate-700 transition">Add Module</button>
                        </div>
                        <div className="space-y-4">
                            {modules.map((module, index) => (
                                <div key={module.id} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm flex flex-col gap-4">
                                     <div className="flex items-center gap-4">
                                         <div className="bg-gray-100 w-8 h-8 rounded-full flex items-center justify-center font-bold text-gray-500 text-xs shrink-0">{index + 1}</div>
                                         <div className="flex-grow space-y-2">
                                             <input type="text" placeholder="Module Title" value={module.title} onChange={(e) => updateModule(module.id, e.target.value)} className="w-full border-b border-gray-200 focus:border-indigo-500 outline-none py-1 text-sm font-medium bg-transparent" />
                                         </div>
                                         <button onClick={() => addVideo(module.id)} className="bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded hover:bg-indigo-200 transition">Add Video</button>
                                         <button onClick={() => removeModule(module.id)} className="text-red-500 hover:bg-red-50 p-2 rounded transition">
                                             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                         </button>
                                     </div>
                                     {module.videos && module.videos.length > 0 && (
                                     <div className="ml-12 space-y-3">
                                         {module.videos.map((video, vIndex) => (
                                             <div key={video.id} className="border border-gray-100 rounded-lg p-3 bg-gray-50 flex flex-col gap-3">
                                                 <div className="flex items-center gap-3">
                                                     <div className="flex-grow">
                                                         <input type="text" placeholder={`Video ${vIndex + 1} Title`} value={video.title} onChange={(e) => updateVideoTitle(module.id, video.id, e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:border-indigo-500 outline-none bg-white" />
                                                     </div>
                                                     <div className="flex items-center gap-2 text-xs shrink-0">
                                                         <input type="file" accept="video/mp4,video/webm,video/ogg" id={`video-file-${video.id}`} className="hidden" onChange={(e) => handleFileSelect(module.id, video.id, e.target.files?.[0] || null)} />
                                                         <label htmlFor={`video-file-${video.id}`} className="text-indigo-600 hover:underline font-medium cursor-pointer">
                                                             {video.fileName ? 'Change Video' : 'Upload Video'}
                                                         </label>
                                                         <span className="text-gray-300">|</span>
                                                         <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.csv,.png,.jpg,.jpeg,.gif,.webp,.epub,.odt,.odp,.ods" id={`resource-file-${video.id}`} className="hidden" onChange={(e) => handleResourceSelect(module.id, video.id, e.target.files?.[0] || null)} />
                                                         <label htmlFor={`resource-file-${video.id}`} className="text-purple-600 hover:underline font-medium cursor-pointer">
                                                             {video.resourceFileName ? 'Change Resource' : 'Add Resource'}
                                                         </label>
                                                         <span className="text-gray-300">|</span>
                                                         <input type="file" accept="image/*" id={`thumbnail-file-${video.id}`} className="hidden" onChange={(e) => handleThumbnailSelect(module.id, video.id, e.target.files?.[0] || null)} />
                                                         <label htmlFor={`thumbnail-file-${video.id}`} className="text-emerald-600 hover:underline font-medium cursor-pointer">
                                                             {(video as any).thumbnailUrl ? 'Change Thumbnail' : 'Add Thumbnail'}
                                                         </label>
                                                         <button onClick={() => removeVideo(module.id, video.id)} className="text-red-500 hover:text-red-700 ml-2">
                                                             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                         </button>
                                                     </div>
                                                 </div>
                                                 {video.fileName && <div className="text-xs text-gray-500">Video: {video.fileName}</div>}
                                                 {video.resourceFileName && <div className="text-xs text-gray-500">Resource: {video.resourceFileName}</div>}
                                                 {video.videoStatus && video.videoStatus !== 'ready' && (
                                                     <div className="bg-white rounded-lg p-2 border border-gray-100">
                                                         <div className="flex justify-between items-center mb-1">
                                                             <span className="text-xs font-bold text-slate-600 flex items-center gap-2">
                                                                 {video.videoStatus === 'uploading' && <Loader2 className="w-3 h-3 animate-spin" />}
                                                                 {video.videoStatus === 'processing' && <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />}
                                                                 {video.videoStatus === 'finalizing' && <Loader2 className="w-3 h-3 animate-spin text-purple-600" />}
                                                                 {video.videoStatus === 'error' && <AlertCircle className="w-3 h-3 text-red-500" />}
                                                                 {video.videoStatus === 'uploading' && 'Uploading Video...'}
                                                                 {video.videoStatus === 'processing' && 'Processing (Transcoding)...'}
                                                                 {video.videoStatus === 'finalizing' && 'Finalizing...'}
                                                                 {video.videoStatus === 'error' && 'Processing Failed'}
                                                             </span>
                                                             {video.videoStatus === 'error' && video.videoKey ? (
                                                                 <button onClick={() => handleRetryProcessing(module.id, video.id)} className="text-xs font-bold text-indigo-600 hover:underline">Retry Processing</button>
                                                             ) : (
                                                                 <span className="text-xs font-bold text-slate-900">{video.videoProgress}%</span>
                                                             )}
                                                         </div>
                                                         <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                                             <div className={`h-full transition-all duration-300 ${video.videoStatus === 'uploading' ? 'bg-blue-500' : video.videoStatus === 'processing' ? 'bg-indigo-500' : video.videoStatus === 'finalizing' ? 'bg-purple-500' : 'bg-red-500'}`} style={{ width: `${video.videoProgress}%` }}></div>
                                                         </div>
                                                     </div>
                                                 )}
                                                 {video.videoStatus === 'ready' && video.fileName && (
                                                     <div className="flex items-center gap-2 text-xs text-green-600 font-bold">
                                                         <CheckCircle className="w-4 h-4" /> Video Ready for Streaming
                                                     </div>
                                                 )}
                                             </div>
                                         ))}
                                     </div>
                                     )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
                    <button onClick={onClose} className="px-6 py-2.5 font-bold text-gray-600 hover:bg-gray-200 rounded-lg transition">Cancel</button>
                    <button onClick={handleSave} disabled={modules.some(m => m.videos.some(v => v.videoStatus && v.videoStatus !== 'ready' && v.fileName))}
                        className="px-6 py-2.5 font-bold text-white bg-indigo-800 hover:bg-indigo-900 rounded-lg shadow-lg shadow-indigo-200 transition disabled:opacity-50 disabled:cursor-not-allowed">
                        Save Course
                    </button>
                </div>
            </div>
        </div>
    )
}

const CreateNoteModal: React.FC<{onClose: () => void; editItem?: Note | null; onSave: (data: Note) => void}> = ({ onClose, editItem, onSave }) => {
    const { user } = useAuth();
    const [title, setTitle] = useState(editItem?.title || '');
    const [description, setDescription] = useState(editItem?.description || '');
    const [price, setPrice] = useState(editItem?.price?.toString() || '199');
    const [originalPrice, setOriginalPrice] = useState(editItem?.originalPrice?.toString() || '');
    const [collegeName, setCollegeName] = useState(editItem?.collegeConfig?.name || '');
    const [collegeDomain, setCollegeDomain] = useState(editItem?.collegeConfig?.emailDomain || '');
    const subjectSelection = useSubjectSelection(editItem?.subjectId);
    const [sections, setSections] = useState<{id: number, title: string, files: {name: string, content?: string}[]}[]>(() => 
        editItem?.sections.map(s => ({ id: Math.random(), title: s.title, files: s.files.map(f => ({ name: f.title, content: f.url })) })) || [{id: 1, title: 'Notes', files: []}]
    );
    
    const addSection = () => setSections([...sections, { id: Date.now(), title: 'New Section', files: [] }]);
    const updateSectionTitle = (id: number, title: string) => setSections(sections.map(s => s.id === id ? { ...s, title } : s));
    const removeSection = (id: number) => setSections(sections.filter(s => s.id !== id));

    const addFilesToSection = async (sectionId: number, newFiles: File[]) => {
        const tempFiles = newFiles.map(f => ({ name: `${f.name} (Uploading...)`, content: '#' }));
        setSections(prevSections => prevSections.map(s => s.id === sectionId ? { ...s, files: [...s.files, ...tempFiles] } : s));

        const uploadSingle = async (file: File, retries = 4): Promise<{ name: string; content: string }> => {
            const fileType = file.type || 'application/octet-stream';
            for (let attempt = 0; attempt <= retries; attempt++) {
                try {
                    const { uploadUrl, publicUrl } = await api.getPresignedUrl(file.name, fileType, file.size, false);
                    const response = await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': fileType } });
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    return { name: file.name, content: publicUrl };
                } catch (error: any) {
                    const msg: string = error?.message ?? '';
                    const waitMatch = msg.match(/(\d+)\s*seconds/);
                    const isRateLimit = msg.toLowerCase().includes('rate limit') || msg.includes('429');
                    if (isRateLimit && attempt < retries) {
                        const waitSec = waitMatch ? parseInt(waitMatch[1]) : 10;
                        console.warn(`Rate limited on ${file.name}. Waiting ${waitSec}s (attempt ${attempt + 1}/${retries})...`);
                        await new Promise(res => setTimeout(res, waitSec * 1000));
                    } else {
                        console.error('File Upload failed:', error);
                        return { name: `${file.name} (Failed)`, content: '#' };
                    }
                }
            }
            return { name: `${file.name} (Failed)`, content: '#' };
        };

        // Upload all files, collecting results in order
        const processedFiles: { name: string; content: string }[] = [];
        for (let i = 0; i < newFiles.length; i++) {
            const result = await uploadSingle(newFiles[i]);
            processedFiles.push(result);
        }

        // Single final pass: swap every temp placeholder for its real result.
        // Using a Map keyed by temp name avoids the double-entry that occurred
        // when an inline per-file replacement AND a final append both ran.
        const resultByTempName = new Map(tempFiles.map((tf, i) => [tf.name, processedFiles[i]]));
        setSections(prevSections => prevSections.map(s => {
            if (s.id !== sectionId) return s;
            const files = s.files.map(f => resultByTempName.get(f.name) ?? f);
            return { ...s, files };
        }));
    };

    const removeFileFromSection = (sectionId: number, fileIndex: number) => {
         setSections(prevSections => prevSections.map(s => s.id === sectionId ? { ...s, files: s.files.filter((_, idx) => idx !== fileIndex) } : s));
    };

    const handleSave = async () => {
        const finalSubjectId = await subjectSelection.getSubjectForSave();
        const noteData = {
            id: editItem?.id || '', title, description,
            subjectId: finalSubjectId, teacherId: user?.id || '',
            uploadedAt: editItem?.uploadedAt || new Date().toISOString(),
            price: parseFloat(price) || 0,
            originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
            collegeConfig: collegeName ? { name: collegeName, emailDomain: collegeDomain } : undefined,
            sections: sections.map(s => ({
                id: s.id.toString(), title: s.title,
                files: s.files.map((f) => ({ id: crypto.randomUUID(), title: f.name, url: f.content || '#', isFree: false }))
            }))
        };
        onSave(noteData);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-bold text-gray-900">{editItem ? 'Edit Note' : 'Create Note'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-2xl">&times;</button>
                </div>
                <div className="p-8 space-y-6">
                    <div><label className={LABEL_CLASS}>Title</label><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={INPUT_CLASS} /></div>
                    <div><label className={LABEL_CLASS}>Description</label><textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={INPUT_CLASS}></textarea></div>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200"><SubjectSelector {...subjectSelection} inputClass={INPUT_CLASS} labelClass={LABEL_CLASS} /></div>
                    <div>
                        <label className={LABEL_CLASS}>Price (₹)</label>
                        <div className="grid grid-cols-2 gap-4">
                            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className={INPUT_CLASS} placeholder="Selling Price" />
                            <input type="number" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} className={INPUT_CLASS} placeholder="Original Price (Optional)" />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">If Original Price is set, it will show as crossed out.</p>
                    </div>
                    <div className="p-6 border border-purple-100 bg-purple-50/50 rounded-xl">
                        <h4 className="text-sm font-bold text-purple-800 mb-4">College-Specific Free Access (Optional)</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-xs font-bold text-purple-600 uppercase mb-1">College Name</label><input type="text" placeholder="e.g. VJTI" value={collegeName} onChange={(e) => setCollegeName(e.target.value)} className={`${INPUT_CLASS} border-purple-200 focus:ring-purple-500 focus:border-purple-500`} /></div>
                            <div><label className="block text-xs font-bold text-purple-600 uppercase mb-1">Email Domain</label><input type="text" placeholder="@vjti.ac.in" value={collegeDomain} onChange={(e) => setCollegeDomain(e.target.value)} className={`${INPUT_CLASS} border-purple-200 focus:ring-purple-500 focus:border-purple-500`} /></div>
                        </div>
                    </div>
                    <div className="border-t border-gray-200 pt-6">
                        <div className="flex justify-between items-center mb-6">
                             <h3 className="font-bold text-gray-800">Course Materials</h3>
                             <button onClick={addSection} className="bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded hover:bg-slate-700 transition">+ Add Section</button>
                        </div>
                        <div className="space-y-4">
                             {sections.map((section) => (
                                 <div key={section.id} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                                     <div className="flex justify-between items-center mb-2">
                                         <input type="text" value={section.title} onChange={(e) => updateSectionTitle(section.id, e.target.value)} className="font-bold text-gray-800 bg-gray-50 border border-gray-200 hover:border-indigo-500 focus:border-indigo-500 rounded px-2 py-1 outline-none w-2/3" placeholder="Section Title" />
                                         <button onClick={() => removeSection(section.id)} className="text-xs text-red-500 font-bold hover:underline">Remove Section</button>
                                     </div>
                                     <div className="border-t border-dashed border-gray-200 pt-3">
                                         {section.files.length > 0 && (
                                             <ul className="mb-3 space-y-2">
                                                 {section.files.map((file, fIdx) => (
                                                     <li key={fIdx} className="flex justify-between items-center text-xs bg-gray-50 p-2 rounded">
                                                         <span className="flex items-center gap-2 flex-grow"><span className="text-red-500">📄</span><input type="text" value={file.name} readOnly className="bg-transparent border-none focus:ring-0 text-gray-600 w-full" /></span>
                                                         <button onClick={() => removeFileFromSection(section.id, fIdx)} className="text-gray-400 hover:text-red-500 ml-2">&times;</button>
                                                     </li>
                                                 ))}
                                             </ul>
                                         )}
                                         <input type="file" multiple accept=".pdf,.doc,.docx,.ppt,.pptx,image/*" id={`note-files-${section.id}`} className="hidden"
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                if (e.target.files && e.target.files.length > 0) { addFilesToSection(section.id, Array.from(e.target.files) as File[]); e.target.value = ''; }
                                            }} />
                                         <label htmlFor={`note-files-${section.id}`} className="block w-full py-2 border border-dashed border-gray-300 rounded text-xs text-center text-gray-500 hover:bg-gray-50 font-medium transition cursor-pointer">+ Click to Upload PDF/Images</label>
                                     </div>
                                 </div>
                             ))}
                        </div>
                    </div>
                </div>
                <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
                    <button onClick={onClose} className="px-6 py-2.5 font-bold text-gray-600 hover:bg-gray-200 rounded-lg transition">Cancel</button>
                    <button onClick={handleSave} className="px-6 py-2.5 font-bold text-white bg-indigo-800 hover:bg-indigo-900 rounded-lg shadow-lg shadow-indigo-200 transition">Save Note</button>
                </div>
            </div>
        </div>
    )
}

const CreateQuizModal: React.FC<{onClose: () => void; editItem?: Quiz | null; onSave: (data: Quiz) => void}> = ({ onClose, editItem, onSave }) => {
    const { user } = useAuth();
    const [title, setTitle] = useState(editItem?.title || '');
    const [duration, setDuration] = useState(editItem?.durationMinutes?.toString() || '30');
    const [price, setPrice] = useState(editItem?.price?.toString() || '0');
    const [originalPrice, setOriginalPrice] = useState(editItem?.originalPrice?.toString() || '');
    const subjectSelection = useSubjectSelection(editItem?.subjectId);
    const [questions, setQuestions] = useState<Question[]>(editItem?.questions ? editItem.questions.map(q => ({ ...q, options: q.options || ['', '', '', ''] })) : []);

    const addQuestion = () => setQuestions([...questions, { id: Date.now().toString(), text: '', options: ['', '', '', ''], correctAnswer: '' }]);
    const updateQuestionText = (id: string, text: string) => setQuestions(questions.map(q => q.id === id ? { ...q, text } : q));
    const updateOption = (qId: string, optIndex: number, val: string) => {
        setQuestions(questions.map(q => {
            if (q.id !== qId) return q;
            const newOpts = [...(q.options || [])];
            const oldVal = newOpts[optIndex];
            newOpts[optIndex] = val;
            return { ...q, options: newOpts, correctAnswer: q.correctAnswer === oldVal ? val : q.correctAnswer };
        }));
    };
    const updateCorrectAnswer = (id: string, ans: string) => setQuestions(questions.map(q => q.id === id ? { ...q, correctAnswer: ans } : q));

    const handleSave = async () => {
        const finalSubjectId = await subjectSelection.getSubjectForSave();
        onSave({ id: editItem?.id || '', title, subjectId: finalSubjectId, teacherId: user?.id || '', questionCount: questions.length, durationMinutes: parseInt(duration) || 30, price: parseFloat(price) || 0, originalPrice: originalPrice ? parseFloat(originalPrice) : undefined, questions });
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-bold text-gray-900">{editItem ? 'Edit Quiz' : 'Create New Quiz'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-2xl">&times;</button>
                </div>
                <div className="p-8 space-y-6">
                    <div><label className={LABEL_CLASS}>Quiz Title</label><input type="text" className={INPUT_CLASS} placeholder="e.g. Thermodynamics MCQ Test 1" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200"><SubjectSelector {...subjectSelection} inputClass={INPUT_CLASS} labelClass={LABEL_CLASS} /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className={LABEL_CLASS}>Time Limit (Mins)</label><input type="number" className={INPUT_CLASS} value={duration} onChange={(e) => setDuration(e.target.value)} /></div>
                        <div><label className={LABEL_CLASS}>Price (₹)</label><div className="grid grid-cols-2 gap-2"><input type="number" className={INPUT_CLASS} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Selling" /><input type="number" className={INPUT_CLASS} value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} placeholder="Original" /></div></div>
                    </div>
                    <div className="border-t border-gray-200 pt-6">
                        <div className="flex justify-between items-center mb-6">
                             <h3 className="font-bold text-gray-800">Questions</h3>
                             <button onClick={addQuestion} className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded hover:bg-blue-700 transition">+ Add Question</button>
                        </div>
                        <div className="space-y-6">
                            {questions.map((q, idx) => (
                                <div key={q.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                    <div className="flex justify-between mb-2"><span className="font-bold text-sm text-gray-600">Question {idx + 1}</span></div>
                                    <input type="text" className={`${INPUT_CLASS} mb-3`} placeholder="Enter question text..." value={q.text} onChange={(e) => updateQuestionText(q.id, e.target.value)} />
                                    <div className="space-y-3 mb-3">
                                        <label className="text-xs font-bold text-gray-400 uppercase">Options (Select the correct one)</label>
                                        {[0,1,2,3].map(opt => (
                                            <div key={opt} className="flex items-center gap-3">
                                                <input type="radio" name={`correct-ans-${q.id}`} checked={q.options && q.options[opt] === q.correctAnswer && q.options[opt] !== ''} onChange={() => updateCorrectAnswer(q.id, q.options![opt])} className="w-5 h-5 text-green-600 focus:ring-green-500 cursor-pointer accent-green-600" />
                                                <input type="text" className={`w-full border rounded p-2 text-xs outline-none transition-all ${q.options && q.options[opt] === q.correctAnswer && q.options[opt] !== '' ? 'border-green-500 bg-green-50 ring-1 ring-green-500' : 'border-gray-300 focus:ring-1 focus:ring-indigo-500'}`} placeholder={`Option ${opt + 1}`} value={q.options ? q.options[opt] : ''} onChange={(e) => updateOption(q.id, opt, e.target.value)} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            {questions.length === 0 && <p className="text-gray-400 text-sm text-center italic">No questions added yet.</p>}
                        </div>
                    </div>
                </div>
                <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
                    <button onClick={onClose} className="px-6 py-2.5 font-bold text-gray-600 hover:bg-gray-200 rounded-lg transition">Cancel</button>
                    <button onClick={handleSave} className="px-6 py-2.5 font-bold text-white bg-indigo-800 hover:bg-indigo-900 rounded-lg shadow-lg shadow-indigo-200 transition">Publish Quiz</button>
                </div>
            </div>
        </div>
    );
};

const CreateVivaModal: React.FC<{onClose: () => void; editItem?: Viva | null; onSave: (data: Viva) => void}> = ({ onClose, editItem, onSave }) => {
    const { user } = useAuth();
    const [title, setTitle] = useState(editItem?.title || '');
    const [description, setDescription] = useState(editItem?.description || '');
    const [price, setPrice] = useState(editItem?.price?.toString() || '0');
    const [originalPrice, setOriginalPrice] = useState(editItem?.originalPrice?.toString() || '');
    const subjectSelection = useSubjectSelection(editItem?.subjectId);
    const [questions, setQuestions] = useState<Question[]>(editItem?.questions ? editItem.questions.map(q => ({ ...q, options: q.options || ['', '', '', ''] })) : []);

    const addQuestion = () => setQuestions([...questions, { id: Date.now().toString(), text: '', options: ['', '', '', ''], correctAnswer: '' }]);
    const updateQuestionText = (id: string, text: string) => setQuestions(questions.map(q => q.id === id ? { ...q, text } : q));
    const updateOption = (qId: string, optIndex: number, val: string) => {
        setQuestions(questions.map(q => {
            if (q.id !== qId) return q;
            const newOpts = [...(q.options || ['', '', '', ''])];
            const oldVal = newOpts[optIndex];
            newOpts[optIndex] = val;
            return { ...q, options: newOpts, correctAnswer: (q.correctAnswer === oldVal && oldVal !== '') ? val : q.correctAnswer };
        }));
    };
    const updateExpectedAnswer = (id: string, ans: string) => setQuestions(questions.map(q => q.id === id ? { ...q, correctAnswer: ans } : q));

    const handleSave = async () => {
        const finalSubjectId = await subjectSelection.getSubjectForSave();
        onSave({ id: editItem?.id || '', title, description, subjectId: finalSubjectId, teacherId: user?.id || '', price: parseFloat(price) || 0, originalPrice: originalPrice ? parseFloat(originalPrice) : undefined, questions });
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-bold text-gray-900">{editItem ? 'Edit Viva Set' : 'Create Viva Set'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-2xl">&times;</button>
                </div>
                <div className="p-8 space-y-6">
                    <div><label className={LABEL_CLASS}>Set Title</label><input type="text" className={INPUT_CLASS} placeholder="e.g. Workshop Practice Viva" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
                    <div><label className={LABEL_CLASS}>Description</label><textarea rows={3} className={INPUT_CLASS} placeholder="Brief about this viva set..." value={description} onChange={(e) => setDescription(e.target.value)} /></div>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200"><SubjectSelector {...subjectSelection} inputClass={INPUT_CLASS} labelClass={LABEL_CLASS} /></div>
                    <div>
                        <label className={LABEL_CLASS}>Price (₹)</label>
                        <div className="grid grid-cols-2 gap-4">
                            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className={INPUT_CLASS} placeholder="Selling Price (0 for Free)" />
                            <input type="number" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} className={INPUT_CLASS} placeholder="Original Price (Optional)" />
                        </div>
                    </div>
                    <div className="border-t border-gray-200 pt-6">
                        <div className="flex justify-between items-center mb-6">
                             <h3 className="font-bold text-gray-800">Viva Questions</h3>
                             <button onClick={addQuestion} className="bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded hover:bg-green-700 transition">+ Add Question</button>
                        </div>
                        <div className="space-y-6">
                            {questions.map((q, idx) => (
                                <div key={q.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                    <div className="flex justify-between mb-2"><span className="font-bold text-sm text-gray-600">Q{idx + 1}</span></div>
                                    <input type="text" className={`${INPUT_CLASS} mb-3`} placeholder="Viva Question..." value={q.text} onChange={(e) => updateQuestionText(q.id, e.target.value)} />
                                    <div className="mb-3">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Options (Optional for Multiple Choice)</label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {(q.options || ['', '', '', '']).map((opt, optIdx) => (
                                                <div key={optIdx} className="flex items-center gap-2">
                                                    <input type="radio" name={`viva-correct-${q.id}`} checked={q.correctAnswer === opt && opt !== ''} onChange={() => updateExpectedAnswer(q.id, opt)} className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500" />
                                                    <input type="text" className="w-full border border-gray-300 rounded p-2 text-xs outline-none focus:border-indigo-500" placeholder={`Option ${optIdx + 1}`} value={opt} onChange={(e) => updateOption(q.id, optIdx, e.target.value)} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <textarea className="w-full border border-gray-300 rounded p-2 text-xs bg-yellow-50 border-yellow-200 focus:ring-1 focus:ring-yellow-500 outline-none" placeholder="Expected Answer / Hint for student..." rows={2} value={q.correctAnswer || ''} onChange={(e) => updateExpectedAnswer(q.id, e.target.value)}></textarea>
                                </div>
                            ))}
                             {questions.length === 0 && <p className="text-gray-400 text-sm text-center italic">No viva questions added yet.</p>}
                        </div>
                    </div>
                </div>
                <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
                    <button onClick={onClose} className="px-6 py-2.5 font-bold text-gray-600 hover:bg-gray-200 rounded-lg transition">Cancel</button>
                    <button onClick={handleSave} className="px-6 py-2.5 font-bold text-white bg-indigo-800 hover:bg-indigo-900 rounded-lg shadow-lg shadow-indigo-200 transition">Publish Viva Set</button>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;

// ─── Exam Upload Tab ──────────────────────────────────────────────────────────

import { uploadExamIntelligence, listExamIntelligence, deleteExamIntelligence, ListItem } from '../services/examIntelligenceApi';
import { addBEToolkitItem } from '../services/beToolkitApi';

const ExamUploadTab: React.FC = () => {
  const [examFile, setExamFile]         = useState<File | null>(null);
  const [examStatus, setExamStatus]     = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [examMessage, setExamMessage]   = useState('');
  const [examPreview, setExamPreview]   = useState<any>(null);
  const [uploadedFiles, setUploadedFiles]       = useState<ListItem[]>([]);
  const [filesLoading, setFilesLoading]         = useState(false);
  const [deletingId, setDeletingId]             = useState<string | null>(null);
  const [deleteMessage, setDeleteMessage]       = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchUploadedFiles = async () => {
    setFilesLoading(true);
    try { const list = await listExamIntelligence(); setUploadedFiles(list); }
    catch { setUploadedFiles([]); }
    finally { setFilesLoading(false); }
  };

  useEffect(() => { fetchUploadedFiles(); }, []);

  const handleDeleteFile = async (item: ListItem) => {
    if (!window.confirm(`Delete "${item.subject} (Sem ${item.semester})"? This cannot be undone.`)) return;
    setDeletingId(item.id); setDeleteMessage(null);
    try {
      await deleteExamIntelligence(item.id);
      setUploadedFiles(prev => prev.filter(f => f.id !== item.id));
      setDeleteMessage({ type: 'success', text: `"${item.subject}" deleted successfully.` });
    } catch (err: any) {
      setDeleteMessage({ type: 'error', text: err.message || 'Failed to delete.' });
    } finally {
      setDeletingId(null);
      setTimeout(() => setDeleteMessage(null), 4000);
    }
  };

  const [toolkit, setToolkit] = useState({ title: '', type: 'project' as const, branch: '', tags: '', difficulty: 'medium' as const, summary: '', source: '', link: '' });
  const [toolkitStatus, setToolkitStatus]   = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [toolkitMessage, setToolkitMessage] = useState('');
  const [seedStatus, setSeedStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleExamFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setExamFile(file); setExamStatus('idle'); setExamMessage(''); setExamPreview(null);
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try { setExamPreview(JSON.parse(ev.target?.result as string)); }
      catch { setExamStatus('error'); setExamMessage('Invalid JSON file — could not parse.'); }
    };
    reader.readAsText(file);
  };

  const handleExamUpload = async () => {
    if (!examPreview) return;
    setExamStatus('loading'); setExamMessage('');
    try {
      const result = await uploadExamIntelligence(examPreview);
      setExamStatus('success'); setExamMessage(result.message || 'Uploaded successfully!');
      setExamFile(null); setExamPreview(null); fetchUploadedFiles();
    } catch (err: any) { setExamStatus('error'); setExamMessage(err.message || 'Upload failed.'); }
  };

  const handleLoadDemo = async () => {
    setSeedStatus('loading');
    const demo = { subject: "Data Structures & Algorithms", semester: "3", units: [{ unit: "Unit 1", title: "Arrays & Linked Lists", topics: [{ name: "Array Operations", priority: "high", weightage: 25, frequency: 8, topQuestions: ["Explain time complexity of array insertion.", "Compare arrays and linked lists."], pyqs: [{ question: "Write an algorithm to reverse an array in-place.", year: 2023, marks: 5 }, { question: "What is the difference between static and dynamic arrays?", year: 2022, marks: 3 }] }, { name: "Singly Linked List", priority: "high", weightage: 20, frequency: 7, topQuestions: ["Implement insert at head in linked list.", "How to detect a cycle in a linked list?"], pyqs: [{ question: "Write a program to reverse a singly linked list.", year: 2023, marks: 5 }] }] }, { unit: "Unit 2", title: "Stacks & Queues", topics: [{ name: "Stack Implementation", priority: "high", weightage: 15, frequency: 9, topQuestions: ["Implement stack using array.", "Applications of stack in expression evaluation."], pyqs: [{ question: "Convert infix expression to postfix using stack.", year: 2023, marks: 6 }] }] }] };
    try { await uploadExamIntelligence(demo as any); setSeedStatus('success'); }
    catch { setSeedStatus('error'); }
  };

  const handleToolkitChange = (key: string, value: string) => setToolkit(prev => ({ ...prev, [key]: value }));

  const handleToolkitSubmit = async () => {
    setToolkitStatus('loading'); setToolkitMessage('');
    try {
      const result = await addBEToolkitItem({ ...toolkit, tags: toolkit.tags.split(',').map(t => t.trim()).filter(Boolean) });
      setToolkitStatus('success'); setToolkitMessage(result.message || 'Item added!');
      setToolkit({ title: '', type: 'project', branch: '', tags: '', difficulty: 'medium', summary: '', source: '', link: '' });
    } catch (err: any) { setToolkitStatus('error'); setToolkitMessage(err.message || 'Failed to add item.'); }
  };

  const handleLoadSampleToolkit = async () => {
    setToolkitStatus('loading');
    const samples = [
      { title: "Autonomous Robot Navigation using ROS", type: "project" as const, branch: "Mechanical Engineering", tags: ["ROS", "Robotics", "Python"], difficulty: "hard" as const, summary: "A ROS-based project implementing SLAM and path planning for autonomous indoor navigation.", source: "arXiv", link: "https://arxiv.org/abs/2106.11461" },
      { title: "Deep Learning for Image Classification", type: "research" as const, branch: "Computer Engineering", tags: ["CNN", "Deep Learning", "Python"], difficulty: "medium" as const, summary: "Survey of CNN architectures for image classification tasks with benchmark comparisons.", source: "arXiv", link: "https://arxiv.org/abs/1901.06032" },
    ];
    let added = 0;
    for (const item of samples) { try { await addBEToolkitItem(item); added++; } catch {} }
    setToolkitStatus(added > 0 ? 'success' : 'error');
    setToolkitMessage(added > 0 ? `${added} sample items loaded!` : 'Failed to load samples.');
  };

  const inputClass = "w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400";

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">📥 Exam Intelligence — JSON Upload</h2>
        <p className="text-sm text-gray-500 mb-5">Upload a structured JSON file to populate exam topics, PYQs, and priorities.</p>
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-indigo-300 rounded-xl cursor-pointer bg-indigo-50 hover:bg-indigo-100 transition-colors mb-4">
          <span className="text-2xl mb-1">📂</span>
          <span className="text-sm text-indigo-700 font-medium">{examFile ? examFile.name : 'Click to select JSON file'}</span>
          <span className="text-xs text-gray-400 mt-1">Only .json files accepted</span>
          <input type="file" accept=".json" className="hidden" onChange={handleExamFileChange} />
        </label>
        {examPreview && (() => {
          const items: any[] = Array.isArray(examPreview) ? examPreview : (Array.isArray(examPreview?.subjects) ? examPreview.subjects : [examPreview]);
          const totalUnits  = items.reduce((a: number, s: any) => a + (s.units?.length ?? 0), 0);
          const totalTopics = items.reduce((a: number, s: any) => a + (s.units?.reduce((b: number, u: any) => b + (u.topics?.length ?? 0), 0) ?? 0), 0);
          return (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 text-xs text-gray-600">
              <p className="font-semibold text-gray-700 mb-2">Preview — {items.length} subject{items.length > 1 ? 's' : ''} detected</p>
              {items.map((s: any, i: number) => (<p key={i} className="text-indigo-700 font-medium">• {s.subject} <span className="text-gray-500 font-normal">(Sem {s.semester}, {s.units?.length ?? 0} units)</span></p>))}
              <p className="mt-2 text-gray-500">Total Units: <span className="font-medium text-gray-700">{totalUnits}</span> &nbsp;|&nbsp; Total Topics: <span className="font-medium text-gray-700">{totalTopics}</span></p>
            </div>
          );
        })()}
        {examMessage && (
          <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg mb-4 ${examStatus === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {examStatus === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            {examMessage}
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={handleExamUpload} disabled={!examPreview || examStatus === 'loading'} className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {examStatus === 'loading' && <Loader2 className="w-4 h-4 animate-spin" />} Upload JSON
          </button>
          <button onClick={handleLoadDemo} disabled={seedStatus === 'loading'} className="flex items-center gap-2 px-5 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors">
            {seedStatus === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : '🧪'}
            {seedStatus === 'success' ? 'Demo Loaded!' : seedStatus === 'error' ? 'Already exists' : 'Load Demo Data'}
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold text-gray-900">📋 Uploaded Exam Files</h2>
          <button onClick={fetchUploadedFiles} disabled={filesLoading} className="flex items-center gap-1 text-xs text-indigo-600 font-semibold hover:underline disabled:opacity-50">
            {filesLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : '↻'} Refresh
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">View and delete previously uploaded exam intelligence JSON files.</p>
        {deleteMessage && (
          <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg mb-4 ${deleteMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {deleteMessage.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            {deleteMessage.text}
          </div>
        )}
        {filesLoading ? (
          <div className="flex items-center justify-center py-8 text-gray-400"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...</div>
        ) : uploadedFiles.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl"><span className="text-2xl block mb-2">📭</span>No exam files uploaded yet.</div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 text-xs font-bold uppercase border-b border-gray-200">
                <tr><th className="px-4 py-3">Subject</th><th className="px-4 py-3">Semester</th><th className="px-4 py-3">Branch</th><th className="px-4 py-3">Uploaded</th><th className="px-4 py-3 text-right">Action</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {uploadedFiles.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-gray-800">{item.subject}</td>
                    <td className="px-4 py-3"><span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded">Sem {item.semester}</span></td>
                    <td className="px-4 py-3 text-gray-500">{item.branch || '—'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleDeleteFile(item)} disabled={deletingId === item.id} className="flex items-center gap-1 ml-auto text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition disabled:opacity-50">
                        {deletingId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : (<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>)}
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">🧰 BE Toolkit — Add Item</h2>
        <p className="text-sm text-gray-500 mb-5">Add a project, research paper, or case study. Only open-access links (arXiv, DOAJ, free PDFs).</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <input className={inputClass} placeholder="Title *" value={toolkit.title} onChange={e => handleToolkitChange('title', e.target.value)} />
          <input className={inputClass} placeholder="Branch (e.g. Computer Engineering) *" value={toolkit.branch} onChange={e => handleToolkitChange('branch', e.target.value)} />
          <select className={inputClass} value={toolkit.type} onChange={e => handleToolkitChange('type', e.target.value)}><option value="project">🔧 Project</option><option value="research">🔬 Research</option><option value="case-study">📋 Case Study</option></select>
          <select className={inputClass} value={toolkit.difficulty} onChange={e => handleToolkitChange('difficulty', e.target.value)}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select>
          <input className={inputClass} placeholder="Tags (comma-separated)" value={toolkit.tags} onChange={e => handleToolkitChange('tags', e.target.value)} />
          <input className={inputClass} placeholder="Source (e.g. arXiv, DOAJ) *" value={toolkit.source} onChange={e => handleToolkitChange('source', e.target.value)} />
        </div>
        <textarea className={`${inputClass} mb-3`} rows={3} placeholder="Summary *" value={toolkit.summary} onChange={e => handleToolkitChange('summary', e.target.value)} />
        <input className={`${inputClass} mb-4`} placeholder="Link (full URL) *" value={toolkit.link} onChange={e => handleToolkitChange('link', e.target.value)} />
        {toolkitMessage && (
          <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg mb-4 ${toolkitStatus === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {toolkitStatus === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            {toolkitMessage}
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={handleToolkitSubmit} disabled={toolkitStatus === 'loading'} className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {toolkitStatus === 'loading' && <Loader2 className="w-4 h-4 animate-spin" />} Add Item
          </button>
          <button onClick={handleLoadSampleToolkit} disabled={toolkitStatus === 'loading'} className="flex items-center gap-2 px-5 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors">
            🛠️ Load Sample Toolkit Data
          </button>
        </div>
      </div>
    </div>
  );
};
