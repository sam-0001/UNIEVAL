import React from 'react';
import { Link } from 'react-router-dom';
import { Course, Note, PurchaseRecord } from '../../types';
import { BookOpen, FileText, Video, Clock, Calendar, ArrowRight } from 'lucide-react';

export interface SearchResultsViewProps {
  searchQuery: string;
  courses: Course[];
  notes: Note[];
  liveClasses: any[];
  myPurchases: Record<string, PurchaseRecord>;
  getSubjectName: (subjectId: string) => string;
  getSubjectBadge: (subjectId: string) => string;
  formatSubjectLabel: (rawSubject?: string, rawCourse?: string) => string;
  navigate: (path: string) => void;
}

export const SearchResultsView: React.FC<SearchResultsViewProps> = ({
  searchQuery,
  courses,
  notes,
  liveClasses,
  myPurchases,
  getSubjectName,
  getSubjectBadge,
  formatSubjectLabel,
  navigate
}) => {
  const query = searchQuery.toLowerCase();

  const matchingCourses = courses.filter(
    c =>
      c.title.toLowerCase().includes(query) ||
      (c.description || '').toLowerCase().includes(query) ||
      getSubjectName(c.subjectId).toLowerCase().includes(query) ||
      getSubjectBadge(c.subjectId).toLowerCase().includes(query)
  );

  const matchingNotes = notes.filter(
    n =>
      n.title.toLowerCase().includes(query) ||
      (n.description || '').toLowerCase().includes(query) ||
      getSubjectName(n.subjectId).toLowerCase().includes(query) ||
      getSubjectBadge(n.subjectId).toLowerCase().includes(query)
  );

  const matchingLiveClasses = liveClasses.filter(
    lc =>
      lc.title.toLowerCase().includes(query) ||
      (lc.subject || '').toLowerCase().includes(query) ||
      (lc.course || '').toLowerCase().includes(query)
  );

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-bold text-slate-800">Search Results for "{searchQuery}"</h2>

      {/* Courses Results */}
      <div>
        <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-500" /> Courses
        </h3>
        {matchingCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matchingCourses.map(c => (
              <Link
                key={c.id}
                to={`/course/${c.id}`}
                className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md hover:-translate-y-1 transition-all group flex flex-col"
              >
                <div className="aspect-video bg-slate-200 relative overflow-hidden">
                  {c.thumbnailUrl ? (
                    <img
                      src={c.thumbnailUrl}
                      alt={c.title}
                      className="w-full h-full object-contain bg-slate-900 group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-indigo-100"></div>
                  )}
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <div className="text-xs font-bold text-[#1F81FC] mb-1 uppercase tracking-wide">
                    {getSubjectBadge(c.subjectId)}
                    {getSubjectName(c.subjectId) && (
                      <span className="text-slate-400 font-medium ml-1 tracking-normal normal-case">
                        • {getSubjectName(c.subjectId)}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2 line-clamp-2">{c.title}</h3>
                  <p className="text-sm text-slate-500 line-clamp-2 mb-4">{c.description}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-sm">No matching courses found.</p>
        )}
      </div>

      {/* Notes Results */}
      <div>
        <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2 mt-8">
          <FileText className="w-5 h-5 text-purple-500" /> Notes
        </h3>
        {matchingNotes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matchingNotes.map(n => (
              <Link
                key={n.id}
                to={`/note/${n.id}`}
                className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 hover:shadow-md hover:-translate-y-1 transition-all group flex flex-col h-full"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center shrink-0 text-blue-600 group-hover:bg-[#1F81FC] group-hover:text-white transition-colors">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <div className="text-xs font-bold text-[#1F81FC] uppercase tracking-wide">
                        {getSubjectBadge(n.subjectId)}
                        {getSubjectName(n.subjectId) && (
                          <span className="text-slate-400 font-medium ml-1 tracking-normal normal-case">
                            • {getSubjectName(n.subjectId)}
                          </span>
                        )}
                      </div>
                      {myPurchases[n.id] && (
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1 ${
                            (myPurchases[n.id].daysRemaining ?? 999) <= 7
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          <Clock className="w-2.5 h-2.5" />
                          {myPurchases[n.id].daysRemaining !== null
                            ? `${myPurchases[n.id].daysRemaining}d left`
                            : 'Active'}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-900 line-clamp-2">{n.title}</h3>
                  </div>
                </div>
                <p className="text-sm text-slate-500 line-clamp-2 mb-4 flex-1">{n.description}</p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-sm">No matching notes found.</p>
        )}
      </div>

      {/* Live Classes Results */}
      <div>
        <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2 mt-8">
          <Video className="w-5 h-5 text-red-500" /> Live Classes
        </h3>
        {matchingLiveClasses.length > 0 ? (
          <div className="space-y-4">
            {matchingLiveClasses.map((lc: any) => {
              const dateObj = new Date(lc.scheduledStartTime);
              const isToday = new Date().toDateString() === dateObj.toDateString();
              const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              const dayStr = isToday ? 'Today' : dateObj.toLocaleDateString('en-US', { weekday: 'short' });
              const timeStr = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

              return (
                <div
                  key={lc.id}
                  className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-col md:flex-row items-start md:items-center gap-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-4 w-full md:w-48 shrink-0">
                    <div
                      className={`px-4 py-2 rounded-lg text-center border ${
                        isToday ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      <div className="text-sm font-bold">{dateStr}</div>
                      <div className="text-xs font-medium">{dayStr}</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">{timeStr}</div>
                      {(() => {
                        const durationMinutes =
                          lc.scheduledEndTime && lc.scheduledStartTime
                            ? Math.max(
                                15,
                                Math.round(
                                  (new Date(lc.scheduledEndTime).getTime() - new Date(lc.scheduledStartTime).getTime()) / 60000
                                )
                              )
                            : 60;
                        const durHrs = Math.floor(durationMinutes / 60);
                        const durMins = durationMinutes % 60;
                        const durStr = durHrs > 0 ? (durMins > 0 ? `${durHrs}h ${durMins}m` : `${durHrs}h`) : `${durMins}m`;
                        return (
                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" /> {durStr}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="flex-1 flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 shrink-0 flex flex-col items-center justify-center shadow-sm">
                      <Video className="w-5 h-5" />
                      <span className="text-[9px] font-bold uppercase tracking-wider mt-0.5">Live</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-base mb-1">{lc.title}</h4>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-1.5">
                        <span className="flex items-center gap-1.5 font-medium text-slate-700">
                          <div className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[8px] text-slate-700 font-bold">
                            {(lc.teacherName || 'Faculty')[0].toUpperCase()}
                          </div>
                          {lc.teacherName || 'Faculty'}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full font-semibold text-[11px] bg-blue-50 text-blue-700 border border-blue-100">
                          {formatSubjectLabel(lc.subject, lc.course)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">Live Interactive Classroom with Faculty</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
                    <button
                      onClick={() => navigate(`/live-class/${lc.id}`)}
                      className="flex-1 md:flex-none bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center gap-2"
                    >
                      Join Class <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-slate-500 text-sm">No matching live classes found.</p>
        )}
      </div>
    </div>
  );
};

export default SearchResultsView;
