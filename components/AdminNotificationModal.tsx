import React, { useState, useEffect } from 'react';
import { Bell, Send, Users, Smartphone, Monitor, CheckCircle, AlertCircle, Loader2, X, ExternalLink } from 'lucide-react';

interface NotificationStats {
  total: number;
  mobile: number;
  desktop: number;
  students: number;
  teachers: number;
  guests: number;
}

export const AdminNotificationModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('/dashboard');
  const [target, setTarget] = useState<'all' | 'students' | 'teachers'>('all');

  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; pruned: number } | null>(null);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/notifications/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.warn('[Push] Error fetching stats:', e);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStats();
      setResult(null);
      setError('');
    }
  }, [isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setError('Please provide both notification title and message body.');
      return;
    }

    const targetDesc = target === 'all' ? 'ALL subscribed devices' : target === 'students' ? 'all student devices' : 'all faculty devices';
    if (!window.confirm(`Are you sure you want to broadcast this push notification to ${targetDesc}?`)) {
      return;
    }

    setSending(true);
    setError('');
    setResult(null);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/notifications/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          url: url.trim() || '/dashboard',
          target
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch notification');
      }

      setResult({
        sent: data.sent,
        failed: data.failed,
        pruned: data.pruned
      });
      fetchStats();
    } catch (err: any) {
      setError(err.message || 'Error broadcasting notification');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-xs"
      >
        <Bell className="w-4 h-4 text-white" />
        Send Push Notification
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200/80 relative text-slate-900 my-8 animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Broadcast Push Notification</h3>
                <p className="text-xs text-slate-500">
                  Send real-time alerts to home screen PWA installs and browser desktops
                </p>
              </div>
            </div>

            {/* Subscriber Stats Chip Grid */}
            <div className="grid grid-cols-3 gap-2.5 mb-6 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-center p-2 bg-white rounded-lg border border-slate-200/60 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Subscribers</span>
                <p className="text-lg font-extrabold text-slate-900 mt-0.5">
                  {statsLoading ? '...' : stats?.total ?? 0}
                </p>
              </div>
              <div className="text-center p-2 bg-white rounded-lg border border-slate-200/60 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-center gap-1">
                  <Smartphone className="w-3 h-3 text-blue-500" /> Mobile
                </span>
                <p className="text-lg font-extrabold text-blue-600 mt-0.5">
                  {statsLoading ? '...' : stats?.mobile ?? 0}
                </p>
              </div>
              <div className="text-center p-2 bg-white rounded-lg border border-slate-200/60 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-center gap-1">
                  <Monitor className="w-3 h-3 text-emerald-500" /> Desktop
                </span>
                <p className="text-lg font-extrabold text-emerald-600 mt-0.5">
                  {statsLoading ? '...' : stats?.desktop ?? 0}
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {result && (
              <div className="mb-4 p-4 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-200">
                <div className="flex items-center gap-2 font-bold mb-1">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Push Broadcast Dispatched!</span>
                </div>
                <p className="text-emerald-700">
                  Delivered to <strong>{result.sent}</strong> devices. ({result.failed} offline/unreachable
                  {result.pruned > 0 ? `, ${result.pruned} expired tokens pruned` : ''}).
                </p>
              </div>
            )}

            <form onSubmit={handleSend} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Target Audience
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'all', label: `Everyone (${stats?.total ?? 0})` },
                    { id: 'students', label: `Students (${stats?.students ?? 0})` },
                    { id: 'teachers', label: `Faculty (${stats?.teachers ?? 0})` }
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTarget(t.id as any)}
                      className={`p-2 rounded-xl text-xs font-semibold transition-all border ${
                        target === t.id
                          ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Notification Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 🔴 FE Engineering Live Class Starting Now!"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Message Body *
                </label>
                <textarea
                  placeholder="e.g. Unit 3 Mathematics live session with Prof. Sharma has commenced. Click to enter the classroom directly."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  maxLength={250}
                  rows={3}
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 bg-white leading-relaxed"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Destination Link (Opens upon click)
                </label>
                <input
                  type="text"
                  placeholder="/dashboard, /browse, or /live-class/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 bg-white font-mono"
                />
              </div>

              {/* Realistic Push Preview Card */}
              <div className="pt-2">
                <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Device Notification Preview
                </span>
                <div className="bg-slate-900 text-white p-3.5 rounded-xl border border-slate-800 shadow-md flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 overflow-hidden">
                    <img src="/img/icon-192.png" alt="UniEval" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-0.5">
                      <span className="font-semibold text-slate-300">UniEval</span>
                      <span>just now</span>
                    </div>
                    <p className="font-bold text-xs text-white truncate">
                      {title || 'Title will appear here...'}
                    </p>
                    <p className="text-[11px] text-slate-300 line-clamp-2 mt-0.5">
                      {body || 'Notification message body will appear here on students desktop and mobile screens...'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-slate-500 hover:text-slate-800 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending || (stats?.total ?? 0) === 0}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-xs flex items-center gap-2"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Sending Broadcast...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Send Push Broadcast
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminNotificationModal;
