import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare, Smartphone, Monitor } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DISMISS_KEY = 'unieval_pwa_install_dismissed_at';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const InstallPwaBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed as an app)
    const standaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    setIsStandalone(standaloneMode);
    if (standaloneMode) return;

    // Check if on iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
    setIsIos(isIosDevice);

    // Check if dismissed recently
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt && Date.now() - parseInt(dismissedAt, 10) < SEVEN_DAYS_MS) {
      return;
    }

    // Capture Chrome/Android/Desktop install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // On iOS Safari, display after a 3-second gentle delay
    if (isIosDevice && !standaloneMode) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosModal(true);
      return;
    }

    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsVisible(false);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.warn('[PWA] Install prompt error:', err);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setIsVisible(false);
  };

  if (isStandalone || !isVisible) return null;

  return (
    <>
      {/* Floating PWA Install Card */}
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 animate-in slide-in-from-bottom-5 duration-300">
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-xl border border-slate-800 flex items-start gap-3.5 relative">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
            <img src="/img/icon-192.png" alt="UniEval" className="w-full h-full object-cover" />
          </div>

          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="font-bold text-sm text-white">Install UniEval App</span>
              <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1.5 py-0.2 rounded font-semibold uppercase">
                {isIos ? 'iOS' : 'PWA'}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              Add to your home screen or desktop for direct 1-tap access and native full-screen view.
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={handleInstallClick}
                className="bg-blue-600 hover:bg-blue-500 active:scale-98 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                {isIos ? 'Add to Home Screen' : 'Install App'}
              </button>
              <button
                onClick={handleDismiss}
                className="text-slate-400 hover:text-white px-2 py-1.5 text-xs font-medium transition-colors"
              >
                Not Now
              </button>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* iOS Step-by-Step Instructions Modal */}
      {showIosModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200/80 relative text-slate-900 animate-in slide-in-from-bottom-6 duration-300">
            <button
              onClick={() => setShowIosModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 text-blue-600">
              <Smartphone className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-1">Add UniEval to Home Screen</h3>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Install UniEval on your iPhone or iPad for a full-screen, native app experience with direct access to notes & live classes.
            </p>

            <div className="space-y-3.5 text-xs text-slate-700">
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 font-bold text-xs">
                  1
                </div>
                <div>
                  <span className="font-semibold text-slate-900">Tap the Share icon</span> at the bottom of Safari's toolbar:
                  <div className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded text-[11px] font-medium ml-1.5 shadow-2xs">
                    <Share className="w-3 h-3 text-blue-600" /> Share
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 font-bold text-xs">
                  2
                </div>
                <div>
                  Scroll down the action sheet and select:
                  <div className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded text-[11px] font-medium ml-1.5 shadow-2xs">
                    <PlusSquare className="w-3 h-3 text-slate-700" /> Add to Home Screen
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 font-bold text-xs">
                  3
                </div>
                <div>
                  Tap <strong className="text-slate-900 font-bold">Add</strong> in the top right corner. The UniEval icon will appear right on your home screen!
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setShowIosModal(false);
                setIsVisible(false);
                localStorage.setItem(DISMISS_KEY, Date.now().toString());
              }}
              className="w-full mt-6 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 rounded-xl text-xs transition-colors shadow-xs"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default InstallPwaBanner;
