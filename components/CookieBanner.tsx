import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, ShieldCheck, X } from 'lucide-react';

const CookieBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if consent has already been given or dismissed
    const consent = localStorage.getItem('unieval_cookie_consent');
    if (!consent) {
      // Small timeout so banner doesn't flash jarringly on initial page render
      const timer = setTimeout(() => setIsVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem('unieval_cookie_consent', 'accepted_all');
    setIsVisible(false);
  };

  const handleAcceptEssential = () => {
    localStorage.setItem('unieval_cookie_consent', 'essential_only');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <aside aria-label="Cookie consent" className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="bg-slate-900/95 backdrop-blur-md text-white border border-slate-700/80 rounded-2xl p-5 shadow-2xl shadow-black/40 ring-1 ring-white/10">
        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-cobalt to-brand-indigo flex items-center justify-center shrink-0 shadow-md">
            <Cookie className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                Cookie & Storage Notice
              </h4>
              <button
                onClick={handleAcceptEssential}
                className="text-slate-400 hover:text-white transition-colors p-1 -mr-1 -mt-1"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
              UniEval uses essential browser storage (JWT auth tokens, reading position, and local encrypted PDF caches) to provide a secure and instant learning experience. We do not use third-party ad trackers.
            </p>
            <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>
                Learn what we collect in our{' '}
                <Link to="/privacy" className="text-brand-cobalt hover:underline font-medium">Privacy Policy</Link>
                {' '}and{' '}
                <Link to="/cookie" className="text-brand-cobalt hover:underline font-medium">Cookie Policy</Link>.
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3.5 border-t border-slate-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleAcceptEssential}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Essential Only
          </button>
          <button
            type="button"
            onClick={handleAcceptAll}
            className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-main shadow-md shadow-brand-cobalt/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Accept All
          </button>
        </div>
      </div>
    </aside>
  );
};

export default CookieBanner;
