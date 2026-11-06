import React from 'react';
import { Link } from 'react-router-dom';
import { useSEO } from '../hooks/useSEO';
import Footer from '../components/Footer';
import { 
  ShieldCheck, 
  GraduationCap, 
  BookOpen, 
  Award, 
  CheckCircle2, 
  Layers, 
  Video, 
  ArrowRight, 
  Radio, 
  Sparkles,
  Lock,
  Cpu
} from 'lucide-react';

const About: React.FC = () => {
  useSEO({
    title: 'About UniEval - Founded by Soham Chaudhari | SPPU Engineering Study Platform',
    description: 'Learn about UniEval and founder Soham Chaudhari. Dedicated to providing Savitribai Phule Pune University (SPPU) engineering students with verified notes, 2024 pattern syllabus copies, and exam intelligence.',
    canonical: 'https://unieval.in/about',
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 flex-1 w-full">
        {/* Header Hero */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            Official Academic Mission
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Empowering Engineering Students at SPPU
          </h1>
          <p className="text-base sm:text-lg text-slate-600 mt-4 leading-relaxed">
            Founded by <strong>Soham Chaudhari</strong> to bring modern academic precision, high-yield notes, official 2024 Pattern syllabus archives, and exam intelligence to every Pune University engineering student.
          </p>
        </div>

        {/* ── 1. MEET THE FOUNDER SECTION ── */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 md:p-12 border border-slate-200 shadow-sm mb-16 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left: Founder Profile Card */}
            <div className="lg:col-span-4 flex flex-col items-center text-center p-6 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="relative mb-4">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-tr from-[#131A3F] via-[#1F81FC] to-[#7F26FE] p-1 shadow-xl flex items-center justify-center">
                  <div className="w-full h-full bg-[#131A3F] rounded-[14px] flex items-center justify-center text-3xl font-extrabold text-white font-mono tracking-wider">
                    SC
                  </div>
                </div>
                <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-2 rounded-full shadow-md border-2 border-white" title="Verified Founder">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>

              <h2 className="text-xl font-bold text-slate-900">Soham Chaudhari</h2>
              <p className="text-xs font-bold text-blue-600 mt-0.5">Founder & Lead Architect</p>
              <p className="text-[11px] text-slate-500 mt-1">UniEval Platform</p>

              <div className="mt-4 pt-4 border-t border-slate-200 w-full space-y-2 text-left text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Curator of SPPU Study Packages</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Full-Stack Platform Architect</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Pune, Maharashtra, India</span>
                </div>
              </div>
            </div>

            {/* Right: Founder's Story & Letter */}
            <div className="lg:col-span-8 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 block">
                The Founder's Story
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Why I Built UniEval for Pune University Students
              </h3>
              
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                As engineering students in Savitribai Phule Pune University (SPPU), we all experience the exact same frustration every semester: syllabus updates happen, but reliable reference material remains scattered across WhatsApp groups, low-quality photocopy Xerox shops, and outdated question banks.
              </p>

              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                When Insem and Endsem exams arrive, students spend more time hunting for the right unit notes and figuring out what to study than actually learning. I founded UniEval to fix this fundamentally — creating a unified, trustworthy digital home where students get official syllabus archives, verified unit-wise notes aligned strictly with the university marking scheme, and interactive live classrooms.
              </p>

              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 text-xs sm:text-sm text-slate-700 space-y-2">
                <div className="font-bold text-blue-900 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-blue-600" />
                  Our Core Principle: 100% Genuine & Transparent
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  We believe in zero fake reviews, transparent pricing, and giving every student a free Unit 1 demo preview on every note package before they decide to enroll. Education must be built on trust and academic integrity.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── 2. PLATFORM STATS & PILLARS ── */}
        <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">Our Mission</h2>
            <p className="text-sm sm:text-base text-slate-600 mb-4 leading-relaxed">
              UniEval bridges the gap between traditional engineering college curricula and modern, high-yield digital study workflows. We provide a clean, ad-free environment engineered specifically for the SPPU 2024 Credit Pattern and NEP guidelines.
            </p>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-6">
              From foundational First Year (FE) Common curriculum to specialized branches in Computer, IT, Mechanical, Civil, ENTC, and AI&DS, UniEval equips students to master difficult concepts and score top marks in university evaluations.
            </p>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">100% University Aligned</h4>
                  <p className="text-xs text-slate-500">Every package follows the official SPPU syllabus units, insem/endsem splits, and weightage.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Protected & Encrypted Study Notes</h4>
                  <p className="text-xs text-slate-500">State-of-the-art AES-256-GCM secure PDF rendering with progressive Range streaming.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Radio className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Interactive Live Broadcasts</h4>
                  <p className="text-xs text-slate-500">Pre-flight device check, live countdown, and low-latency classrooms with faculty.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#131A3F] rounded-3xl p-8 text-white shadow-xl">
            <h3 className="text-lg font-bold mb-6 text-white flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-[#1F81FC]" />
              Platform Overview
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700">
                <div className="text-[#1F81FC] text-3xl font-extrabold font-mono mb-1">22+</div>
                <div className="text-xs font-semibold text-slate-200">2024 Pattern Syllabi</div>
                <div className="text-[10px] text-slate-400 mt-1">FE, SE & TE Official PDFs</div>
              </div>

              <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700">
                <div className="text-emerald-400 text-3xl font-extrabold font-mono mb-1">100%</div>
                <div className="text-xs font-semibold text-slate-200">Verified Notes</div>
                <div className="text-[10px] text-slate-400 mt-1">Unit 1 Free Demos</div>
              </div>

              <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700">
                <div className="text-amber-400 text-3xl font-extrabold font-mono mb-1">12</div>
                <div className="text-xs font-semibold text-slate-200">Branches Supported</div>
                <div className="text-[10px] text-slate-400 mt-1">Comp, IT, ENTC, Mech & more</div>
              </div>

              <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700">
                <div className="text-[#7F26FE] text-3xl font-extrabold font-mono mb-1">PYQ</div>
                <div className="text-xs font-semibold text-slate-200">Exam Intelligence</div>
                <div className="text-[10px] text-slate-400 mt-1">Weightage & Trends</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 3. CALL TO ACTION ── */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 md:p-12 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-3">
            Start Your Preparation with UniEval
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mb-8 max-w-xl mx-auto">
            Explore official SPPU 2024 Pattern syllabus copies, sample verified Unit 1 PDFs, and study smarter for your upcoming Insem and Endsem exams.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link 
              to="/syllabus" 
              className="bg-gradient-to-r from-[#1F81FC] to-[#7F26FE] text-white px-6 py-3 rounded-xl font-bold text-xs sm:text-sm hover:opacity-95 transition-all shadow-md active:scale-95 flex items-center gap-2"
            >
              <span>Explore SPPU Syllabus 2024</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link 
              to="/notes" 
              className="bg-white text-slate-800 border border-slate-300 hover:border-slate-400 px-6 py-3 rounded-xl font-bold text-xs sm:text-sm hover:bg-slate-50 transition-colors"
            >
              Browse Notes Library
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default About;
