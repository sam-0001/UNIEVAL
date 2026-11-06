import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

export type TeacherView = 'LOGIN' | 'SIGNUP' | 'FORGOT_PASSWORD';

export const TeacherLogin: React.FC = () => {
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

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            await login(email, password);
        } catch { /* error shown via context */ }
    };

    const handleSignupStep1 = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !email || !password) { setError('Please fill in all fields.'); return; }
        setError(null);
        try {
            await sendOtp(email);
            setOtpSent(true);
        } catch { /* error shown via context */ }
    };

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

    const handleForgotStep1 = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) { setError('Please enter your email.'); return; }
        setError(null);
        try {
            await sendOtp(email);
            setOtpSent(true);
        } catch { /* error shown via context */ }
    };

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

                {error && (
                    <div className="mb-5 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg text-center">
                        {error}
                    </div>
                )}

                {/* LOGIN FORM */}
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

                {/* SIGNUP FORM */}
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

                {/* FORGOT PASSWORD FORM */}
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

                {/* RESET SUCCESS */}
                {view === 'FORGOT_PASSWORD' && resetSuccess && (
                    <div className="text-center space-y-4">
                        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                            <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <p className="text-sm text-slate-600">You can now log in with your new password.</p>
                        <button onClick={() => switchView('LOGIN')}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-200 transition-all">
                            Back to Login
                        </button>
                    </div>
                )}

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

export default TeacherLogin;
