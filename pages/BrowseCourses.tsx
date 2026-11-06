import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Branch, Subject, Course, Note, Quiz, Viva, Combo } from '../types';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSEO } from '../hooks/useSEO';
import { Layers, Award, BookOpen, Package, Check, Loader2, AlertCircle, ArrowRight, ShieldCheck, HelpCircle, Clock } from 'lucide-react';
import { launchCashfreeCheckout } from '../services/cashfreeCheckout';

const BrowseCourses: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  
  useSEO({
    title: 'SPPU Engineering Courses, Video Lectures & Syllabus Catalog',
    description: 'Browse all SPPU (Pune University) engineering courses, video lectures, notes, and viva assessments across Computer, IT, Mechanical, Civil, ENTC & AIDS.',
    canonical: 'https://unieval.in/browse',
  });

  // --- Filters State ---
  const initialBranch = searchParams.get('branch') || '';
  const initialYear = searchParams.get('year') ? Number(searchParams.get('year')) : '';
  const initialQuery = searchParams.get('q') || searchParams.get('search') || '';

  const [selectedBranch, setSelectedBranch] = useState<string>(initialBranch);
  const [selectedYear, setSelectedYear] = useState<number | ''>(initialYear as number | '');
  const [searchQuery, setSearchQuery] = useState<string>(initialQuery);

  // --- Data State ---
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [viva, setViva] = useState<Viva[]>([]);
  const [loading, setLoading] = useState(false);

  // Selected combo for detail/checkout modal
  const [activeComboDetail, setActiveComboDetail] = useState<(Combo & { courses?: Course[]; notes?: Note[] }) | null>(null);
  const [loadingComboModal, setLoadingComboModal] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // --- Tabs State ---
  type TabType = 'courses' | 'notes' | 'combos' | 'quizzes' | 'viva';
  const [activeTab, setActiveTab] = useState<TabType>('courses');

  // Sync state to URL when changed
  useEffect(() => {
    const b = searchParams.get('branch');
    const y = searchParams.get('year');
    const q = searchParams.get('q') || searchParams.get('search');
    setTimeout(() => {
        if (b !== null && b !== selectedBranch) setSelectedBranch(b);
        if (y !== null && Number(y) !== selectedYear) setSelectedYear(Number(y));
        if (q !== null && q !== searchQuery) setSearchQuery(q);
    }, 0);
  }, [searchParams, selectedBranch, selectedYear, searchQuery]);

  useEffect(() => {
    document.title = 'SPPU Engineering Courses, Video Lectures & Syllabus | Pune University - UniEval';
    let canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.setAttribute('href', 'https://unieval.in/browse');
    }
  }, []);

  const updateParams = (branch: string, year: number | '', q: string = searchQuery) => {
    const params: Record<string, string> = {};
    if (branch) params.branch = branch;
    if (year) params.year = year.toString();
    if (q) params.q = q;
    setSearchParams(params);
  };

  const handleYearChange = (year: number | '') => {
    setSelectedYear(year);
    updateParams(selectedBranch, year);
  };
  
  const handleBranchChange = (branch: string) => {
    setSelectedBranch(branch);
    updateParams(branch, selectedYear);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    updateParams(selectedBranch, selectedYear, query);
  };

  const toggleFirstYearMode = () => {
      if (selectedYear === 1) {
          setSelectedYear('');
          updateParams(selectedBranch, '');
      } else {
          setSelectedBranch('');
          setSelectedYear(1);
          updateParams('', 1);
      }
  }

  // --- Data Fetching ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Get Subjects based on filters
        const fetchedSubjects = await api.getSubjects(
          selectedBranch as Branch || undefined,
          selectedYear ? Number(selectedYear) : undefined
        ).catch(() => []);
        setSubjects(fetchedSubjects);

        // 2. Fetch all content
        const subjectIds = new Set(fetchedSubjects.map(s => s.id));
        
        const [allCourses, allNotes, allCombos, allQuizzes, allViva] = await Promise.all([
            api.getCourses().catch(() => []),
            api.getNotes().catch(() => []),
            api.getCombos().catch(() => []),
            api.getQuizzes().catch(() => []),
            api.getViva().catch(() => [])
        ]);

        const dedup = <T extends { id: string }>(arr: T[]) =>
          arr.filter((item, idx, self) => self.findIndex(x => x.id === item.id) === idx);

        if (selectedBranch || selectedYear) {
          setCourses(dedup(allCourses.filter(c => subjectIds.has(c.subjectId))));
          setNotes(dedup(allNotes.filter(n => subjectIds.has(n.subjectId))));
          setCombos(dedup(allCombos.filter(cb => (cb.subjectIds || []).some((sid: string) => subjectIds.has(sid)))));
          setQuizzes(dedup(allQuizzes.filter(q => subjectIds.has(q.subjectId))));
          setViva(dedup(allViva.filter(v => subjectIds.has(v.subjectId))));
        } else {
          setCourses(dedup(allCourses));
          setNotes(dedup(allNotes));
          setCombos(dedup(allCombos));
          setQuizzes(dedup(allQuizzes));
          setViva(dedup(allViva));
        }
      } catch (err) {
        console.error('Failed to load courses data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedBranch, selectedYear]);

  const isFirstYearMode = selectedYear === 1;
  const availableYears = isFirstYearMode ? [1] : [2, 3, 4];

  // Helper to filter items by keyword search query
  const filterByQuery = <T extends { title?: string; name?: string; description?: string }>(items: T[]) => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase().trim();
    if (q === 'sppu' || q === 'notes' || q === 'courses' || q === 'sppu notes' || q === 'sppu courses') return items;
    return items.filter(item => {
      const title = (item.title || item.name || '').toLowerCase();
      const desc = (item.description || '').toLowerCase();
      return title.includes(q) || desc.includes(q);
    });
  };

  const displayedCourses = React.useMemo(() => filterByQuery(courses), [courses, searchQuery]);
  const displayedNotes = React.useMemo(() => filterByQuery(notes), [notes, searchQuery]);
  const displayedCombos = React.useMemo(() => filterByQuery(combos), [combos, searchQuery]);
  const displayedQuizzes = React.useMemo(() => filterByQuery(quizzes), [quizzes, searchQuery]);
  const displayedViva = React.useMemo(() => filterByQuery(viva), [viva, searchQuery]);

  // Helper to get counts for tabs
  const counts = {
      courses: displayedCourses.length,
      notes: displayedNotes.length,
      combos: displayedCombos.length,
      quizzes: displayedQuizzes.length,
      viva: displayedViva.length
  };

  // --- Render Functions ---

  const renderCourses = () => (
     <div className="grid grid-cols-1 gap-8">
            {subjects.map(subject => {
                const subjectCourses = displayedCourses.filter(c => c.subjectId === subject.id);
                if (subjectCourses.length === 0) return null;

                return (
                    <div key={subject.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-300">
                        <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800">{subject.name}</h3>
                                <p className="text-sm text-gray-500 font-mono mt-1">{subject.code} • {isFirstYearMode ? 'Common' : subject.branch}</p>
                            </div>
                        </div>
                        
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {subjectCourses.map(course => (
                                    <Link to={`/course/${course.id}`} key={course.id} className="group block h-full">
                                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden group-hover:border-indigo-300 transition-colors h-full flex flex-col">
                                            <div className="aspect-video bg-gray-200 relative overflow-hidden">
                                                <img 
                                                    src={course.thumbnailUrl} 
                                                    alt={course.title} 
                                                    className="absolute inset-0 object-contain w-full h-full transform group-hover:scale-105 transition-transform duration-500 cursor-pointer"
                                                    onError={(e) => { e.currentTarget.src = 'https://picsum.photos/800/600?random=' + course.id; }}
                                                />
                                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity flex items-center justify-center">
                                                    <svg className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                            </div>
                                            <div className="p-4 flex flex-col flex-grow">
                                                <h4 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-1">{course.title}</h4>
                                                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{course.description}</p>
                                                <div className="mt-auto pt-4 flex items-center justify-between">
                                                    <div className="text-xs text-gray-400 flex items-center">
                                                        <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        {course.modules.length} Modules
                                                    </div>
                                                    {course.price ? (
                                                        <div className="flex flex-col items-end">
                                                            {course.originalPrice && course.originalPrice > course.price && (
                                                                <span className="text-xs text-red-400 line-through">₹{course.originalPrice}</span>
                                                            )}
                                                            <span className="font-bold text-gray-900">₹{course.price}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded">FREE</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            })}
            {(() => {
                const otherCourses = displayedCourses.filter(c => !subjects.some(s => s.id === c.subjectId));
                if (otherCourses.length === 0) return null;
                return (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-300">
                        <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800">Other Courses</h3>
                                <p className="text-sm text-gray-500 font-mono mt-1">General Curriculum</p>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {otherCourses.map(course => (
                                    <Link to={`/course/${course.id}`} key={course.id} className="group block h-full">
                                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden group-hover:border-indigo-300 transition-colors h-full flex flex-col">
                                            <div className="aspect-video bg-gray-200 relative overflow-hidden">
                                                <img 
                                                    src={course.thumbnailUrl} 
                                                    alt={course.title} 
                                                    className="absolute inset-0 object-contain w-full h-full transform group-hover:scale-105 transition-transform duration-500 cursor-pointer"
                                                    onError={(e) => { e.currentTarget.src = 'https://picsum.photos/800/600?random=' + course.id; }}
                                                />
                                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity flex items-center justify-center">
                                                    <svg className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                            </div>
                                            <div className="p-4 flex flex-col flex-grow">
                                                <h4 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-1">{course.title}</h4>
                                                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{course.description}</p>
                                                <div className="mt-auto pt-4 flex items-center justify-between">
                                                    <div className="text-xs text-gray-400 flex items-center">
                                                        <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        {course.modules.length} Modules
                                                    </div>
                                                    {course.price ? (
                                                        <div className="flex flex-col items-end">
                                                            {course.originalPrice && course.originalPrice > course.price && (
                                                                <span className="text-xs text-red-400 line-through">₹{course.originalPrice}</span>
                                                            )}
                                                            <span className="font-bold text-gray-900">₹{course.price}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded">FREE</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            })()}
            {displayedCourses.length === 0 && <div className="text-center py-10 text-gray-500">No courses found.</div>}
     </div>
  );

  const renderProductGrid = (items: (Note | Quiz | Viva)[], type: 'note' | 'quiz' | 'viva') => (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(item => {
              // Determine the link destination based on type
              let linkPath = '';
              if (type === 'note') linkPath = `/note/${item.id}`;
              else if (type === 'quiz') linkPath = `/quiz/${item.id}`;
              else if (type === 'viva') linkPath = `/viva/${item.id}`;
              
              const CardContent = (
                <div className="bg-white rounded-2xl shadow-2xs border border-slate-200/80 p-6 hover:shadow-md hover:border-blue-300 transition-all duration-200 flex flex-col relative overflow-hidden group h-full">
                  <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">
                          {item.title}
                      </h3>
                      {type === 'note' && (
                          <div className="bg-red-50 p-2 rounded-lg shrink-0">
                             <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                             </svg>
                          </div>
                      )}
                      {type === 'quiz' && (
                          <div className="bg-blue-50 p-2 rounded-lg shrink-0">
                              <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                          </div>
                      )}
                      {type === 'viva' && (
                           <div className="bg-green-50 p-2 rounded-lg shrink-0">
                              <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                              </svg>
                           </div>
                      )}
                  </div>

                  {type === 'note' && (
                    <div className="mb-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-brand-cobalt border border-blue-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-cobalt animate-pulse"></span>
                        1st PDF Free Demo
                      </span>
                    </div>
                  )}

                  <p className="text-sm text-gray-500 mb-6 flex-grow">
                      {item.description || `Comprehensive ${type} material for your preparation.`}
                  </p>
                  
                  {type === 'quiz' && (
                      <div className="mb-4 flex items-center gap-4 text-xs font-medium text-slate-500">
                          <span className="flex items-center"><HelpCircle className="w-3.5 h-3.5 mr-1 text-slate-400" /> {(item as Quiz).questionCount} Qs</span>
                          <span className="flex items-center"><Clock className="w-3.5 h-3.5 mr-1 text-slate-400" /> {(item as Quiz).durationMinutes} Mins</span>
                      </div>
                  )}

                  <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-50">
                      <div>
                          {item.price ? (
                              <div className="flex flex-col">
                                  {item.originalPrice && item.originalPrice > item.price && (
                                      <span className="text-xs text-red-400 line-through">₹{item.originalPrice.toFixed(2)}</span>
                                  )}
                                  <span className="text-xl font-bold text-gray-900">₹{item.price.toFixed(2)}</span>
                              </div>
                          ) : (
                              <span className="text-lg font-bold text-green-600">Free</span>
                          )}
                      </div>
                      <span className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 underline">
                          {type === 'quiz' ? 'Start Quiz' : type === 'viva' ? 'Start Viva' : 'View Details'}
                      </span>
                  </div>
              </div>
              );

              return linkPath ? (
                  <Link to={linkPath} key={item.id} className="block h-full">
                      {CardContent}
                  </Link>
              ) : (
                  <div key={item.id} className="block h-full cursor-pointer">
                      {CardContent}
                  </div>
              );
          })}
      </div>
  );

  const isUserEnrolledInCombo = (combo: Combo) => {
      if (!user) return false;
      if (user.purchasedComboIds?.includes(combo.id)) return true;
      const collegeDomain = combo.collegeConfig?.emailDomain?.trim().toLowerCase();
      if (collegeDomain && collegeDomain.length >= 3 && user.email?.toLowerCase().endsWith(collegeDomain)) return true;
      return false;
  };

  const handleOpenComboModal = async (combo: Combo) => {
      setCheckoutError(null);
      setLoadingComboModal(true);
      try {
          const detail = await api.getComboById(combo.id);
          setActiveComboDetail(detail || combo);
      } catch (e) {
          setActiveComboDetail(combo);
      } finally {
          setLoadingComboModal(false);
      }
  };

  const handleEnrollCombo = async (combo: Combo) => {
      if (!user) {
          navigate('/login');
          return;
      }
      setCheckoutError(null);
      setCheckoutLoading(true);

      try {
          const collegeDomain = combo.collegeConfig?.emailDomain?.trim().toLowerCase();
          const isCollegeFree = !!collegeDomain && collegeDomain.length >= 3 && user.email?.toLowerCase().endsWith(collegeDomain);

          if ((combo.price === 0) || isCollegeFree) {
              const res = await api.enrollComboFree(combo.id);
              if (res.user) updateUser(res.user);
              alert('🎉 Success! This combo has been unlocked. All included courses and notes are now in your dashboard.');
              setActiveComboDetail(null);
              navigate('/dashboard');
              return;
          }

          const orderData = await api.createComboOrder(combo.id);
          if (orderData.devMode && orderData.user) {
              updateUser(orderData.user);
              alert('🎉 Success! This combo has been unlocked. All included courses and notes are now in your dashboard.');
              setActiveComboDetail(null);
              navigate('/dashboard');
              return;
          }

          if (!orderData.paymentSessionId || !orderData.orderId) {
              throw new Error('Failed to create payment session. Please try again.');
          }

          launchCashfreeCheckout({
              paymentSessionId: orderData.paymentSessionId,
              onError: (errMsg) => setCheckoutError(errMsg),
              onSuccess: async () => {
                  try {
                      const verifyRes = await api.verifyComboPurchase(combo.id, {
                          cashfree_order_id: orderData.orderId!,
                          cashfree_payment_session_id: orderData.paymentSessionId!
                      });
                      if (verifyRes.success && verifyRes.user) {
                          updateUser(verifyRes.user);
                          alert('Payment successful! All courses and notes in this combo are now unlocked.');
                          setActiveComboDetail(null);
                          navigate('/dashboard');
                      }
                  } catch (e: any) {
                      setCheckoutError(e.message || 'Payment verification failed. Please contact support.');
                  }
              }
          });
      } catch (err: any) {
          setCheckoutError(err.message || 'Failed to initiate combo purchase.');
      } finally {
          setCheckoutLoading(false);
      }
  };

  const renderCombos = () => (
      <div className="space-y-6">
          <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-md border border-indigo-800/40 relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
              <div className="relative z-10 max-w-2xl">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-amber-300 backdrop-blur-sm border border-white/15 mb-3">
                      <Award className="w-3.5 h-3.5 text-amber-300" /> Best Value Bundles
                  </span>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-white leading-tight">
                      Semester Subject Combos
                  </h3>
                  <p className="text-xs sm:text-sm text-indigo-200 mt-1.5 leading-relaxed">
                      Get all-in-one preparation for your semester. When you unlock a combo, all video courses and exam notes across every subject in the bundle are immediately unlocked in your personal student library.
                  </p>
              </div>
          </div>

          {displayedCombos.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-md mx-auto">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <Layers className="w-7 h-7" />
                  </div>
                  <h4 className="text-base font-bold text-slate-800 mb-1">No Combos Available For This Filter</h4>
                  <p className="text-xs text-slate-500 mb-4">
                      Try selecting "All Branches" or clearing your search keywords to view all active bundles.
                  </p>
              </div>
          ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {displayedCombos.map(combo => {
                      const isEnrolled = isUserEnrolledInCombo(combo);
                      const discountPercent = combo.originalPrice && combo.originalPrice > combo.price
                          ? Math.round(((combo.originalPrice - combo.price) / combo.originalPrice) * 100)
                          : null;

                      const comboCourses = courses.filter(c => combo.subjectIds?.includes(c.subjectId));
                      const comboNotes = notes.filter(n => combo.subjectIds?.includes(n.subjectId));
                      const cCount = combo.coursesCount ?? (combo.comboType === 'notes' ? 0 : comboCourses.length);
                      const nCount = combo.notesCount ?? (combo.comboType === 'courses' ? 0 : comboNotes.length);

                      return (
                          <div
                              key={combo.id}
                              onClick={() => handleOpenComboModal(combo)}
                              className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col cursor-pointer group"
                          >
                              {/* Thumbnail */}
                              <div className="aspect-video bg-slate-900 relative overflow-hidden flex items-center justify-center">
                                  {combo.thumbnailUrl ? (
                                      <img
                                          src={combo.thumbnailUrl}
                                          alt={combo.title}
                                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                                      />
                                  ) : (
                                      <div className="w-full h-full bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 p-6 flex flex-col justify-between">
                                          <div className="flex justify-between items-start">
                                              <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                  Subject Combo
                                              </span>
                                              <Layers className="w-6 h-6 text-indigo-400" />
                                          </div>
                                          <div>
                                              <p className="text-white font-extrabold text-base sm:text-lg line-clamp-2">{combo.title}</p>
                                              <p className="text-indigo-300/80 text-xs mt-1">{combo.subjectIds?.length || 0} Subjects Included</p>
                                          </div>
                                      </div>
                                  )}

                                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                                      {discountPercent && (
                                          <span className="bg-emerald-500 text-white text-[11px] font-extrabold px-2.5 py-0.5 rounded-full shadow-sm">
                                              {discountPercent}% OFF
                                          </span>
                                      )}
                                      <span className="bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border border-white/10">
                                          Combo
                                      </span>
                                  </div>
                              </div>

                              <div className="p-5 flex-1 flex flex-col">
                                  <h4 className="font-extrabold text-base text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1 mb-1">
                                      {combo.title}
                                  </h4>

                                  {combo.description && (
                                      <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                                          {combo.description}
                                      </p>
                                  )}

                                  {/* Subject tags */}
                                  <div className="mb-3">
                                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                          Includes {combo.subjectIds?.length || 0} Subjects:
                                      </p>
                                      <div className="flex flex-wrap gap-1">
                                          {(combo.subjectNames || []).slice(0, 3).map((sn, i) => (
                                              <span key={i} className="bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded-md truncate max-w-[130px]">
                                                  {sn}
                                              </span>
                                          ))}
                                          {(combo.subjectNames || []).length > 3 && (
                                              <span className="bg-slate-100 text-slate-500 text-[10px] font-semibold px-1.5 py-0.5 rounded-md">
                                                  +{(combo.subjectNames || []).length - 3} more
                                              </span>
                                          )}
                                      </div>
                                  </div>

                                  {/* Materials count pill */}
                                  <div className="bg-indigo-50/70 border border-indigo-100/80 rounded-xl p-2.5 mb-4 text-xs flex items-center justify-around font-medium">
                                      <span className="flex items-center gap-1 text-blue-700 font-bold">
                                          <BookOpen className="w-3.5 h-3.5" />
                                          {cCount} Course{cCount === 1 ? '' : 's'}
                                      </span>
                                      <span className="text-indigo-200">•</span>
                                      <span className="flex items-center gap-1 text-purple-700 font-bold">
                                          <Package className="w-3.5 h-3.5" />
                                          {nCount} Note Pkg{nCount === 1 ? '' : 's'}
                                      </span>
                                  </div>

                                  <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
                                      <div>
                                          {combo.originalPrice && combo.originalPrice > combo.price ? (
                                              <div className="flex flex-col">
                                                  <span className="text-[10px] text-gray-400 line-through">₹{combo.originalPrice}</span>
                                                  <span className="font-extrabold text-slate-900 text-lg leading-tight">₹{combo.price}</span>
                                              </div>
                                          ) : (
                                              <span className="font-extrabold text-slate-900 text-lg">
                                                  {combo.price === 0 ? 'FREE' : `₹${combo.price}`}
                                              </span>
                                          )}
                                      </div>

                                      <button
                                          type="button"
                                          onClick={(e) => {
                                              e.stopPropagation();
                                              handleOpenComboModal(combo);
                                          }}
                                          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${isEnrolled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' : 'bg-indigo-900 hover:bg-indigo-800 text-white shadow-sm'}`}
                                      >
                                          {isEnrolled ? (
                                              <>
                                                  <Check className="w-3.5 h-3.5" /> Enrolled
                                              </>
                                          ) : (
                                              <>
                                                  View Combo <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                                              </>
                                          )}
                                      </button>
                                  </div>
                              </div>
                          </div>
                      );
                  })}
              </div>
          )}
      </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 min-h-screen">
      
      {/* Dynamic Header */}
      <div className="mb-6 sm:mb-8 border-b border-gray-200 pb-5 sm:pb-6">
         <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
             <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                    {isFirstYearMode ? 'First Year Engineering (FE)' : (selectedBranch ? `${selectedBranch}` : 'Browse All Content')}
                </h1>
                <p className="mt-2 text-sm sm:text-base text-gray-600">
                {isFirstYearMode 
                    ? 'Common curriculum for all engineering branches.' 
                    : 'Select your academic year to view specific subjects.'}
                </p>
             </div>
             {/* Toggle Button for Context Switching */}
             <button 
                onClick={toggleFirstYearMode}
                className="w-full sm:w-auto text-center bg-gray-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors whitespace-nowrap min-h-[44px] flex items-center justify-center"
             >
                {isFirstYearMode ? 'View Departmental Content' : 'View First Year (FE)'}
             </button>
         </div>
      </div>

      {/* Filters Section */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-start sm:items-end mb-6 sm:mb-8">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                 </div>
                 <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Search courses, notes, topics..."
                    className="block w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700 min-h-[44px]"
                 />
            </div>

            {/* Year Selector */}
            <div className="flex space-x-2 overflow-x-auto pb-2 no-scrollbar w-full sm:w-auto -mx-3 px-3 sm:mx-0 sm:px-0">
                {availableYears.map(y => (
                    <button
                        key={y}
                        onClick={() => handleYearChange(y === selectedYear ? '' : y)}
                        className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap min-h-[44px] min-w-[52px] flex items-center justify-center ${
                            selectedYear === y 
                            ? 'bg-indigo-600 text-white shadow-md' 
                            : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                        }`}
                    >
                        {y === 1 ? 'FE' : y === 2 ? 'SE' : y === 3 ? 'TE' : 'BE'}
                    </button>
                ))}
            </div>

            {/* Branch Selector (Hidden if Year 1 is selected) */}
            {!isFirstYearMode && (
                <div className="relative w-full sm:w-[320px]">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                     </div>
                     <select
                        value={selectedBranch}
                        onChange={(e) => handleBranchChange(e.target.value)}
                        className="appearance-none block w-full pl-10 pr-10 py-3 text-base bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-700 font-medium cursor-pointer hover:border-indigo-300 transition-colors min-h-[44px]"
                     >
                        <option value="">All Engineering Branches</option>
                        <option value="Computer Science Engineering (CSE)">Computer Science (CSE)</option>
                        <option value="Mechanical Engineering">Mechanical Engineering</option>
                        <option value="Civil Engineering">Civil Engineering</option>
                        <option value="Electrical & Electronics Engineering (EEE)">Electrical & Electronics (EEE)</option>
                        <option value="Artificial Intelligence & Machine Learning (AI-ML)">AI & ML</option>
                     </select>
                     <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                     </div>
                </div>
            )}
      </div>

      {/* TABS NAVIGATION */}
      <div className="mb-8 border-b border-gray-200 overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0">
          <nav className="-mb-px flex space-x-6 sm:space-x-8 min-w-max" aria-label="Tabs">
              {(['courses', 'notes', 'combos', 'quizzes', 'viva'] as TabType[]).map((tab) => (
                  <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`
                        whitespace-nowrap py-3.5 px-1 border-b-2 font-medium text-sm transition-colors min-h-[44px] flex items-center
                        ${activeTab === tab
                          ? 'border-indigo-500 text-indigo-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                      `}
                  >
                      {tab === 'courses' && 'Video Courses'}
                      {tab === 'notes' && 'Exam Notes'}
                      {tab === 'combos' && 'Subject Combos'}
                      {tab === 'quizzes' && 'Quizzes'}
                      {tab === 'viva' && 'Viva'}
                      <span className={`ml-2 py-0.5 px-2.5 rounded-full text-xs font-medium ${activeTab === tab ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-900'}`}>
                          {counts[tab]}
                      </span>
                  </button>
              ))}
          </nav>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
          <div>
              {activeTab === 'courses' && renderCourses()}
              
              {activeTab === 'notes' && (
                  displayedNotes.length > 0 
                  ? renderProductGrid(displayedNotes, 'note') 
                  : <div className="text-center py-12 bg-gray-50 rounded-lg text-gray-500">No notes found for this selection.</div>
              )}

              {activeTab === 'combos' && renderCombos()}

              {activeTab === 'quizzes' && (
                   displayedQuizzes.length > 0
                   ? renderProductGrid(displayedQuizzes, 'quiz')
                   : <div className="text-center py-12 bg-gray-50 rounded-lg text-gray-500">No quizzes available for this selection.</div>
              )}

              {activeTab === 'viva' && (
                   displayedViva.length > 0
                   ? renderProductGrid(displayedViva, 'viva')
                   : <div className="text-center py-12 bg-gray-50 rounded-lg text-gray-500">No viva preparation material available for this selection.</div>
              )}
          </div>
      )}

      {/* Combo Details & Checkout Modal */}
      {activeComboDetail && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100">
                  {/* Modal Header */}
                  <div className="p-5 border-b border-gray-100 flex justify-between items-start bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white shrink-0">
                      <div>
                          <div className="flex items-center gap-2 mb-1.5">
                              <span className="bg-white/10 text-yellow-300 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border border-white/15">
                                  Subject Combo Bundle
                              </span>
                              {activeComboDetail.originalPrice && activeComboDetail.originalPrice > activeComboDetail.price && (
                                  <span className="bg-emerald-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                                      {Math.round(((activeComboDetail.originalPrice - activeComboDetail.price) / activeComboDetail.originalPrice) * 100)}% OFF
                                  </span>
                              )}
                          </div>
                          <h3 className="text-lg sm:text-xl font-extrabold text-white leading-tight">
                              {activeComboDetail.title}
                          </h3>
                      </div>
                      <button
                          onClick={() => setActiveComboDetail(null)}
                          className="text-white/70 hover:text-white font-bold text-2xl -mt-1 -mr-1 p-1 transition-colors"
                      >
                          &times;
                      </button>
                  </div>

                  {/* Modal Body */}
                  <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
                      {activeComboDetail.description && (
                          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                              {activeComboDetail.description}
                          </p>
                      )}

                      {/* Pricing summary card */}
                      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div>
                              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                  Combo Access Price
                              </p>
                              <div className="flex items-baseline gap-2 mt-0.5">
                                  <span className="text-3xl font-extrabold text-slate-900">
                                      {activeComboDetail.price === 0 ? 'FREE' : `₹${activeComboDetail.price}`}
                                  </span>
                                  {activeComboDetail.originalPrice && activeComboDetail.originalPrice > activeComboDetail.price && (
                                      <span className="text-sm text-slate-400 line-through">
                                          ₹{activeComboDetail.originalPrice}
                                      </span>
                                  )}
                              </div>
                              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                                  <span>
                                      {activeComboDetail.validityType === 'date' && activeComboDetail.validityDate
                                          ? `Valid until ${new Date(activeComboDetail.validityDate).toLocaleDateString()}`
                                          : `Full ${activeComboDetail.validityMonths || 6} Months Access`}
                                  </span>
                              </p>
                          </div>

                          <div className="w-full sm:w-auto">
                              {isUserEnrolledInCombo(activeComboDetail) ? (
                                  <button
                                      onClick={() => {
                                          setActiveComboDetail(null);
                                          navigate('/dashboard');
                                      }}
                                      className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2"
                                  >
                                      <Check className="w-4 h-4" /> Already Enrolled • Go to Dashboard
                                  </button>
                              ) : (
                                  <button
                                      disabled={checkoutLoading}
                                      onClick={() => handleEnrollCombo(activeComboDetail)}
                                      className="w-full sm:w-auto bg-indigo-900 hover:bg-indigo-800 text-white px-7 py-3 rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-indigo-900/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
                                  >
                                      {checkoutLoading ? (
                                          <>
                                              <Loader2 className="w-4 h-4 animate-spin" />
                                              <span>Processing...</span>
                                          </>
                                      ) : (
                                          <span>
                                              {activeComboDetail.price === 0 ? 'Enroll For Free' : `Unlock Combo • ₹${activeComboDetail.price}`}
                                          </span>
                                      )}
                                  </button>
                              )}
                          </div>
                      </div>

                      {checkoutError && (
                          <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 shrink-0" />
                              <span>{checkoutError}</span>
                          </div>
                      )}

                      {/* Included subjects list */}
                      <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                              Included Subjects ({activeComboDetail.subjectIds?.length || 0})
                          </h4>
                          <div className="flex flex-wrap gap-2">
                              {(activeComboDetail.subjectNames && activeComboDetail.subjectNames.length > 0
                                  ? activeComboDetail.subjectNames
                                  : (activeComboDetail.subjectIds || []).map(id => subjects.find(s => s.id === id)?.name || id)
                              ).map((sName, i) => (
                                  <span key={i} className="bg-indigo-50 border border-indigo-100 text-indigo-900 text-xs font-semibold px-3 py-1 rounded-lg">
                                      {sName}
                                  </span>
                              ))}
                          </div>
                      </div>

                      {/* Included items breakdown */}
                      <div className="space-y-4 pt-2">
                          {/* Courses breakdown */}
                          {activeComboDetail.comboType !== 'notes' && (
                              <div>
                                  <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2">
                                      <BookOpen className="w-4 h-4 text-blue-600" />
                                      Included Video Courses ({activeComboDetail.courses?.length ?? courses.filter(c => activeComboDetail.subjectIds?.includes(c.subjectId)).length})
                                  </h4>
                                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                      {(activeComboDetail.courses && activeComboDetail.courses.length > 0
                                          ? activeComboDetail.courses
                                          : courses.filter(c => activeComboDetail.subjectIds?.includes(c.subjectId))
                                      ).map((c, i) => (
                                          <div key={i} className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs flex justify-between items-center">
                                              <span className="font-semibold text-slate-800 truncate mr-2">{c.title}</span>
                                              <span className="text-slate-400 shrink-0">{c.modules?.length || 0} Modules</span>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          )}

                          {/* Notes breakdown */}
                          {activeComboDetail.comboType !== 'courses' && (
                              <div>
                                  <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2">
                                      <Package className="w-4 h-4 text-purple-600" />
                                      Included Exam Note Packages ({activeComboDetail.notes?.length ?? notes.filter(n => activeComboDetail.subjectIds?.includes(n.subjectId)).length})
                                  </h4>
                                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                      {(activeComboDetail.notes && activeComboDetail.notes.length > 0
                                          ? activeComboDetail.notes
                                          : notes.filter(n => activeComboDetail.subjectIds?.includes(n.subjectId))
                                      ).map((n, i) => (
                                          <div key={i} className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs flex justify-between items-center">
                                              <span className="font-semibold text-slate-800 truncate mr-2">{n.title}</span>
                                              <span className="text-slate-400 shrink-0">{n.sections?.length || 0} Units</span>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default BrowseCourses;