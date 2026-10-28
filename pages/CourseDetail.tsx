import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Course, CourseModule, CourseVideo, User, UserRole, getDashboardRoute } from '../types';
import { useAuth } from '../context/AuthContext';
import CustomVideoPlayer from '../components/CustomVideoPlayer';
import { useSEO } from '../hooks/useSEO';
import { Clock, ArrowLeft } from 'lucide-react';

// Extend window object to support Cashfree
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

const CourseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, updateUser, setShowLoginModal, setOnLoginSuccess } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [activeModule, setActiveModule] = useState<CourseModule | null>(null);
  const [activeVideo, setActiveVideo] = useState<CourseVideo | null>(null);
  const [liveClasses, setLiveClasses] = useState<any[]>([]);

  useSEO({
    title: course ? `${course.title} - SPPU Engineering Course` : 'SPPU Engineering Course',
    description: course?.description || 'Learn with expert SPPU engineering video courses, lecture modules, and study materials on UniEval.',
    canonical: id ? `https://unieval.in/course/${id}` : 'https://unieval.in/browse',
    ogImage: course?.thumbnailUrl || undefined,
  });

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [paymentError, setPaymentError] = useState('');

  useEffect(() => {
    if (id) {
      api.getCourseById(id).then(c => {
        setCourse(c || null);
        if (c && c.modules.length > 0) {
          setActiveModule(c.modules[0]);
          if (c.modules[0].videos && c.modules[0].videos.length > 0) {
            setActiveVideo(c.modules[0].videos[0]);
          } else if (c.modules[0].videoUrl) {
            setActiveVideo({
              id: 'legacy',
              title: c.modules[0].title,
              videoUrl: c.modules[0].videoUrl,
              duration: c.modules[0].duration || '',
              resources: c.modules[0].resources
            });
          }
        }
      });

      fetch(`/api/live-classes/course/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      .then(res => res.ok ? res.json() : [])
      .then(data => { if(data.liveClasses && Array.isArray(data.liveClasses)) setLiveClasses(data.liveClasses); })
      .catch(e => console.error(e));
    }
  }, [id]);

  useEffect(() => {
    if (user) {
      api.getMe().then(freshUser => updateUser(freshUser)).catch(() => {});
    }
  }, [user?.id]);

  const isPurchased = user?.purchasedCourseIds?.includes(course?.id || '') || false;
  const isCollegeFree = React.useMemo(() => {
    if (!user || !course || !course.collegeConfig?.emailDomain) return false;
    const domain = course.collegeConfig.emailDomain.trim();
    if (!domain || domain.length < 3) return false;
    return user.email.toLowerCase().endsWith(domain.toLowerCase());
  }, [user, course]);
  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN;
  const isTeacherOwner = user?.role === UserRole.TEACHER && Boolean(user?.id && course?.teacherId && user.id === course.teacherId);
  const hasAccess = !!user && (isPurchased || isAdmin || isTeacherOwner);
  const displayPrice = appliedCoupon ? appliedCoupon.discountedPrice : (course?.price || 0);

  const handleApplyCoupon = async () => {
    if (!course || !couponCode.trim()) return;
    if (!user) {
      setOnLoginSuccess(() => () => { setCouponCode(couponCode); });
      setShowLoginModal(true);
      return;
    }
    setCouponLoading(true);
    setCouponError('');
    setPaymentError('');
    try {
      const result = await api.validateCoupon(couponCode.trim(), course.id);
      if (!result.valid || !result.couponId || result.discountedPrice == null) {
        throw new Error(result.error || 'Invalid coupon code');
      }
      setAppliedCoupon({
        couponId: result.couponId,
        code: couponCode.trim().toUpperCase(),
        discountedPrice: result.discountedPrice,
        savings: result.savings ?? 0,
      });
    } catch (e: any) {
      setAppliedCoupon(null);
      setCouponError(e.message || 'Could not apply this coupon.');
    } finally {
      setCouponLoading(false);
    }
  };

  const clearCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
  };

  const handlePayment = (currentUser = user) => {
    if (!course) return;

    const userIsPurchased = currentUser?.purchasedCourseIds?.includes(course.id) || false;
    const userHasAccess = !!currentUser && (userIsPurchased || isAdmin || isTeacherOwner);
    if (userHasAccess) return;

    if (!currentUser) {
      setOnLoginSuccess(() => (loggedInUser: User) => { handlePayment(loggedInUser); });
      setShowLoginModal(true);
      return;
    }

    setPaymentError('');

    // Free course
    if (course.price === 0) {
      api.enrollCourseFree(course.id)
        .then(res => { updateUser(res.user); })
        .catch(e => setPaymentError(e.message || 'Enrollment failed.'));
      return;
    }

    // Paid course — use proper order flow with coupon
    api.createCourseOrder(course.id, appliedCoupon?.couponId)
      .then(orderData => {
        // Dev mode or 100% coupon — access already granted server-side
        if (orderData.devMode && orderData.user) {
          updateUser(orderData.user);
          return;
        }

        if (!orderData.orderId || !orderData.paymentSessionId) {
          setPaymentError('Could not initialize payment session. Please try again.');
          return;
        }

        const cashfree = window.Cashfree({ mode: import.meta.env.PROD ? "production" : "sandbox" }); // or production based on your need
        cashfree.checkout({
          paymentSessionId: orderData.paymentSessionId,
          redirectTarget: "_modal"
        }).then((result: any) => {
          if(result.error) {
             setPaymentError(result.error.message || 'Payment failed');
          } else {
             api.verifyCoursePayment(course.id, {
                cashfree_order_id: orderData.orderId!,
                cashfree_payment_session_id: orderData.paymentSessionId!,
                couponId: appliedCoupon?.couponId,
             }).then((res: any) => {
                if (res.success) { updateUser(res.user); navigate('/dashboard'); }
             }).catch((e: any) => {
                setPaymentError(e.message || 'Payment verification failed. Please contact support.');
             });
          }
        });
      })
      .catch(e => setPaymentError(e.message || 'Could not initiate payment.'));
  };

  const handlePurchase = () => handlePayment();

  // Navigation Logic
  const getFlatVideos = () => {
    if (!course) return [];
    const flat: { module: CourseModule, video: CourseVideo }[] = [];
    course.modules.forEach(m => {
      if (m.videos && m.videos.length > 0) {
        m.videos.forEach(v => flat.push({ module: m, video: v }));
      } else if (m.videoUrl) {
        flat.push({
          module: m,
          video: {
            id: 'legacy-' + m.id,
            title: m.title,
            videoUrl: m.videoUrl,
            duration: m.duration || '',
            resources: m.resources
          }
        });
      }
    });
    return flat;
  };

  const flatVideos = getFlatVideos();
  const activeVideoIndex = flatVideos.findIndex(fv => fv.video.id === activeVideo?.id);
  const nextVideoItem = activeVideoIndex !== -1 && activeVideoIndex < flatVideos.length - 1 ? flatVideos[activeVideoIndex + 1] : null;
  const prevVideoItem = activeVideoIndex > 0 ? flatVideos[activeVideoIndex - 1] : null;

  const handleNext = () => { if (nextVideoItem) { setActiveModule(nextVideoItem.module); setActiveVideo(nextVideoItem.video); } };
  const handlePrev = () => { if (prevVideoItem) { setActiveModule(prevVideoItem.module); setActiveVideo(prevVideoItem.video); } };

  if (!course) return <div className="p-8 text-center">Loading course...</div>;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-24">
      {/* Back to Dashboard Link */}
      <Link to={getDashboardRoute(user?.role)} className="inline-flex items-center text-xs sm:text-sm text-slate-500 hover:text-brand-cobalt mb-4 sm:mb-6 transition-colors font-medium group">
        <ArrowLeft className="w-4 h-4 mr-1.5 group-hover:-translate-x-0.5 transition-transform" />
        Back to Dashboard
      </Link>
      <div className="lg:grid lg:grid-cols-3 lg:gap-8">
        {/* Main Content (Video Player) */}
        <div className="lg:col-span-2">
          <div className="mb-6 relative aspect-video bg-slate-900 rounded-xl overflow-hidden shadow-sm">
            {hasAccess ? (
              activeVideo?.videoUrl && activeVideo?.videoStatus !== 'processing' && activeVideo?.videoStatus !== 'finalizing' && activeVideo?.videoStatus !== 'error' ? (
                <CustomVideoPlayer
                  src={activeVideo.videoUrl}
                  poster={activeVideo.thumbnailUrl}
                  title={activeVideo.title}
                  nextTitle={nextVideoItem?.video.title}
                  onNext={nextVideoItem ? handleNext : undefined}
                  onPrev={prevVideoItem ? handlePrev : undefined}
                  resources={activeVideo.resources}
                  autoPlay={false}
                  watermarkText={user ? `${user.phoneNumber || user.email} | ${user.id.slice(-6).toUpperCase()}` : undefined}
                />
              ) : activeVideo?.videoStatus === 'processing' || activeVideo?.videoStatus === 'finalizing' ? (
                <div className="absolute inset-0 flex items-center justify-center text-white flex-col gap-3 bg-brand-navy rounded-xl shadow-2xl overflow-hidden">
                  <div className="w-10 h-10 border-4 border-white/20 border-t-brand-cobalt rounded-full animate-spin"/>
                  <p className="text-sm text-gray-300 font-medium">Video is being processed, please check back shortly.</p>
                  {activeVideo.videoProgress != null && activeVideo.videoProgress > 0 && (
                    <p className="text-xs text-gray-500">{activeVideo.videoProgress}% complete</p>
                  )}
                </div>
              ) : activeVideo?.videoStatus === 'error' ? (
                <div className="absolute inset-0 flex items-center justify-center text-white flex-col gap-2 bg-brand-navy rounded-xl shadow-2xl overflow-hidden">
                  <p className="text-red-400 font-semibold">Video processing failed.</p>
                  <p className="text-xs text-gray-500">Please contact support or re-upload the video.</p>
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-white flex-col bg-brand-navy rounded-xl shadow-2xl overflow-hidden">
                  <p className="text-gray-400">Video not available</p>
                </div>
              )
            ) : (
              <div className="absolute inset-0 flex items-center justify-center flex-col bg-brand-navy/95 backdrop-blur-sm z-10 p-4 sm:p-6 text-center rounded-xl shadow-2xl overflow-hidden">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-brand-cobalt rounded-full flex items-center justify-center mb-3 sm:mb-4 shadow-lg shadow-brand-cobalt/30 shrink-0">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-1.5 sm:mb-2">Course Locked</h3>
                <p className="text-gray-300 text-xs sm:text-sm mb-4 sm:mb-6 max-w-md">Enroll in this course to access high-quality video lectures, assignments, and more.</p>
                <button
                  onClick={() => handlePayment()}
                  className="bg-gradient-main text-white hover:opacity-90 px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl font-bold text-sm sm:text-lg transition-all active:scale-95"
                >
                  {!user ? 'Login to Enroll' : (course.price === 0 ? 'Enroll for Free' : `Unlock for ₹${displayPrice}`)}
                </button>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 sm:p-6 mb-6 sm:mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4 sm:gap-6">
              <div className="flex-1 w-full">
                <div className="flex items-center gap-3 mb-2 sm:mb-3">
                  <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy">{course.title}</h1>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {course.collegeConfig && !hasAccess && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-full border border-green-200">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                      Free for {course.collegeConfig.name} students
                    </div>
                  )}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full border border-indigo-200">
                    <Clock className="w-3.5 h-3.5" />
                    {course.validityType === 'date' && course.validityDate
                      ? `Access Valid Until ${new Date(course.validityDate).toLocaleDateString()}`
                      : `${course.validityMonths || 6} Months Access`}
                  </div>
                </div>

                <div className="prose prose-slate prose-sm max-w-none">
                  <p className="text-slate-600 whitespace-pre-line leading-relaxed">{course.description}</p>
                </div>
              </div>

              <div className="w-full md:w-auto min-w-[280px]">
                {hasAccess ? (
                  <div className="bg-green-100 text-green-700 px-6 py-3 rounded-xl text-center font-bold flex items-center justify-center gap-2 shadow-sm">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Enrolled
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                    {/* Price */}
                    <div className="flex items-baseline justify-end gap-2 mb-4">
                      {course.originalPrice && course.originalPrice > (course.price || 0) && !appliedCoupon && (
                        <span className="text-lg text-slate-400 line-through">₹{course.originalPrice}</span>
                      )}
                      {appliedCoupon && (
                        <span className="text-lg text-slate-400 line-through">₹{course.price}</span>
                      )}
                      <span className="text-3xl font-bold text-slate-900">
                        {displayPrice === 0 ? 'Free' : `₹${displayPrice}`}
                      </span>
                    </div>

                    {/* Coupon row */}
                    {appliedCoupon ? (
                      <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 w-full mb-4">
                        <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        <div className="flex-1 text-left">
                          <p className="text-xs font-bold text-green-700">{appliedCoupon.code} applied</p>
                          <p className="text-xs text-slate-500">You save ₹{appliedCoupon.savings}</p>
                        </div>
                        <button onClick={clearCoupon} className="text-xs font-semibold text-slate-500 hover:text-red-600">Remove</button>
                      </div>
                    ) : (
                      <div className="flex gap-2 w-full mb-3">
                        <input
                          type="text"
                          value={couponCode}
                          onChange={e => setCouponCode(e.target.value.toUpperCase())}
                          onKeyDown={e => { if (e.key === 'Enter') handleApplyCoupon(); }}
                          placeholder="Coupon code"
                          className="flex-1 min-w-0 border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-brand-cobalt bg-white"
                        />
                        <button
                          onClick={handleApplyCoupon}
                          disabled={couponLoading || !couponCode.trim()}
                          className="text-sm font-bold px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors shrink-0 shadow-sm"
                        >
                          {couponLoading ? '...' : 'Apply'}
                        </button>
                      </div>
                    )}
                    {couponError && <p className="text-xs text-red-600 text-left w-full mb-2">{couponError}</p>}
                    {paymentError && <p className="text-xs text-red-600 text-left w-full mb-2">{paymentError}</p>}

                    <button
                      onClick={() => handlePayment()}
                      className="w-full bg-gradient-main hover:opacity-90 text-white px-6 py-3 rounded-xl font-bold text-lg shadow-md transition-transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {!user ? 'Login to Enroll' : (course.price === 0 ? 'Enroll for Free' : 'Enroll Now')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar (Modules) */}
        <div className="mt-8 lg:mt-0 space-y-6">
          {liveClasses.length > 0 && (
            <div className="bg-white rounded-lg shadow overflow-hidden border border-red-100">
              <div className="p-4 border-b border-gray-200 bg-red-50 flex items-center justify-between">
                <h3 className="text-lg font-bold text-red-700 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse"></span>
                  Live Classes
                </h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-red-100 text-red-700">
                  {hasAccess ? 'Enrolled' : 'Included with Course'}
                </span>
              </div>
              <ul className="divide-y divide-gray-200">
                {liveClasses.map(lc => {
                  const classTime = lc.scheduledStartTime || lc.scheduledAt || lc.createdAt;
                  const isLive = new Date(classTime).getTime() <= Date.now() + 15 * 60000;
                  return (
                    <li key={lc.id} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-sm text-gray-900">{lc.title}</p>
                        <p className="text-xs text-gray-500">{classTime ? new Date(classTime).toLocaleString() : 'Scheduled Session'}</p>
                      </div>
                      {isLive ? (
                        hasAccess ? (
                          <button onClick={() => navigate(`/live-class/${lc.id}`)} className="bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-lg shadow-red-200 hover:bg-red-700 animate-pulse">
                            Join Live
                          </button>
                        ) : (
                          <button onClick={handlePurchase} className="bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-lg shadow-red-200 hover:bg-red-700">
                            Enroll to Join
                          </button>
                        )
                      ) : (
                        <span className="text-xs font-bold text-gray-400 bg-gray-100 px-3 py-1.5 rounded">Upcoming</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden sticky top-6">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-medium text-gray-900">Course Content</h3>
            </div>
            <ul className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
              {course.modules.map((module, idx) => {
                const isModuleLocked = !hasAccess && idx > 0;
                const videos = module.videos && module.videos.length > 0 ? module.videos : (module.videoUrl ? [{
                  id: 'legacy-' + module.id,
                  title: module.title,
                  videoUrl: module.videoUrl,
                  duration: module.duration || '',
                  resources: module.resources
                }] : []);

                return (
                  <li key={module.id} className={`bg-white border-b border-slate-100 ${module.videos?.some(v => v.id === activeVideo?.id) || (module.videoUrl && 'legacy-' + module.id === activeVideo?.id) ? 'border-l-4 border-l-brand-cobalt' : 'border-l-4 border-l-transparent'}`}>
                    <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                      <h4 className="text-sm font-bold text-gray-800">Module {idx + 1}: {module.title}</h4>
                      {isModuleLocked && <span className="text-[10px] text-brand-cobalt font-bold uppercase tracking-wider">Locked</span>}
                    </div>
                    <ul className="divide-y divide-gray-100">
                      {videos.map((video) => (
                        <li
                          key={video.id}
                          className={`p-3 pl-6 transition-all ${activeVideo?.id === video.id ? 'bg-blue-50' : 'hover:bg-slate-50'} ${isModuleLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                          onClick={() => { if (!isModuleLocked) { setActiveModule(module); setActiveVideo(video); } else { handlePayment(); } }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              {(video as any).thumbnailUrl ? (
                                <div className="relative flex-shrink-0 w-20 aspect-video mr-3 rounded overflow-hidden shadow-sm border border-gray-200 group-hover:scale-105 transition-transform duration-300">
                                  <img src={(video as any).thumbnailUrl} alt={video.title} className="absolute inset-0 w-full h-full object-contain cursor-pointer" />
                                  {isModuleLocked && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                      </svg>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className={`flex-shrink-0 h-6 w-6 rounded-md flex items-center justify-center mr-3 ${activeVideo?.id === video.id ? 'bg-brand-cobalt text-white' : 'bg-gray-200 text-gray-600'}`}>
                                  {activeVideo?.id === video.id ? (
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" /></svg>
                                  ) : isModuleLocked ? (
                                    <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                  ) : (
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  )}
                                </div>
                              )}
                              <div className="flex-1">
                                <p className={`text-sm ${activeVideo?.id === video.id ? 'font-bold text-brand-cobalt' : 'font-medium text-gray-700'}`}>{video.title}</p>
                              </div>
                            </div>
                            <span className="text-xs text-gray-400">{video.duration}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      {/* Sticky Mobile Buy Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] md:hidden z-50 animate-in slide-in-from-bottom-full duration-300">
        <div className="flex flex-col gap-2 max-w-7xl mx-auto">
          {!hasAccess && (
            <>
              {/* Coupon row */}
              {appliedCoupon ? (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-green-700">{appliedCoupon.code} applied</p>
                    <p className="text-xs text-green-700/80">You save ₹{appliedCoupon.savings}</p>
                  </div>
                  <button onClick={clearCoupon} className="text-xs font-semibold text-green-800 hover:text-red-600">Remove</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={e => setCouponCode(e.target.value.toUpperCase())}
                    onKeyDown={e => { if (e.key === 'Enter') handleApplyCoupon(); }}
                    placeholder="Coupon code"
                    className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                    className="text-xs font-semibold px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg border border-slate-300 transition-colors"
                  >
                    {couponLoading ? '...' : 'Apply'}
                  </button>
                </div>
              )}
              {couponError && <p className="text-xs text-red-600">{couponError}</p>}
              {paymentError && <p className="text-xs text-red-600">{paymentError}</p>}

              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 uppercase font-bold">Course Price</span>
                  <div className="flex items-baseline gap-2">
                    {appliedCoupon && <span className="text-xs text-red-400 line-through">₹{course.price}</span>}
                    {course.originalPrice && !appliedCoupon && course.originalPrice > (course.price || 0) && (
                      <span className="text-xs text-red-400 line-through">₹{course.originalPrice}</span>
                    )}
                    <span className="text-xl font-bold text-gray-900">₹{displayPrice}</span>
                  </div>
                </div>
                <button
                  onClick={() => handlePayment()}
                  className="flex-1 bg-gradient-main hover:opacity-90 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95"
                >
                  {!user ? 'Login to Enroll' : (course.price === 0 ? 'Enroll for Free' : 'Enroll Now')}
                </button>
              </div>
            </>
          )}
          {hasAccess && (
            <div className="text-center">
              <span className="text-sm font-bold text-green-600">
                {isCollegeFree ? `✓ Free for ${course.collegeConfig?.name}` : '✓ Enrolled'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;