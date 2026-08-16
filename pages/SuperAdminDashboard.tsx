import React, { useState, useEffect, useCallback } from 'react';
import { User, UserRole, Course, Note } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { uploadExamIntelligence } from '../services/examIntelligenceApi';
import AdminBroadcastModal from '../components/AdminBroadcastModal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TeacherStats {
    totalProducts: number;
    totalCourses: number;
    totalNotes: number;
    totalSales: number;
    platformFee: number;
    netPayable: number;
    totalPaid: number;
    pendingPayout: number;
}

interface PayoutRecord {
    id: string;
    teacherId: string;
    amount: number;
    grossAmount: number;
    platformFee: number;
    status: 'PENDING' | 'COMPLETED';
    transactionId?: string;
    completedAt?: string;
    createdAt: string;
}

interface TeacherRow {
    teacher: User & { upiId?: string };
    stats: TeacherStats;
    pendingPayout: PayoutRecord | null;
    lastCompleted: PayoutRecord | null;
}

// ─── Super Admin Login ────────────────────────────────────────────────────────

const SuperAdminLogin: React.FC = () => {
    const { sendOtp, isLoading, error, setError, updateUser } = useAuth();
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [verifying, setVerifying] = useState(false);

    const SUPER_ADMIN_EMAIL = import.meta.env.VITE_SUPER_ADMIN_EMAIL || 'buildinpublicengineers@gmail.com';

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (email.toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase()) {
            setError('Access Restricted: Invalid Super Admin Email');
            return;
        }
        try { await sendOtp(email); setOtpSent(true); }
        catch (err) { console.error(err); }
    };

    const handleVerifyLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setVerifying(true);
        try {
            const { token, user: userData } = await api.superAdminLogin(email, otp);
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(userData));
            localStorage.setItem('lastActivity', Date.now().toString());
            updateUser(userData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
        } finally { setVerifying(false); }
    };

    const loading = isLoading || verifying;

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                <div className="text-center mb-8">
                    <div className="bg-slate-900 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl border border-slate-800">
                        <span className="text-3xl">🛡️</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Super Admin Access</h1>
                    <p className="text-slate-500 text-sm mt-2">Restricted Area. Authorized Personnel Only.</p>
                </div>
                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg text-center font-medium">
                        {error}
                    </div>
                )}
                {!otpSent ? (
                    <form onSubmit={handleSendOtp} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Admin Email</label>
                            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                                placeholder="Enter authorized email" />
                        </div>
                        <button type="submit" disabled={loading}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed">
                            {loading ? 'Sending Code...' : 'Request Access Code'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyLogin} className="space-y-4">
                        <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-lg border border-blue-100">
                            Security code sent to <strong>{email}</strong>. Please check your inbox.
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Security Code</label>
                            <input type="text" required value={otp} onChange={e => setOtp(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none text-center text-2xl tracking-[0.5em] font-mono"
                                placeholder="••••••" autoFocus />
                        </div>
                        <button type="submit" disabled={loading}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed">
                            {loading ? 'Verifying...' : 'Verify & Enter'}
                        </button>
                        <button type="button" onClick={() => { setOtpSent(false); setOtp(''); setError(null); }}
                            className="w-full text-slate-400 text-xs font-bold hover:text-slate-600">
                            Cancel & Retry
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

// ─── Student Management Components ──────────────────────────────────────────

const AccessModal: React.FC<{
    student: User;
    courses: Course[];
    notes: Note[];
    onClose: () => void;
    onUpdate: (updatedUser: User) => void;
}> = ({ student, courses, notes, onClose, onUpdate }) => {
    const [loading, setLoading] = useState<string | null>(null);

    const handleToggleAccess = async (itemId: string, type: 'course' | 'note', isGranted: boolean) => {
        setLoading(itemId);
        try {
            const updated = isGranted 
                ? await api.revokeAccess(student.id, itemId, type)
                : await api.grantAccess(student.id, itemId, type);
            onUpdate(updated);
        } catch (err) {
            alert('Action failed');
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900">Manage Access: {student.name}</h3>
                    <p className="text-sm text-gray-500">{student.email}</p>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Courses */}
                    <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Courses</h4>
                        <div className="grid grid-cols-1 gap-2">
                            {courses.map(c => {
                                const hasAccess = student.purchasedCourseIds?.includes(c.id);
                                return (
                                    <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                        <span className="text-sm font-medium text-gray-700">{c.title}</span>
                                        <button 
                                            onClick={() => handleToggleAccess(c.id, 'course', hasAccess)}
                                            disabled={!!loading}
                                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                hasAccess 
                                                    ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                                                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                            }`}
                                        >
                                            {loading === c.id ? '...' : (hasAccess ? 'Revoke' : 'Grant')}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Notes</h4>
                        <div className="grid grid-cols-1 gap-2">
                            {notes.map(n => {
                                const hasAccess = student.purchasedNoteIds?.includes(n.id);
                                return (
                                    <div key={n.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                        <span className="text-sm font-medium text-gray-700">{n.title}</span>
                                        <button 
                                            onClick={() => handleToggleAccess(n.id, 'note', hasAccess)}
                                            disabled={!!loading}
                                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                hasAccess 
                                                    ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                                                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                            }`}
                                        >
                                            {loading === n.id ? '...' : (hasAccess ? 'Revoke' : 'Grant')}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50 text-right">
                    <button onClick={onClose} className="px-6 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-50">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

const CreditsModal: React.FC<{
    student: User;
    onClose: () => void;
    onUpdate: (updatedUser: User) => void;
}> = ({ student, onClose, onUpdate }) => {
    const [credits, setCredits] = useState(student.credits || 0);
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        try {
            const updated = await api.updateUserCredits(student.id, credits);
            onUpdate(updated);
            onClose();
        } catch (err) {
            alert('Failed to update credits');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Manage Credits: {student.name}</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Available Credits</label>
                        <input 
                            type="number" 
                            value={credits} 
                            onChange={e => setCredits(parseInt(e.target.value) || 0)}
                            className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 outline-none text-2xl font-bold"
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button onClick={onClose} className="flex-1 py-3 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-xl">Cancel</button>
                        <button 
                            onClick={handleSave} 
                            disabled={loading}
                            className="flex-1 py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Confirm Payment Modal ────────────────────────────────────────────────────

interface ConfirmModalProps {
    payout: PayoutRecord;
    teacher: User & { upiId?: string };
    onConfirm: (txnId: string) => Promise<void>;
    onClose: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ payout, teacher, onConfirm, onClose }) => {
    const [txnId, setTxnId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!txnId.trim()) { setError('Transaction ID is required'); return; }
        setLoading(true);
        try { await onConfirm(txnId.trim()); }
        catch (err) { setError(err instanceof Error ? err.message : 'Failed'); }
        finally { setLoading(false); }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Confirm Payment</h3>
                <p className="text-sm text-gray-500 mb-4">Enter the UPI transaction ID after paying <strong>{teacher.name}</strong></p>
                <div className="bg-indigo-50 rounded-xl p-3 mb-4 text-center">
                    <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider">Amount Paid</p>
                    <p className="text-3xl font-bold text-indigo-900">₹{payout.amount.toLocaleString()}</p>
                </div>
                {error && <p className="text-red-500 text-xs mb-3 font-medium">{error}</p>}
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">UPI Transaction ID</label>
                        <input type="text" required value={txnId} onChange={e => setTxnId(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                            placeholder="e.g. 4038291029384756" autoFocus />
                    </div>
                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2.5 font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition text-sm">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading}
                            className="flex-1 py-2.5 font-bold text-white bg-green-600 hover:bg-green-700 rounded-xl transition text-sm disabled:opacity-70">
                            {loading ? 'Saving...' : 'Mark as Paid ✓'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── Pay Now Modal (QR) ───────────────────────────────────────────────────────

interface PayModalProps {
    row: TeacherRow;
    qrUrl: string;
    upiString: string;
    payout: PayoutRecord;
    onConfirmClick: () => void;
    onClose: () => void;
}

const PayModal: React.FC<PayModalProps> = ({ row, qrUrl, upiString, payout, onConfirmClick, onClose }) => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-indigo-900 p-5 text-white text-center">
                <p className="text-indigo-300 text-xs font-bold uppercase tracking-wider">Payout to</p>
                <h2 className="text-2xl font-bold mt-1">{row.teacher.name}</h2>
                <p className="text-indigo-200 text-sm mt-0.5">{row.teacher.upiId}</p>
            </div>
            <div className="p-6 flex flex-col items-center">
                <div className="mb-4 text-center">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Amount</p>
                    <p className="text-4xl font-bold text-gray-900">₹{payout.amount.toLocaleString()}</p>
                    <p className="text-xs text-gray-400 mt-1">After 10% platform fee deducted</p>
                </div>
                <div className="bg-white p-3 rounded-xl border-2 border-dashed border-gray-200 mb-4">
                    <img src={qrUrl} alt="UPI QR" className="w-48 h-48 object-contain" />
                </div>
                <a href={upiString}
                    className="w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl mb-3 transition text-sm">
                    Open in UPI App
                </a>
                <p className="text-xs text-gray-400 text-center mb-4">
                    Scan with GPay, PhonePe, or Paytm. After paying, click "I've Paid".
                </p>
                <div className="flex gap-3 w-full">
                    <button onClick={onClose} className="flex-1 py-2.5 font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition text-sm">
                        Close
                    </button>
                    <button onClick={onConfirmClick} className="flex-1 py-2.5 font-bold text-white bg-green-600 hover:bg-green-700 rounded-xl transition text-sm">
                        I've Paid →
                    </button>
                </div>
            </div>
        </div>
    </div>
);

// ─── Teacher Payout History Modal ─────────────────────────────────────────────

interface HistoryModalProps {
    teacher: User & { upiId?: string };
    onClose: () => void;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ teacher, onClose }) => {
    const [data, setData] = useState<{ payouts: PayoutRecord[]; stats: TeacherStats } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getTeacherPayoutHistory(teacher.id)
            .then(setData)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [teacher.id]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
                <div className="bg-slate-900 p-5 text-white flex items-center justify-between">
                    <div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Payout History</p>
                        <h2 className="text-xl font-bold">{teacher.name}</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl font-light">×</button>
                </div>

                {loading ? (
                    <div className="p-10 text-center text-gray-400">Loading...</div>
                ) : data ? (
                    <div className="p-5">
                        {/* Stats summary */}
                        <div className="grid grid-cols-2 gap-3 mb-5">
                            {[
                                { label: 'Total Earnings', value: `₹${data.stats.totalSales.toLocaleString()}`, color: 'text-gray-900' },
                                { label: 'Platform Fee (10%)', value: `₹${data.stats.platformFee.toLocaleString()}`, color: 'text-red-500' },
                                { label: 'Total Paid', value: `₹${data.stats.totalPaid.toLocaleString()}`, color: 'text-green-600' },
                                { label: 'Pending', value: `₹${data.stats.pendingPayout.toLocaleString()}`, color: 'text-amber-600' },
                            ].map(s => (
                                <div key={s.label} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">{s.label}</p>
                                    <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                                </div>
                            ))}
                        </div>

                        {/* Payout records */}
                        <div className="max-h-64 overflow-y-auto space-y-2">
                            {data.payouts.length === 0 ? (
                                <p className="text-center text-gray-400 py-6 text-sm">No payouts yet.</p>
                            ) : data.payouts.map(p => (
                                <div key={p.id} className="flex items-center justify-between bg-gray-50 rounded-xl p-3 border border-gray-100">
                                    <div>
                                        <p className="font-bold text-gray-900 text-sm">₹{p.amount.toLocaleString()}</p>
                                        <p className="text-xs text-gray-400">{new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                        {p.transactionId && <p className="text-xs text-gray-400 font-mono">TXN: {p.transactionId}</p>}
                                    </div>
                                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${p.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {p.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="p-10 text-center text-red-400">Failed to load data.</div>
                )}
            </div>
        </div>
    );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────

type Tab = 'TEACHERS' | 'STUDENTS' | 'EXAM_PREP';

const SuperAdminDashboard: React.FC = () => {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('TEACHERS');
    const [loading, setLoading] = useState(true);

    // ── Teacher Stats state ──
    const [rows, setRows] = useState<TeacherRow[]>([]);

    // ── Student management state ──
    const [students, setStudents] = useState<User[]>([]);
    const [studentSearch, setStudentSearch] = useState('');
    const [studentLoading, setStudentLoading] = useState(false);
    const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
    const [availableNotes, setAvailableNotes] = useState<Note[]>([]);
    const [accessModal, setAccessModal] = useState<User | null>(null);
    const [creditsModal, setCreditsModal] = useState<User | null>(null);

    // ── Exam Upload state ──
    const [showExamUpload, setShowExamUpload] = useState(false);
    const [examUploadText, setExamUploadText] = useState('');
    const [examUploading, setExamUploading]   = useState(false);
    const [examUploadResult, setExamUploadResult] = useState<{ message: string; saved: string[]; skipped: string[] } | null>(null);
    const [examUploadError, setExamUploadError]   = useState('');

    // Modal state for Teachers
    const [payModal, setPayModal] = useState<{ row: TeacherRow; qrUrl: string; upiString: string; payout: PayoutRecord } | null>(null);
    const [confirmModal, setConfirmModal] = useState<{ payout: PayoutRecord; teacher: User & { upiId?: string } } | null>(null);
    const [historyModal, setHistoryModal] = useState<(User & { upiId?: string }) | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getTeachersWithStats();
            setRows(data);
        } catch (err) {
            console.error('Failed to fetch', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchStudents = useCallback(async (search = '') => {
        setStudentLoading(true);
        try {
            const { data } = await api.getUsers(search, UserRole.STUDENT);
            setStudents(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setStudentLoading(false);
        }
    }, []);

    const fetchContent = useCallback(async () => {
        try {
            const [courses, notes] = await Promise.all([
                api.getCourses(),
                api.getNotes()
            ]);
            setAvailableCourses(courses);
            setAvailableNotes(notes);
        } catch (err) {
            console.error(err);
        }
    }, []);

    useEffect(() => {
        if (user?.role === UserRole.SUPER_ADMIN) {
            if (activeTab === 'TEACHERS') fetchData();
            if (activeTab === 'STUDENTS') {
                fetchStudents();
                fetchContent();
            }
        }
    }, [user, activeTab, fetchData, fetchStudents, fetchContent]);

    const handleExamUpload = async () => {
        setExamUploadError(''); setExamUploadResult(null);
        let parsed: any;
        try { parsed = JSON.parse(examUploadText.trim()); }
        catch { setExamUploadError('Invalid JSON — please check the format and try again.'); return; }
        setExamUploading(true);
        try {
            const result = await uploadExamIntelligence(parsed);
            setExamUploadResult(result);
            setExamUploadText('');
        } catch (err) {
            setExamUploadError(err instanceof Error ? err.message : 'Upload failed');
        } finally { setExamUploading(false); }
    };

    const handleExamFileLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => setExamUploadText(ev.target?.result as string ?? '');
        reader.readAsText(file);
        e.target.value = '';
    };

    if (!user || user.role !== UserRole.SUPER_ADMIN) return <SuperAdminLogin />;

    // ── Handlers ────────────────────────────────────────────────────────────

    const handlePayClick = async (row: TeacherRow) => {
        setActionError(null);
        // If there's already a pending payout, just show the QR again
        if (row.pendingPayout) {
            const upiString = `upi://pay?pa=${encodeURIComponent(row.teacher.upiId || '')}&pn=${encodeURIComponent(row.teacher.name)}&am=${row.pendingPayout.amount.toFixed(2)}&cu=INR`;
            setPayModal({
                row,
                payout: row.pendingPayout,
                upiString,
                qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiString)}`,
            });
            return;
        }
        // Create a new payout
        try {
            const result = await api.createPayout(row.teacher.id);
            setPayModal({ row, payout: result.payout, qrUrl: result.qrUrl, upiString: result.upiString });
            await fetchData(); // refresh table state
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Failed to create payout');
        }
    };

    const handleConfirm = async (txnId: string) => {
        if (!confirmModal) return;
        await api.confirmPayout(confirmModal.payout.id, txnId);
        setConfirmModal(null);
        setPayModal(null);
        await fetchData();
    };

    const handleUserUpdate = (updated: User) => {
        setStudents(prev => prev.map(s => s.id === updated.id ? updated : s));
        if (accessModal?.id === updated.id) setAccessModal(updated);
        if (creditsModal?.id === updated.id) setCreditsModal(updated);
    };

    const handleRevokeAllStudents = async () => {
        if (!confirm('Are you absolutely sure you want to revoke ALL student accesses for all purchased courses and notes? This is usually done after exams are completed.')) return;
        try {
            const res = await api.revokeAllStudentAccess();
            alert(res.message);
            fetchStudents(studentSearch);
        } catch (err: any) {
            alert(err.message || 'Failed to revoke access');
        }
    };

    const handleRevertRevokeAllStudents = async () => {
        if (!confirm('Are you sure you want to revert the last global revoke action? This will restore previously archived accesses to all students.')) return;
        try {
            const res = await api.revertRevokeAllStudentAccess();
            alert(res.message);
            fetchStudents(studentSearch);
        } catch (err: any) {
            alert(err.message || 'Failed to revert access');
        }
    };

    // ── Totals ────────────────────────────────────────────────────────────

    const totalSales    = rows.reduce((a, r) => a + r.stats.totalSales, 0);
    const totalFee      = rows.reduce((a, r) => a + r.stats.platformFee, 0);
    const totalPending  = rows.reduce((a, r) => a + r.stats.pendingPayout, 0);

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900">

            {/* Header */}
            <header className="bg-indigo-900 text-white shadow-lg sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/10 p-2 rounded-lg"><span className="text-xl">🛡️</span></div>
                        <h1 className="text-xl font-bold tracking-tight">Super Admin Dashboard</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <p className="text-xs text-indigo-300 font-medium uppercase tracking-wider">Logged in as</p>
                            <p className="font-bold">{user.name}</p>
                        </div>
                        <button onClick={logout} className="bg-white/10 hover:bg-white/20 text-white text-sm font-bold px-4 py-2 rounded-lg transition-all">
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Tabs */}
                <div className="flex gap-1 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 mb-8 w-fit">
                    {[
                        { id: 'TEACHERS', label: 'Teachers', icon: '👨‍🏫' },
                        { id: 'STUDENTS', label: 'Students', icon: '🎓' },
                        { id: 'EXAM_PREP', label: 'Exam Prep', icon: '📝' },
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id as Tab)}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                                activeTab === t.id 
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                                    : 'text-gray-500 hover:bg-gray-50'
                            }`}
                        >
                            <span>{t.icon}</span>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Stats Cards (Teacher View Only) */}
                {activeTab === 'TEACHERS' && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
                        {[
                            { label: 'Total Teachers', value: rows.length, color: 'text-gray-900', icon: '👨‍🏫' },
                            { label: 'Gross Sales', value: `₹${totalSales.toLocaleString()}`, color: 'text-gray-900', icon: '💰' },
                            { label: 'Platform Revenue (10%)', value: `₹${totalFee.toLocaleString()}`, color: 'text-indigo-700', icon: '📊' },
                            { label: 'Total Pending Payouts', value: `₹${totalPending.toLocaleString()}`, color: 'text-amber-600', icon: '⏳' },
                        ].map(c => (
                            <div key={c.label} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-lg">{c.icon}</span>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{c.label}</p>
                                </div>
                                <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── TEACHERS TAB ── */}
                {activeTab === 'TEACHERS' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in duration-500">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-gray-800">Teacher Payout Management</h2>
                            <button onClick={fetchData} className="text-indigo-600 hover:text-indigo-800 text-sm font-bold flex items-center gap-1">
                                <span>↻</span> Refresh
                            </button>
                        </div>

                        {loading ? (
                            <div className="p-12 text-center text-gray-400">Loading data...</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-200">
                                            <th className="px-5 py-4">Teacher</th>
                                            <th className="px-5 py-4 text-center">Products</th>
                                            <th className="px-5 py-4 text-right">Total Sales</th>
                                            <th className="px-5 py-4 text-right text-red-400">Fee (10%)</th>
                                            <th className="px-5 py-4 text-right text-green-500">Net Payable</th>
                                            <th className="px-5 py-4 text-right text-gray-500">Total Paid</th>
                                            <th className="px-5 py-4 text-right text-amber-500">Pending</th>
                                            <th className="px-5 py-4 text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {rows.map(row => {
                                            const { teacher, stats, pendingPayout, lastCompleted } = row;
                                            const hasPending  = !!pendingPayout;
                                            const hasCompleted = !!lastCompleted;

                                            return (
                                                <tr key={teacher.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <img src={teacher.avatar} alt="" className="w-9 h-9 rounded-full bg-gray-200 flex-shrink-0" />
                                                            <div>
                                                                <p className="font-bold text-gray-900 text-sm">{teacher.name}</p>
                                                                <p className="text-xs text-gray-400">{teacher.email}</p>
                                                                {teacher.upiId ? (
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 mt-0.5">
                                                                        {teacher.upiId}
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700 mt-0.5">
                                                                        No UPI ID
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4 text-center">
                                                        <div className="text-sm font-bold text-gray-700">{stats.totalProducts}</div>
                                                        <div className="text-xs text-gray-400">{stats.totalCourses}c · {stats.totalNotes}n</div>
                                                    </td>
                                                    <td className="px-5 py-4 text-right font-bold text-gray-900">₹{stats.totalSales.toLocaleString()}</td>
                                                    <td className="px-5 py-4 text-right font-medium text-red-500">-₹{stats.platformFee.toLocaleString()}</td>
                                                    <td className="px-5 py-4 text-right font-bold text-green-600">₹{stats.netPayable.toLocaleString()}</td>
                                                    <td className="px-5 py-4 text-right font-medium text-gray-500">₹{stats.totalPaid.toLocaleString()}</td>
                                                    <td className="px-5 py-4 text-right font-bold text-amber-600">₹{stats.pendingPayout.toLocaleString()}</td>
                                                    <td className="px-5 py-4">
                                                        <div className="flex flex-col items-center gap-1.5">
                                                            <button onClick={() => setHistoryModal(teacher as any)}
                                                                className="text-xs text-indigo-500 hover:text-indigo-700 font-bold underline underline-offset-2">
                                                                History
                                                            </button>

                                                            {hasPending ? (
                                                                <div className="flex flex-col items-center gap-1">
                                                                    <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                                                        QR Generated
                                                                    </span>
                                                                    <button onClick={() => handlePayClick(row)}
                                                                        className="text-xs bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 py-1.5 rounded-lg transition">
                                                                        View QR
                                                                    </button>
                                                                    <button onClick={() => setConfirmModal({ payout: pendingPayout, teacher: teacher as any })}
                                                                        className="text-xs bg-green-600 hover:bg-green-700 text-white font-bold px-3 py-1.5 rounded-lg transition">
                                                                        Confirm Paid
                                                                    </button>
                                                                </div>
                                                            ) : hasCompleted && stats.pendingPayout <= 0 ? (
                                                                <div className="text-center">
                                                                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                                                                        ✓ All Paid
                                                                    </span>
                                                                    {lastCompleted?.transactionId && (
                                                                        <p className="text-xs text-gray-400 font-mono mt-0.5">{lastCompleted.transactionId.slice(0, 10)}…</p>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handlePayClick(row)}
                                                                    disabled={stats.pendingPayout <= 0 || !teacher.upiId}
                                                                    className="text-xs bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-bold px-4 py-2 rounded-lg transition">
                                                                    Pay Now
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {rows.length === 0 && (
                                            <tr>
                                                <td colSpan={8} className="px-5 py-12 text-center text-gray-400 italic">
                                                    No teachers found.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* ── STUDENTS TAB ── */}
                {activeTab === 'STUDENTS' && (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        {/* WhatsApp Broadcast Module */}
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
                            <AdminBroadcastModal />
                        </div>

                        {/* Search Bar */}
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex flex-col sm:flex-row justify-between gap-4">
                            <div className="flex-1 relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                                <input 
                                    type="text" 
                                    placeholder="Search by name, email or phone..." 
                                    value={studentSearch}
                                    onChange={e => setStudentSearch(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && fetchStudents(studentSearch)}
                                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                />
                            </div>
                            <button 
                                onClick={() => fetchStudents(studentSearch)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-3 rounded-xl transition-all shadow-lg shadow-indigo-100"
                            >
                                Search
                            </button>
                            <button 
                                onClick={handleRevokeAllStudents}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-3 rounded-xl transition-all shadow-lg shadow-red-100 whitespace-nowrap text-sm"
                            >
                                Revoke All Access
                            </button>
                            <button 
                                onClick={handleRevertRevokeAllStudents}
                                className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-3 rounded-xl transition-all shadow-lg shadow-amber-100 whitespace-nowrap text-sm"
                            >
                                Revert Revoke
                            </button>
                        </div>

                        {/* Students Table */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                                <h2 className="text-lg font-bold text-gray-800">Student Directory</h2>
                                <div className="flex items-center gap-4">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{(students || []).length} Students found</span>
                                    <button onClick={() => fetchStudents(studentSearch)} className="text-indigo-600 hover:text-indigo-800 text-sm font-bold flex items-center gap-1">
                                        <span>↻</span> Refresh
                                    </button>
                                </div>
                            </div>

                            {studentLoading ? (
                                <div className="p-12 text-center text-gray-400">Searching students...</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-200">
                                                <th className="px-5 py-4">Student</th>
                                                <th className="px-5 py-4">WhatsApp</th>
                                                <th className="px-5 py-4 text-center">Credits</th>
                                                <th className="px-5 py-4 text-center">Purchases</th>
                                                <th className="px-5 py-4 text-center">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {(students || []).map(s => (
                                                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                                                                {s.name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-gray-900 text-sm">{s.name}</p>
                                                                <p className="text-xs text-gray-400">{s.email}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <span className="text-sm font-mono text-gray-600">{s.phoneNumber || '—'}</span>
                                                    </td>
                                                    <td className="px-5 py-4 text-center">
                                                        <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-bold border border-amber-100">
                                                            <span>✨</span> {s.credits || 0}
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4 text-center">
                                                        <div className="text-xs font-bold text-gray-500">
                                                            {(s.purchasedCourseIds || []).length}c · {(s.purchasedNoteIds || []).length}n
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <div className="flex justify-center gap-2">
                                                            <button 
                                                                onClick={() => setCreditsModal(s)}
                                                                className="text-xs bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-bold px-3 py-1.5 rounded-lg transition"
                                                            >
                                                                Credits
                                                            </button>
                                                            <button 
                                                                onClick={() => setAccessModal(s)}
                                                                className="text-xs bg-gray-900 text-white hover:bg-slate-800 font-bold px-3 py-1.5 rounded-lg transition"
                                                            >
                                                                Manage Access
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {(!students || students.length === 0) && (
                                                <tr>
                                                    <td colSpan={5} className="px-5 py-12 text-center text-gray-400 italic">
                                                        No students found matching your search.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── EXAM PREP TAB ── */}
                {activeTab === 'EXAM_PREP' && (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                            <div className="bg-indigo-900 px-5 py-4">
                                <h3 className="text-white font-bold">Upload Exam Intelligence JSON</h3>
                                <p className="text-indigo-300 text-xs mt-0.5">Paste JSON or load from a file. Duplicates are auto-skipped.</p>
                            </div>
                            <div className="p-5 space-y-4">
                                {/* File picker */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Load from File</label>
                                    <label className="inline-flex items-center gap-2 cursor-pointer px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg transition border border-gray-200">
                                        <span>📂</span> Choose JSON File
                                        <input type="file" accept=".json,application/json" onChange={handleExamFileLoad} className="hidden" />
                                    </label>
                                    {examUploadText && (
                                        <span className="ml-3 text-xs text-green-600 font-medium">✓ File loaded ({examUploadText.length.toLocaleString()} chars)</span>
                                    )}
                                </div>

                                {/* JSON textarea */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Or Paste JSON</label>
                                    <textarea
                                        value={examUploadText}
                                        onChange={e => setExamUploadText(e.target.value)}
                                        rows={12}
                                        className="w-full border border-gray-200 rounded-xl p-3 font-mono text-xs text-gray-800 bg-gray-50 focus:ring-2 focus:ring-indigo-400 outline-none resize-y"
                                        placeholder={`// Single subject:\n{\n  "subject": "Engineering Mathematics III",\n  "semester": "5",\n  "branch": "CS",\n  "year": "TE",\n  "units": [...]\n}\n\n// Or an array:\n[{ "subject": "...", ... }, { "subject": "...", ... }]`}
                                    />
                                </div>

                                {/* Result */}
                                {examUploadResult && (
                                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                                        <p className="text-green-800 font-bold text-sm mb-1">✅ {examUploadResult.message}</p>
                                        {examUploadResult.saved.length > 0 && <p className="text-green-700 text-xs">Saved: {examUploadResult.saved.join(', ')}</p>}
                                        {examUploadResult.skipped.length > 0 && <p className="text-amber-600 text-xs mt-0.5">Skipped (duplicates): {examUploadResult.skipped.join(', ')}</p>}
                                    </div>
                                )}
                                {examUploadError && (
                                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                        <p className="text-red-700 font-bold text-sm">❌ {examUploadError}</p>
                                    </div>
                                )}

                                <button
                                    onClick={handleExamUpload}
                                    disabled={examUploading || !examUploadText.trim()}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition shadow-lg shadow-indigo-100">
                                    {examUploading
                                        ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Uploading...</>
                                        : <><span>⬆️</span> Upload</>}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Modals for Teachers */}
            {payModal && (
                <PayModal
                    row={payModal.row}
                    qrUrl={payModal.qrUrl}
                    upiString={payModal.upiString}
                    payout={payModal.payout}
                    onConfirmClick={() => setConfirmModal({ payout: payModal.payout, teacher: payModal.row.teacher as any })}
                    onClose={() => setPayModal(null)}
                />
            )}

            {confirmModal && (
                <ConfirmModal
                    payout={confirmModal.payout}
                    teacher={confirmModal.teacher}
                    onConfirm={handleConfirm}
                    onClose={() => setConfirmModal(null)}
                />
            )}

            {historyModal && (
                <HistoryModal
                    teacher={historyModal}
                    onClose={() => setHistoryModal(null)}
                />
            )}

            {/* Modals for Students */}
            {accessModal && (
                <AccessModal 
                    student={accessModal}
                    courses={availableCourses}
                    notes={availableNotes}
                    onClose={() => setAccessModal(null)}
                    onUpdate={handleUserUpdate}
                />
            )}

            {creditsModal && (
                <CreditsModal 
                    student={creditsModal}
                    onClose={() => setCreditsModal(null)}
                    onUpdate={handleUserUpdate}
                />
            )}
        </div>
    );
};

export default SuperAdminDashboard;
