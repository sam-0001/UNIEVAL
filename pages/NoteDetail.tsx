import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Note, NoteFile, User } from '../types';
import { useAuth } from '../context/AuthContext';
import SecurePdfViewer from '../components/SecurePdfViewer';
import SecureHtmlViewer from '../components/SecureHtmlViewer';

declare global {
  interface Window {
    Cashfree: (options: { mode: string }) => { checkout: (options: any) => Promise<any> };
  }
}

type AppliedCoupon = {
  couponId: string;
  code: string;
  discountedPrice: number;
  savings: number;
};

const NoteDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, updateUser, setShowLoginModal, setOnLoginSuccess } = useAuth();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [activeFile, setActiveFile] = useState<NoteFile | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const viewerContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      setTimeout(() => setLoading(true), 0);
      api.getNoteById(id).then(data => {
        setNote(data || null);
        if (data && data.sections.length > 0) {
          setExpandedSections(new Set(data.sections.map(s => s.id)));
          if (data.sections[0].files.length > 0) {
            setActiveFile(data.sections[0].files[0]);
          }
        }
        setLoading(false);
      });
    }
  }, [id]);

  // FIX: Separate effect watching `user` so getMe fires after AuthContext
  // finishes hydrating from localStorage (user is null on first render).
  // This guarantees admin-granted access shows immediately on page load/refresh.
  useEffect(() => {
    if (user) {
      api.getMe().then(freshUser => updateUser(freshUser)).catch(() => {});
    }
  }, [user?.id]);

  // Listen for fullscreen change events (e.g. user presses Escape)
  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement) setIsFullscreen(false);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const el = viewerContainerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      try {
        await el.requestFullscreen();
        setIsFullscreen(true);
      } catch { /* unsupported */ }
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Access logic
  const isPurchased = user?.purchasedNoteIds.includes(note?.id || '') || false;
  const isCollegeFree = React.useMemo(() => {
    if (!user || !note || !note.collegeConfig) return false;
    return user.email.endsWith(note.collegeConfig.emailDomain.trim());
  }, [user, note]);
  const hasAccess = !!user && (isPurchased || isCollegeFree || (note?.price === 0));
  const displayPrice = appliedCoupon ? appliedCoupon.discountedPrice : (note?.price || 0);

  const handleApplyCoupon = async () => {
    if (!note || !couponCode.trim()) return;
    if (!user) {
      setOnLoginSuccess(() => () => { setCouponCode(couponCode); });
      setShowLoginModal(true);
      return;
    }
    setCouponLoading(true);
    setPaymentError('');
    try {
      const result = await api.validateCoupon(couponCode.trim(), note.id);
      if (!result.valid || !result.couponId || result.discountedPrice == null) {
        throw new Error(result.error || 'Invalid coupon code');
      }
      setAppliedCoupon({
        couponId: result.couponId,
        code: couponCode.trim().toUpperCase(),
        discountedPrice: result.discountedPrice,
        savings: result.savings || 0,
      });
    } catch (e: any) {
      setAppliedCoupon(null);
      setPaymentError(e.message || 'Could not apply this coupon.');
    } finally {
      setCouponLoading(false);
    }
  };

  const clearCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setPaymentError('');
  };

  const handlePayment = async (currentUser = user) => {
    if (!note) return;
    setPaymentError('');
    const userIsPurchased = currentUser?.purchasedNoteIds.includes(note.id) || false;
    const userIsCollegeFree = !!currentUser && !!note.collegeConfig && currentUser.email.endsWith(note.collegeConfig.emailDomain.trim());
    const userHasAccess = !!currentUser && (userIsPurchased || userIsCollegeFree || (note.price === 0));
    if (userHasAccess) return;
    if (!currentUser) {
      setOnLoginSuccess(() => (loggedInUser: User) => { handlePayment(loggedInUser); });
      setShowLoginModal(true);
      return;
    }
    if (note.price === 0) {
      setPaymentLoading(true);
      try {
        const updatedUser = await api.purchaseNote(currentUser.id, note.id);
        updateUser(updatedUser);
      } catch (e: any) {
        setPaymentError(e.message || 'Failed to unlock. Please try again.');
      } finally { setPaymentLoading(false); }
      return;
    }
    setPaymentLoading(true);
    try {
      const orderData = await api.createNoteOrder(note.id, appliedCoupon?.couponId);
      if (orderData.devMode && orderData.user) {
        updateUser(orderData.user);
        setPaymentLoading(false);
        return;
      }
      setPaymentLoading(false);
      const cashfree = window.Cashfree({ mode: "sandbox" });
      cashfree.checkout({
        paymentSessionId: orderData.paymentSessionId,
        redirectTarget: "_modal"
      }).then((result: any) => {
        if(result.error) {
           setPaymentError(result.error.message || 'Payment failed');
        } else {
           api.verifyNotePurchase(note.id, {
              cashfree_order_id: orderData.orderId,
              cashfree_payment_session_id: orderData.paymentSessionId,
              couponId: appliedCoupon?.couponId,
           }).then((res: any) => {
              if (res.success) updateUser(res.user);
           }).catch((e: any) => {
              setPaymentError('Payment received but verification failed. Contact support with your payment ID: ' + orderData.orderId);
           });
        }
      });
    } catch (e: any) {
      setPaymentError(e.message || 'Payment initialization failed. Please try again.');
      setPaymentLoading(false);
    }
  };

  const handleFileSelect = (file: NoteFile) => {
    if (!user) { setShowLoginModal(true); return; }
    if (!hasAccess && !file.isFree) { handlePayment(); return; }
    setActiveFile(file);
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  // UI Helpers
  const getFileExtension = (filename: string) => filename.split('.').pop()?.toUpperCase() || 'FILE';

  const getFileBadge = (filename: string) => {
    const ext = getFileExtension(filename);
    let colorClass = 'bg-gray-100 text-gray-600';
    if (['PDF'].includes(ext)) colorClass = 'bg-red-100 text-red-600';
    else if (['DOC', 'DOCX', 'TXT', 'MD'].includes(ext)) colorClass = 'bg-blue-100 text-blue-600';
    else if (['PPT', 'PPTX'].includes(ext)) colorClass = 'bg-orange-100 text-orange-600';
    else if (['XLS', 'XLSX', 'CSV'].includes(ext)) colorClass = 'bg-green-100 text-green-600';
    else if (['JPG', 'JPEG', 'PNG', 'GIF', 'WEBP'].includes(ext)) colorClass = 'bg-purple-100 text-purple-600';
    else if (['HTML', 'HTM'].includes(ext)) colorClass = 'bg-amber-100 text-amber-600';
    return (
      <div className={`p-1.5 rounded ${colorClass}`}>
        <span className="text-[10px] font-bold">{ext.substring(0, 4)}</span>
      </div>
    );
  };

  /**
   * Build the URL for the file viewer.
   * PDFs and text files go through the secure proxy — raw R2 URL is NEVER exposed.
   * Office docs (docx, pptx, xlsx) go through Google Docs Viewer using the proxy URL,
   * so Google never sees the real R2 URL either.
   * Images are fetched via the proxy and displayed as blobs.
   */
  const buildViewerContent = () => {
    if (!activeFile || !note) return null;
    const ext = getFileExtension(activeFile.title).toLowerCase();
    const secureUrl = api.getSecureFileUrl(note.id, activeFile.id);

    // Images — fetch through proxy and show as blob URL
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
      return (
        <div className="w-full h-full overflow-auto flex items-center justify-center p-4 bg-slate-100">
          <img
            src={secureUrl}
            alt={activeFile.title}
            className="max-w-full max-h-full object-contain shadow-md bg-white select-none"
            draggable={false}
            onContextMenu={e => e.preventDefault()}
          />
        </div>
      );
    }

    // Office Documents — use Google Docs Viewer with the secure proxy URL
    if (['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(ext)) {
      const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(window.location.origin + secureUrl)}&embedded=true`;
      return (
        <iframe
          key={activeFile.id}
          src={viewerUrl}
          className="w-full h-full border-none bg-white"
          title={activeFile.title}
          sandbox="allow-scripts allow-same-origin"
          onContextMenu={(e: React.MouseEvent) => e.preventDefault()}
        />
      );
    }

    // PDF — canvas-rendered via PDF.js (no browser toolbar, no download, URL never exposed)
    if (ext === 'pdf') {
      return (
        <SecurePdfViewer
          key={activeFile.id}
          url={secureUrl}
          filename={activeFile.title}
          watermarkText={(user as any)?.phoneNumber || user?.email || 'UNIEVAL'}
        />
      );
    }

    // HTML — sandboxed, watermarked viewer (same anti-piracy treatment as PDF)
    if (['html', 'htm'].includes(ext)) {
      return (
        <SecureHtmlViewer
          key={activeFile.id}
          url={secureUrl}
          filename={activeFile.title}
          watermarkText={(user as any)?.phoneNumber || user?.email || 'UNIEVAL'}
        />
      );
    }

    // TXT / MD / CSV — plain text via secure proxy iframe
    if (['txt', 'md', 'csv'].includes(ext)) {
      return (
        <div
          className="w-full h-full relative select-none"
          onContextMenu={e => e.preventDefault()}
        >
          <iframe
            key={activeFile.id}
            src={secureUrl}
            className="w-full h-full border-none bg-white"
            title={activeFile.title}
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        </div>
      );
    }

    // Unsupported file types
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-500 p-8">
        <svg className="w-16 h-16 mb-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
        </svg>
        <h3 className="text-lg font-bold text-slate-700 mb-2">Preview Not Available</h3>
        <p className="text-sm text-center max-w-md text-slate-400">
          This file format ({ext.toUpperCase()}) cannot be previewed in the browser.
        </p>
      </div>
    );
  };

  if (loading) return <div className="p-12 text-center">Loading...</div>;
  if (!note) return <div className="p-12 text-center">Note not found.</div>;

  return (
    <div className="bg-slate-50 min-h-screen pb-12">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Back Link */}
        <Link to="/browse?year=1" className="inline-flex items-center text-sm text-slate-500 hover:text-brand-cobalt mb-6 transition-colors font-medium">
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to First Year Notes
        </Link>

        {/* Header Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-start gap-4">
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-4 rounded-xl border border-brand-cobalt/20 shadow-sm">
              <img src="/img/logo.jpeg" className="w-10 h-10 object-cover rounded-lg" alt="UNIEVAL" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-brand-navy">{note.title}</h1>
              <p className="text-slate-500 mt-1 whitespace-pre-line">{note.description}</p>
              <div className="mt-2 flex items-center gap-2">
                {note.price && note.price > 0 ? (
                  <>
                    {note.originalPrice && note.originalPrice > note.price && (
                      <span className="text-lg text-red-400 line-through">₹{note.originalPrice}</span>
                    )}
                    {appliedCoupon && (
                      <span className="text-lg text-red-400 line-through">₹{note.price}</span>
                    )}
                    <span className="text-xl font-bold text-slate-900">₹{displayPrice}</span>
                  </>
                ) : (
                  <span className="text-xl font-bold text-green-600">Free</span>
                )}
              </div>
            </div>
          </div>

          {hasAccess ? (
            <div className="bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-bold flex items-center shadow-sm">
              <svg className="w-5 h-5 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {isCollegeFree ? `Free for ${note.collegeConfig?.name}` : (note.price === 0 ? 'Free Content' : 'Purchased/Unlocked')}
            </div>
          ) : (
            <div className="flex flex-col items-end gap-2">
              {note.price && note.price > 0 && (
                <div className="w-full max-w-xs bg-white border border-slate-200 rounded-xl p-3">
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-left">
                        <p className="text-xs font-bold text-green-700">{appliedCoupon.code} applied</p>
                        <p className="text-xs text-slate-500">You save ₹{appliedCoupon.savings}</p>
                      </div>
                      <button onClick={clearCoupon} className="text-xs font-semibold text-slate-500 hover:text-red-600">Remove</button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        value={couponCode}
                        onChange={e => setCouponCode(e.target.value.toUpperCase())}
                        onKeyDown={e => { if (e.key === 'Enter') handleApplyCoupon(); }}
                        placeholder="Coupon code"
                        className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                      <button
                        onClick={handleApplyCoupon}
                        disabled={couponLoading || !couponCode.trim()}
                        className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                      >
                        {couponLoading ? '...' : 'Apply'}
                      </button>
                    </div>
                  )}
                </div>
              )}
              {paymentError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 max-w-xs text-right">{paymentError}</p>
              )}
              <button
                onClick={() => handlePayment()}
                disabled={paymentLoading}
                className="hidden md:flex items-center gap-2 bg-gradient-main hover:opacity-90 disabled:opacity-60 text-white px-8 py-3 rounded-xl font-bold text-lg shadow-lg shadow-indigo-200 transition-all transform hover:scale-105"
              >
                {paymentLoading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {!user ? 'Login to Unlock' : (displayPrice === 0 ? 'Unlock for Free' : `Unlock for ₹${displayPrice}`)}
              </button>
            </div>
          )}
        </div>

        {/* Main Layout */}
        <div className="flex flex-col lg:flex-row gap-6">

          {/* Sidebar */}
          <div className="w-full lg:w-1/4 flex-shrink-0 space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-4 border-b border-slate-100 font-bold text-slate-800 bg-slate-50/50 uppercase text-xs tracking-wider">
                Course Materials
              </div>
              {note.sections.map((section, idx) => {
                const isExpanded = expandedSections.has(section.id);
                return (
                  <div key={section.id} className={idx < note.sections.length - 1 ? 'border-b border-slate-100' : ''}>
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="w-full px-4 py-3 bg-white flex justify-between items-center hover:bg-slate-50 transition-colors focus:outline-none"
                    >
                      <span className="font-semibold text-sm text-slate-700">{section.title}</span>
                      <svg className={`w-4 h-4 text-slate-400 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {isExpanded && (
                      <div className="bg-slate-50/30 animate-in slide-in-from-top-2 duration-200">
                        {section.files.map((f) => (
                          <div
                            key={f.id}
                            onClick={() => handleFileSelect(f)}
                            className={`px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-slate-50 border-l-4 transition-all ${activeFile?.id === f.id ? 'border-brand-cobalt bg-blue-50/50' : 'border-transparent'}`}
                          >
                            {getFileBadge(f.title)}
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm truncate ${activeFile?.id === f.id ? 'font-bold text-brand-cobalt' : 'text-slate-600 font-medium'}`}>
                                {f.title}
                              </p>
                              <p className={`text-xs font-medium ${activeFile?.id === f.id ? 'text-brand-cobalt' : 'text-slate-400'}`}>
                                {activeFile?.id === f.id ? 'Viewing Now' : 'View File'}
                              </p>
                            </div>
                            {!hasAccess && !f.isFree && (
                              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                            )}
                          </div>
                        ))}
                        {section.files.length === 0 && (
                          <div className="px-4 py-3 text-xs text-gray-400 italic">No files available</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Content Viewer */}
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[600px] lg:h-[800px]">

            {/* Viewer Header — no Download button */}
            <div className="border-b border-slate-200 px-4 py-3 flex justify-between items-center bg-white">
              <h2 className="font-semibold text-slate-800 text-sm truncate max-w-[70%]">
                {activeFile ? activeFile.title : 'Select a file'}
              </h2>
              {activeFile && (
                <button
                  onClick={toggleFullscreen}
                  title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                  className="flex items-center gap-1 text-xs font-medium text-slate-600 border border-slate-200 px-3 py-1.5 rounded hover:bg-slate-50 transition-colors"
                >
                  {isFullscreen ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M15 9h4.5M15 9V4.5M15 9l5.25-5.25M9 15H4.5M9 15v4.5M9 15l-5.25 5.25" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  )}
                  <span className="hidden sm:inline">{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
                </button>
              )}
            </div>

            {/* File Viewer Main Area */}
            <div
              ref={viewerContainerRef}
              className={`flex-1 bg-slate-100 relative overflow-hidden ${isFullscreen ? 'fixed inset-0 z-[9999] bg-black flex flex-col' : ''}`}
            >
              {/* Fullscreen toolbar (only shown when fullscreen) */}
              {isFullscreen && (
                <div className="bg-slate-900 text-white px-4 py-2 flex items-center justify-between text-xs shrink-0">
                  <span className="font-medium truncate max-w-[60%]">{activeFile?.title}</span>
                  <button
                    onClick={toggleFullscreen}
                    className="flex items-center gap-2 text-white/80 hover:text-white border border-white/20 px-3 py-1 rounded transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M15 9h4.5M15 9V4.5M9 15H4.5M9 15v4.5M15 15h4.5M15 15v4.5" />
                    </svg>
                    Exit Fullscreen
                  </button>
                </div>
              )}

              {/* Scenario: Locked */}
              {activeFile && !hasAccess && !activeFile.isFree ? (
                <div className="absolute inset-0 flex items-center justify-center flex-col bg-white/90 backdrop-blur-sm z-10 p-4">
                  <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-sm border border-slate-200">
                    <div className="w-16 h-16 bg-blue-50 text-brand-cobalt rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-brand-navy mb-2">Content Locked</h3>
                    <p className="text-slate-500 mb-6 text-sm">
                      Purchase the complete <b>{note.title}</b> pack to access {activeFile.title} and all other locked materials.
                    </p>
                    {paymentError && (
                      <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">{paymentError}</p>
                    )}
                    {note.price && note.price > 0 && (
                      <div className="mb-4">
                        {appliedCoupon ? (
                          <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-left">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-xs font-bold text-green-700">{appliedCoupon.code} applied</p>
                                <p className="text-xs text-green-700/80">You save ₹{appliedCoupon.savings}</p>
                              </div>
                              <button onClick={clearCoupon} className="text-xs font-semibold text-green-800 hover:text-red-600">Remove</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <input
                              value={couponCode}
                              onChange={e => setCouponCode(e.target.value.toUpperCase())}
                              onKeyDown={e => { if (e.key === 'Enter') handleApplyCoupon(); }}
                              placeholder="Coupon code"
                              className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                            <button
                              onClick={handleApplyCoupon}
                              disabled={couponLoading || !couponCode.trim()}
                              className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                            >
                              {couponLoading ? '...' : 'Apply'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    <button
                      onClick={() => handlePayment()}
                      disabled={paymentLoading}
                      className="w-full bg-gradient-main hover:opacity-90 disabled:opacity-60 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                    >
                      {paymentLoading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                      {!user ? 'Login to Unlock' : (displayPrice === 0 ? 'Unlock for Free' : `Unlock for ₹${displayPrice}`)}
                    </button>
                  </div>
                </div>
              ) : activeFile ? (
                /* Unlocked — viewer only, no toolbar with download */
                <div className={`w-full flex flex-col ${isFullscreen ? 'flex-1 min-h-0' : 'h-full'}`}>
                  {/* Slim toolbar — no download button */}
                  {!isFullscreen && (
                    <div className="bg-slate-800 text-white px-4 py-2 flex items-center justify-between text-xs shrink-0">
                      <div className="flex items-center gap-3">
                        <span className="font-mono">{getFileExtension(activeFile.title)} Viewer</span>
                      </div>
                      <button
                        onClick={toggleFullscreen}
                        className="flex items-center gap-1 hover:text-gray-300 transition-colors"
                        title="Fullscreen"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                        <span className="hidden sm:inline">Fullscreen</span>
                      </button>
                    </div>
                  )}
                  {/* ✅ FIX: key={activeFile.id} forces remount when file changes */}
                  <div key={activeFile.id} className="flex-1 relative overflow-hidden">
                    {buildViewerContent()}
                  </div>
                </div>
              ) : (
                /* No file selected */
                <div className="absolute inset-0 flex items-center justify-center bg-slate-50 text-slate-400 flex-col">
                  <svg className="w-16 h-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p>Select a file from the sidebar to view.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sticky Mobile Buy Button */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] md:hidden z-50 animate-in slide-in-from-bottom-full duration-300">
          <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
            <div className="flex flex-col">
              {hasAccess ? (
                <span className="text-sm font-bold text-green-600">Unlocked</span>
              ) : (
                <>
                  <span className="text-xs text-gray-500 uppercase font-bold">Total Price</span>
                  <div className="flex items-baseline gap-2">
                    {note.originalPrice && note.originalPrice > (note.price || 0) && (
                      <span className="text-xs text-red-400 line-through">₹{note.originalPrice}</span>
                    )}
                    {appliedCoupon && (
                      <span className="text-xs text-red-400 line-through">₹{note.price}</span>
                    )}
                    <span className="text-xl font-bold text-gray-900">₹{displayPrice}</span>
                  </div>
                </>
              )}
            </div>
            {!hasAccess && (
              <button
                onClick={() => handlePayment()}
                disabled={paymentLoading}
                className="flex-1 bg-gradient-main hover:opacity-90 disabled:opacity-60 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {paymentLoading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {!user ? 'Login to Unlock' : (displayPrice === 0 ? 'Unlock for Free' : 'Unlock Now')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoteDetail;
