import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ─── Dataset ──────────────────────────────────────────────────────────────────

interface BranchData {
  id: string;
  title: string;
  category: string;
  icon: string;
}

export const BRANCHES: BranchData[] = [
  { id: 'cse',        title: 'Computer Science Engineering (CSE)',          category: 'Computer & IT',  icon: '💻' },
  { id: 'it',         title: 'Information Technology (IT)',                  category: 'Computer & IT',  icon: '🖥️' },
  { id: 'ai',         title: 'Artificial Intelligence (AI)',                 category: 'Computer & IT',  icon: '🧠' },
  { id: 'aiml',       title: 'Artificial Intelligence & Machine Learning (AI-ML)', category: 'Computer & IT', icon: '🤖' },
  { id: 'ds',         title: 'Data Science Engineering',                     category: 'Computer & IT',  icon: '📊' },
  { id: 'cyber',      title: 'Cyber Security',                              category: 'Computer & IT',  icon: '🔒' },
  { id: 'se',         title: 'Software Engineering',                         category: 'Computer & IT',  icon: '👨‍💻' },
  { id: 'cloud',      title: 'Cloud Computing',                             category: 'Computer & IT',  icon: '☁️' },
  { id: 'iot',        title: 'Internet of Things (IoT)',                    category: 'Computer & IT',  icon: '📡' },
  { id: 'comp_eng',   title: 'Computer Engineering',                        category: 'Computer & IT',  icon: '💾' },
  { id: 'robotics',   title: 'Robotics Engineering',                        category: 'Computer & IT',  icon: '🦾' },
  { id: 'blockchain', title: 'Blockchain Technology',                       category: 'Computer & IT',  icon: '🔗' },
  { id: 'electronics', title: 'Electronics Engineering',                    category: 'Electronics',    icon: '⚡' },
  { id: 'entc',       title: 'Electronics & Telecommunication (ENTC)',      category: 'Electronics',    icon: '📶' },
  { id: 'eee',        title: 'Electrical & Electronics Engineering (EEE)',  category: 'Electronics',    icon: '💡' },
  { id: 'instru',     title: 'Instrumentation Engineering',                 category: 'Electronics',    icon: '🌡️' },
  { id: 'embedded',   title: 'Embedded Systems Engineering',                category: 'Electronics',    icon: '🔌' },
  { id: 'vlsi',       title: 'VLSI Design',                                 category: 'Electronics',    icon: '📼' },
  { id: 'power',      title: 'Power Engineering',                           category: 'Electronics',    icon: '🔋' },
  { id: 'control',    title: 'Control Systems Engineering',                 category: 'Electronics',    icon: '🎛️' },
  { id: 'mech',       title: 'Mechanical Engineering',                      category: 'Mechanical',     icon: '⚙️' },
  { id: 'auto',       title: 'Automobile Engineering',                      category: 'Mechanical',     icon: '🚗' },
  { id: 'mechatronics', title: 'Mechatronics Engineering',                  category: 'Mechanical',     icon: '🛠️' },
  { id: 'aerospace',  title: 'Aerospace Engineering',                       category: 'Mechanical',     icon: '🚀' },
  { id: 'aero',       title: 'Aeronautical Engineering',                    category: 'Mechanical',     icon: '✈️' },
  { id: 'marine',     title: 'Marine Engineering',                          category: 'Mechanical',     icon: '🚢' },
  { id: 'manuf',      title: 'Manufacturing Engineering',                   category: 'Mechanical',     icon: '🏭' },
  { id: 'robo_auto',  title: 'Robotics & Automation',                       category: 'Mechanical',     icon: '🦾' },
  { id: 'thermal',    title: 'Thermal Engineering',                         category: 'Mechanical',     icon: '🔥' },
  { id: 'chem',       title: 'Chemical Engineering',                        category: 'Chemical',       icon: '🧪' },
  { id: 'petro',      title: 'Petrochemical Engineering',                   category: 'Chemical',       icon: '🛢️' },
  { id: 'biotech',    title: 'Biotechnology Engineering',                   category: 'Chemical',       icon: '🧬' },
  { id: 'biomed',     title: 'Biomedical Engineering',                      category: 'Chemical',       icon: '🩺' },
  { id: 'food',       title: 'Food Technology / Food Engineering',          category: 'Chemical',       icon: '🍔' },
  { id: 'pharma',     title: 'Pharmaceutical Engineering',                  category: 'Chemical',       icon: '💊' },
  { id: 'polymer',    title: 'Polymer Engineering',                         category: 'Chemical',       icon: '🧪' },
  { id: 'env_sci',    title: 'Environmental Engineering',                   category: 'Chemical',       icon: '🌿' },
  { id: 'civil',      title: 'Civil Engineering',                           category: 'Infrastructure', icon: '🏗️' },
  { id: 'struct',     title: 'Structural Engineering',                      category: 'Infrastructure', icon: '🌉' },
  { id: 'trans',      title: 'Transportation Engineering',                  category: 'Infrastructure', icon: '🚦' },
  { id: 'geo',        title: 'Geotechnical Engineering',                    category: 'Infrastructure', icon: '⛰️' },
  { id: 'urban',      title: 'Urban Planning Engineering',                  category: 'Infrastructure', icon: '🏙️' },
  { id: 'water',      title: 'Water Resources Engineering',                 category: 'Infrastructure', icon: '💧' },
  { id: 'ai_eng',     title: 'Artificial Intelligence Engineering',         category: 'Emerging',       icon: '🧠' },
  { id: 'data_eng',   title: 'Data Engineering',                            category: 'Emerging',       icon: '📉' },
  { id: 'renew',      title: 'Renewable Energy Engineering',                category: 'Emerging',       icon: '☀️' },
  { id: 'energy',     title: 'Energy Engineering',                          category: 'Emerging',       icon: '⚡' },
  { id: 'nano',       title: 'Nanotechnology Engineering',                  category: 'Emerging',       icon: '🔬' },
  { id: 'quantum',    title: 'Quantum Engineering',                         category: 'Emerging',       icon: '⚛️' },
  { id: 'space',      title: 'Space Technology Engineering',                category: 'Emerging',       icon: '🛰️' },
  { id: 'smart_mfg',  title: 'Smart Manufacturing',                         category: 'Emerging',       icon: '🏭' },
  { id: 'agri',       title: 'Agricultural Engineering',                    category: 'Specialized',    icon: '🚜' },
  { id: 'mining',     title: 'Mining Engineering',                          category: 'Specialized',    icon: '⛏️' },
  { id: 'petroleum',  title: 'Petroleum Engineering',                       category: 'Specialized',    icon: '⛽' },
  { id: 'textile',    title: 'Textile Engineering',                         category: 'Specialized',    icon: '🧵' },
  { id: 'leather',    title: 'Leather Technology',                          category: 'Specialized',    icon: '👜' },
  { id: 'printing',   title: 'Printing Technology',                         category: 'Specialized',    icon: '🖨️' },
  { id: 'ceramic',    title: 'Ceramic Engineering',                         category: 'Specialized',    icon: '🏺' },
  { id: 'plastic',    title: 'Plastic Engineering',                         category: 'Specialized',    icon: '🥤' },
  { id: 'ocean',      title: 'Ocean Engineering',                           category: 'Specialized',    icon: '🌊' },
];

// ─── Exam Prep subjects shown on homepage ─────────────────────────────────────

interface ExamPrepSubject {
  icon: string;
  name: string;
  label: string;
  branch: string;
}

const EXAM_PREP_SUBJECTS: ExamPrepSubject[] = [
  { icon: '💻', name: 'Data Structures & Algorithms', label: 'High Weightage',    branch: 'Computer Science Engineering (CSE)' },
  { icon: '🔌', name: 'Basic Electrical Engineering',  label: 'FE Must-Know',     branch: 'Electrical & Electronics Engineering (EEE)' },
  { icon: '⚙️', name: 'Engineering Mechanics',         label: 'Core Subject',     branch: 'Mechanical Engineering' },
  { icon: '🧪', name: 'Engineering Chemistry',         label: 'FE Compulsory',    branch: 'Chemical Engineering' },
  { icon: '📊', name: 'Applied Mathematics',           label: 'All Branches',     branch: 'Computer Science Engineering (CSE)' },
  { icon: '🔒', name: 'Network Security',              label: 'Important Topics', branch: 'Cyber Security' },
  { icon: '📡', name: 'Digital Communication',         label: 'TE / BE Focus',    branch: 'Electronics & Telecommunication (ENTC)' },
  { icon: '🏗️', name: 'Structural Analysis',           label: 'Core Subject',     branch: 'Civil Engineering' },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

const ExamPrepCard: React.FC<{ subject: ExamPrepSubject; onClick: () => void }> = ({ subject, onClick }) => (
  <div
    onClick={onClick}
    className="group relative bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-brand-cobalt transition-all duration-200 cursor-pointer flex flex-col gap-3"
  >
    <div className="absolute top-0 left-6 right-6 h-0.5 rounded-b bg-gradient-main opacity-0 group-hover:opacity-100 transition-opacity" />
    <div className="flex items-start justify-between gap-2">
      <span className="text-3xl leading-none">{subject.icon}</span>
      <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg border bg-blue-50 text-brand-cobalt border-blue-200 whitespace-nowrap">
        {subject.label}
      </span>
    </div>
    <p className="font-bold text-brand-navy text-sm leading-snug group-hover:text-brand-indigo transition-colors">
      {subject.name}
    </p>
    <button className="mt-auto self-start text-xs font-semibold text-brand-cobalt group-hover:text-brand-indigo flex items-center gap-1 transition-colors">
      Start Prep
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  </div>
);

const FeatureCard: React.FC<{ emoji: string; title: string; desc: string; bg: string }> = ({ emoji, title, desc, bg }) => (
  <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3">
    <div className={`w-11 h-11 ${bg} rounded-lg flex items-center justify-center text-xl flex-shrink-0`}>{emoji}</div>
    <h3 className="font-bold text-brand-navy">{title}</h3>
    <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

const Home: React.FC = () => {
  const { user, setShowLoginModal, setOnLoginSuccess } = useAuth();
  const navigate = useNavigate();

  const [searchTerm,     setSearchTerm]     = useState('');
  const [startIndex,     setStartIndex]     = useState(0);
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const ITEMS_PER_PAGE = 8;

  const filteredBranches =
    activeCategory === 'All'
      ? BRANCHES.filter((b) => b.title.toLowerCase().includes(searchTerm.toLowerCase()))
      : BRANCHES.filter((b) => b.category === activeCategory && b.title.toLowerCase().includes(searchTerm.toLowerCase()));

  const categories    = ['All', ...Array.from(new Set(BRANCHES.map((b) => b.category)))];
  const visibleBranches = filteredBranches.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  useEffect(() => {
    if (activeCategory !== 'All' || searchTerm) return;
    const interval = setInterval(() => {
      setStartIndex((prev) => {
        const next = prev + ITEMS_PER_PAGE;
        return next >= filteredBranches.length ? 0 : next;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [filteredBranches.length, activeCategory, searchTerm]);

  useEffect(() => {
    setTimeout(() => { if (startIndex !== 0) setStartIndex(0); }, 0);
  }, [activeCategory, searchTerm]);

  const requireAuth = (destination: string) => {
    if (!user) {
      setOnLoginSuccess(() => () => navigate(destination));
      setShowLoginModal(true);
    } else {
      navigate(destination);
    }
  };

  const handleBranchClick = (e: React.MouseEvent, branchTitle: string) => {
    e.preventDefault();
    requireAuth(`/browse?branch=${encodeURIComponent(branchTitle)}`);
  };

  const handleExamPrepClick = (branch: string) =>
    requireAuth(`/exam-intelligence?branch=${encodeURIComponent(branch)}`);

  const handleStartExamPrep = () => requireAuth('/exam-intelligence');

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">

      {/* ── 1. HERO ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-brand-navy text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-navy via-[#131A3F] to-[#0f172a] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 text-center flex flex-col items-center gap-6">
          {/* Audience pill */}
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-lg px-4 py-1.5 text-xs font-semibold text-white tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-cobalt animate-pulse shrink-0" />
            Built for SPPU Engineering Students — FE · SE · TE · BE
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold tracking-tight leading-[1.1]">
            SPPU Exam Prep,{' '}
            <span className="text-gradient-main">simplified.</span>
          </h1>

          {/* Subtext */}
          <p className="text-lg sm:text-xl text-slate-300 max-w-xl leading-relaxed">
            Only study what matters. Skip the rest.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mt-2">
            <button
              onClick={handleStartExamPrep}
              className="w-full sm:w-auto bg-gradient-main text-white font-bold px-8 py-3.5 rounded-lg text-base shadow-lg shadow-brand-indigo/25 transition-all hover:scale-[1.02] active:scale-100"
            >
              🚀 Start Exam Prep
            </button>
            <Link
              to="/browse"
              className="w-full sm:w-auto bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-8 py-3.5 rounded-lg text-base transition-all text-center"
            >
              Browse Subjects
            </Link>
          </div>

          {/* Quick feature pills */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-2 text-sm text-slate-400">
            <span>📚 Notes & PYQs</span>
            <span>🎥 Video Lectures</span>
            <span>🤖 AI Quiz Generator</span>
            <span>🎓 All Branches</span>
          </div>
        </div>
      </section>

      {/* ── 2. EXAM PREP SPOTLIGHT ──────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-1.5 h-5 bg-brand-cobalt rounded-lg" />
              <p className="text-xs font-bold uppercase tracking-widest text-brand-cobalt">Exam Prep</p>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-brand-navy">Start Your Preparation</h2>
            <p className="text-gray-500 mt-1 text-sm">Jump straight into high-weightage topics for your semester.</p>
          </div>
          <Link
            to="/exam-intelligence"
            className="shrink-0 text-sm font-semibold text-brand-cobalt hover:text-brand-indigo flex items-center gap-1 transition-colors"
          >
            View all subjects
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* 4-col subject grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {EXAM_PREP_SUBJECTS.map((subject) => (
            <ExamPrepCard
              key={subject.name}
              subject={subject}
              onClick={() => handleExamPrepClick(subject.branch)}
            />
          ))}
        </div>

        {/* AI nudge strip */}
        <div className="mt-8 bg-gradient-main rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shadow-brand-indigo/20">
          <div>
            <p className="text-white font-bold text-lg">Not sure where to start?</p>
            <p className="text-white/80 text-sm mt-0.5">Let our AI pick the most important topics for your exam.</p>
          </div>
          <button
            onClick={handleStartExamPrep}
            className="shrink-0 bg-white text-brand-indigo font-bold px-6 py-2.5 rounded-lg hover:bg-slate-50 transition-colors shadow-sm whitespace-nowrap"
          >
            Try Exam Intelligence →
          </button>
        </div>
      </section>

      {/* ── 3. YEAR QUICK ACCESS ────────────────────────────────────────── */}
      <section className="bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-xl font-extrabold text-brand-navy mb-6 text-center">Browse by Year</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {([
              { year: '1', label: 'First Year',  sub: 'FE — Common for all',       emoji: '🎓', from: '#131A3F', to: '#1e293b' },
              { year: '2', label: 'Second Year', sub: 'SE — Branch starts',        emoji: '📐', from: '#1F81FC', to: '#3b82f6' },
              { year: '3', label: 'Third Year',  sub: 'TE — Core subjects',        emoji: '⚡', from: '#7F26FE', to: '#8b5cf6' },
              { year: '4', label: 'Final Year',  sub: 'BE — Advanced electives',   emoji: '🚀', from: '#0ea5e9', to: '#0284c7' },
            ] as const).map(({ year, label, sub, emoji, from: f, to: t }) => (
              <Link
                key={year}
                to={`/browse?year=${year}`}
                className="group relative overflow-hidden rounded-xl p-5 text-white shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex flex-col gap-1"
                style={{ background: `linear-gradient(135deg, ${f}, ${t})` }}
              >
                <span className="text-3xl block mb-2">{emoji}</span>
                <p className="font-bold text-base leading-tight">{label}</p>
                <p className="text-white/70 text-xs mt-0.5">{sub}</p>
                <div className="absolute bottom-3 right-3 text-white/20 text-5xl font-black leading-none select-none">{year}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. FEATURES ──────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
        <div className="text-center mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-cobalt mb-2">Platform Features</p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-brand-navy">Everything you need to ace your exams</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <FeatureCard emoji="🤖" bg="bg-indigo-50" title="AI Quiz Generator"    desc="Generate smart MCQs from any topic in seconds. Adaptive difficulty based on your performance." />
          <FeatureCard emoji="🎯" bg="bg-amber-50"  title="Important Questions"  desc="Curated PYQs and high-weightage questions for every subject — reviewed by toppers." />
          <FeatureCard emoji="📝" bg="bg-emerald-50" title="Concise Notes"       desc="Exam-focused notes crafted for SPPU syllabus. No fluff, straight to the point." />
          <FeatureCard emoji="🎥" bg="bg-sky-50"    title="Video Lectures"       desc="Topic-wise video courses from experienced educators. Watch at your own pace." />
          <FeatureCard emoji="💬" bg="bg-violet-50" title="Viva Prep"            desc="Practice oral viva questions with AI-powered feedback before your practical exams." />
          <FeatureCard emoji="🏆" bg="bg-rose-50"   title="BE Toolkit"          desc="Final year students get project resources, seminar topics, and placement prep tools." />
        </div>
      </section>

      {/* ── 5. BRANCH EXPLORER ───────────────────────────────────────────── */}
      <section className="bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
          {/* Header + search */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">All Engineering Branches</p>
              <h2 className="text-2xl font-extrabold text-gray-900">Explore by Branch</h2>
            </div>
            <div className="w-full md:w-80 relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search your branch..."
                className="block w-full pl-11 pr-4 py-3 rounded-xl bg-slate-50 text-gray-900 border border-gray-200 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Category filter pills */}
          <div className="flex overflow-x-auto pb-3 mb-6 gap-2 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                  activeCategory === cat
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Branch Grid / Slider */}
          <div className="flex overflow-x-auto pb-6 gap-4 no-scrollbar snap-x snap-mandatory min-h-[160px]">
            {filteredBranches.map((branch) => (
              <a
                key={branch.id}
                href="#"
                onClick={(e) => handleBranchClick(e, branch.title)}
                className="group bg-white border border-gray-100 rounded-xl p-5 hover:shadow-lg hover:border-indigo-200 transition-all duration-200 flex flex-col items-center text-center cursor-pointer min-w-[160px] flex-shrink-0 snap-start"
              >
                <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center text-2xl mb-3 group-hover:scale-110 group-hover:bg-indigo-100 transition-all">
                  {branch.icon}
                </div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1 group-hover:text-indigo-600 transition-colors leading-snug">
                  {branch.title}
                </h3>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mt-auto pt-2">
                  {branch.category}
                </p>
              </a>
            ))}
            {filteredBranches.length === 0 && (
              <div className="w-full flex flex-col items-center justify-center py-8 text-gray-400 gap-2">
                <span className="text-4xl">🔍</span>
                <p className="text-sm font-medium">No branches match your search.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── 6. FINAL CTA ────────────────────────────────────────────────── */}
      <section className="bg-brand-navy text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center flex flex-col items-center gap-6">
          <span className="text-5xl">🎓</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight">
            Your next exam is closer than you think.
          </h2>
          <p className="text-slate-400 text-lg max-w-xl leading-relaxed">
            Thousands of SPPU students use UNIEVAL to study smarter, not harder. Start today — it's free.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            {!user && (
              <Link
                to="/login"
                className="w-full sm:w-auto bg-gradient-main text-white font-bold px-8 py-3.5 rounded-lg text-base transition-all hover:scale-[1.02] text-center shadow-lg shadow-brand-indigo/20"
              >
                Create Free Account
              </Link>
            )}
            <button
              onClick={handleStartExamPrep}
              className="w-full sm:w-auto bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-8 py-3.5 rounded-lg text-base transition-all"
            >
              Start Exam Prep Now
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="bg-brand-navy border-t border-white/10 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <img src="/img/logo.jpeg" alt="UNIEVAL" className="w-7 h-7 rounded-md object-cover" />
              <span className="text-white font-bold">UNIEVAL</span>
            </div>
            <p className="text-sm leading-relaxed">Empowering SPPU engineering students with smart, focused exam preparation tools.</p>
          </div>
          <div>
            <h4 className="text-gray-300 font-semibold mb-4 text-sm">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/"                  className="hover:text-white transition-colors">Home</Link></li>
              <li><Link to="/exam-intelligence" className="hover:text-white transition-colors">Exam Prep</Link></li>
              <li><Link to="/browse"            className="hover:text-white transition-colors">Browse Courses</Link></li>
              <li><Link to="/notes"             className="hover:text-white transition-colors">Notes Library</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-gray-300 font-semibold mb-4 text-sm">Contact</h4>
            <p className="text-sm">support@unieval.edu</p>
            <p className="text-sm mt-1">Campus Main Building</p>
          </div>
        </div>
        <div className="mt-10 text-center text-xs border-t border-gray-800 pt-8">
          &copy; 2024 UNIEVAL. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Home;