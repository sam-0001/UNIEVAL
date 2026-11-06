import React from 'react';
import {
  Calendar, Radio, BookOpen, Play, Clock, Video, Loader2, ArrowRight
} from 'lucide-react';

export interface LiveClassesTabProps {
  liveClasses: any[];
  liveTabFilter: 'upcoming' | 'live' | 'my-classes' | 'recordings';
  setLiveTabFilter: (filter: 'upcoming' | 'live' | 'my-classes' | 'recordings') => void;
  handleOpenRecording: (lc: any) => void;
  formatSubjectLabel: (rawSubject?: string, rawCourse?: string) => string;
  navigate: (path: string) => void;
}

export const LiveClassesTab: React.FC<LiveClassesTabProps> = ({
  liveClasses,
  liveTabFilter,
  setLiveTabFilter,
  handleOpenRecording,
  formatSubjectLabel,
  navigate
}) => {
  const upcomingClasses = liveClasses.filter((lc: any) => lc.status === 'scheduled');
  const activeLiveClasses = liveClasses.filter((lc: any) => lc.status === 'live' || lc.status === 'in-progress');
  const recordedClasses = liveClasses.filter((lc: any) => lc.status === 'completed' || lc.recordingUrl);

  const currentFilteredClasses = (() => {
    if (liveTabFilter === 'upcoming') return upcomingClasses;
    if (liveTabFilter === 'live') return activeLiveClasses;
    if (liveTabFilter === 'recordings') return recordedClasses;
    return liveClasses; // 'my-classes'
  })();

  return (
    <div className="space-y-8 relative z-10">
      {/* Filter Tabs */}
      <div className="flex items-center gap-2.5 sm:gap-3 overflow-x-auto pb-2 md:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar">
        <button 
          onClick={() => setLiveTabFilter('upcoming')} 
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors border ${
            liveTabFilter === 'upcoming' 
              ? 'bg-blue-600 border-blue-600 text-white shadow-sm' 
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Calendar className="w-4 h-4" /> 
          <span>Upcoming</span> 
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
            liveTabFilter === 'upcoming' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {upcomingClasses.length}
          </span>
        </button>

        <button 
          onClick={() => setLiveTabFilter('live')} 
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors border ${
            liveTabFilter === 'live' 
              ? 'bg-red-600 border-red-600 text-white shadow-sm' 
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Radio className={`w-4 h-4 ${liveTabFilter === 'live' ? 'text-white' : 'text-red-500 animate-pulse'}`} /> 
          <span>Live Now</span> 
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
            liveTabFilter === 'live' ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'
          }`}>
            {activeLiveClasses.length}
          </span>
        </button>

        <button 
          onClick={() => setLiveTabFilter('my-classes')} 
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors border ${
            liveTabFilter === 'my-classes' 
              ? 'bg-blue-600 border-blue-600 text-white shadow-sm' 
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <BookOpen className="w-4 h-4" /> 
          <span>My Classes</span> 
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
            liveTabFilter === 'my-classes' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {liveClasses.length}
          </span>
        </button>

        <button 
          onClick={() => setLiveTabFilter('recordings')} 
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors border ${
            liveTabFilter === 'recordings' 
              ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' 
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Play className={`w-4 h-4 ${liveTabFilter === 'recordings' ? 'fill-current' : ''}`} /> 
          <span>Recordings</span> 
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
            liveTabFilter === 'recordings' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {recordedClasses.length}
          </span>
        </button>
      </div>

      {/* Dynamic Live Classes / Recordings List Section */}
      <div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              liveTabFilter === 'recordings' 
                ? 'bg-indigo-50 text-indigo-600' 
                : liveTabFilter === 'live' 
                ? 'bg-red-50 text-red-600' 
                : 'bg-blue-50 text-blue-600'
            }`}>
              {liveTabFilter === 'recordings' ? (
                <Play className="w-5 h-5 fill-current" />
              ) : liveTabFilter === 'live' ? (
                <Radio className="w-5 h-5" />
              ) : (
                <Calendar className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                {liveTabFilter === 'recordings' 
                  ? 'Class Recordings & Replays' 
                  : liveTabFilter === 'live' 
                  ? 'Classes Happening Live Now' 
                  : liveTabFilter === 'my-classes' 
                  ? 'All Enrolled Course Sessions' 
                  : 'Upcoming Live Classes'}
              </h3>
              <p className="text-sm text-slate-500">
                {liveTabFilter === 'recordings' 
                  ? 'Replay completed lectures and interactive recordings anytime' 
                  : liveTabFilter === 'live' 
                  ? 'Join directly to participate with audio, video, and live chat' 
                  : liveTabFilter === 'my-classes' 
                  ? 'Full history of upcoming schedules and past recordings' 
                  : 'Your scheduled live classes and upcoming live broadcasts'}
              </p>
            </div>
          </div>
        </div>
        
        {currentFilteredClasses.length === 0 ? (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
              liveTabFilter === 'recordings' 
                ? 'bg-indigo-100 text-indigo-600' 
                : liveTabFilter === 'live' 
                ? 'bg-red-100 text-red-600' 
                : 'bg-blue-100 text-blue-600'
            }`}>
              {liveTabFilter === 'recordings' ? (
                <Play className="w-8 h-8 fill-current" />
              ) : liveTabFilter === 'live' ? (
                <Radio className="w-8 h-8" />
              ) : (
                <Calendar className="w-8 h-8" />
              )}
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              {liveTabFilter === 'recordings' 
                ? 'No recordings available yet' 
                : liveTabFilter === 'live' 
                ? 'No classes live right now' 
                : 'No live classes found'}
            </h3>
            <p className="text-slate-500 max-w-sm">
              {liveTabFilter === 'recordings' 
                ? 'Recordings will automatically become available once live classes conclude.' 
                : liveTabFilter === 'live' 
                ? 'Check the Upcoming tab to see scheduled lecture dates and times.' 
                : 'Check back later for new class sessions scheduled by instructors.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {currentFilteredClasses.map((lc: any) => {
              const dateObj = new Date(lc.scheduledStartTime);
              const isToday = new Date().toDateString() === dateObj.toDateString();
              const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              const dayStr = isToday ? 'Today' : dateObj.toLocaleDateString('en-US', { weekday: 'short' });
              const timeStr = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
              const isLive = lc.status === 'live' || lc.status === 'in-progress';
              const isCompleted = lc.status === 'completed';
              const hasRealRecording = Boolean(
                lc.recordingUrl &&
                lc.recordingUrl.trim().length > 0 &&
                lc.recordingUrl !== lc.dailyRoomUrl &&
                !lc.recordingUrl.endsWith(lc.dailyRoomName || '')
              );
              
              return (
                <div key={lc.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-col md:flex-row items-start md:items-center gap-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4 w-full md:w-48 shrink-0">
                    <div className={`px-4 py-2 rounded-lg text-center border ${
                      isLive 
                        ? 'bg-red-50 text-red-600 border-red-200' 
                        : isCompleted 
                        ? 'bg-indigo-50 text-indigo-600 border-indigo-100' 
                        : isToday 
                        ? 'bg-blue-50 text-blue-600 border-blue-100' 
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}>
                      <div className="text-sm font-bold">{dateStr}</div>
                      <div className="text-xs font-medium">{dayStr}</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">{timeStr}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        {isLive ? (
                          <span className="text-red-600 font-semibold flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" />
                            Broadcasting
                          </span>
                        ) : isCompleted ? (
                          <span className="text-indigo-600 font-medium">Recorded Session</span>
                        ) : (
                          <><Clock className="w-3 h-3" /> Scheduled</>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-1 flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl shrink-0 flex flex-col items-center justify-center shadow-sm border ${
                      isLive 
                        ? "bg-rose-50 text-rose-600 border-rose-200" 
                        : isCompleted 
                        ? "bg-indigo-50 text-indigo-600 border-indigo-200" 
                        : "bg-blue-50 text-blue-600 border-blue-200"
                    }`}>
                      {isLive ? (
                        <>
                          <Radio className="w-5 h-5 animate-pulse" />
                          <span className="text-[9px] font-bold uppercase tracking-wider mt-0.5">Live</span>
                        </>
                      ) : isCompleted ? (
                        <>
                          <Play className="w-5 h-5 fill-current" />
                          <span className="text-[9px] font-bold uppercase tracking-wider mt-0.5">Replay</span>
                        </>
                      ) : (
                        <>
                          <Video className="w-5 h-5" />
                          <span className="text-[9px] font-bold uppercase tracking-wider mt-0.5">Class</span>
                        </>
                      )}
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
                      <p className="text-xs text-slate-500">
                        {isCompleted 
                          ? (hasRealRecording ? 'Class concluded • Interactive recording replay available' : 'Class concluded • Recording archived') 
                          : isLive 
                          ? 'Interactive broadcast in progress • Join with audio & chat' 
                          : 'Scheduled live lecture session'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
                    {isCompleted || liveTabFilter === 'recordings' ? (
                      hasRealRecording || lc.recordingStatus === 'ready' ? (
                        <button 
                          onClick={() => handleOpenRecording(lc)} 
                          className="flex-1 md:flex-none bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                          title="Watch interactive recording replay"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Watch Recording</span>
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleOpenRecording(lc)} 
                          className="flex-1 md:flex-none bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700/60 px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all"
                          title="Live stream ended • Video recording is currently processing"
                        >
                          <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                          <span>Processing Recording</span>
                        </button>
                      )
                    ) : isLive ? (
                      <button 
                        onClick={() => navigate(`/live-class/${lc.id}`)} 
                        className="flex-1 md:flex-none bg-gradient-to-r from-red-600 to-rose-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:opacity-95 transition-all shadow-md shadow-red-500/20 flex items-center justify-center gap-2 active:scale-95 animate-pulse"
                      >
                        <Radio className="w-4 h-4" />
                        <span>Join Live Now</span>
                      </button>
                    ) : (
                      <button 
                        onClick={() => navigate(`/live-class/${lc.id}`)} 
                        className="flex-1 md:flex-none bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center gap-2"
                      >
                        Join Class <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveClassesTab;
