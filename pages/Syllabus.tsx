import React, { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSEO } from '../hooks/useSEO';
import Footer from '../components/Footer';
import { 
  SYLLABUS_DATASET, 
  DRIVE_FOLDER_URL, 
  DRIVE_EMBED_URL, 
  SyllabusItem,
  filterSyllabus
} from '../components/home/SyllabusModal';
import { 
  BookOpen, FileText, Search, ExternalLink, FolderOpen, 
  Eye, ArrowRight, ChevronRight, CheckCircle2, GraduationCap, 
  Layers, ShieldCheck, Award, HelpCircle, ArrowLeft, Download,
  Compass, Laptop, Cpu, Binary
} from 'lucide-react';

const SYLLABUS_FAQS = [
  {
    q: 'What is the SPPU 2024 credit pattern engineering syllabus?',
    a: 'The SPPU 2024 Pattern is the revised undergraduate engineering curriculum formulated by Savitribai Phule Pune University in compliance with the National Education Policy (NEP 2020). It introduces multidisciplinary credit flexibility, standardized 30-mark In-Semester (Units 1–2) and 70-mark End-Semester (Units 3–6) evaluation formats, and continuous internal assessments across all affiliated Pune colleges.'
  },
  {
    q: 'Where can I download official SPPU Engineering Syllabus PDFs for FE, SE, and TE?',
    a: 'UniEval (https://unieval.in/syllabus) maintains the complete verified repository of Pune University (SPPU) 2024 pattern syllabus copies. Students can preview PDFs instantly on-screen or download original curriculum documents directly from our shared Google Drive archive across all engineering disciplines.'
  },
  {
    q: 'Is the First Year (FE) engineering syllabus common for all branches in SPPU?',
    a: 'Yes, the SPPU First Year Engineering (FE) 2024-25 pattern syllabus is common across all engineering branches (Computer, IT, AI&DS, ENTC, Mechanical, Civil, Electrical, Chemical, etc.). Core subjects include Engineering Mathematics 1 & 2, Engineering Physics, Engineering Chemistry, Basic Electrical Engineering (BEE), Basic Electronics Engineering (BXE), Engineering Mechanics, and Programming and Problem Solving (PPS).'
  },
  {
    q: 'Which engineering branches are included in the SPPU SE and TE syllabus on UniEval?',
    a: 'UniEval hosts official syllabi for all 12 accredited SPPU branches: Computer Engineering, Information Technology (IT), Artificial Intelligence & Data Science (AI&DS), Artificial Intelligence & Machine Learning (AIML), Electronics & Telecommunication (ENTC), Electronics VLSI Design & Technology, Electrical Engineering, Mechanical Engineering, Mechanical Sandwich, Civil Engineering, Chemical Engineering, and Robotics & Automation.'
  },
  {
    q: 'What is UniEval and how does it help SPPU Pune University engineering students?',
    a: 'UniEval (https://unieval.in) is the leading academic intelligence, verified study notes, and exam preparation platform built specifically for Savitribai Phule Pune University engineering students. UniEval provides chapter-wise unit notes with point-to-point marking schemes, past year question paper (PYQ) statistical trend analysis, adaptive video courses, and live classroom prep sessions.'
  },
  {
    q: 'Where can I download the SE Computer Engineering Syllabus for SPPU?',
    a: 'The official Savitribai Phule Pune University SE Computer Engineering 2024 Pattern syllabus PDF (Computer_Engineering.pdf) is available on UniEval (https://unieval.in/syllabus?q=SE+computer+engineering). It details subjects including Data Structures & Algorithms, Object-Oriented Programming (OOP), Discrete Mathematics, Computer Organization & Architecture, and Logic Design.'
  },
  {
    q: 'How can I download SPPU syllabus for my specific engineering branch (IT, ENTC, Mech, Civil)?',
    a: 'On UniEval (https://unieval.in/syllabus), students can filter directly by year (FE, SE, TE) or search by branch keyword (e.g. "SE IT", "SE ENTC", "SE Mechanical", "TE Computer"). All 12 accredited SPPU branches are indexed with online PDF preview and direct Google Drive cloud downloads.'
  },
  {
    q: 'How does the SPPU insem and endsem marking scheme work?',
    a: 'Under the SPPU credit pattern, each theory course carries 100 marks: 30 marks for the In-Semester examination (conducted mid-term on Units 1 and 2) and 70 marks for the End-Semester examination (conducted by Pune University on Units 3, 4, 5, and 6). To pass, students require an overall aggregate of 40% with a mandatory minimum of 28/70 in the Endsem examination.'
  }
];

const Syllabus: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialYearParam = searchParams.get('year')?.toUpperCase();
  const initialYear: 'ALL' | 'FE' | 'SE' | 'TE' = (initialYearParam === 'FE' || initialYearParam === 'SE' || initialYearParam === 'TE') 
    ? initialYearParam 
    : 'ALL';
  const initialQuery = searchParams.get('q') || searchParams.get('search') || searchParams.get('branch') || '';

  const [selectedYear, setSelectedYear] = useState<'ALL' | 'FE' | 'SE' | 'TE'>(initialYear);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [activePdf, setActivePdf] = useState<SyllabusItem | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Sync state if URL search params change
  useEffect(() => {
    const q = searchParams.get('q') || searchParams.get('search') || searchParams.get('branch');
    const y = searchParams.get('year')?.toUpperCase();
    if (q !== null && q !== searchQuery) setSearchQuery(q);
    if (y && (y === 'FE' || y === 'SE' || y === 'TE') && y !== selectedYear) setSelectedYear(y);
  }, [searchParams]);

  // ── High-Authority Structured Data for Google AI Overviews & Search ─────────
  const jsonLdData = useMemo(() => [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://unieval.in/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Syllabus",
          "item": "https://unieval.in/syllabus"
        }
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "EducationalOrganization",
      "name": "UniEval",
      "url": "https://unieval.in/",
      "logo": "https://unieval.in/img/logo.jpeg",
      "description": "UniEval provides verified SPPU Engineering syllabus copies, chapter notes, question paper solutions, and exam preparation for Pune University students.",
      "areaServed": "Pune, Maharashtra, India"
    },
    {
      "@context": "https://schema.org",
      "@type": "Dataset",
      "name": "SPPU Engineering Syllabus Archive (2024 Credit Pattern)",
      "description": "Official Savitribai Phule Pune University (SPPU) engineering syllabus copies across First Year (FE), Second Year (SE), and Third Year (TE) for Computer, IT, Mechanical, Civil, ENTC, AIDS, and Electrical disciplines.",
      "url": "https://unieval.in/syllabus",
      "keywords": [
        "SPPU syllabus",
        "engineering syllabus",
        "fe syllabus",
        "se syllabus",
        "te syllabus",
        "sppu 2024 pattern syllabus",
        "pune university syllabus"
      ],
      "creator": {
        "@type": "Organization",
        "name": "UniEval",
        "url": "https://unieval.in"
      },
      "license": "https://unieval.in/terms"
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": "SPPU Engineering Syllabi by Branch and Year",
      "description": "List of official SPPU syllabus files downloadable via UniEval.",
      "numberOfItems": SYLLABUS_DATASET.length,
      "itemListElement": SYLLABUS_DATASET.map((item, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "name": `${item.branch} Syllabus - SPPU ${item.year} (${item.pattern})`,
        "url": `https://drive.google.com/file/d/${item.id}/view?usp=sharing`,
        "description": `${item.yearLabel}: ${item.branch} official syllabus curriculum PDF issued under Savitribai Phule Pune University.`
      }))
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": SYLLABUS_FAQS.map((faq) => ({
        "@type": "Question",
        "name": faq.q,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.a
        }
      }))
    }
  ], []);

  useSEO({
    title: 'SPPU Engineering Syllabus 2024 Pattern | FE, SE, TE PDF Download',
    description: 'Download official Savitribai Phule Pune University (SPPU) Engineering Syllabus 2024 Pattern PDFs for First Year (FE), Second Year (SE), and Third Year (TE). Complete curriculum for Computer, IT, AI&DS, ENTC, Mech, Civil, Electrical with marking schemes.',
    keywords: 'engineering syllabus, sppu syllabus, fe syllabus, se syllabus, te syllabus, se computer engineering syllabus sppu, se it syllabus sppu, se entc syllabus sppu, se mechanical engineering syllabus sppu, se civil syllabus sppu, se aids syllabus sppu, te computer engineering syllabus sppu, sppu 2024 pattern syllabus, sppu engineering syllabus pdf, pune university engineering syllabus, unieval, unieval sppu',
    canonical: 'https://unieval.in/syllabus',
    ogTitle: 'SPPU Engineering Syllabus 2024 Pattern | FE, SE, TE PDF Download - UniEval',
    ogDescription: 'Official SPPU Engineering Syllabus repository (2024 Credit Pattern). Direct PDF download & preview for FE Common, SE, and TE across all branches.',
    ogUrl: 'https://unieval.in/syllabus',
    jsonLd: jsonLdData,
  });

  // Filter items using smart tokenized matcher
  const filteredItems = useMemo(() => {
    return filterSyllabus(SYLLABUS_DATASET, selectedYear, searchQuery);
  }, [selectedYear, searchQuery]);

  const feCount = SYLLABUS_DATASET.filter((s) => s.year === 'FE').length;
  const seCount = SYLLABUS_DATASET.filter((s) => s.year === 'SE').length;
  const teCount = SYLLABUS_DATASET.filter((s) => s.year === 'TE').length;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800">

      {/* ── 1. Hero & Academic Scope Header ───────────────────────────────── */}
      <section className="relative pt-12 pb-16 md:pt-16 md:pb-20 bg-gradient-to-b from-blue-50/80 via-slate-50/40 to-slate-50 border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500 mb-6">
            <Link to="/" className="hover:text-blue-600 transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <span className="text-slate-900 font-semibold">Syllabus</span>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <span className="text-blue-600 font-medium">SPPU 2024 Pattern</span>
          </nav>

          <div className="max-w-3xl">
            {/* Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-bold tracking-wide mb-4 shadow-2xs">
              <BookOpen className="w-3.5 h-3.5" />
              Official SPPU University Archive • NEP 2024 Pattern
            </div>

            {/* H1 */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
              SPPU Engineering Syllabus{' '}
              <span className="text-blue-600">2024 Pattern</span>
            </h1>

            {/* Description */}
            <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
              Official Savitribai Phule Pune University (SPPU) syllabus copies, credit frameworks, course objectives, and unit marking distributions across First Year (FE), Second Year (SE), and Third Year (TE).
            </p>

            {/* Direct Google Drive Folder CTA */}
            <div className="flex flex-wrap items-center gap-3 mt-6">
              <a
                href={DRIVE_FOLDER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-sm hover:shadow transition-all"
              >
                <FolderOpen className="w-4 h-4" />
                <span>Open Google Drive Shared Folder</span>
                <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
              </a>

              <Link
                to="/notes"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs sm:text-sm font-semibold rounded-xl shadow-2xs transition-colors"
              >
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Explore Matching Unit Notes</span>
              </Link>
            </div>
          </div>

          {/* ── Google AI Overview / AI Summary Knowledge Box ─────────────── */}
          <div className="mt-10 p-5 sm:p-6 rounded-2xl bg-white border border-blue-200/80 shadow-xs relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>UniEval SPPU Syllabus Quick Overview</span>
                  <span className="text-[10px] bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded-full border border-blue-100">
                    Verified Repository
                  </span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                  <strong>UniEval (unieval.in)</strong> is the centralized engineering academic intelligence portal for <strong>Savitribai Phule Pune University (SPPU / Pune University)</strong>. All 22 official curriculum copies for the <strong>2024 Credit Pattern (NEP 2020)</strong> are synchronized directly from university academic council guidelines. Students preparing for In-Semester (30 marks) and End-Semester (70 marks) examinations can review exact course outcomes, unit contents, recommended reference books, and lab experiments below.
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500 font-medium">
                  <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> FE All Branches Common</span>
                  <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 12 SE Branch Copies</span>
                  <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 9 TE Branch Copies</span>
                  <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 100% Free Public Access</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── 2. Interactive PDF Viewer Modal (When student clicks "Preview") ── */}
      {activePdf && (
        <section className="bg-slate-900 border-b border-slate-800 text-white py-4 transition-all">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActivePdf(null)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Close Preview
                </button>
                <div>
                  <h3 className="text-sm font-bold truncate max-w-md">{activePdf.branch}</h3>
                  <p className="text-xs text-slate-400 font-mono">{activePdf.yearLabel} • {activePdf.title}</p>
                </div>
              </div>

              <a
                href={`https://drive.google.com/file/d/${activePdf.id}/view?usp=sharing`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold transition-colors"
              >
                <span>Open in Google Drive</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="mt-4 w-full h-[620px] rounded-xl overflow-hidden border border-slate-800 bg-black">
              <iframe
                src={`https://drive.google.com/file/d/${activePdf.id}/preview`}
                title={activePdf.branch}
                className="w-full h-full border-0"
                allow="autoplay"
              />
            </div>
          </div>
        </section>
      )}

      {/* ── 3. Main Syllabus Catalog & Explorer ────────────────────────────── */}
      <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-grow">
        
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-8">
          
          {/* Year Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
            <button
              onClick={() => setSelectedYear('ALL')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
                selectedYear === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Branches ({SYLLABUS_DATASET.length})
            </button>
            <button
              onClick={() => setSelectedYear('FE')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
                selectedYear === 'FE'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              First Year (FE - {feCount})
            </button>
            <button
              onClick={() => setSelectedYear('SE')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
                selectedYear === 'SE'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Second Year (SE - {seCount})
            </button>
            <button
              onClick={() => setSelectedYear('TE')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
                selectedYear === 'TE'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Third Year (TE - {teCount})
            </button>
          </div>

          {/* Instant Search Bar */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter branch (e.g. SE Computer, ENTC, Civil)..."
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-100 transition-all text-slate-800 placeholder-slate-400 shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Popular Branch Quick Filters (SE Computer, IT, ENTC, Mech, Civil...) */}
        <div className="flex flex-wrap items-center gap-1.5 mb-8 text-xs">
          <span className="font-semibold text-slate-400 mr-1">Direct Branch Jump:</span>
          {[
            { label: 'SE Computer Engineering', query: 'SE Computer', year: 'SE' as const },
            { label: 'SE IT', query: 'SE IT', year: 'SE' as const },
            { label: 'SE AI&DS', query: 'SE AIDS', year: 'SE' as const },
            { label: 'SE AIML', query: 'SE AIML', year: 'SE' as const },
            { label: 'SE ENTC', query: 'SE ENTC', year: 'SE' as const },
            { label: 'SE Mechanical', query: 'SE Mechanical', year: 'SE' as const },
            { label: 'SE Civil', query: 'SE Civil', year: 'SE' as const },
            { label: 'TE Computer', query: 'TE Computer', year: 'TE' as const },
            { label: 'FE All Branches', query: 'FE Common', year: 'FE' as const },
          ].map((tag) => (
            <button
              key={tag.label}
              onClick={() => {
                setSelectedYear(tag.year);
                setSearchQuery(tag.query);
              }}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 transition-colors shadow-2xs font-medium text-slate-600"
            >
              {tag.label}
            </button>
          ))}
        </div>

        {/* Syllabus Grid */}
        {filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredItems.map((item) => (
              <div
                key={`${item.year}-${item.id}`}
                className="group bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md hover:border-blue-400 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border ${
                      item.year === 'FE'
                        ? 'bg-blue-50 text-blue-700 border-blue-200/80'
                        : item.year === 'SE'
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200/80'
                        : 'bg-purple-50 text-purple-700 border-purple-200/80'
                    }`}>
                      {item.yearLabel}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {item.category}
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-slate-900 group-hover:text-blue-600 transition-colors">
                    {item.branch}
                  </h3>
                  
                  <p className="text-xs text-slate-500 font-mono mt-1 flex items-center gap-1.5 truncate">
                    <FileText className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span className="truncate">{item.title}</span>
                  </p>

                  <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                    Official Savitribai Phule Pune University course structure, theory & practical syllabus, textbook references, and assessment scheme.
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                  <button
                    onClick={() => {
                      setActivePdf(item);
                      window.scrollTo({ top: 400, behavior: 'smooth' });
                    }}
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview Online</span>
                  </button>

                  <a
                    href={`https://drive.google.com/file/d/${item.id}/view?usp=sharing`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 transition-colors"
                    title="Open directly in Google Drive"
                  >
                    <span>Google Drive</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center bg-white rounded-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No matching syllabus found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              We couldn't find any syllabus matching "{searchQuery}". Try searching for Computer, Mechanical, Civil, or ENTC.
            </p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedYear('ALL'); }}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        )}

      </section>

      {/* ── 4. Academic Year Syllabus Highlights (SEO Rich Entity Section) ── */}
      <section className="py-16 bg-white border-t border-slate-200/80 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Curriculum Structure</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              Pune University (SPPU) Engineering Pattern Breakdown
            </h2>
            <p className="text-slate-600 text-sm mt-2">
              Understanding the course outcomes, credit distribution, and Insem/Endsem evaluation system across undergraduate engineering years.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* FE Card */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200/90">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 font-extrabold flex items-center justify-center mb-4">
                FE
              </div>
              <h3 className="text-lg font-bold text-slate-900">First Year (FE) • Common Pattern</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                The First Year syllabus is universally applied across all Pune University engineering colleges. It establishes fundamental sciences and engineering concepts.
              </p>
              <ul className="mt-4 space-y-1.5 text-xs text-slate-600">
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" /> Engineering Mathematics 1 & 2</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" /> Engineering Physics & Chemistry</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" /> Basic Electrical & Electronics (BEE & BXE)</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" /> Engineering Mechanics & PPS (Python)</li>
              </ul>
            </div>

            {/* SE Card */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200/90">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 font-extrabold flex items-center justify-center mb-4">
                SE
              </div>
              <h3 className="text-lg font-bold text-slate-900">Second Year (SE) • Core Fundamentals</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Students dive into specialized departmental engineering subjects. High emphasis on Insem (Units 1 & 2) problem-solving and unit-wise theory.
              </p>
              <ul className="mt-4 space-y-1.5 text-xs text-slate-600">
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" /> Data Structures, OOP & Discrete Math (Comp/IT)</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" /> Thermodynamics & Solid Mechanics (Mech)</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" /> Electronic Circuits & Signals (ENTC)</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" /> Surveying & Fluid Mechanics (Civil)</li>
              </ul>
            </div>

            {/* TE Card */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200/90">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 font-extrabold flex items-center justify-center mb-4">
                TE
              </div>
              <h3 className="text-lg font-bold text-slate-900">Third Year (TE) • Advanced Applications</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Focuses on advanced technical competencies, university lab practicals, seminar research, and preparing for Insem and Endsem papers.
              </p>
              <ul className="mt-4 space-y-1.5 text-xs text-slate-600">
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" /> DBMS, OS, Computer Networks (Comp/IT)</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" /> DSP & Microcontrollers (ENTC)</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" /> Design of Machine Elements (Mech)</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" /> Structural Design & Concrete Tech (Civil)</li>
              </ul>
            </div>
          </div>

        </div>
      </section>

      {/* ── 5. Frequently Asked Questions (Google AI Overview Extraction) ─── */}
      <section className="py-16 bg-slate-50 border-t border-slate-200/70 w-full">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Knowledge Base</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              Frequently Asked Questions About SPPU Syllabus
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm mt-2">
              Verified answers to common queries regarding Savitribai Phule Pune University engineering syllabus patterns.
            </p>
          </div>

          <div className="space-y-3">
            {SYLLABUS_FAQS.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={index}
                  className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-2xs transition-all"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 font-bold text-sm text-slate-900 hover:text-blue-600 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ── 6. Related Resources CTA ─────────────────────────────────────── */}
      <section className="py-16 bg-slate-900 text-white w-full">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-blue-400 text-xs font-semibold mb-4 border border-slate-700">
            <Award className="w-3.5 h-3.5" /> High-Yield Preparation
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight max-w-xl">
            Match Your Syllabus with Topper-Verified SPPU Notes
          </h2>
          <p className="mt-3 text-slate-400 text-xs sm:text-sm max-w-lg leading-relaxed">
            Knowing the syllabus is step one. Studying the exact unit questions, PYQ solutions, and university marking criteria is how UniEval students score SGPA 9+.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <Link
              to="/notes"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all text-center"
            >
              Browse Unit Notes (1st PDF Free)
            </Link>
            <Link
              to="/exam-intelligence"
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs sm:text-sm rounded-xl transition-all text-center"
            >
              Explore SPPU Exam Intelligence
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Syllabus;
