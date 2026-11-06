import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Note, PurchaseRecord, User } from '../../../types';
import {
  FileText, Layers, Search, Clock, ArrowRight, Navigation, Award, Bookmark
} from 'lucide-react';
import { getYearMeta } from '../../../constants/academics';

export interface NotesTabProps {
  notes: Note[];
  allNotesState: Note[];
  user: User;
  studentNoteYears: number[];
  notesByYear: Record<number, Note[]>;
  myPurchases: Record<string, PurchaseRecord>;
  getItemYear: (subjectId: string) => number;
  getSubjectBadge: (subjectId: string) => string;
  getSubjectName: (subjectId: string) => string;
  isCollegeFreeItem: (item: any) => boolean;
}

export const NotesTab: React.FC<NotesTabProps> = ({
  notes,
  allNotesState,
  user,
  studentNoteYears,
  notesByYear,
  myPurchases,
  getItemYear,
  getSubjectBadge,
  getSubjectName,
  isCollegeFreeItem
}) => {
  const [selectedNoteYearFilter, setSelectedNoteYearFilter] = useState<number | 'all'>('all');
  const [noteSearchQuery, setNoteSearchQuery] = useState('');

  const filteredNotes = notes.filter(n => {
    const yr = getItemYear(n.subjectId);
    if (selectedNoteYearFilter !== 'all' && yr !== selectedNoteYearFilter) return false;
    if (noteSearchQuery.trim()) {
      const q = noteSearchQuery.toLowerCase();
      const titleMatch = n.title.toLowerCase().includes(q);
      const descMatch = (n.description || '').toLowerCase().includes(q);
      const subjMatch = getSubjectName(n.subjectId).toLowerCase().includes(q);
      const badgeMatch = getSubjectBadge(n.subjectId).toLowerCase().includes(q);
      if (!titleMatch && !descMatch && !subjMatch && !badgeMatch) return false;
    }
    return true;
  });

  const renderNoteCard = (n: Note) => {
    const purchase = myPurchases[n.id];
    const fileCount = n.sections?.reduce((acc: number, s: any) => acc + (s.files?.length || 0), 0) || 0;
    const yr = getItemYear(n.subjectId);
    const meta = getYearMeta(yr);
    const subjName = getSubjectName(n.subjectId);

    return (
      <Link 
        key={n.id} 
        to={`/note/${n.id}`} 
        className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all overflow-hidden flex flex-col group relative"
      >
        <div className="aspect-video bg-slate-900 relative overflow-hidden">
          {n.thumbnailUrl ? (
            <img 
              src={n.thumbnailUrl} 
              alt={n.title} 
              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" 
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#131A3F] via-slate-900 to-[#1F81FC]/40 flex flex-col items-center justify-center text-white/80 p-4 text-center select-none group-hover:scale-105 transition-transform duration-300">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-2 shadow-inner border border-white/10">
                <FileText className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-xs font-bold text-white line-clamp-1">{n.title}</span>
              <span className="text-[10px] text-blue-200/80 font-medium mt-0.5">{fileCount > 0 ? `${fileCount} PDFs` : 'Study Material'}</span>
            </div>
          )}
          
          {/* Year badge pill */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-[#131A3F]/90 backdrop-blur-md text-white text-[10px] font-extrabold px-2.5 py-1 rounded-lg border border-white/10 shadow-sm">
            <span className={`w-1.5 h-1.5 rounded-full ${meta.dotColor}`}></span>
            <span>{meta.code}</span>
          </div>

          {/* Expiry / Days remaining */}
          {purchase && (
            <div className="absolute top-2.5 right-2.5">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-md shadow-sm flex items-center gap-1 ${
                (purchase.daysRemaining ?? 999) <= 7 
                  ? 'bg-amber-500/90 text-white' 
                  : 'bg-emerald-600/90 text-white'
              }`}>
                <Clock className="w-2.5 h-2.5" />
                {purchase.daysRemaining !== null 
                  ? `${purchase.daysRemaining}d left` 
                  : 'Active'}
              </span>
            </div>
          )}

          <div className="absolute bottom-2.5 right-2.5 bg-white/95 backdrop-blur-sm text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded shadow-sm flex items-center gap-1">
            <FileText className="w-3 h-3 text-[#1F81FC]" /> PDF Notes
          </div>
        </div>

        <div className="p-4 flex-1 flex flex-col">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1F81FC] mb-1.5 truncate">
            <span className="uppercase tracking-wider text-[11px] font-extrabold">{meta.code}</span>
            {subjName && <span className="text-slate-400 font-normal truncate">• {subjName}</span>}
          </div>

          <h3 className="font-bold text-slate-900 mb-2 line-clamp-2 leading-snug group-hover:text-[#1F81FC] transition-colors">
            {n.title}
          </h3>

          <div className="flex items-center gap-3 text-xs text-slate-500 mb-4">
            <span className="flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" /> 
              {fileCount > 0 ? `${fileCount} ${fileCount === 1 ? 'PDF' : 'PDFs'}` : `${n.sections?.length || 0} Sections`}
            </span>
          </div>

          <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              {purchase?.amountPaid === 0 ? 'Free Access' : 'Enrolled'}
            </span>
            <span className="bg-blue-50 text-blue-600 group-hover:bg-[#1F81FC] group-hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1">
              Open Notes <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="space-y-8 relative z-10">
      {/* Notes Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#131A3F] mb-1">My Notes</h1>
          <p className="text-slate-500 text-sm">Your purchased notes and study material</p>
        </div>
        <Link to="/notes" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold shadow-xs transition-colors flex items-center gap-2 text-sm">
          Browse More Notes <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-[#1F81FC] shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Total Notes</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-bold text-slate-900 leading-none mt-1">{notes.length}</h3>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Purchased packages</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 font-extrabold text-sm border border-blue-100">
            FE
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">First Year (FE)</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-bold text-slate-900 leading-none mt-1">
                {notesByYear[1]?.length || 0}
              </h3>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Foundation notes</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 font-extrabold text-sm border border-indigo-100">
            SE
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Second Year (SE)</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-bold text-slate-900 leading-none mt-1">
                {notesByYear[2]?.length || 0}
              </h3>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Department core</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Curriculum Scope</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-base font-bold text-slate-900 leading-none mt-1">
                {studentNoteYears.length > 0 
                  ? studentNoteYears.map(y => getYearMeta(y).code).join(' & ') 
                  : 'None'}
              </h3>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Active academic years</p>
          </div>
        </div>
      </div>

      {/* Year Filter Tabs & Search Row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 no-scrollbar">
          <button 
            onClick={() => setSelectedNoteYearFilter('all')} 
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              selectedNoteYearFilter === 'all'
                ? 'bg-[#131A3F] text-white shadow-sm'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" /> All Academic Years <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              selectedNoteYearFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}>{notes.length}</span>
          </button>

          {studentNoteYears.map(yearNum => {
            const meta = getYearMeta(yearNum);
            const count = (notesByYear[yearNum] || []).length;
            const isSelected = selectedNoteYearFilter === yearNum;
            return (
              <button
                key={yearNum}
                onClick={() => setSelectedNoteYearFilter(isSelected ? 'all' : yearNum)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                  isSelected
                    ? meta.pillActive
                    : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${meta.dotColor}`}></span>
                <span>{meta.code} • {meta.name}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full md:w-72 shrink-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search notes or subjects..."
            value={noteSearchQuery}
            onChange={(e) => setNoteSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F81FC]/30 text-slate-800 placeholder-slate-400"
          />
        </div>
      </div>

      {/* Notes List */}
      {notes.length === 0 ? (
        <div className="bg-slate-50 rounded-2xl border border-blue-100 p-12 flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="absolute right-10 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none hidden md:block">
            <Navigation className="w-32 h-32 text-blue-400 rotate-45" />
          </div>
          <div className="w-16 h-16 bg-blue-100 text-blue-500 rounded-2xl flex items-center justify-center mb-4 relative z-10 shadow-sm border border-white">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2 relative z-10">You haven't purchased any notes yet.</h3>
          <p className="text-sm text-slate-500 mb-6 relative z-10 max-w-sm">Explore high quality notes prepared by expert teachers.</p>
          <Link to="/notes" className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-md relative z-10 flex items-center gap-2">
            Browse Notes <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : selectedNoteYearFilter === 'all' && studentNoteYears.length > 1 ? (
        <div className="space-y-10">
          {studentNoteYears.map(yearNum => {
            const meta = getYearMeta(yearNum);
            const yearNotes = filteredNotes.filter(n => getItemYear(n.subjectId) === yearNum);
            if (yearNotes.length === 0) return null;

            return (
              <div key={yearNum} className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200/80 gap-2">
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-extrabold uppercase tracking-wider border ${meta.badgeColor}`}>
                      {meta.code}
                    </span>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 leading-tight">
                        {meta.name}
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">{meta.subtext}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                      {yearNotes.length} {yearNotes.length === 1 ? 'Package' : 'Packages'}
                    </span>
                    <button
                      onClick={() => setSelectedNoteYearFilter(yearNum)}
                      className="text-xs font-bold text-[#1F81FC] hover:underline flex items-center gap-1 ml-2"
                    >
                      Focus on {meta.code} <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {yearNotes.map(renderNoteCard)}
                </div>
              </div>
            );
          })}

          {filteredNotes.length === 0 && (
            <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center">
              <p className="text-sm text-slate-500">No notes found matching "{noteSearchQuery}".</p>
              <button onClick={() => setNoteSearchQuery('')} className="text-xs font-bold text-blue-600 hover:underline mt-2">Clear search</button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {selectedNoteYearFilter !== 'all' && (
            <div className="flex items-center justify-between bg-blue-50/60 border border-blue-100 rounded-xl p-3 px-4">
              <span className="text-sm font-semibold text-slate-900">
                Showing {getYearMeta(selectedNoteYearFilter).name} ({filteredNotes.length})
              </span>
              <button
                onClick={() => setSelectedNoteYearFilter('all')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
              >
                Show all academic years
              </button>
            </div>
          )}

          {filteredNotes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredNotes.map(renderNoteCard)}
            </div>
          ) : (
            <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center">
              <p className="text-sm text-slate-500">No notes found for this filter.</p>
              <button
                onClick={() => { setSelectedNoteYearFilter('all'); setNoteSearchQuery(''); }}
                className="text-xs font-bold text-blue-600 hover:underline mt-2"
              >
                Reset filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Recommended for You */}
      <div className="pt-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Award className="w-5 h-5 text-blue-600" /> Recommended for You</h2>
            <p className="text-sm text-slate-500">Popular notes based on your branch and year</p>
          </div>
          <Link to="/notes" className="text-blue-600 text-sm font-bold flex items-center gap-1 hover:underline">View All <ArrowRight className="w-4 h-4" /></Link>
        </div>
        
        {(() => {
          const recommendedNotes = allNotesState.filter(n => !user.purchasedNoteIds?.includes(n.id) && !isCollegeFreeItem(n) && n.price !== 0).slice(0, 4);
          if (recommendedNotes.length === 0) {
            return (
              <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-10 flex flex-col items-center justify-center text-center">
                <FileText className="w-10 h-10 text-slate-300 mb-3" />
                <h3 className="text-sm font-bold text-slate-700 mb-1">You've got everything!</h3>
                <p className="text-sm text-slate-500 max-w-sm">You have unlocked all recommended notes for your branch and year. Browse the catalog for more topics.</p>
              </div>
            );
          }
          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {recommendedNotes.map((n) => (
                <Link key={n.id} to={`/note/${n.id}`} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex flex-col group">
                  <div className="aspect-video bg-slate-900 relative">
                    {n.thumbnailUrl ? (
                      <img src={n.thumbnailUrl} alt={n.title} className="w-full h-full object-contain opacity-90 group-hover:opacity-100 transition-opacity" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#131A3F] via-slate-900 to-indigo-950 flex flex-col items-center justify-center text-white/80 p-4 text-center select-none">
                        <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-1.5 border border-white/10">
                          <FileText className="w-4 h-4 text-indigo-400" />
                        </div>
                        <span className="text-xs font-bold text-white line-clamp-1">{n.title}</span>
                      </div>
                    )}
                    <div className="absolute top-3 left-3 bg-white/20 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded">
                      {getSubjectBadge(n.subjectId)}
                    </div>
                    <div className="absolute top-3 right-3 text-white/70 hover:text-white cursor-pointer">
                      <Bookmark className="w-5 h-5" />
                    </div>
                    <div className="absolute bottom-3 right-3 bg-white text-red-600 text-[10px] font-bold px-2 py-1 rounded shadow-md flex items-center gap-1">
                      <FileText className="w-3 h-3" /> PDF
                    </div>
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="font-bold text-slate-900 mb-2 line-clamp-2 leading-snug">{n.title}</h3>
                    {(() => {
                      const fileCount = n.sections?.reduce((acc: number, s: any) => acc + (s.files?.length || 0), 0) || 0;
                      return (
                        <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                          <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> {fileCount > 0 ? `${fileCount} ${fileCount === 1 ? 'PDF' : 'PDFs'}` : `${n.sections?.length || 0} Sections`}</span>
                        </div>
                      );
                    })()}
                    <div className="mt-auto flex items-center justify-between">
                      <span className="font-bold text-slate-900">₹{n.price}</span>
                      <span className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold group-hover:bg-blue-100 transition-colors flex items-center gap-1">
                        View Notes <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default NotesTab;
