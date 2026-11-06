import React from 'react';
import { Link } from 'react-router-dom';
import { Course, Note } from '../../../types';
import {
  Coins, BookOpen, FileText, Radio, ArrowRight, ChevronRight,
  Video, CheckCircle2, GraduationCap, Play, Calendar, Zap, Compass, Brain, Wrench
} from 'lucide-react';
import { StudentProgressItem } from '../../../hooks/useStudentDashboardData';

export interface OverviewTabProps {
  courses: Course[];
  notes: Note[];
  liveClasses: any[];
  credits: number;
  isUnlimited: boolean;
  studentProgressMap: Record<string, StudentProgressItem>;
  getSubjectBadge: (id: string) => string;
  setActiveTab: (tab: any) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  courses,
  notes,
  liveClasses,
  credits,
  isUnlimited,
  studentProgressMap,
  getSubjectBadge,
  setActiveTab
}) => {
  return (
    <div className="space-y-6">
      {/* Floating Get Credits Button (aligned to right, above grid) */}
      <div className="flex justify-end mt-[-10px] mb-2 hidden md:flex">
        <button
          onClick={() => setActiveTab('billing')}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold shadow-xs transition-colors text-xs sm:text-sm"
        >
          <Coins className="w-4 h-4 text-amber-300" /> Get Practice Credits
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
        <div
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer flex flex-col justify-between"
          onClick={() => setActiveTab('courses')}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Enrolled Courses</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><BookOpen className="w-4 h-4" /></div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-3xl font-extrabold text-slate-900">{courses.length}</h3>
            <span className="text-xs font-semibold text-blue-600 flex items-center gap-0.5">
              View courses <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        <div
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer flex flex-col justify-between"
          onClick={() => setActiveTab('notes')}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Unlocked Notes</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><FileText className="w-4 h-4" /></div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-3xl font-extrabold text-slate-900">{notes.length}</h3>
            <span className="text-xs font-semibold text-indigo-600 flex items-center gap-0.5">
              Study library <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        <div
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-rose-300 transition-all cursor-pointer flex flex-col justify-between"
          onClick={() => setActiveTab('live')}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Live Classes</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl"><Radio className="w-4 h-4" /></div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-3xl font-extrabold text-slate-900">{liveClasses.length}</h3>
              {liveClasses.length > 0 && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>}
            </div>
            <span className="text-xs font-semibold text-rose-600 flex items-center gap-0.5">
              Live schedule <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        <div
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-amber-300 transition-all cursor-pointer flex flex-col justify-between"
          onClick={() => setActiveTab('billing')}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Practice Credits</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><Coins className="w-4 h-4" /></div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-3xl font-extrabold text-slate-900">{isUnlimited ? '∞' : credits}</h3>
            <span className="text-xs font-semibold text-amber-600 flex items-center gap-0.5">
              Manage wallet <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* Middle Section: Continue Learning & Keep Growing */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" /> Continue Learning
            </h3>
            <button onClick={() => setActiveTab('courses')} className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1">
              View All <ChevronRight className="w-3.5 h-3.5"/>
            </button>
          </div>
          {courses.length > 0 ? (
            <div className="flex-1 flex flex-col justify-center">
              {courses.slice(0, 1).map(c => {
                const totalLectures = c.modules?.reduce((acc: number, m: any) => acc + (m.videos?.length || (m.videoUrl ? 1 : 0)), 0) || (c.modules?.length ?? 0);
                return (
                  <div key={c.id} className="flex flex-col md:flex-row items-center gap-5 p-4 bg-slate-50 rounded-xl border border-slate-200/60">
                    <div className="w-full md:w-44 aspect-video bg-slate-900 rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                      {c.thumbnailUrl ? (
                        <img src={c.thumbnailUrl} alt={c.title} className="w-full h-full object-contain" />
                      ) : (
                        <Video className="w-8 h-8 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 w-full">
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 uppercase tracking-wide">
                        {getSubjectBadge(c.subjectId)}
                      </span>
                      <h4 className="font-bold text-slate-900 text-base mt-1.5 mb-1 line-clamp-1">{c.title}</h4>
                      <p className="text-xs text-slate-500 mb-3">
                        {c.modules?.length || 0} Modules • {totalLectures} Video Lectures
                      </p>
                      {(() => {
                        const prog = studentProgressMap[c.id];
                        const completedCount = prog?.completedCount || 0;
                        const pct = totalLectures > 0 ? Math.round((completedCount / totalLectures) * 100) : 0;
                        return (
                          <div className="flex items-center gap-3 w-full">
                            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
                            </div>
                            <span className="text-xs font-semibold text-slate-700">{pct}% ({completedCount}/{totalLectures})</span>
                          </div>
                        );
                      })()}
                    </div>
                    <Link to={`/course/${c.id}`} className="w-full md:w-auto shrink-0 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-2xs">
                      Resume <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200 p-8 text-center">
              <BookOpen className="w-8 h-8 text-slate-400 mb-2" />
              <p className="font-medium text-slate-700">No courses enrolled yet.</p>
              <p className="text-slate-400 text-[11px] mt-0.5">Explore high-weightage SPPU courses and study packages.</p>
              <Link to="/browse" className="text-blue-600 font-bold text-xs mt-3 inline-flex items-center gap-1 hover:underline">
                Browse Catalog <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>

        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 text-white shadow-2xs relative overflow-hidden flex flex-col justify-center">
          <div className="absolute right-0 bottom-0 pointer-events-none opacity-10">
            <GraduationCap className="w-36 h-36 text-blue-400 transform translate-x-6 translate-y-6" />
          </div>
          <div className="relative z-10 flex-1 flex flex-col justify-center">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 mb-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" /> Exam Preparation
            </div>
            <h3 className="text-xl font-bold text-white mb-2 leading-tight">
              Target SGPA 9+ This Semester
            </h3>
            <p className="text-slate-400 text-xs mb-5 pr-4 leading-relaxed">
              Solve previous year exam papers and review chapter question predictions verified by university faculty.
            </p>
            <div>
              <Link to="/exam-intelligence" className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors shadow-xs">
                Open Exam Intelligence <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section 1: Upcoming Live & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Video className="w-5 h-5 text-emerald-500" /> Upcoming Live Classes
            </h3>
            <button onClick={() => setActiveTab('live')} className="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1">
              View All <ChevronRight className="w-4 h-4"/>
            </button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-slate-100 p-8 text-center min-h-[220px]">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 mb-4 border border-blue-100 shadow-sm relative">
              <Play className="w-8 h-8 fill-current" />
              <div className="absolute -top-2 -right-2 w-5 h-5 bg-white rounded-full flex items-center justify-center border border-slate-200">
                <Calendar className="w-3 h-3 text-slate-400"/>
              </div>
            </div>
            <h4 className="font-bold text-slate-800 mb-1">No upcoming live classes.</h4>
            <p className="text-sm text-slate-500 mb-6">Stay tuned for new live sessions!</p>
            <button onClick={() => setActiveTab('live')} className="bg-blue-50 text-blue-600 px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors flex items-center gap-2 border border-blue-100">
              Browse Live Classes <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
            <Zap className="w-5 h-5 text-blue-500" /> Quick Actions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button onClick={() => setActiveTab('courses')} className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors border border-slate-100 group">
              <div className="flex items-center gap-3 text-left">
                <div className="p-2.5 bg-blue-100 rounded-lg text-blue-600"><BookOpen className="w-5 h-5" /></div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">My Courses</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Continue learning</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
            </button>
            <button onClick={() => setActiveTab('notes')} className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors border border-slate-100 group">
              <div className="flex items-center gap-3 text-left">
                <div className="p-2.5 bg-purple-100 rounded-lg text-purple-600"><FileText className="w-5 h-5" /></div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">My Notes</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">View purchased notes</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
            </button>
            <button onClick={() => setActiveTab('live')} className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors border border-slate-100 group">
              <div className="flex items-center gap-3 text-left">
                <div className="p-2.5 bg-emerald-100 rounded-lg text-emerald-600"><Video className="w-5 h-5" /></div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Live Classes</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Join upcoming sessions</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
            </button>
            <button onClick={() => setActiveTab('billing')} className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors border border-slate-100 group">
              <div className="flex items-center gap-3 text-left">
                <div className="p-2.5 bg-orange-100 rounded-lg text-orange-500"><Coins className="w-5 h-5" /></div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Credits & Plans</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Get more credits</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Section 2: Explore More */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
          <Compass className="w-5 h-5 text-blue-500" /> Explore More
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/exam-intelligence" className="flex items-center justify-between p-5 bg-slate-50 hover:bg-purple-50 rounded-xl transition-colors border border-slate-100 hover:border-purple-200 group">
            <div className="flex items-center gap-4 text-left">
              <div className="p-3 bg-purple-100 rounded-lg text-purple-600"><Brain className="w-5 h-5" /></div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Exam Prep</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Syllabus, PYQs, important topics</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-colors" />
          </Link>
          <Link to="/be-toolkit" className="flex items-center justify-between p-5 bg-slate-50 hover:bg-yellow-50 rounded-xl transition-colors border border-slate-100 hover:border-yellow-200 group">
            <div className="flex items-center gap-4 text-left">
              <div className="p-3 bg-yellow-100 rounded-lg text-yellow-600"><Wrench className="w-5 h-5" /></div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">BE Toolkit</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Useful tools for engineering students</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-yellow-600 transition-colors" />
          </Link>
          <Link to="/notes" className="flex items-center justify-between p-5 bg-slate-50 hover:bg-blue-50 rounded-xl transition-colors border border-slate-100 hover:border-blue-200 group">
            <div className="flex items-center gap-4 text-left">
              <div className="p-3 bg-blue-100 rounded-lg text-blue-600"><FileText className="w-5 h-5" /></div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Browse Notes</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Explore subject wise notes</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
