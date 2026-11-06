import React, { useState, useEffect } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSEO } from '../hooks/useSEO';
import { UserRole, Course, Note } from '../types';
import { api } from '../services/api';
import Footer from '../components/Footer';
import { SyllabusSection } from '../components/home/SyllabusSection';
import { 
  Search, BookOpen, Video, FileText, CheckCircle2, Award, 
  ArrowRight, ShieldCheck, Lock, Star, ChevronRight, GraduationCap,
  Play, Radio, Layers, Laptop, Cpu, Binary, Compass
} from 'lucide-react';

// ─── Engineering Branches Dataset (Clean SVG-mapped) ─────────────────────────

interface BranchData {
  id: string;
  title: string;
  shortName: string;
  category: string;
}

export const BRANCHES: BranchData[] = [
  { id: 'cse', title: 'Computer Science Engineering (CSE)', shortName: 'CSE', category: 'Computer & IT' },
  { id: 'it', title: 'Information Technology (IT)', shortName: 'IT', category: 'Computer & IT' },
  { id: 'aiml', title: 'Artificial Intelligence & Machine Learning', shortName: 'AI-ML', category: 'Computer & IT' },
  { id: 'ds', title: 'Data Science Engineering', shortName: 'Data Science', category: 'Computer & IT' },
  { id: 'entc', title: 'Electronics & Telecommunication (ENTC)', shortName: 'ENTC', category: 'Electronics' },
  { id: 'eee', title: 'Electrical & Electronics Engineering', shortName: 'Electrical', category: 'Electronics' },
  { id: 'mech', title: 'Mechanical Engineering', shortName: 'Mechanical', category: 'Mechanical' },
  { id: 'civil', title: 'Civil Engineering', shortName: 'Civil', category: 'Core Engineering' },
  { id: 'robo', title: 'Robotics & Automation', shortName: 'Robotics', category: 'Emerging' },
  { id: 'chem', title: 'Chemical Engineering', shortName: 'Chemical', category: 'Core Engineering' },
];

const POPULAR_SUBJECT_TAGS = [
  { name: 'Engg. Mathematics M3', query: 'Mathematics' },
  { name: 'Data Structures & OOP', query: 'Data Structures' },
  { name: 'Basic Electrical Engg.', query: 'Electrical' },
  { name: 'Engineering Mechanics', query: 'Mechanics' },
  { name: 'Operating Systems', query: 'Operating Systems' },
];

const COLLEGE_PARTNERS = [
  'COEP Technological University',
  'Pune Institute of Computer Technology (PICT)',
  'MIT World Peace University',
  'Pimpri Chinchwad College of Engineering (PCCOE)',
  'MKSSS Cummins College of Engineering',
  'Vishwakarma Institute of Information Tech (VIIT)',
];

const STUDENT_TESTIMONIALS = [
  {
    name: 'Aditya Kulkarni',
    role: 'Third Year (TE) • Computer Engineering',
    college: 'PICT, Pune',
    rating: 5,
    text: 'The SPPU unit notes and previous year question summaries are spot on. For Insem, studying the unit PYQs on UniEval was literally the difference between an average score and scoring 27/30.',
  },
  {
    name: 'Neha Deshmukh',
    role: 'Second Year (SE) • ENTC',
    college: 'Cummins College of Engineering',
    rating: 5,
    text: 'Engineering Mathematics 3 was causing so much stress across our batch. The step-by-step video solutions and clean PDF notes made the entire syllabus crystal clear.',
  },
  {
    name: 'Sanket Patil',
    role: 'Final Year (BE) • Mechanical Engineering',
    college: 'PCCOE, Pune',
    rating: 5,
    text: 'Having verified notes with the exact SPPU marking scheme format is a lifesaver. No outdated syllabus copies or missing diagrams — everything is updated and reliable.',
  },
];

const Home: React.FC = () => {
  const { user, setShowLoginModal, setOnLoginSuccess } = useAuth();
  const navigate = useNavigate();

  if (user) {
    const target = user.role === UserRole.SUPER_ADMIN ? '/super-admin' :
      (user.role === UserRole.ADMIN || user.role === UserRole.TEACHER ? '/admin' : '/dashboard');
    return <Navigate to={target} replace />;
  }

  useSEO({
    title: 'SPPU Notes, Engineering Syllabus 2024 Pattern & Exam Prep',
    description: 'Top-ranked SPPU Engineering notes, official 2024 pattern syllabus PDFs (FE, SE, TE), previous year question papers (PYQs), and insem & endsem exam intelligence for Computer, IT, Mechanical, Civil, ENTC & AIDS.',
    keywords: 'engineering syllabus, sppu syllabus, fe syllabus, se syllabus, te syllabus, sppu 2024 pattern syllabus, sppu engineering syllabus pdf, pune university engineering syllabus, sppu notes, sppu pyq, unieval, unieval sppu',
    canonical: 'https://unieval.in/',
    ogTitle: 'SPPU Notes, Engineering Syllabus 2024 Pattern & Exam Prep | Pune University - UniEval',
    ogDescription: 'Official SPPU Engineering Syllabus 2024 Pattern (FE, SE, TE), verified Pune University notes, PYQs, exam intelligence, and video courses on UniEval.',
    ogUrl: 'https://unieval.in/',
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [featuredCourses, setFeaturedCourses] = useState<Course[]>([]);
  const [featuredNotes, setFeaturedNotes] = useState<Note[]>([]);
  const [loadingContent, setLoadingContent] = useState(true);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      api.getCourses().catch(() => []),
      api.getNotes().catch(() => [])
    ]).then(([courses, notes]) => {
      if (isMounted) {
        setFeaturedCourses(courses.slice(0, 4));
        setFeaturedNotes(notes.slice(0, 4));
        setLoadingContent(false);
      }
    });
    return () => { isMounted = false; };
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/browse?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/browse');
    }
  };

  const handleQuickTagClick = (tag: string) => {
    navigate(`/browse?q=${encodeURIComponent(tag)}`);
  };

  const requireAuth = (destination: string) => {
    if (!user) {
      setOnLoginSuccess(() => () => navigate(destination));
      setShowLoginModal(true);
    } else {
      navigate(destination);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800">

      {/* ── 1. HERO SECTION (Minimalist, Crisp & Academic) ────────────────── */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 bg-gradient-to-b from-blue-50/70 via-slate-50/30 to-slate-50 border-b border-slate-200/60 overflow-hidden">
        {/* Subtle grid pattern background */}
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none" 
          style={{ backgroundImage: 'radial-gradient(#1e293b 1px, transparent 1px)', backgroundSize: '24px 24px' }} 
        />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">
          
          {/* Academic Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold tracking-wide mb-6 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            SPPU (Pune University) Curriculum • FE · SE · TE · BE
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15] max-w-4xl">
            Ace Your Engineering Exams With{' '}
            <span className="text-blue-600 underline decoration-blue-200 underline-offset-8">Verified SPPU Notes</span> & Courses.
          </h1>

          {/* Subtext */}
          <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed">
            Curated chapter-wise notes, previous year solved question papers, and in-depth video lectures engineered specifically for Savitribai Phule Pune University students.
          </p>

          {/* Prominent Search Bar */}
          <form onSubmit={handleSearchSubmit} className="w-full max-w-2xl mt-8">
            <div className="relative flex items-center bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100 transition-all p-1.5">
              <Search className="w-5 h-5 text-slate-400 ml-3.5 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by subject, code, or topic (e.g. M3, DSA, Mechanics)..."
                className="w-full px-3.5 py-2.5 text-sm sm:text-base text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm shrink-0"
              >
                Search
              </button>
            </div>
          </form>

          {/* Popular Search Tags */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-xs text-slate-500">
            <span className="font-medium text-slate-400">Popular:</span>
            {POPULAR_SUBJECT_TAGS.map((tag) => (
              <button
                key={tag.name}
                onClick={() => handleQuickTagClick(tag.query)}
                className="px-2.5 py-1 rounded-md bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-600 transition-colors shadow-2xs font-medium"
              >
                {tag.name}
              </button>
            ))}
          </div>

          {/* Core Action Links */}
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <Link
              to="/browse"
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl shadow-sm transition-all"
            >
              Browse Complete Catalog
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/notes"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl border border-slate-200 shadow-2xs transition-all"
            >
              <FileText className="w-4 h-4 text-blue-600" />
              1st PDF Free Demos
            </Link>
            <Link
              to="/syllabus"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-50 hover:bg-blue-100/80 text-blue-700 text-sm font-semibold rounded-xl border border-blue-200/80 shadow-2xs transition-all"
            >
              <BookOpen className="w-4 h-4 text-blue-600" />
              SPPU Syllabus (2024)
            </Link>
          </div>

        </div>
      </section>

      {/* ── 2. TRUSTED BY SPPU STUDENTS BANNER ───────────────────────────── */}
      <section className="bg-white border-b border-slate-200/60 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Trusted by 10,000+ engineering students across top SPPU colleges
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {COLLEGE_PARTNERS.map((college) => (
              <span 
                key={college} 
                className="text-xs sm:text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
              >
                {college}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. ACADEMIC YEAR PATHWAYS (FE · SE · TE · BE) ────────────────── */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-1.5 h-4 bg-blue-600 rounded-full" />
              <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Engineering Curriculum</p>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Select Your Academic Year</h2>
            <p className="text-slate-500 text-sm mt-1">Direct syllabus access mapped to Pune University 2019 & 2024 credit patterns.</p>
          </div>
          <Link to="/browse" className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors">
            View all subjects <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* FE Card */}
          <Link 
            to="/browse?year=1" 
            className="group bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-400 transition-all flex flex-col"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              FE
            </div>
            <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
              First Year Engineering
            </h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed flex-grow">
              Common curriculum across all branches. Engineering Mathematics 1 & 2, Physics, Chemistry, Mechanics, and Basic Electrical.
            </p>
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600">
              <span>Explore FE Subjects</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* SE Card */}
          <Link 
            to="/browse?year=2" 
            className="group bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-400 transition-all flex flex-col"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              SE
            </div>
            <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
              Second Year Engineering
            </h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed flex-grow">
              Core branch fundamentals. Data Structures, Logic Design, Thermodynamics, Solid Mechanics, Math 3, and Circuit Theory.
            </p>
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600">
              <span>Explore SE Subjects</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* TE Card */}
          <Link 
            to="/browse?year=3" 
            className="group bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-400 transition-all flex flex-col"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 font-bold mb-4 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              TE
            </div>
            <h3 className="text-lg font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
              Third Year Engineering
            </h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed flex-grow">
              In-depth professional subjects, Insem question paper strategies, DBMS, Computer Networks, Control Systems, and Design.
            </p>
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-purple-600">
              <span>Explore TE Subjects</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* BE Card */}
          <Link 
            to="/browse?year=4" 
            className="group bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-400 transition-all flex flex-col"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-bold mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              BE
            </div>
            <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
              Final Year Engineering
            </h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed flex-grow">
              Advanced electives, Machine Learning, Cloud Computing, Project Viva assessments, and comprehensive toolkit resources.
            </p>
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-600">
              <span>Explore BE Subjects</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </section>

      {/* ── 4. OFFICIAL SPPU SYLLABUS ARCHIVE (2024 Pattern • Google Drive Sync) ── */}
      <SyllabusSection />

      {/* ── 5. FEATURED STUDY MATERIALS & COURSES ────────────────────────── */}
      <section className="py-16 bg-white border-y border-slate-200/60 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-1.5 h-4 bg-blue-600 rounded-full" />
                <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Top-Rated Materials</p>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Featured SPPU Courses & Notes</h2>
              <p className="text-slate-500 text-sm mt-1">High-yield preparation packages reviewed by Pune University educators.</p>
            </div>
            <Link to="/browse" className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors">
              Browse All Courses <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredCourses.length > 0 ? (
              featuredCourses.map((course) => (
                <Link
                  key={course.id}
                  to={`/course/${course.id}`}
                  className="group bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col"
                >
                  <div className="aspect-video w-full bg-slate-100 relative overflow-hidden flex items-center justify-center">
                    {course.thumbnailUrl ? (
                      <img 
                        src={course.thumbnailUrl} 
                        alt={course.title} 
                        className="w-full h-full object-contain group-hover:scale-102 transition-transform duration-300" 
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                        <Video className="w-8 h-8 mb-1 text-slate-300" />
                        <span className="text-[11px] font-medium">Video Course</span>
                      </div>
                    )}
                    <span className="absolute top-2.5 left-2.5 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-md">
                      {course.modules?.length || 0} Modules
                    </span>
                  </div>

                  <div className="p-4 flex flex-col flex-grow">
                    <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {course.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 flex-grow">
                      {course.description}
                    </p>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-amber-500 text-xs font-semibold">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>4.9</span>
                        <span className="text-slate-400 font-normal">(SPPU)</span>
                      </div>
                      <div className="text-right">
                        {course.price && course.price > 0 ? (
                          <div className="flex items-baseline gap-1.5">
                            {course.originalPrice && course.originalPrice > course.price && (
                              <span className="text-xs text-slate-400 line-through">₹{course.originalPrice}</span>
                            )}
                            <span className="text-base font-bold text-slate-900">₹{course.price}</span>
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                            FREE
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              // Clean Skeleton Placeholders while loading
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
                  <div className="aspect-video bg-slate-100 rounded-lg mb-3" />
                  <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              ))
            )}
          </div>

          {/* Featured Notes Bar */}
          <div className="mt-10 p-5 rounded-2xl bg-blue-50/60 border border-blue-100 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">Unit 1 PDF Free Demo Preview on All Note Packages</h4>
                <p className="text-xs text-slate-600">Sample verified handwritten notes before purchasing. Instant preview without registration.</p>
              </div>
            </div>
            <Link
              to="/notes"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors shrink-0"
            >
              Explore Free Demos <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

        </div>
      </section>

      {/* ── 5. WHY UNIEVAL (Platform Superpowers) ─────────────────────────── */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Engineered for University Exams
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Why SPPU Toppers Choose UniEval
          </h2>
          <p className="text-slate-500 text-sm mt-3 leading-relaxed">
            Standard textbooks are 800 pages long. UniEval extracts exactly what Pune University examiners look for in 5-mark and 10-mark answers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs hover:shadow-sm transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-4">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900">SPPU Syllabus Aligned</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Mapped unit-by-unit to Savitribai Phule Pune University course outcomes and recent 2019/2024 credit pattern revisions.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs hover:shadow-sm transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-4">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900">Topper-Verified Study Notes</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Concise handwritten and digital notes with point-to-point university marking scheme summaries, formulas, and diagrams.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs hover:shadow-sm transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mb-4">
              <Radio className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900">Live Studio Classrooms</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Real-time WebRTC sessions before Insem and Endsem exams with automatic landscape lock and instant recording sync.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs hover:shadow-sm transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-4">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900">Solved Previous Papers</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              High-weightage recurring questions from past university exams with point-by-point marking scheme answer templates.
            </p>
          </div>
        </div>
      </section>

      {/* ── 6. VERIFIED STUDENT TESTIMONIALS ─────────────────────────────── */}
      <section className="py-20 bg-slate-100/70 border-t border-slate-200/70 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-xl mx-auto mb-12">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-2">Student Feedback</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Proven Results Across Pune Colleges</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STUDENT_TESTIMONIALS.map((t, idx) => (
              <div 
                key={idx} 
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex gap-1 text-amber-400 mb-3">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed italic">
                    "{t.text}"
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <h4 className="font-bold text-sm text-slate-900">{t.name}</h4>
                  <p className="text-xs text-slate-500">{t.role}</p>
                  <p className="text-xs font-medium text-blue-600 mt-0.5">{t.college}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── 7. CALL TO ACTION BANNER ─────────────────────────────────────── */}
      <section className="py-20 bg-slate-900 text-white w-full">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-blue-400 text-xs font-semibold mb-4 border border-slate-700">
            <GraduationCap className="w-3.5 h-3.5" /> Start Preparing Today
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight max-w-2xl">
            Stop Worrying About Exam Clearances. Start Scoring SGPA 9+.
          </h2>
          <p className="mt-4 text-slate-400 text-sm sm:text-base max-w-xl leading-relaxed">
            Join thousands of Savitribai Phule Pune University engineering students learning with structured, high-yield study materials.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-8 w-full sm:w-auto">
            <Link
              to="/browse"
              className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition-all text-center"
            >
              Explore Course Catalog
            </Link>
            <Link
              to="/notes"
              className="px-8 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-sm rounded-xl transition-all text-center"
            >
              Preview Free Unit PDFs
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Home;
