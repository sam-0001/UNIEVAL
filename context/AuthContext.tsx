import React, {
  createContext, useContext, useState, useEffect,
  ReactNode, useCallback, useRef
} from 'react';
import { User, UserRole } from '../types';
import { api } from '../services/api';

// ─── Credits Context ──────────────────────────────────────────────────────────
interface CreditsState {
  credits: number;
  freeQuizUsed: number;
  freeQuizLimit: number;
  unlimitedPlan: { active: boolean; expiresAt: string | null };
  isUnlimited: boolean;
  freeLeft: number;
  hasAccess: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

const CreditsContext = createContext<CreditsState | undefined>(undefined);

export const useCredits = () => {
  const ctx = useContext(CreditsContext);
  if (!ctx) throw new Error('useCredits must be used within AuthProvider');
  return ctx;
};

// ─── Auth Context ─────────────────────────────────────────────────────────────
interface AuthContextType {
  user: User | null;
  login: (email: string, password?: string) => Promise<void>;
  register: (name: string, email: string, role: UserRole, password?: string, phoneNumber?: string) => Promise<void>;

  logout: () => void;
  updateUser: (user: User) => void;
  isLoading: boolean;
  actionLoading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  sendOtp: (email: string, options?: { phoneNumber?: string; mode?: 'signup' | 'default' }) => Promise<{ message: string; sentTo: string }>;
  verifyOtp: (email: string, otp: string) => Promise<boolean>;
  verifyPhoneOtp: (email: string, otp: string) => Promise<boolean>;
  resetPassword: (email: string, otp: string, newPass: string) => Promise<void>;
  showLoginModal: boolean;
  setShowLoginModal: (show: boolean) => void;
  onLoginSuccess: ((user: User) => void) | null;
  setOnLoginSuccess: (callback: ((user: User) => void) | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_TIMEOUT  = 18 * 60 * 60 * 1000; // 18 hours idle
const SESSION_POLL_MS  = 20_000;               // poll server every 20 s
const AUTO_LOGOUT_SEC  = 10;                   // countdown before forced logout

// ─── Device Conflict Modal ────────────────────────────────────────────────────
interface DeviceConflictModalProps {
  onLogout: () => void;
  onStayLoggedIn: () => void;
}

const DeviceConflictModal: React.FC<DeviceConflictModalProps> = ({ onLogout, onStayLoggedIn }) => {
  const [countdown, setCountdown] = useState(AUTO_LOGOUT_SEC);

  useEffect(() => {
    if (countdown <= 0) { onLogout(); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, onLogout]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px',
    }}>
      <div style={{
        background: '#fff', borderRadius: '16px', padding: '32px 28px',
        maxWidth: '400px', width: '100%', textAlign: 'center',
        boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
        animation: 'dcSlideUp 0.25s ease',
      }}>
        <style>{`
          @keyframes dcSlideUp {
            from { opacity: 0; transform: translateY(20px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        {/* Warning icon */}
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%',
          background: '#fef3c7', display: 'flex', alignItems: 'center',
          justifyContent: 'center', margin: '0 auto 20px', fontSize: '30px',
        }}>
          ⚠️
        </div>

        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: '0 0 10px' }}>
          Login Detected on Another Device
        </h2>
        <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 6px', lineHeight: 1.6 }}>
          Your account was signed in from another device or browser.
          Only <strong>one active session</strong> is allowed at a time.
        </p>
        <p style={{
          fontSize: '13px', color: '#ef4444', fontWeight: 700,
          margin: '0 0 24px',
          padding: '8px 12px', background: '#fef2f2',
          borderRadius: '8px', display: 'inline-block',
        }}>
          Auto-logging out in {countdown}s…
        </p>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onLogout}
            style={{
              flex: 1, padding: '11px 0', borderRadius: '10px',
              background: '#ef4444', color: '#fff', fontWeight: 700,
              fontSize: '14px', border: 'none', cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#dc2626')}
            onMouseLeave={e => (e.currentTarget.style.background = '#ef4444')}
          >
            Logout
          </button>
          <button
            onClick={onStayLoggedIn}
            style={{
              flex: 1, padding: '11px 0', borderRadius: '10px',
              background: '#4f46e5', color: '#fff', fontWeight: 700,
              fontSize: '14px', border: 'none', cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#4338ca')}
            onMouseLeave={e => (e.currentTarget.style.background = '#4f46e5')}
          >
            Stay Logged In
          </button>
        </div>

        <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '14px', lineHeight: 1.5 }}>
          "Stay Logged In" will re-authenticate you here and sign out the other device.
        </p>
      </div>
    </div>
  );
};

// ─── AuthProvider ─────────────────────────────────────────────────────────────
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser]                     = useState<User | null>(null);
  const [isLoading, setIsLoading]           = useState(true);
  const [actionLoading, setActionLoading]   = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [onLoginSuccess, setOnLoginSuccess] = useState<((user: User) => void) | null>(null);

  // Single-device conflict flag
  const [deviceConflict, setDeviceConflict] = useState(false);

  // ─── Credits ─────────────────────────────────────────────────────────────
  const FREE_LIMIT = 3;
  const [credits, setCredits]               = useState(0);
  const [freeQuizUsed, setFreeQuizUsed]     = useState(0);
  const [unlimitedPlan, setUnlimitedPlan]   = useState<{ active: boolean; expiresAt: string | null }>({ active: false, expiresAt: null });
  const [creditsLoading, setCreditsLoading] = useState(false);

  const fetchCredits = useCallback(async () => {
    const stored = localStorage.getItem('user');
    if (!stored) return;
    let u: User | null = null;
    try { u = JSON.parse(stored); } catch { return; }
    if (!u || u.role !== UserRole.STUDENT) return;
    setCreditsLoading(true);
    try {
      const data = await api.getCredits();
      setCredits(data.credits);
      setFreeQuizUsed(data.freeQuizUsed);
      setUnlimitedPlan(data.unlimitedPlan);
    } catch { /* ignore */ }
    finally { setCreditsLoading(false); }
  }, []);

  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  useEffect(() => {
    if (user && user.role === UserRole.STUDENT) fetchCredits();
    else { setCredits(0); setFreeQuizUsed(0); setUnlimitedPlan({ active: false, expiresAt: null }); }
  }, [user, fetchCredits]);

  const isUnlimited = !!(unlimitedPlan.active && unlimitedPlan.expiresAt && new Date(unlimitedPlan.expiresAt) > new Date());
  const freeLeft    = Math.max(0, FREE_LIMIT - freeQuizUsed);
  const hasAccess   = isUnlimited || freeLeft > 0 || credits > 0;

  const creditsState: CreditsState = {
    credits, freeQuizUsed, freeQuizLimit: FREE_LIMIT,
    unlimitedPlan, isUnlimited, freeLeft, hasAccess,
    loading: creditsLoading, refresh: fetchCredits,
  };

  // ─── Session helpers ───────────────────────────────────────────────────────
  const updateLastActivity = useCallback(() => {
    if (localStorage.getItem('user')) localStorage.setItem('lastActivity', Date.now().toString());
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setDeviceConflict(false);
    setCredits(0); setFreeQuizUsed(0); setUnlimitedPlan({ active: false, expiresAt: null });
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('lastActivity');
  }, []);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const storedUser   = localStorage.getItem('user');
    const lastActivity = localStorage.getItem('lastActivity');
    const storedToken  = localStorage.getItem('token');
    if (storedUser && lastActivity && storedToken) {
      const now = Date.now();
      if (now - parseInt(lastActivity, 10) < SESSION_TIMEOUT) {
        try { setUser(JSON.parse(storedUser)); updateLastActivity(); }
        catch { logout(); }
      } else { logout(); }
    }
    setIsLoading(false);
  }, [logout, updateLastActivity]);

  // 18-hour idle timeout
  useEffect(() => {
    const handleActivity = () => updateLastActivity();
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown',   handleActivity);
    window.addEventListener('click',     handleActivity);
    window.addEventListener('scroll',    handleActivity);
    const interval = setInterval(() => {
      const lastActivity = localStorage.getItem('lastActivity');
      if (userRef.current && lastActivity && Date.now() - parseInt(lastActivity, 10) > SESSION_TIMEOUT) {
        logout();
      }
    }, 60_000);
    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown',   handleActivity);
      window.removeEventListener('click',     handleActivity);
      window.removeEventListener('scroll',    handleActivity);
      clearInterval(interval);
    };
  }, [logout, updateLastActivity]);

  // ─── Single-device session polling ────────────────────────────────────────
  const deviceConflictRef = useRef(deviceConflict);
  useEffect(() => { deviceConflictRef.current = deviceConflict; }, [deviceConflict]);

  useEffect(() => {
    if (!user) return;

    const poll = async () => {
      if (deviceConflictRef.current) return; // already showing modal
      try {
        const { valid } = await api.checkSession();
        if (!valid) setDeviceConflict(true);
      } catch {
        // Network hiccup — don't kick the user, just skip this tick
      }
    };

    poll(); // run immediately on login
    const interval = setInterval(poll, SESSION_POLL_MS);
    return () => clearInterval(interval);
  }, [user]);

  // Conflict modal — "Logout" button
  const handleConflictLogout = useCallback(async () => {
    try { await api.serverLogout(); } catch { /* best-effort */ }
    logout();
  }, [logout]);

  // Conflict modal — "Stay Logged In" button
  // We log out locally and reopen the login modal so the user re-authenticates
  // here. A fresh login issues a new sessionToken, kicking the other device.
  const handleStayLoggedIn = useCallback(() => {
    setDeviceConflict(false);
    logout();
    setShowLoginModal(true);
  }, [logout]);

  // ─── Auth actions ──────────────────────────────────────────────────────────
  const login = async (email: string, password?: string) => {
    setActionLoading(true); setError(null);
    try {
      const { token, user: userData } = await api.login(email, password);
      setUser(userData);
      setDeviceConflict(false);
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      updateLastActivity();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(msg); throw err;
    } finally { setActionLoading(false); }
  };

  const register = async (name: string, email: string, role: UserRole, password?: string, phoneNumber?: string) => {
    setActionLoading(true); setError(null);
    try {
      const { token, user: userData } = await api.register(name, email, role, password, phoneNumber);
      setUser(userData);
      setDeviceConflict(false);
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      updateLastActivity();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(msg); throw err;
    } finally { setActionLoading(false); }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const sendOtp = async (email: string, options?: { phoneNumber?: string; mode?: 'signup' | 'default' }) => {
    setActionLoading(true); setError(null);
    try { return await api.sendOTP(email, options); }
    catch (err) { const msg = err instanceof Error ? err.message : 'Unknown error'; setError(msg); throw err; }
    finally { setActionLoading(false); }
  };

  const verifyOtp = async (email: string, otp: string) => {
    setActionLoading(true); setError(null);
    try { return await api.verifyOTP(email, otp); }
    catch (err) { const msg = err instanceof Error ? err.message : 'Unknown error'; setError(msg); throw err; }
    finally { setActionLoading(false); }
  };

  const verifyPhoneOtp = async (email: string, otp: string) => {
    setActionLoading(true); setError(null);
    try { return await api.verifyPhoneOTP(email, otp); }
    catch (err) { const msg = err instanceof Error ? err.message : 'Unknown error'; setError(msg); throw err; }
    finally { setActionLoading(false); }
  };

  const resetPassword = async (email: string, otp: string, newPass: string) => {
    setActionLoading(true); setError(null);
    try { await api.resetPassword(email, otp, newPass); }
    catch (err) { const msg = err instanceof Error ? err.message : 'Unknown error'; setError(msg); throw err; }
    finally { setActionLoading(false); }
  };

  return (
    <CreditsContext.Provider value={creditsState}>
      <AuthContext.Provider value={{
        user, login, register, logout, updateUser, isLoading, actionLoading, error, setError,
        sendOtp, verifyOtp, verifyPhoneOtp, resetPassword,
        showLoginModal, setShowLoginModal, onLoginSuccess, setOnLoginSuccess,
      }}>
        {children}

        {/* Single-device conflict overlay — always rendered at root level */}
        {deviceConflict && (
          <DeviceConflictModal
            onLogout={handleConflictLogout}
            onStayLoggedIn={handleStayLoggedIn}
          />
        )}
      </AuthContext.Provider>
    </CreditsContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};