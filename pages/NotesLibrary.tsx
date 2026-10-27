import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Note, Branch } from '../types';
import { Link, useSearchParams } from 'react-router-dom';
import { useSEO } from '../hooks/useSEO';

const NotesLibrary: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  useSEO({
    title: 'SPPU Notes PDF - Download Pune University Engineering Notes',
    description: 'Download verified SPPU Engineering Notes PDF for FE, SE, TE, and BE. Complete chapter-wise handwritten & topper notes for Computer, IT, Mechanical, Civil, ENTC & AIDS.',
    canonical: 'https://unieval.in/notes',
  });

  // --- Filters State ---
  const initialBranch = searchParams.get('branch') || '';
  const initialYear = searchParams.get('year') ? Number(searchParams.get('year')) : '';
  const initialQuery = searchParams.get('q') || searchParams.get('search') || '';

  const [selectedBranch, setSelectedBranch] = useState<string>(initialBranch);
  const [selectedYear, setSelectedYear] = useState<number | ''>(initialYear as number | '');
  const [searchQuery, setSearchQuery] = useState<string>(initialQuery);

  // --- Data State ---
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);

  // Sync state to URL when changed
  useEffect(() => {
    const b = searchParams.get('branch');
    const y = searchParams.get('year');
    const q = searchParams.get('q') || searchParams.get('search');
    // Use timeout to avoid immediate state update conflicts if multiple params change
    setTimeout(() => {
        if (b !== null && b !== selectedBranch) setSelectedBranch(b);
        if (y !== null && Number(y) !== selectedYear) setSelectedYear(Number(y));
        if (q !== null && q !== searchQuery) setSearchQuery(q);
    }, 0);
  }, [searchParams, selectedBranch, selectedYear, searchQuery]);

  useEffect(() => {
    document.title = 'SPPU Notes PDF - Download Pune University Engineering Notes | UniEval';
    let canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.setAttribute('href', 'https://unieval.in/notes');
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

        // 2. Fetch all notes
        const allNotes = await api.getNotes().catch(() => []);

        // If a branch or year filter is explicitly active, filter by subjects
        if (selectedBranch || selectedYear) {
          const subjectIds = new Set(fetchedSubjects.map(s => s.id));
          setNotes(allNotes.filter(n => subjectIds.has(n.subjectId)));
        } else {
          // If no branch/year chosen, display all notes
          setNotes(allNotes);
        }
      } catch (err) {
        console.error('Failed to load notes data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedBranch, selectedYear]);

  const displayedNotes = React.useMemo(() => {
    if (!searchQuery.trim()) return notes;
    const q = searchQuery.toLowerCase().trim();
    return notes.filter(n => {
      if (q === 'sppu' || q === 'notes' || q === 'sppu notes' || q === 'sppu note') return true;
      const matchTitle = (n.title || '').toLowerCase().includes(q);
      const matchDesc = (n.description || '').toLowerCase().includes(q);
      return matchTitle || matchDesc;
    });
  }, [notes, searchQuery]);

  const isFirstYearMode = selectedYear === 1;
  const availableYears = isFirstYearMode ? [1] : [2, 3, 4];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 min-h-screen">
      
      {/* Dynamic Header */}
      <div className="mb-6 sm:mb-8 border-b border-gray-200 pb-5 sm:pb-6">
         <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
             <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                    {isFirstYearMode ? 'First Year Engineering (FE) SPPU Notes' : (selectedBranch ? `${selectedBranch} SPPU Notes` : 'SPPU Notes Library')}
                </h1>
                <p className="mt-2 text-sm sm:text-base text-gray-600">
                {isFirstYearMode 
                    ? 'Common lecture notes and study materials for all Pune University (SPPU) branches.' 
                    : 'Access top-quality SPPU lecture notes, cheat sheets, and engineering study materials.'}
                </p>
             </div>
             {/* Toggle Button for Context Switching */}
             <button 
                onClick={toggleFirstYearMode}
                className="w-full sm:w-auto text-center bg-brand-navy text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-opacity-90 transition-colors whitespace-nowrap min-h-[44px] flex items-center justify-center"
             >
                {isFirstYearMode ? 'View Departmental Notes' : 'View First Year (FE)'}
             </button>
         </div>
      </div>

      {/* Filters & Search Section */}
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
                    placeholder="Search SPPU notes, subjects..."
                    className="block w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-cobalt text-gray-700 min-h-[44px]"
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
                            ? 'bg-brand-cobalt text-white shadow-sm' 
                            : 'bg-white text-gray-700 border border-gray-200 hover:bg-blue-50'
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
                        className="appearance-none block w-full pl-10 pr-10 py-3 text-base bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-cobalt focus:border-transparent text-gray-700 font-medium cursor-pointer hover:border-brand-cobalt transition-colors min-h-[44px]"
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

      {/* Content Area */}
      {loading ? (
        <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-cobalt"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {displayedNotes.length > 0 ? (
                displayedNotes.map(note => (
                    <Link to={`/note/${note.id}`} key={note.id} className="block h-full">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:-translate-y-1 hover:shadow-lg hover:border-brand-indigo transition-all duration-300 flex flex-col relative overflow-hidden group h-full">
                            {/* Gradient Top Border Accent */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-main transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                            
                            <div className="flex justify-between items-start mb-2 gap-2">
                                <h3 className="text-lg font-bold text-brand-navy group-hover:text-brand-indigo transition-colors leading-tight">
                                    {note.title}
                                </h3>
                                <div className="bg-red-50 p-2 rounded-lg shrink-0">
                                    <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                </div>
                            </div>

                            <div className="mb-3">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    1st PDF Free Demo
                                </span>
                            </div>

                            {/* Added whitespace-pre-line and removed line-clamp so the full list renders properly */}
                            <p className="text-sm text-gray-500 mb-6 flex-grow whitespace-pre-line">
                                {note.description || "Comprehensive note material for your preparation."}
                            </p>
                            
                            <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-50">
                                <div>
                                    {note.price ? (
                                        <div className="flex flex-col">
                                            {note.originalPrice && note.originalPrice > note.price && (
                                                <span className="text-xs text-red-400 line-through">₹{note.originalPrice.toFixed(2)}</span>
                                            )}
                                            <span className="text-xl font-bold text-brand-navy">₹{note.price.toFixed(2)}</span>
                                        </div>
                                    ) : (
                                        <span className="text-lg font-bold text-emerald-600">Free</span>
                                    )}
                                </div>
                                <span className="text-sm font-bold text-brand-cobalt group-hover:text-brand-indigo underline transition-colors">
                                    View Details
                                </span>
                            </div>
                        </div>
                    </Link>
                ))
            ) : (
                <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg text-gray-500">
                    No notes found for this selection.
                </div>
            )}
        </div>
      )}
    </div>
  );
};

export default NotesLibrary;