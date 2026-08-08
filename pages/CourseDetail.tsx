import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import { Course, CourseModule, CourseVideo, User } from '../types';
import { useAuth } from '../context/AuthContext';
import CustomVideoPlayer from '../components/CustomVideoPlayer';

// Extend window object to support Razorpay
declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
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
  const { user, updateUser, setShowLoginModal, setOnLoginSuccess } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [activeModule, setActiveModule] = useState<CourseModule | null>(null);
  const [activeVideo, setActiveVideo] = useState<CourseVideo | null>(null);

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
    }
  }, [id]);

  useEffect(() => {
    if (user) {
      api.getMe().then(freshUser => updateUser(freshUser)).catch(() => {});
    }
  }, [user?.id]);

  const isPurchased = user?.purchasedCourseIds.includes(course?.id || '') || false;
  const hasAccess = !!user && (isPurchased || (course?.price === 0));
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

    const userIsPurchased = currentUser?.purchasedCourseIds.includes(course.id) || false;
    const userHasAccess = !!currentUser && (userIsPurchased || (course.price === 0));
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

        const options = {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency || 'INR',
          name: 'UNIEVAL',
          description: `Unlock ${course.title}`,
          image: 'https://cdn-icons-png.flaticon.com/512/337/337946.png',
          order_id: orderData.orderId,
          handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
            try {
              const result = await api.verifyCoursePayment(course.id, {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                couponId: appliedCoupon?.couponId,
              });
              if (result.success) updateUser(result.user);
            } catch (e: any) {
              setPaymentError(e.message || 'Payment verification failed. Please contact support.');
            }
          },
          prefill: { name: currentUser.name, email: currentUser.email, contact: '' },
          theme: { color: '#4f46e5' },
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
      })
      .catch(e => setPaymentError(e.message || 'Could not initiate payment.'));
  };

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
      <div className="lg:grid lg:grid-cols-3 lg:gap-8">
        {/* Main Content (Video Player) */}
        <div className="lg:col-span-2">
          <div className="mb-6 relative">
            {hasAccess ? (
              activeVideo?.videoUrl && activeVideo?.videoStatus !== 'processing' && activeVideo?.videoStatus !== 'finalizing' && activeVideo?.videoStatus !== 'error' ? (
                <CustomVideoPlayer
                  src={activeVideo.videoUrl}
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
              <div className="absolute inset-0 flex items-center justify-center flex-col bg-brand-navy/95 backdrop-blur-sm z-10 p-6 text-center rounded-xl shadow-2xl overflow-hidden">
                <div className="w-16 h-16 bg-brand-cobalt rounded-full flex items-center justify-center mb-4 shadow-lg shadow-brand-cobalt/30">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Course Locked</h3>
                <p className="text-gray-300 mb-6 max-w-md">Enroll in this course to access high-quality video lectures, assignments, and more.</p>
                <button
                  onClick={() => handlePayment()}
                  className="bg-gradient-main text-white hover:opacity-90 px-8 py-3 rounded-xl font-bold text-lg transition-all"
                >
                  {!user ? 'Login to Enroll' : (course.price === 0 ? 'Enroll for Free' : `Unlock for ₹${displayPrice}`)}
                </button>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-brand-navy mb-2">{course.title}</h1>
                <p className="text-gray-600 whitespace-pre-line">{course.description}</p>
              </div>
              <div className="hidden md:block text-right min-w-[200px]">
                {hasAccess ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">Enrolled</span>
                ) : (
                  <div className="flex flex-col items-end gap-3">
                    {/* Price */}
                    <div className="flex items-baseline gap-2">
                      {appliedCoupon && (
                        <span className="text-sm text-gray-400 line-through">₹{course.price}</span>
                      )}
                      <span className="text-2xl font-bold text-gray-900">₹{displayPrice}</span>
                    </div>

                    {/* Coupon row */}
                    {appliedCoupon ? (
                      <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 w-full">
                        <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        <div className="flex-1 text-left">
                          <p className="text-xs font-bold text-green-700">{appliedCoupon.code} applied</p>
                          <p className="text-xs text-slate-500">You save ₹{appliedCoupon.savings}</p>
                        </div>
                        <button onClick={clearCoupon} className="text-xs font-semibold text-slate-500 hover:text-red-600">Remove</button>
                      </div>
                    ) : (
                      <div className="flex gap-2 w-full">
                        <input
                          type="text"
                          value={couponCode}
                          onChange={e => setCouponCode(e.target.value.toUpperCase())}
                          onKeyDown={e => { if (e.key === 'Enter') handleApplyCoupon(); }}
                          placeholder="Coupon code"
                          className="flex-1 min-w-0 border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                        <button
                          onClick={handleApplyCoupon}
                          disabled={couponLoading || !couponCode.trim()}
                          className="text-xs font-semibold px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg border border-slate-300 transition-colors shrink-0"
                        >
                          {couponLoading ? '...' : 'Apply'}
                        </button>
                      </div>
                    )}
                    {couponError && <p className="text-xs text-red-600 text-left w-full">{couponError}</p>}
                    {paymentError && <p className="text-xs text-red-600 text-left w-full">{paymentError}</p>}

                    <button
                      onClick={() => handlePayment()}
                      className="w-full mt-1 bg-gradient-main hover:opacity-90 text-white px-6 py-2 rounded-lg font-bold shadow-md transition-all"
                    >
                      {!user ? 'Login' : (course.price === 0 ? 'Enroll' : 'Buy Now')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar (Modules) */}
        <div className="mt-8 lg:mt-0">
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
                  {!user ? 'Login to Enroll' : (course.price === 0 ? 'Enroll Now' : 'Enroll Now')}
                </button>
              </div>
            </>
          )}
          {hasAccess && (
            <div className="text-center">
              <span className="text-sm font-bold text-green-600">✓ Enrolled</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;