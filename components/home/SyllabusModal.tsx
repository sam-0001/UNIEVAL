import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Search, FileText, ExternalLink, Download, Eye, 
  FolderOpen, Layers, CheckCircle2, ChevronRight, BookOpen,
  Maximize2, ArrowLeft, RefreshCw
} from 'lucide-react';

export interface SyllabusItem {
  id: string; // Google Drive file ID
  title: string;
  branch: string;
  year: 'FE' | 'SE' | 'TE';
  yearLabel: string;
  pattern: string;
  category: string;
}

export const DRIVE_FOLDER_ID = '1PaXIr_9w7Fz_wcpQnP8yF0YkJlL-N8xU';
export const DRIVE_FOLDER_URL = `https://drive.google.com/drive/folders/${DRIVE_FOLDER_ID}?usp=drive_link`;
export const DRIVE_EMBED_URL = `https://drive.google.com/embeddedfolderview?id=${DRIVE_FOLDER_ID}#grid`;

export const SYLLABUS_DATASET: SyllabusItem[] = [
  // ── First Year (FE • 2024-25) ──
  {
    id: '1ZVcBPNRPEdTt4jdScE8GntscFDVrxis1',
    title: 'SPPU_FE_2024_Pattern.pdf',
    branch: 'First Year (FE) - All Engineering Branches',
    year: 'FE',
    yearLabel: 'FE • 2024-25 Pattern',
    pattern: '2024 NEP Pattern',
    category: 'Common Curriculum',
  },

  // ── Second Year (SE • 2025-26) ──
  {
    id: '174dV79i6fs0xRzxuBgg8QoJwrCkq0YsC',
    title: 'Computer_Engineering.pdf',
    branch: 'Computer Engineering',
    year: 'SE',
    yearLabel: 'SE • 2025-26 Pattern',
    pattern: '2024 Pattern',
    category: 'Computer & IT',
  },
  {
    id: '1pgbsGAbpUHFNSWIOHzQfQjm1tT4aX0eN',
    title: 'Information_Technology.pdf',
    branch: 'Information Technology (IT)',
    year: 'SE',
    yearLabel: 'SE • 2025-26 Pattern',
    pattern: '2024 Pattern',
    category: 'Computer & IT',
  },
  {
    id: '1Z8VlXoZ48yxHL-ooTusfxq5ry2cwbcm4',
    title: 'Artificial_Intelligence_and_Data_Science.pdf',
    branch: 'Artificial Intelligence & Data Science (AI&DS)',
    year: 'SE',
    yearLabel: 'SE • 2025-26 Pattern',
    pattern: '2024 Pattern',
    category: 'Computer & IT',
  },
  {
    id: '1MRoseOKu49_jMPBwmY-PBNaBh-skxr9-',
    title: 'Artificial_Intelligence_and_Machine_Learning.pdf',
    branch: 'Artificial Intelligence & Machine Learning (AIML)',
    year: 'SE',
    yearLabel: 'SE • 2025-26 Pattern',
    pattern: '2024 Pattern',
    category: 'Computer & IT',
  },
  {
    id: '1DIJF4medM9aY9btDuH7xMCHsi4iR2hS4',
    title: 'Electronics_and_Telecommunication.pdf',
    branch: 'Electronics & Telecommunication (ENTC)',
    year: 'SE',
    yearLabel: 'SE • 2025-26 Pattern',
    pattern: '2024 Pattern',
    category: 'Electronics',
  },
  {
    id: '1spBLhjytCBMjk5Dpg5K6i84o5KFoVYMY',
    title: 'Electronics_VLSI_Design_and_Technology.pdf',
    branch: 'Electronics (VLSI Design & Technology)',
    year: 'SE',
    yearLabel: 'SE • 2025-26 Pattern',
    pattern: '2024 Pattern',
    category: 'Electronics',
  },
  {
    id: '1SzpipMiz7ybuJibQmfBAYSht2kcbAfir',
    title: 'Electrical_Engineering.pdf',
    branch: 'Electrical Engineering',
    year: 'SE',
    yearLabel: 'SE • 2025-26 Pattern',
    pattern: '2024 Pattern',
    category: 'Electrical',
  },
  {
    id: '1y3KueZ5FzmdmSibuXaspUV6BY1xyryIQ',
    title: 'Mechanical_Engineering.pdf',
    branch: 'Mechanical Engineering',
    year: 'SE',
    yearLabel: 'SE • 2025-26 Pattern',
    pattern: '2024 Pattern',
    category: 'Mechanical',
  },
  {
    id: '1FvN-U589jdMGgGnT3TwrTCTtzSe6d090',
    title: 'Mechanical_Sandwich.pdf',
    branch: 'Mechanical Sandwich Engineering',
    year: 'SE',
    yearLabel: 'SE • 2025-26 Pattern',
    pattern: '2024 Pattern',
    category: 'Mechanical',
  },
  {
    id: '1GCi1e6vJ-h7GC7UJdC4RPnp-cVeuycgV',
    title: 'Civil_Engineering.pdf',
    branch: 'Civil Engineering',
    year: 'SE',
    yearLabel: 'SE • 2025-26 Pattern',
    pattern: '2024 Pattern',
    category: 'Civil',
  },
  {
    id: '1CCV6QuWo1QGG_SfQe3839p8iCCYdD2w2',
    title: 'Chemical_Engineering.pdf',
    branch: 'Chemical Engineering',
    year: 'SE',
    yearLabel: 'SE • 2025-26 Pattern',
    pattern: '2024 Pattern',
    category: 'Chemical',
  },
  {
    id: '15UKUyWwcjYcAbEqz30yax-cQcrz2y3HM',
    title: 'Robotics_and_Automation.pdf',
    branch: 'Robotics & Automation',
    year: 'SE',
    yearLabel: 'SE • 2025-26 Pattern',
    pattern: '2024 Pattern',
    category: 'Emerging',
  },

  // ── Third Year (TE • 2026-27) ──
  {
    id: '1Bq7j8YDIvZrbOVvz9O5xl81rb4DmoJK0',
    title: 'Computer_Engineering.pdf',
    branch: 'Computer Engineering',
    year: 'TE',
    yearLabel: 'TE • 2026-27 Pattern',
    pattern: '2024 Pattern',
    category: 'Computer & IT',
  },
  {
    id: '17dSJHtJlb73V2Po_YOg7j6Ya6dDQSjKT',
    title: 'Artificial_Intelligence_and_Machine_Learning.pdf',
    branch: 'Artificial Intelligence & Machine Learning (AIML)',
    year: 'TE',
    yearLabel: 'TE • 2026-27 Pattern',
    pattern: '2024 Pattern',
    category: 'Computer & IT',
  },
  {
    id: '1Do0QDrOEPy8KqFC79RoErDE4eP7RXqXc',
    title: 'Electronics_and_Telecommunication.pdf',
    branch: 'Electronics & Telecommunication (ENTC)',
    year: 'TE',
    yearLabel: 'TE • 2026-27 Pattern',
    pattern: '2024 Pattern',
    category: 'Electronics',
  },
  {
    id: '1MplbyWhUz5z5NgvNGy8FBT6XeDHTkmui',
    title: 'Electronics_VLSI_Design_and_Technology.pdf',
    branch: 'Electronics (VLSI Design & Technology)',
    year: 'TE',
    yearLabel: 'TE • 2026-27 Pattern',
    pattern: '2024 Pattern',
    category: 'Electronics',
  },
  {
    id: '1OAEDaEntGK24tEzI1JYEMJNi8Z5cdc1t',
    title: 'Electrical_Engineering.pdf',
    branch: 'Electrical Engineering',
    year: 'TE',
    yearLabel: 'TE • 2026-27 Pattern',
    pattern: '2024 Pattern',
    category: 'Electrical',
  },
  {
    id: '1sZl9z6pNA3_TfxpuJrBux9W4zZw711sP',
    title: 'Mechanical_Engineering.pdf',
    branch: 'Mechanical Engineering',
    year: 'TE',
    yearLabel: 'TE • 2026-27 Pattern',
    pattern: '2024 Pattern',
    category: 'Mechanical',
  },
  {
    id: '1x9YNO---TlmS_o-ZGsQ3S9rOvXQw8Nmu',
    title: 'Mechanical_Sandwich.pdf',
    branch: 'Mechanical Sandwich Engineering',
    year: 'TE',
    yearLabel: 'TE • 2026-27 Pattern',
    pattern: '2024 Pattern',
    category: 'Mechanical',
  },
  {
    id: '1rrrGrC3fiH_4mbGKrog7dzG023nom4pV',
    title: 'Civil_Engineering.pdf',
    branch: 'Civil Engineering',
    year: 'TE',
    yearLabel: 'TE • 2026-27 Pattern',
    pattern: '2024 Pattern',
    category: 'Civil',
  },
  {
    id: '1xPjLGZKW7ogid4zk7z3IxjEFR8hS2Gh1',
    title: 'Chemical_Engineering.pdf',
    branch: 'Chemical Engineering',
    year: 'TE',
    yearLabel: 'TE • 2026-27 Pattern',
    pattern: '2024 Pattern',
    category: 'Chemical',
  },
];

export function filterSyllabus(
  items: SyllabusItem[],
  selectedYear: 'ALL' | 'FE' | 'SE' | 'TE',
  query: string
): SyllabusItem[] {
  const cleanQuery = query.toLowerCase().trim();
  if (!cleanQuery && selectedYear === 'ALL') return items;

  // Stop words commonly included in student search queries
  const stopWords = new Set([
    'sppu', 'pune', 'university', 'syllabus', 'engineering', 'engg', 
    'pattern', 'pdf', 'copy', 'curriculum', 'scheme', 'download', 'notes', 'insem', 'endsem'
  ]);
  
  // Extract tokens
  const rawTokens = cleanQuery.split(/[\s,+_\-/]+/).filter(Boolean);
  
  // Detect if query specifies year
  let detectedYear: 'FE' | 'SE' | 'TE' | null = null;
  const filteredTokens: string[] = [];

  for (const token of rawTokens) {
    if (token === 'fe' || token === 'first' || token === 'firstyear' || token === '1st') {
      detectedYear = 'FE';
    } else if (token === 'se' || token === 'second' || token === 'secondyear' || token === '2nd') {
      detectedYear = 'SE';
    } else if (token === 'te' || token === 'third' || token === 'thirdyear' || token === '3rd') {
      detectedYear = 'TE';
    } else if (!stopWords.has(token)) {
      filteredTokens.push(token);
    }
  }

  // If user selected a specific year tab, respect it; otherwise use detected year from search
  const effectiveYear = selectedYear !== 'ALL' ? selectedYear : detectedYear;

  return items.filter((item) => {
    // Check year filter
    if (effectiveYear && item.year !== effectiveYear) {
      return false;
    }

    if (filteredTokens.length === 0) {
      return true;
    }

    // Combined searchable text for item (branch and title prioritized)
    const branchText = `${item.branch} ${item.title}`.toLowerCase();
    const fullText = `${item.branch} ${item.title} ${item.category} ${item.yearLabel} ${item.pattern}`.toLowerCase();

    // Check if every meaningful token matches the target text or aliases
    return filteredTokens.every((token) => {
      // Branch aliases
      if (token === 'comp' || token === 'cse' || token === 'computer') {
        return branchText.includes('computer');
      }
      if (token === 'it') {
        return branchText.includes('information technology') || item.title.toLowerCase().includes('information_technology');
      }
      if (token === 'aids' || token === 'ai-ds' || token === 'ds') {
        return branchText.includes('data science') || branchText.includes('ai&ds');
      }
      if (token === 'aiml' || token === 'ai-ml') {
        return branchText.includes('machine learning') || branchText.includes('aiml');
      }
      if (token === 'entc' || token === 'etc' || token === 'telecom') {
        return branchText.includes('telecommunication') || branchText.includes('entc');
      }
      if (token === 'mech' || token === 'mechanical') {
        return branchText.includes('mechanical');
      }
      if (token === 'civil') {
        return branchText.includes('civil');
      }
      if (token === 'chem' || token === 'chemical') {
        return branchText.includes('chemical');
      }
      if (token === 'ee' || token === 'electrical') {
        return branchText.includes('electrical');
      }
      if (token === 'robo' || token === 'robotics') {
        return branchText.includes('robotics');
      }
      if (token === 'vlsi') {
        return branchText.includes('vlsi');
      }
      return branchText.includes(token) || fullText.includes(token);
    });
  });
}

interface SyllabusModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialYear?: 'ALL' | 'FE' | 'SE' | 'TE';
}

export const SyllabusModal: React.FC<SyllabusModalProps> = ({
  isOpen,
  onClose,
  initialYear = 'ALL',
}) => {
  const [selectedYear, setSelectedYear] = useState<'ALL' | 'FE' | 'SE' | 'TE'>(initialYear);
  const [searchQuery, setSearchQuery] = useState('');
  const [activePdf, setActivePdf] = useState<SyllabusItem | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'drive'>('list');
  const [iframeLoading, setIframeLoading] = useState(true);

  // Sync initialYear when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedYear(initialYear);
      setActivePdf(null);
      setViewMode('list');
      setSearchQuery('');
    }
  }, [isOpen, initialYear]);

  // Handle ESC key to close modal or PDF preview
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activePdf) {
          setActivePdf(null);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    // Prevent background scrolling
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, activePdf, onClose]);

  // Filter items using smart tokenized matcher
  const filteredItems = useMemo(() => {
    return filterSyllabus(SYLLABUS_DATASET, selectedYear, searchQuery);
  }, [selectedYear, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-md transition-opacity" 
        onClick={onClose} 
      />

      {/* Modal Dialog */}
      <div 
        className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── 1. Top Bar Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/80 bg-slate-50/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-none">
                  SPPU Engineering Syllabus Archive
                </h3>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 uppercase tracking-wider">
                  2024 Pattern
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Official Savitribai Phule Pune University syllabus copies & course structures
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Direct Google Drive Folder Link */}
            <a
              href={DRIVE_FOLDER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors shadow-2xs"
              title="Open entire shared folder in Google Drive"
            >
              <FolderOpen className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden md:inline">Open Drive Folder</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── 2. Active PDF Inline Viewer Mode ── */}
        {activePdf ? (
          <div className="flex flex-col flex-1 min-h-[500px] overflow-hidden bg-slate-900">
            {/* Viewer Header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800 border-b border-slate-700 text-white">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActivePdf(null)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to List
                </button>
                <div className="hidden sm:block">
                  <p className="text-xs font-semibold truncate max-w-md">{activePdf.branch}</p>
                  <p className="text-[11px] text-slate-400">{activePdf.yearLabel} • {activePdf.pattern}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`https://drive.google.com/file/d/${activePdf.id}/view?usp=sharing`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open in New Tab
                </a>
              </div>
            </div>

            {/* Google Drive PDF Preview Iframe */}
            <div className="relative flex-1 w-full h-full min-h-[520px]">
              <iframe
                src={`https://drive.google.com/file/d/${activePdf.id}/preview`}
                title={activePdf.branch}
                className="w-full h-full border-0"
                allow="autoplay"
              />
            </div>
          </div>
        ) : viewMode === 'drive' ? (
          /* ── 3. Embedded Google Drive Folder View Mode ── */
          <div className="flex flex-col flex-1 min-h-[550px] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-100 border-b border-slate-200 text-xs">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <FolderOpen className="w-4 h-4 text-blue-600" />
                Live Google Drive Directory Stream
              </span>
              <button
                onClick={() => setViewMode('list')}
                className="text-blue-600 hover:text-blue-800 font-semibold underline"
              >
                Switch to UniEval Filtered View
              </button>
            </div>
            <div className="relative flex-1 w-full h-[550px]">
              <iframe
                src={DRIVE_EMBED_URL}
                title="Google Drive Shared Folder"
                className="w-full h-full border-0"
              />
            </div>
          </div>
        ) : (
          /* ── 4. UniEval Curated Explorer View Mode ── */
          <div className="flex flex-col flex-1 overflow-hidden">
            
            {/* Filter Bar & Controls */}
            <div className="p-4 border-b border-slate-100 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Year Selector Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl overflow-x-auto">
                <button
                  onClick={() => setSelectedYear('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                    selectedYear === 'ALL'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({SYLLABUS_DATASET.length})
                </button>
                <button
                  onClick={() => setSelectedYear('FE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                    selectedYear === 'FE'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  First Year (FE)
                </button>
                <button
                  onClick={() => setSelectedYear('SE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                    selectedYear === 'SE'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Second Year (SE)
                </button>
                <button
                  onClick={() => setSelectedYear('TE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                    selectedYear === 'TE'
                      ? 'bg-purple-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Third Year (TE)
                </button>
              </div>

              {/* Real-time Search Box */}
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter branch (e.g. Computer, ENTC, Civil)..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-800 placeholder-slate-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* List Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 divide-y divide-slate-100">
              {filteredItems.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredItems.map((item) => (
                    <div
                      key={`${item.year}-${item.id}`}
                      className="group bg-white hover:bg-slate-50/90 rounded-xl p-3.5 border border-slate-200/90 hover:border-blue-400 transition-all shadow-2xs flex flex-col justify-between"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0 group-hover:scale-105 transition-transform">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              item.year === 'FE' 
                                ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                                : item.year === 'SE'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
                                : 'bg-purple-50 text-purple-700 border border-purple-200/60'
                            }`}>
                              {item.yearLabel}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {item.category}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 mt-1 truncate group-hover:text-blue-600 transition-colors">
                            {item.branch}
                          </h4>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                            {item.title}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                        <button
                          onClick={() => setActivePdf(item)}
                          className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Preview PDF</span>
                        </button>
                        <a
                          href={`https://drive.google.com/file/d/${item.id}/view?usp=sharing`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 font-medium transition-colors"
                          title="Open directly in Google Drive"
                        >
                          <span>Google Drive</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <Search className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">No syllabus matches found</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Try searching with another branch keyword like "Computer", "Mechanical", "Civil", or select "All".
                  </p>
                  <button
                    onClick={() => { setSearchQuery(''); setSelectedYear('ALL'); }}
                    className="mt-3 text-xs font-semibold text-blue-600 hover:underline"
                  >
                    Reset filters
                  </button>
                </div>
              )}
            </div>

            {/* ── 5. Modal Footer ── */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-500">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Synchronized with SPPU Academic Council 2024 Pattern</span>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setViewMode('drive')}
                  className="font-semibold text-blue-600 hover:underline"
                >
                  View Embedded Google Drive
                </button>
                <a
                  href={DRIVE_FOLDER_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-2xs transition-colors"
                >
                  <span>Open Folder in Drive</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
