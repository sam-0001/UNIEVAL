import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, FolderOpen, ExternalLink, FileText, 
  ArrowRight, CheckCircle2, ChevronRight, Layers, Sparkles
} from 'lucide-react';
import { SyllabusModal, DRIVE_FOLDER_URL, SYLLABUS_DATASET } from './SyllabusModal';

export const SyllabusSection: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<'ALL' | 'FE' | 'SE' | 'TE'>('ALL');

  const handleOpenYear = (year: 'ALL' | 'FE' | 'SE' | 'TE') => {
    setSelectedYear(year);
    setIsModalOpen(true);
  };

  const feCount = SYLLABUS_DATASET.filter((s) => s.year === 'FE').length;
  const seCount = SYLLABUS_DATASET.filter((s) => s.year === 'SE').length;
  const teCount = SYLLABUS_DATASET.filter((s) => s.year === 'TE').length;

  return (
    <>
      <section id="syllabus" className="py-20 bg-gradient-to-b from-white via-blue-50/20 to-white border-b border-slate-200/70 w-full relative overflow-hidden">
        {/* Subtle grid background */}
        <div 
          className="absolute inset-0 opacity-[0.025] pointer-events-none" 
          style={{ backgroundImage: 'radial-gradient(#1e293b 1px, transparent 1px)', backgroundSize: '24px 24px' }} 
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-semibold tracking-wide mb-3 shadow-2xs">
                <BookOpen className="w-3.5 h-3.5" />
                Official SPPU Syllabus Repository • 2024 Pattern
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                Pune University Engineering Syllabus
              </h2>
              <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
                Direct access to official SPPU 2024 credit pattern syllabus copies across First Year (FE), Second Year (SE), and Third Year (TE). Review unit weightages, course outcomes, and evaluation schemes.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                onClick={() => handleOpenYear('ALL')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-sm hover:shadow transition-all"
              >
                <FolderOpen className="w-4 h-4" />
                Browse All Files
              </button>
              <a
                href={DRIVE_FOLDER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs sm:text-sm font-semibold rounded-xl shadow-2xs transition-colors"
                title="Open shared Google Drive folder in a new tab"
              >
                <span>Google Drive Folder</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </a>
            </div>
          </div>

          {/* 3 Year Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* FE Card */}
            <div 
              onClick={() => handleOpenYear('FE')}
              className="group cursor-pointer bg-white rounded-2xl p-6 border border-slate-200 shadow-xs hover:shadow-md hover:border-blue-400 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    FE
                  </div>
                  <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                    2024-25 Pattern
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  First Year Engineering
                </h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Common syllabus for all branches. Covers Engineering Mathematics 1 & 2, Physics, Chemistry, Basic Electrical, Basic Electronics, and Mechanics.
                </p>
                
                <div className="mt-4 flex flex-wrap gap-1.5">
                  <span className="text-[10px] font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                    Common All Branches
                  </span>
                  <span className="text-[10px] font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                    Full Pattern PDF
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  View FE Syllabus PDF
                </span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* SE Card */}
            <div 
              onClick={() => handleOpenYear('SE')}
              className="group cursor-pointer bg-white rounded-2xl p-6 border border-slate-200 shadow-xs hover:shadow-md hover:border-indigo-400 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    SE
                  </div>
                  <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                    {seCount} Branch Copies
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  Second Year Engineering
                </h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Detailed branch-specific syllabi for Computer, IT, AI&DS, AIML, ENTC, VLSI, Mechanical, Sandwich, Civil, Chemical, Electrical, and Robotics.
                </p>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  <span className="text-[10px] font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                    Computer / IT
                  </span>
                  <span className="text-[10px] font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                    AI&DS / AIML
                  </span>
                  <span className="text-[10px] font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                    ENTC / Mech
                  </span>
                  <span className="text-[10px] font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                    +7 More
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  Explore {seCount} Branch Syllabi
                </span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* TE Card */}
            <div 
              onClick={() => handleOpenYear('TE')}
              className="group cursor-pointer bg-white rounded-2xl p-6 border border-slate-200 shadow-xs hover:shadow-md hover:border-purple-400 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 font-bold text-lg group-hover:bg-purple-600 group-hover:text-white transition-colors">
                    TE
                  </div>
                  <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md border border-purple-100">
                    {teCount} Branch Copies
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                  Third Year Engineering
                </h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  NEP 2026-27 revision covering Computer, AIML, ENTC, VLSI, Electrical, Mechanical, Sandwich, Civil, and Chemical Engineering course outlines.
                </p>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  <span className="text-[10px] font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                    Computer Engg
                  </span>
                  <span className="text-[10px] font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                    ENTC & VLSI
                  </span>
                  <span className="text-[10px] font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                    Mech & Civil
                  </span>
                  <span className="text-[10px] font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                    +5 More
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-purple-600">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  Explore {teCount} Branch Syllabi
                </span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

          </div>

          {/* Quick Syllabus Banner */}
          <div className="mt-8 p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-900">
                  Shared Google Drive Folder Synchronized
                </p>
                <p className="text-xs text-slate-500">
                  All 22 syllabus PDFs are hosted in a publicly shared Google Drive directory for instant preview and offline PDF download.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                to="/syllabus"
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200/70 text-slate-800 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
              >
                <span>Full Syllabus Directory</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={() => handleOpenYear('ALL')}
                className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 transition-colors"
              >
                Quick Preview
              </button>
              <a
                href={DRIVE_FOLDER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
              >
                <span>Google Drive</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

        </div>
      </section>

      {/* Syllabus Interactive Modal */}
      <SyllabusModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialYear={selectedYear}
      />
    </>
  );
};
