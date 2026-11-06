import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Lock, FileText, Cookie, Award, Mail, MapPin, CheckCircle2 } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          
          {/* Col 1 & 2: Brand & Mission */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-2.5">
              <img src="/img/logo.jpeg" alt="UNIEVAL" className="w-8 h-8 rounded-lg object-contain shadow-sm border border-slate-800" />
              <span className="text-white font-bold text-xl tracking-tight">UNIEVAL</span>
            </Link>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed max-w-sm">
              The premier learning and exam intelligence platform tailored for Savitribai Phule Pune University (SPPU) engineering students. Providing high-yield notes, expert video courses, exam question paper analysis, and live classrooms.
            </p>
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 text-[11px] font-medium text-slate-300">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Verified Study Portal
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 text-[11px] font-medium text-slate-300">
                <ShieldCheck className="w-3 h-3 text-blue-400" /> Cashfree Verified
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 text-[11px] font-medium text-slate-300">
                <Award className="w-3 h-3 text-amber-400" /> SPPU Curriculum Aligned
              </span>
            </div>
          </div>

          {/* Col 3: Academic Exploration */}
          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-4">Academics</h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <Link to="/browse" className="hover:text-white transition-colors">Course Catalog</Link>
              </li>
              <li>
                <Link to="/notes" className="hover:text-white transition-colors">Study Notes Library</Link>
              </li>
              <li>
                <Link to="/syllabus" className="hover:text-white transition-colors">SPPU Syllabus (2024 Pattern)</Link>
              </li>
              <li>
                <Link to="/exam-intelligence" className="hover:text-white transition-colors">Exam Intelligence</Link>
              </li>
              <li>
                <Link to="/be-toolkit" className="hover:text-white transition-colors">BE Project & Viva Toolkit</Link>
              </li>
              <li>
                <Link to="/browse?tab=combos" className="hover:text-white transition-colors">Subject Combos</Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Legal & Policies */}
          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-4">Legal & Privacy</h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <Link to="/privacy" className="hover:text-white flex items-center gap-1.5 transition-colors">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" /> Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-white flex items-center gap-1.5 transition-colors">
                  <FileText className="w-3.5 h-3.5 text-indigo-400" /> Terms & Conditions
                </Link>
              </li>
              <li>
                <Link to="/cookie" className="hover:text-white flex items-center gap-1.5 transition-colors">
                  <Cookie className="w-3.5 h-3.5 text-amber-400" /> Cookie Policy
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-white transition-colors">About Us</Link>
              </li>
            </ul>
          </div>

          {/* Col 5: Contact & Support */}
          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-4">Contact & Support</h4>
            <ul className="space-y-3 text-xs sm:text-sm">
              <li className="flex items-start gap-2">
                <Mail className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <a href="mailto:support@unieval.in" className="hover:text-white transition-colors">
                  support@unieval.in
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span className="leading-snug">
                  Pune, Maharashtra, India
                </span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>&copy; {new Date().getFullYear()} UNIEVAL. All rights reserved. Not affiliated with Savitribai Phule Pune University.</p>
          <div className="flex items-center gap-6">
            <Link to="/privacy" className="hover:text-slate-300 transition-colors">Privacy</Link>
            <span className="text-slate-700">•</span>
            <Link to="/terms" className="hover:text-slate-300 transition-colors">Terms</Link>
            <span className="text-slate-700">•</span>
            <Link to="/cookie" className="hover:text-slate-300 transition-colors">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
