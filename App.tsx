import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import LoginModal from './components/LoginModal';

// ── Eagerly loaded (small, needed on first paint) ─────────────────────────────
import Home  from './pages/Home';
import Login from './pages/Login';

// ── Lazy loaded (split into separate chunks — only downloaded when visited) ───
// Each lazy() call = a separate JS chunk in the production build.
// Heavy pages (AdminDashboard: 1,791 lines) are now only loaded when the user
// actually navigates to that route.
const About               = lazy(() => import('./pages/About'));
const BrowseCourses       = lazy(() => import('./pages/BrowseCourses'));
const CourseDetail        = lazy(() => import('./pages/CourseDetail'));
const NoteDetail          = lazy(() => import('./pages/NoteDetail'));
const QuizDetail          = lazy(() => import('./pages/QuizDetail'));
const VivaDetail          = lazy(() => import('./pages/VivaDetail'));
const NotesLibrary        = lazy(() => import('./pages/NotesLibrary'));
const Profile             = lazy(() => import('./pages/Profile'));
const AdminDashboard      = lazy(() => import('./pages/AdminDashboard'));
const SuperAdminDashboard = lazy(() => import('./pages/SuperAdminDashboard'));
const ExamIntelligence    = lazy(() => import('./pages/ExamIntelligence'));
const BEToolkit           = lazy(() => import('./pages/BEToolkit'));

// ── Loading fallback ──────────────────────────────────────────────────────────
const PageLoader: React.FC = () => (
    <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '60vh', flexDirection: 'column', gap: '12px'
    }}>
        <div style={{
            width: '32px', height: '32px', border: '3px solid #e2e8f0',
            borderTop: '3px solid #6366f1', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
);

// ── Error boundary — catches lazy load failures (e.g. stale chunk after deploy)
class ErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean }
> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() { return { hasError: true }; }
    componentDidCatch(error: Error) {
        console.error('[ErrorBoundary]', error);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                    <h2 style={{ color: '#1e293b', marginBottom: '8px' }}>Something went wrong</h2>
                    <p style={{ color: '#64748b', marginBottom: '24px' }}>
                        The page failed to load. This usually fixes itself.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{ padding: '8px 20px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}
                    >
                        Reload page
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

const AuthModalWrapper = () => {
    const { showLoginModal } = useAuth();
    return showLoginModal ? <LoginModal /> : null;
};

const App: React.FC = () => {
    return (
        <AuthProvider>
            <Router>
                <div className="min-h-screen bg-slate-50">
                    <Navbar />
                    <AuthModalWrapper />
                    <ErrorBoundary>
                        <Suspense fallback={<PageLoader />}>
                            <Routes>
                                <Route path="/"                 element={<Home />} />
                                <Route path="/login"            element={<Login />} />
                                <Route path="/about"            element={<About />} />
                                <Route path="/browse"           element={<BrowseCourses />} />
                                <Route path="/course/:id"       element={<CourseDetail />} />
                                <Route path="/note/:id"         element={<NoteDetail />} />
                                <Route path="/quiz/:id"         element={<QuizDetail />} />
                                <Route path="/viva/:id"         element={<VivaDetail />} />
                                <Route path="/notes"            element={<NotesLibrary />} />
                                <Route path="/profile"          element={<Profile />} />
                                <Route path="/admin"            element={<AdminDashboard />} />
                                <Route path="/teacher/upload"   element={<AdminDashboard />} />
                                <Route path="/super-admin"      element={<SuperAdminDashboard />} />
                                <Route path="/exam-intelligence" element={<ExamIntelligence />} />
                                <Route path="/be-toolkit"       element={<BEToolkit />} />
                                <Route path="*"                 element={<Navigate to="/" replace />} />
                            </Routes>
                        </Suspense>
                    </ErrorBoundary>
                </div>
            </Router>
        </AuthProvider>
    );
};

export default App;
