import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Note, Branch } from '../types';
import { Link, useSearchParams } from 'react-router-dom';

const NotesLibrary: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // --- Filters State ---
  const initialBranch = searchParams.get('branch') || '';
  const initialYear = searchParams.get('year') ? Number(searchParams.get('year')) : '';

  const [selectedBranch, setSelectedBranch] = useState<string>(initialBranch);
  const [selectedYear, setSelectedYear] = useState<number | ''>(initialYear as number | '');

  // --- Data State ---
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);

  // Sync state to URL when changed
  useEffect(() => {
    const b = searchParams.get('branch');
    const y = searchParams.get('year');
    // Use timeout to avoid immediate state update conflicts if multiple params change
    setTimeout(() => {
        if (b !== null && b !== selectedBranch) setSelectedBranch(b);
        if (y !== null && Number(y) !== selectedYear) setSelectedYear(Number(y));
    }, 0);
  }, [searchParams, selectedBranch, selectedYear]);

  const updateParams = (branch: string, year: number | '') => {
    const params: Record<string, string> = {};
    if (branch) params.branch = branch;
    if (year) params.year = year.toString();
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
      
      // 1. Get Subjects based on filters
      const fetchedSubjects = await api.getSubjects(
        selectedBranch as Branch || undefined,
        selectedYear ? Number(selectedYear) : undefined
      );

      // 2. Fetch all notes and filter by the subjects we found
      const allNotes = await api.getNotes();
      const subjectIds = new Set(fetchedSubjects.map(s => s.id));
      setNotes(allNotes.filter(n => subjectIds.has(n.subjectId)));

      setLoading(false);
    };
    fetchData();
  }, [selectedBranch, selectedYear]);

  const isFirstYearMode = selectedYear === 1;
  const availableYears = isFirstYearMode ? [1] : [2, 3, 4];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen">
      
      {/* Dynamic Header */}
      <div className="mb-8 border-b border-gray-200 pb-6">
         <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
             <div>
                <h1 className="text-3xl font-bold text-gray-900">
                    {isFirstYearMode ? 'First Year Engineering (FE) Notes' : (selectedBranch ? `${selectedBranch} Notes` : 'Notes Library')}
                </h1>
                <p className="mt-2 text-gray-600">
                {isFirstYearMode 
                    ? 'Common lecture notes and study materials for all branches.' 
                    : 'Access lecture notes, cheat sheets, and study materials.'}
                </p>
             </div>
             {/* Toggle Button for Context Switching */}
             <button 
                onClick={toggleFirstYearMode}
                className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors whitespace-nowrap"
             >
                {isFirstYearMode ? 'View Departmental Notes' : 'View First Year (FE)'}
             </button>
         </div>
      </div>

      {/* Filters Section */}
      <div className="flex flex-wrap gap-4 items-end mb-8">
            {/* Year Selector */}
            <div className="flex space-x-2 overflow-x-auto pb-2 no-scrollbar">
                {availableYears.map(y => (
                    <button
                        key={y}
                        onClick={() => handleYearChange(y === selectedYear ? '' : y)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
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
                        className="appearance-none block w-full pl-10 pr-10 py-3 text-base bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-700 font-medium cursor-pointer hover:border-indigo-300 transition-colors"
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {notes.length > 0 ? (
                notes.map(note => (
                    <Link to={`/note/${note.id}`} key={note.id} className="block h-full">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-shadow duration-300 flex flex-col relative overflow-hidden group h-full">
                            {/* Purple Top Border Accent */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-600 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                            
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-700 transition-colors leading-tight">
                                    {note.title}
                                </h3>
                                <div className="bg-red-50 p-2 rounded-lg">
                                    <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                </div>
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
                                            <span className="text-xl font-bold text-gray-900">₹{note.price.toFixed(2)}</span>
                                        </div>
                                    ) : (
                                        <span className="text-lg font-bold text-green-600">Free</span>
                                    )}
                                </div>
                                <span className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 underline">
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