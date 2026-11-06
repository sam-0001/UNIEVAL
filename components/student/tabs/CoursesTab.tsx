import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Course, PurchaseRecord, User } from '../../../types';
import {
  ArrowRight, Layers, Search, Clock, Video, FileText, BookOpen,
  Compass, GraduationCap
} from 'lucide-react';
import { getYearMeta } from '../../../constants/academics';
import { StudentProgressItem } from '../../../hooks/useStudentDashboardData';

export interface CoursesTabProps {
  courses: Course[];
  allCoursesState: Course[];
  user: User;
  studentCourseYears: number[];
  coursesByYear: Record<number, Course[]>;
  myPurchases: Record<string, PurchaseRecord>;
  studentProgressMap: Record<string, StudentProgressItem>;
  getItemYear: (subjectId: string) => number;
  getSubjectBadge: (subjectId: string) => string;
  getSubjectName: (subjectId: string) => string;
  isCollegeFreeItem: (item: any) => boolean;
}

export const CoursesTab: React.FC<CoursesTabProps> = ({
  courses,
  allCoursesState,
  user,
  studentCourseYears,
  coursesByYear,
  myPurchases,
  studentProgressMap,
  getItemYear,
  getSubjectBadge,
  getSubjectName,
  isCollegeFreeItem
}) => {
  const [selectedCourseYearFilter, setSelectedCourseYearFilter] = useState<number | 'all'>('all');
  const [courseSearchQuery, setCourseSearchQuery] = useState('');

  const filteredCourses = courses.filter(c => {
    const yr = getItemYear(c.subjectId);
    if (selectedCourseYearFilter !== 'all' && yr !== selectedCourseYearFilter) return false;
    if (courseSearchQuery.trim()) {
      const q = courseSearchQuery.toLowerCase();
      const titleMatch = c.title.toLowerCase().includes(q);
      const descMatch = (c.description || '').toLowerCase().includes(q);
      const subjMatch = getSubjectName(c.subjectId).toLowerCase().includes(q);
      const badgeMatch = getSubjectBadge(c.subjectId).toLowerCase().includes(q);
      if (!titleMatch && !descMatch && !subjMatch && !badgeMatch) return false;
    }
    return true;
  });

  const renderCourseItem = (c: Course) => {
    const lectureCount = c.modules?.reduce((acc: number, m: any) => acc + (m.videos?.length || (m.videoUrl ? 1 : 0)), 0) || (c.modules?.length ?? 0);
    const noteCount = c.modules?.reduce((acc: number, m: any) => acc + (m.resources?.length || 0) + (m.videos?.reduce((vacc: number, v: any) => vacc + (v.resources?.length || 0), 0) || 0), 0) || 0;
    return (
      <div key={c.id} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row gap-6 relative">
        <div className="w-full md:w-[280px] aspect-video bg-slate-100 rounded-xl overflow-hidden shrink-0">
          {c.thumbnailUrl ? <img src={c.thumbnailUrl} alt={c.title} className="w-full h-full object-contain bg-slate-900" /> : <div className="w-full h-full bg-indigo-100"></div>}
        </div>
        <div className="flex-1 flex flex-col py-1">
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md uppercase tracking-wide">
                  {getSubjectBadge(c.subjectId)}
                </span>
                {myPurchases[c.id] && (
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                    (myPurchases[c.id].daysRemaining ?? 999) <= 7 
                      ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    <Clock className="w-3 h-3" />
                    {myPurchases[c.id].daysRemaining !== null 
                      ? `${myPurchases[c.id].daysRemaining}d access left` 
                      : 'Access active'}
                  </span>
                )}
              </div>
              <h3 className="font-bold text-slate-900 text-xl mt-3 mb-4">{c.title}</h3>
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-500 mb-6">
            <span className="flex items-center gap-1.5"><Video className="w-4 h-4" /> {lectureCount} {lectureCount === 1 ? 'Lecture' : 'Lectures'}</span>
            {noteCount > 0 && <span className="flex items-center gap-1.5"><FileText className="w-4 h-4" /> {noteCount} {noteCount === 1 ? 'Note' : 'Notes'}</span>}
            {c.modules && c.modules.length > 0 && <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4" /> {c.modules.length} {c.modules.length === 1 ? 'Module' : 'Modules'}</span>}
          </div>
          {(() => {
            const prog = studentProgressMap[c.id];
            const completedCount = prog?.completedCount || 0;
            const pct = lectureCount > 0 ? Math.round((completedCount / lectureCount) * 100) : 0;
            return (
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-auto pt-2">
                <div className="flex-1 flex items-center gap-3">
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
                  </div>
                  <span className="text-xs font-bold text-slate-700 min-w-8">{pct}%</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                  <Link to={`/course/${c.id}`} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-xs">
                    Continue Learning <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link to={`/course/${c.id}`} className="bg-blue-50 text-blue-600 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold hover:bg-blue-100 transition-colors text-center">
                    Course Details
                  </Link>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 relative z-10">
      {/* Courses Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#131A3F] mb-1">My Courses</h1>
          <p className="text-slate-500 text-sm">Your enrolled courses and learning progress</p>
        </div>
        <Link to="/browse" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold shadow-xs transition-colors flex items-center gap-2 text-sm">
          Browse More Courses <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 no-scrollbar">
          <button 
            onClick={() => setSelectedCourseYearFilter('all')} 
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              selectedCourseYearFilter === 'all'
                ? 'bg-[#131A3F] text-white shadow-sm'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" /> All Courses <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              selectedCourseYearFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}>{courses.length}</span>
          </button>

          {studentCourseYears.map(yearNum => {
            const meta = getYearMeta(yearNum);
            const count = (coursesByYear[yearNum] || []).length;
            const isSelected = selectedCourseYearFilter === yearNum;
            return (
              <button
                key={yearNum}
                onClick={() => setSelectedCourseYearFilter(isSelected ? 'all' : yearNum)}
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
            placeholder="Search courses..."
            value={courseSearchQuery}
            onChange={(e) => setCourseSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F81FC]/30 text-slate-800 placeholder-slate-400"
          />
        </div>
      </div>

      {/* Courses List */}
      {courses.length === 0 ? (
        <div className="bg-slate-50 rounded-2xl border border-indigo-100 p-12 flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="absolute right-10 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none hidden md:block">
            <Compass className="w-32 h-32 text-indigo-400 rotate-12" />
          </div>
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 relative z-10 shadow-sm border border-white">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2 relative z-10">You haven't enrolled in any courses yet.</h3>
          <p className="text-sm text-slate-500 mb-6 relative z-10 max-w-sm">Discover high-quality courses from expert teachers and start your learning journey.</p>
          <Link to="/browse" className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors shadow-md relative z-10 flex items-center gap-2">
            Browse Catalog <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : selectedCourseYearFilter === 'all' && studentCourseYears.length > 1 ? (
        <div className="space-y-10">
          {studentCourseYears.map(yearNum => {
            const meta = getYearMeta(yearNum);
            const yearCourses = filteredCourses.filter(c => getItemYear(c.subjectId) === yearNum);
            if (yearCourses.length === 0) return null;
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
                      {yearCourses.length} {yearCourses.length === 1 ? 'Course' : 'Courses'}
                    </span>
                    <button
                      onClick={() => setSelectedCourseYearFilter(yearNum)}
                      className="text-xs font-bold text-[#1F81FC] hover:underline flex items-center gap-1 ml-2"
                    >
                      Focus on {meta.code} <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="space-y-4">
                  {yearCourses.map(renderCourseItem)}
                </div>
              </div>
            );
          })}
          {filteredCourses.length === 0 && (
            <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center">
              <p className="text-sm text-slate-500">No courses found matching "{courseSearchQuery}".</p>
              <button onClick={() => setCourseSearchQuery('')} className="text-xs font-bold text-blue-600 hover:underline mt-2">Clear search</button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {selectedCourseYearFilter !== 'all' && (
            <div className="flex items-center justify-between bg-blue-50/60 border border-blue-100 rounded-xl p-3 px-4">
              <span className="text-sm font-semibold text-slate-900">
                Showing {getYearMeta(selectedCourseYearFilter).name} ({filteredCourses.length})
              </span>
              <button
                onClick={() => setSelectedCourseYearFilter('all')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
              >
                Show all academic years
              </button>
            </div>
          )}
          {filteredCourses.length > 0 ? (
            <div className="space-y-4">
              {filteredCourses.map(renderCourseItem)}
            </div>
          ) : (
            <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center">
              <p className="text-sm text-slate-500">No courses found for this filter.</p>
              <button
                onClick={() => { setSelectedCourseYearFilter('all'); setCourseSearchQuery(''); }}
                className="text-xs font-bold text-blue-600 hover:underline mt-2"
              >
                Reset filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Recommended for You */}
      <div className="pt-8 border-t border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">Recommended for You <span className="text-2xl">🔥</span></h2>
            <p className="text-sm text-slate-500 mt-1">Based on your branch and year</p>
          </div>
          <Link to="/browse" className="text-blue-600 text-sm font-bold flex items-center gap-1 hover:underline">View All <ArrowRight className="w-4 h-4" /></Link>
        </div>
        
        {(() => {
          const recommendedCourses = allCoursesState.filter(c => !user.purchasedCourseIds?.includes(c.id) && !isCollegeFreeItem(c)).slice(0, 4);
          if (recommendedCourses.length === 0) {
            return (
              <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-10 flex flex-col items-center justify-center text-center">
                <BookOpen className="w-10 h-10 text-slate-300 mb-3" />
                <h3 className="text-sm font-bold text-slate-700 mb-1">You're all caught up!</h3>
                <p className="text-sm text-slate-500 max-w-sm">You have enrolled in all recommended courses for your branch and year. Browse the catalog for more topics.</p>
              </div>
            );
          }
          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {recommendedCourses.map((c) => (
                <div key={c.id} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex flex-col group">
                  <div className="aspect-video bg-slate-900 relative">
                    {c.thumbnailUrl && <img src={c.thumbnailUrl} alt={c.title} className="w-full h-full object-contain opacity-90 group-hover:opacity-100 transition-opacity" />}
                    <div className="absolute top-3 left-3 bg-white/20 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded">
                      {getSubjectBadge(c.subjectId)}
                    </div>
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="font-bold text-slate-900 mb-3 line-clamp-2 leading-snug">{c.title}</h3>
                    {(() => {
                      const recLectures = c.modules?.reduce((acc: number, m: any) => acc + (m.videos?.length || (m.videoUrl ? 1 : 0)), 0) || (c.modules?.length ?? 0);
                      const recNotes = c.modules?.reduce((acc: number, m: any) => acc + (m.resources?.length || 0) + (m.videos?.reduce((vacc: number, v: any) => vacc + (v.resources?.length || 0), 0) || 0), 0) || 0;
                      return (
                        <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                          <span className="flex items-center gap-1"><Video className="w-3.5 h-3.5" /> {recLectures} {recLectures === 1 ? 'Lecture' : 'Lectures'}</span>
                          {recNotes > 0 && <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> {recNotes} {recNotes === 1 ? 'Note' : 'Notes'}</span>}
                        </div>
                      );
                    })()}
                    <div className="mt-auto flex items-center justify-between">
                      <span className="font-bold text-slate-900">₹{c.price}</span>
                      <Link to={`/course/${c.id}`} className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors flex items-center gap-1">
                        View Course <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* Bottom Banner */}
      <div className="mt-8 bg-purple-50 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 border border-purple-100 relative overflow-hidden">
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shrink-0 shadow-sm text-purple-600">
            <GraduationCap className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 mb-1">Explore More Courses</h3>
            <p className="text-slate-600 text-sm">Discover high quality courses for all subjects from expert teachers.</p>
          </div>
        </div>
        <div className="relative z-10 shrink-0">
          <Link to="/browse" className="bg-blue-600 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-md">
            Browse Courses <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="absolute right-0 bottom-0 pointer-events-none opacity-20 hidden md:block">
          <BookOpen className="w-48 h-48 text-purple-400 transform translate-x-12 translate-y-12" />
        </div>
      </div>
    </div>
  );
};

export default CoursesTab;
