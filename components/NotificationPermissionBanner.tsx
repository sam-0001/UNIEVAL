import React, { useState, useEffect } from 'react';
import { Bell, X, Check, Loader2 } from 'lucide-react';
import { getNotificationPermission, subscribeToPushNotifications } from '../services/pwa';

const DISMISS_KEY = 'unieval_notif_permission_dismissed_at';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const NotificationPermissionBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Only ask if permission is default and notifications are supported
    const perm = getNotificationPermission();
    if (perm !== 'default') return;

    // Check if user dismissed recently
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt && Date.now() - parseInt(dismissedAt, 10) < SEVEN_DAYS_MS) {
      return;
    }

    // Gentle delay so user experiences the page first (5s)
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const handleEnable = async () => {
    setLoading(true);
    try {
      const res = await subscribeToPushNotifications();
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          setIsVisible(false);
        }, 2500);
      } else {
        setIsVisible(false);
      }
    } catch (e) {
      console.warn('[PWA] Notification enable error:', e);
      setIsVisible(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-6 sm:right-auto sm:w-96 z-40 animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-white text-slate-900 p-4 rounded-2xl shadow-xl border border-slate-200/80 flex items-start gap-3.5 relative">
        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          {success ? <Check className="w-5 h-5 text-emerald-600" /> : <Bell className="w-5 h-5" />}
        </div>

        <div className="flex-1 min-w-0 pr-5">
          {success ? (
            <div>
              <p className="font-bold text-sm text-emerald-700">Notifications Enabled!</p>
              <p className="text-xs text-slate-500 mt-0.5">
                You'll receive live alerts for scheduled classrooms and new study units.
              </p>
            </div>
          ) : (
            <>
              <h4 className="font-bold text-sm text-slate-900 mb-0.5">Live Class & Exam Alerts</h4>
              <p className="text-xs text-slate-500 leading-relaxed mb-3">
                Get real-time push alerts when faculty starts live streams or exam notes are uploaded.
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleEnable}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Enabling...
                    </>
                  ) : (
                    'Enable Alerts'
                  )}
                </button>
                <button
                  onClick={handleDismiss}
                  className="text-slate-500 hover:text-slate-800 px-2 py-1.5 text-xs font-medium transition-colors"
                >
                  Later
                </button>
              </div>
            </>
          )}
        </div>

        {!success && (
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default NotificationPermissionBanner;
