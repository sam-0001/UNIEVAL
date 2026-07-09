import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole, User } from '../types';

type AuthView = 'LOGIN' | 'SIGNUP' | 'FORGOT_PASSWORD';

// Signup has 3 steps:
//   1 = fill details (name / email / phone / password)
//   2 = verify email OTP
//   3 = verify mobile OTP → register
type SignupStep = 1 | 2 | 3;

// ─── Password Requirements ────────────────────────────────────────────────────
interface PasswordRule {
  id: string;
  label: string;
  test: (pwd: string) => boolean;
}

const PASSWORD_RULES: PasswordRule[] = [
  { id: 'length',    label: 'At least 8 characters',           test: (p) => p.length >= 8 },
  { id: 'uppercase', label: 'One uppercase letter (A–Z)',       test: (p) => /[A-Z]/.test(p) },
  { id: 'lowercase', label: 'One lowercase letter (a–z)',       test: (p) => /[a-z]/.test(p) },
  { id: 'number',    label: 'One number (0–9)',                 test: (p) => /[0-9]/.test(p) },
  { id: 'special',   label: 'One special character (!@#$…)',    test: (p) => /[^A-Za-z0-9]/.test(p) },
];

// ─── Password Strength Meter Component ───────────────────────────────────────
const PasswordStrengthMeter: React.FC<{ password: string }> = ({ password }) => {
  const results = useMemo(
    () => PASSWORD_RULES.map((rule) => ({ ...rule, passed: rule.test(password) })),
    [password]
  );

  const passedCount = results.filter((r) => r.passed).length;

  const strengthConfig = [
    { label: '',        color: 'bg-gray-200' },
    { label: 'Weak',    color: 'bg-red-500'    },
    { label: 'Fair',    color: 'bg-orange-400' },
    { label: 'Good',    color: 'bg-yellow-400' },
    { label: 'Strong',  color: 'bg-emerald-400'},
    { label: 'Perfect', color: 'bg-emerald-500'},
  ];
  const strength = password.length === 0 ? 0 : passedCount;
  const { label: strengthLabel, color: strengthColor } = strengthConfig[strength];

  if (password.length === 0) return null;

  return (
    <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
      <div>
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-semibold text-gray-500">Password strength</span>
          {strengthLabel && (
            <span className={`text-xs font-bold transition-colors duration-300 ${
              passedCount <= 1 ? 'text-red-500' :
              passedCount === 2 ? 'text-orange-500' :
              passedCount === 3 ? 'text-yellow-500' :
              passedCount === 4 ? 'text-emerald-500' :
              'text-emerald-600'
            }`}>{strengthLabel}</span>
          )}
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((seg) => (
            <div key={seg} className={`h-1.5 flex-1 rounded-full transition-all duration-400 ${seg <= passedCount ? strengthColor : 'bg-gray-200'}`} />
          ))}
        </div>
      </div>
      <ul className="space-y-1.5">
        {results.map((rule) => (
          <li key={rule.id} className={`flex items-center gap-2 text-xs font-medium transition-all duration-300 ${rule.passed ? 'text-emerald-600' : 'text-gray-400'}`}>
            <span className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-all duration-300 ${rule.passed ? 'bg-emerald-100 text-emerald-600 scale-110' : 'bg-gray-100 text-gray-300'}`}>
              {rule.passed ? (
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <circle cx="12" cy="12" r="5" />
                </svg>
              )}
            </span>
            <span className={`transition-colors duration-300 ${rule.passed ? 'line-through decoration-emerald-300' : ''}`}>{rule.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

// ─── Resend Countdown Hook ────────────────────────────────────────────────────
const RESEND_COOLDOWN = 45;

function useResendCountdown() {
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = () => { setCountdown(RESEND_COOLDOWN); };

  useEffect(() => {
    if (countdown <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { if (timerRef.current) clearInterval(timerRef.current); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [countdown > 0 ? 1 : 0]);

  const reset = () => { if (timerRef.current) clearInterval(timerRef.current); setCountdown(0); };

  return { countdown, start, reset, canResend: countdown === 0 };
}

// ─── Resend Button ────────────────────────────────────────────────────────────
const ResendButton: React.FC<{
  onResend: () => void;
  countdown: number;
  canResend: boolean;
  isLoading: boolean;
}> = ({ onResend, countdown, canResend, isLoading }) => (
  <div className="flex justify-center mt-3">
    {canResend ? (
      <button type="button" onClick={onResend} disabled={isLoading}
        className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
        {isLoading ? 'Sending…' : 'Resend OTP'}
      </button>
    ) : (
      <span className="text-xs text-gray-400 flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
          <circle cx="12" cy="12" r="10" />
        </svg>
        Resend in <strong className="text-indigo-500">{countdown}s</strong>
      </span>
    )}
  </div>
);

// ─── Step Indicator ───────────────────────────────────────────────────────────
const StepIndicator: React.FC<{ current: SignupStep }> = ({ current }) => (
  <div className="flex items-center justify-center gap-2 mb-6">
    {([1, 2, 3] as SignupStep[]).map((step) => (
      <React.Fragment key={step}>
        <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all duration-300 ${
          step < current ? 'bg-emerald-500 text-white'
          : step === current ? 'bg-indigo-600 text-white ring-4 ring-indigo-100'
          : 'bg-gray-100 text-gray-400'
        }`}>
          {step < current ? (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : step}
        </div>
        {step < 3 && (
          <div className={`w-8 h-0.5 rounded transition-all duration-500 ${step < current ? 'bg-emerald-400' : 'bg-gray-200'}`} />
        )}
      </React.Fragment>
    ))}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const LoginModal: React.FC = () => {
  const {
    showLoginModal, setShowLoginModal,
    login, register, sendOtp, verifyOtp, verifyPhoneOtp, resetPassword,
    error, isLoading, setError, onLoginSuccess, setOnLoginSuccess
  } = useAuth();

  const [view, setView] = useState<AuthView>('LOGIN');

  // Form States
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [fullName, setFullName]   = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // OTP / Step States
  const [otp, setOtp]             = useState('');
  const [otpSent, setOtpSent]     = useState(false);
  const [signupStep, setSignupStep] = useState<SignupStep>(1);
  const [newPassword, setNewPassword] = useState('');
  const [isSuperAdminLogin, setIsSuperAdminLogin] = useState(false);
  const [duplicateField, setDuplicateField] = useState<'email' | 'phone' | null>(null);

  const { countdown, start: startCountdown, reset: resetCountdown, canResend } = useResendCountdown();

  const SUPER_ADMIN_EMAIL = import.meta.env.VITE_SUPER_ADMIN_EMAIL || 'buildinpublicengineers@gmail.com';

  const handleClose = () => {
    setShowLoginModal(false);
    setOnLoginSuccess(null);
  };

  const handleSwitchView = (newView: AuthView) => {
    setView(newView);
    setError(null);
    setOtpSent(false);
    setOtp('');
    setPassword('');
    setNewPassword('');
    setPhoneNumber('');
    setSignupStep(1);
    setIsSuperAdminLogin(false);
    setDuplicateField(null);
    resetCountdown();
  };

  const handleSuccess = (user?: User) => {
    setShowLoginModal(false);
    if (onLoginSuccess) {
      if (user) {
        onLoginSuccess(user);
      } else {
        const storedUser = localStorage.getItem('user');
        if (storedUser) onLoginSuccess(JSON.parse(storedUser));
      }
      setOnLoginSuccess(null);
    }
  };

  // ── Login ──────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (email.toLowerCase() === SUPER_ADMIN_EMAIL) {
      try {
        if (!otpSent) {
          await sendOtp(email);
          setOtpSent(true);
          setIsSuperAdminLogin(true);
          setError(null);
          startCountdown();
        } else {
          const isValid = await verifyOtp(email, otp);
          if (isValid) {
            await login(email, password || '__otp_verified__');
            const u = JSON.parse(localStorage.getItem('user') || '{}');
            handleSuccess(u);
          }
        }
      } catch { /* handled in context */ }
      return;
    }

    try {
      await login(email, password);
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      handleSuccess(u);
    } catch { /* handled in context */ }
  };

  const isPasswordValid = useMemo(
    () => PASSWORD_RULES.every((rule) => rule.test(password)),
    [password]
  );

  // ── Signup Step 1 → 2: validate fields, send email + SMS OTP ────────────
  const handleSignupStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password || !phoneNumber) {
      setError('Please fill in all fields.'); return;
    }
    if (!/^[0-9]{10}$/.test(phoneNumber)) {
      setError('Enter a valid 10-digit mobile number.'); return;
    }
    if (!isPasswordValid) {
      setError('Please make sure your password meets all requirements.'); return;
    }
    setDuplicateField(null);
    try {
      // mode='signup' → backend sends OTP to email AND mobile
      await sendOtp(email, { mode: 'signup', phoneNumber });
      setOtpSent(true);
      setSignupStep(2);
      startCountdown();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'EMAIL_EXISTS') {
        setDuplicateField('email');
        setError(null);
      } else if (msg === 'PHONE_EXISTS') {
        setDuplicateField('phone');
        setError(null);
      }
      // other errors handled in context
    }
  };

  // ── Signup Step 2: verify email OTP → advance to step 3 ──────────────────
  const handleSignupStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isValid = await verifyOtp(email, otp);
      if (!isValid) return;
      setOtp('');
      setSignupStep(3);
      resetCountdown();
    } catch { /* handled in context */ }
  };

  // ── Signup Step 3: verify mobile OTP → register ───────────────────────────
  const handleSignupStep3 = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isValid = await verifyPhoneOtp(email, otp);
      if (!isValid) return;
      await register(fullName, email, UserRole.STUDENT, password, phoneNumber);
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      handleSuccess(u);
    } catch { /* handled in context */ }
  };

  const handleEmailResend = async () => {
    try { await sendOtp(email); setError(null); startCountdown(); } catch { /* handled */ }
  };

  // ── Forgot Password ────────────────────────────────────────────────────────
  const handleForgotStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError('Please enter your email.'); return; }
    try { await sendOtp(email); setOtpSent(true); startCountdown(); } catch { /* handled */ }
  };

  const handleForgotResend = async () => {
    try { await sendOtp(email); setError(null); startCountdown(); } catch { /* handled */ }
  };

  const handleForgotStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || !newPassword) { setError('Please enter OTP and new password.'); return; }
    try {
      await resetPassword(email, otp, newPassword);
      alert('Password reset successfully! Please login.');
      handleSwitchView('LOGIN');
    } catch { /* handled */ }
  };

  const handleSuperAdminResend = async () => {
    try { await sendOtp(email); setError(null); startCountdown(); } catch { /* handled */ }
  };

  if (!showLoginModal) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-hidden font-sans animate-in fade-in duration-200">

      <div className="bg-white w-full max-w-[480px] rounded-2xl shadow-2xl relative flex flex-col max-h-[90vh] overflow-y-auto overflow-x-hidden no-scrollbar animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button onClick={handleClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100 z-10">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-8 sm:p-10">
          {/* Header */}
          <div className="flex flex-col items-center mb-8 text-center">
            <div className="bg-indigo-600 rounded-lg p-2 shadow-lg shadow-indigo-200 mb-4">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">UNIEVAL</h2>
            <p className="text-gray-500 text-sm font-medium mt-1">Login to continue</p>
          </div>

          <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
            {view === 'LOGIN'           && 'Sign In'}
            {view === 'SIGNUP'          && (signupStep === 1 ? 'Create Account' : signupStep === 2 ? 'Verify Email' : 'Verify Mobile')}
            {view === 'FORGOT_PASSWORD' && (otpSent ? 'Reset Password' : 'Forgot Password')}
          </h3>

          {view === 'SIGNUP' && <StepIndicator current={signupStep} />}

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2 rounded-lg text-center animate-in fade-in slide-in-from-top-2">
              {error}
            </div>
          )}

          {/* ─── LOGIN FORM ─────────────────────────────────────────────── */}
          {view === 'LOGIN' && (
            <form className="space-y-5" onSubmit={handleLogin}>
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-700">Email Address</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@university.edu"
                  className="block w-full px-4 py-3 rounded-xl border-gray-200 border bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-sm" />
              </div>

              {!isSuperAdminLogin && (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="block text-sm font-semibold text-gray-700">Password</label>
                    <button type="button" onClick={() => handleSwitchView('FORGOT_PASSWORD')}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-500">Forgot Password?</button>
                  </div>
                  <input type="password" required={!isSuperAdminLogin} value={password}
                    onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                    className="block w-full px-4 py-3 rounded-xl border-gray-200 border bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-sm" />
                </div>
              )}

              {isSuperAdminLogin && otpSent && (
                <div className="space-y-1.5 animate-in slide-in-from-right-4 fade-in duration-300">
                  <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-lg mb-4">
                    A verification code has been sent to <strong>{email}</strong>. Please check your inbox.
                  </div>
                  <label className="block text-sm font-semibold text-gray-700">Enter OTP</label>
                  <input type="text" required value={otp} onChange={(e) => setOtp(e.target.value)}
                    placeholder="123456"
                    className="block w-full px-4 py-3 rounded-xl border-gray-200 border bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-sm tracking-widest font-mono text-center text-lg" />
                  <ResendButton onResend={handleSuperAdminResend} countdown={countdown} canResend={canResend} isLoading={isLoading} />
                </div>
              )}

              <button type="submit" disabled={isLoading}
                className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-indigo-600/20 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-4">
                {isLoading ? 'Processing…' : (isSuperAdminLogin ? (otpSent ? 'Verify & Login' : 'Send Login OTP') : 'Login')}
              </button>
            </form>
          )}

          {/* ─── SIGNUP FORM ─────────────────────────────────────────────── */}
          {view === 'SIGNUP' && (
            <>
              {/* Step 1: Details */}
              {signupStep === 1 && (
                <form className="space-y-5 animate-in slide-in-from-left-4 fade-in duration-300" onSubmit={handleSignupStep1}>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700">Full Name</label>
                    <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="block w-full px-4 py-3 rounded-xl border-gray-200 border bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700">Email Address</label>
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@university.edu"
                      className="block w-full px-4 py-3 rounded-xl border-gray-200 border bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700">Mobile Number</label>
                    <div className="flex rounded-xl border border-gray-200 bg-gray-50 focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all overflow-hidden">
                      <span className="flex items-center px-3 text-sm font-semibold text-gray-500 border-r border-gray-200 bg-gray-100 select-none">+91</span>
                      <input type="tel" required value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="9876543210" maxLength={10}
                        className="flex-1 px-4 py-3 bg-transparent outline-none text-sm" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700">Create Password</label>
                    <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="block w-full px-4 py-3 rounded-xl border-gray-200 border bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-sm" />
                    <PasswordStrengthMeter password={password} />
                  </div>

                  {/* ── Duplicate account banner ── */}
                  {duplicateField && (
                    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-200">
                      <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-amber-800">
                          {duplicateField === 'email'
                            ? 'This email is already registered.'
                            : 'This mobile number is already registered.'}
                        </p>
                        <p className="text-xs text-amber-700 mt-0.5">
                          Please{' '}
                          <button
                            type="button"
                            onClick={() => handleSwitchView('LOGIN')}
                            className="font-bold underline underline-offset-2 hover:text-amber-900 transition-colors"
                          >
                            log in to your account
                          </button>
                          {' '}or use a different {duplicateField === 'email' ? 'email address' : 'mobile number'}.
                        </p>
                      </div>
                    </div>
                  )}

                  <button type="submit" disabled={isLoading || (!isPasswordValid && password.length > 0)}
                    className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-indigo-600/20 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4">
                    {isLoading ? 'Sending…' : 'Continue →'}
                  </button>
                </form>
              )}

              {/* Step 2: Verify Email OTP */}
              {signupStep === 2 && (
                <form className="space-y-5 animate-in slide-in-from-right-4 fade-in duration-300" onSubmit={handleSignupStep2}>
                  <div className="bg-blue-50 border border-blue-100 text-blue-800 text-xs p-3 rounded-lg">
                    <p className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      OTP sent to your email <strong className="ml-1">{email}</strong>
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700">Enter Email OTP</label>
                    <input type="text" required value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456" maxLength={6}
                      className="block w-full px-4 py-3 rounded-xl border-gray-200 border bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-sm tracking-widest font-mono text-center text-lg" />
                    <ResendButton onResend={handleEmailResend} countdown={countdown} canResend={canResend} isLoading={isLoading} />
                  </div>
                  <button type="submit" disabled={isLoading || otp.length !== 6}
                    className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-indigo-600/20 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4">
                    {isLoading ? 'Verifying…' : 'Verify Email →'}
                  </button>
                  <button type="button" onClick={() => { setSignupStep(1); setOtp(''); setError(null); }}
                    className="w-full text-xs text-gray-400 hover:text-gray-600 mt-1">
                    ← Back to details
                  </button>
                </form>
              )}

              {/* Step 3: Verify Mobile OTP → Register */}
              {signupStep === 3 && (
                <form className="space-y-5 animate-in slide-in-from-right-4 fade-in duration-300" onSubmit={handleSignupStep3}>
                  <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs p-3 rounded-lg flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Email verified! Now verify your mobile number.</span>
                  </div>
                  <div className="bg-blue-50 border border-blue-100 text-blue-800 text-xs p-3 rounded-lg">
                    <p className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      OTP sent via SMS to <strong className="ml-1">+91 {phoneNumber}</strong>
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700">Enter Mobile OTP</label>
                    <input type="text" required value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456" maxLength={6}
                      className="block w-full px-4 py-3 rounded-xl border-gray-200 border bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-sm tracking-widest font-mono text-center text-lg" />
                  </div>
                  <button type="submit" disabled={isLoading || otp.length !== 6}
                    className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-indigo-600/20 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4">
                    {isLoading ? 'Creating Account…' : 'Verify & Create Account ✓'}
                  </button>
                </form>
              )}
            </>
          )}

          {/* ─── FORGOT PASSWORD FORM ─────────────────────────────────────── */}
          {view === 'FORGOT_PASSWORD' && (
            <form className="space-y-5" onSubmit={otpSent ? handleForgotStep2 : handleForgotStep1}>
              {!otpSent && (
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-gray-700">Email Address</label>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@university.edu"
                    className="block w-full px-4 py-3 rounded-xl border-gray-200 border bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-sm" />
                  <p className="text-xs text-gray-400">We'll send an OTP to your registered email.</p>
                </div>
              )}
              {otpSent && (
                <>
                  <div className="bg-blue-50 border border-blue-100 text-blue-800 text-xs p-3 rounded-lg flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    OTP sent to <strong className="ml-1">{email}</strong>. Check your inbox.
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700">Enter 6-digit OTP</label>
                    <input type="text" required value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456" maxLength={6}
                      className="block w-full px-4 py-3 rounded-xl border-gray-200 border bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-sm tracking-widest font-mono text-center text-lg" />
                    <ResendButton onResend={handleForgotResend} countdown={countdown} canResend={canResend} isLoading={isLoading} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700">New Password</label>
                    <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="block w-full px-4 py-3 rounded-xl border-gray-200 border bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-sm" />
                    <PasswordStrengthMeter password={newPassword} />
                  </div>
                </>
              )}
              <button type="submit" disabled={isLoading}
                className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-indigo-600/20 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-4">
                {isLoading ? 'Processing…' : (otpSent ? 'Reset Password' : 'Send OTP')}
              </button>
            </form>
          )}

          {/* Toggle Mode */}
          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-600">
              {view === 'LOGIN' ? 'New here? ' : 'Already have an account? '}
              <button onClick={() => handleSwitchView(view === 'LOGIN' ? 'SIGNUP' : 'LOGIN')}
                className="font-bold text-indigo-600 hover:text-indigo-500 transition-colors ml-1">
                {view === 'LOGIN' ? 'Create Account' : 'Back to Login'}
              </button>
            </p>
            {view === 'FORGOT_PASSWORD' && (
              <button onClick={() => handleSwitchView('LOGIN')}
                className="block w-full mt-4 text-xs font-bold text-gray-500 hover:text-gray-700">
                Cancel Reset
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;