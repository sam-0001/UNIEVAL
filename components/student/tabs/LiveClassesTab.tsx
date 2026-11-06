import React from 'react';
import {
  Calendar, Radio, BookOpen, Play, Clock, Video, Loader2, ArrowRight, ExternalLink
} from 'lucide-react';
import LiveCountdown from '../../live/LiveCountdown';
import { getGoogleCalendarUrl } from '../../live/CalendarUtils';

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
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all border ${
            liveTabFilter === 'upcoming' 
              ? 'bg-[#1F81FC] border-[#1F81FC] text-white shadow-md shadow-blue-500/20' 
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Calendar className="w-4 h-4" /> 
          <span>Upcoming</span> 
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            liveTabFilter === 'upcoming' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {upcomingClasses.length}
          </span>
        </button>

        <button 
          onClick={() => setLiveTabFilter('live')} 
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all border ${
            liveTabFilter === 'live' 
              ? 'bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-500/20 animate-pulse' 
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Radio className={`w-4 h-4 ${liveTabFilter === 'live' ? 'text-white' : 'text-rose-500 animate-pulse'}`} /> 
          <span>Live Now</span> 
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            liveTabFilter === 'live' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-600'
          }`}>
            {activeLiveClasses.length}
          </span>
        </button>

        <button 
          onClick={() => setLiveTabFilter('my-classes')} 
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all border ${
            liveTabFilter === 'my-classes' 
              ? 'bg-[#131A3F] border-[#131A3F] text-white shadow-md' 
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <BookOpen className="w-4 h-4" /> 
          <span>All Classes</span> 
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            liveTabFilter === 'my-classes' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {liveClasses.length}
          </span>
        </button>

        <button 
          onClick={() => setLiveTabFilter('recordings')} 
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all border ${
            liveTabFilter === 'recordings' 
              ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20' 
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Play className={`w-4 h-4 ${liveTabFilter === 'recordings' ? 'fill-current' : ''}`} /> 
          <span>Recordings</span> 
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
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
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${
              liveTabFilter === 'recordings' 
                ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' 
                : liveTabFilter === 'live' 
                ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                : 'bg-blue-50 text-blue-600 border border-blue-100'
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
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                {liveTabFilter === 'recordings' 
                  ? 'Class Recordings & Lecture Replays' 
                  : liveTabFilter === 'live' 
                  ? 'Classes Happening Live Right Now' 
                  : liveTabFilter === 'my-classes' 
                  ? 'Complete Class Schedule & History' 
                  : 'Upcoming Live Lectures'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {liveTabFilter === 'recordings' 
                  ? 'Stream complete recordings of past sessions with video playback' 
                  : liveTabFilter === 'live' 
                  ? 'Interactive live stream in session • Join to participate in audio, chat, and notes' 
                  : liveTabFilter === 'my-classes' 
                  ? 'All scheduled and completed interactive lecture sessions' 
                  : 'Check upcoming dates, countdowns, and sync to your calendar'}
              </p>
            </div>
          </div>
        </div>
        
        {currentFilteredClasses.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${
              liveTabFilter === 'recordings' 
                ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' 
                : liveTabFilter === 'live' 
                ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                : 'bg-blue-50 text-blue-600 border border-blue-100'
            }`}>
              {liveTabFilter === 'recordings' ? (
                <Play className="w-8 h-8 fill-current" />
              ) : liveTabFilter === 'live' ? (
                <Radio className="w-8 h-8" />
              ) : (
                <Calendar className="w-8 h-8" />
              )}
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">
              {liveTabFilter === 'recordings' 
                ? 'No recordings available yet' 
                : liveTabFilter === 'live' 
                ? 'No classes broadcasting right now' 
                : 'No upcoming live classes scheduled'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
              {liveTabFilter === 'recordings' 
                ? 'Recordings will automatically become available to replay once live broadcasts conclude.' 
                : liveTabFilter === 'live' 
                ? 'Browse the Upcoming tab to view scheduled class times and set calendar reminders.' 
                : 'Check back later for newly scheduled live lectures from your course instructors.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {currentFilteredClasses.map((lc: any) => {
              const dateObj = new Date(lc.scheduledStartTime || lc.scheduledAt || Date.now());
              const isToday = new Date().toDateString() === dateObj.toDateString();
              const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              const dayStr = isToday ? 'Today' : dateObj.toLocaleDateString('en-US', { weekday: 'short' });
              const timeStr = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
              const isLive = lc.status === 'live' || lc.status === 'in-progress';
              const isCompleted = lc.status === 'completed';
              const isScheduled = lc.status === 'scheduled';
              const hasRealRecording = Boolean(
                lc.recordingUrl &&
                lc.recordingUrl.trim().length > 0 &&
                lc.recordingUrl !== lc.dailyRoomUrl &&
                !lc.recordingUrl.endsWith(lc.dailyRoomName || '')
              );

              const calEvent = {
                title: lc.title || 'UniEval Live Class',
                description: `Live session: ${lc.title}. Instructor: ${lc.teacherName || 'Faculty'}. Course: ${lc.course || 'UniEval'}.`,
                startTime: dateObj,
                location: `${window.location.origin}/live-class/${lc.id}`
              };
              
              return (
                <div 
                  key={lc.id} 
                  className={`bg-white rounded-2xl border p-5 flex flex-col md:flex-row items-start md:items-center gap-5 transition-all shadow-sm hover:shadow-md ${
                    isLive 
                      ? 'border-rose-400 ring-2 ring-rose-400/20 shadow-rose-500/10' 
                      : 'border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  {/* Date & Time Column */}
                  <div className="flex items-center gap-3.5 w-full md:w-52 shrink-0">
                    <div className={`px-4 py-2.5 rounded-xl text-center border shrink-0 min-w-[72px] ${
                      isLive 
                        ? 'bg-rose-50 text-rose-600 border-rose-200 shadow-sm' 
                        : isCompleted 
                        ? 'bg-indigo-50 text-indigo-600 border-indigo-100' 
                        : isToday 
                        ? 'bg-blue-50 text-[#1F81FC] border-blue-200' 
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}>
                      <div className="text-sm font-bold tracking-tight">{dateStr}</div>
                      <div className="text-[11px] font-semibold uppercase">{dayStr}</div>
                    </div>

                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900">{timeStr}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        {isLive ? (
                          <span className="text-rose-600 font-bold flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
                            Live Now
                          </span>
                        ) : isCompleted ? (
                          <span className="text-indigo-600 font-medium">Recorded</span>
                        ) : (
                          <span className="flex items-center gap-1 font-medium text-slate-500">
                            <Clock className="w-3 h-3 text-[#1F81FC]" />
                            <span>Scheduled</span>
                          </span>
                        )}
                      </div>

                      {/* Compact Countdown for scheduled classes */}
                      {isScheduled && (
                        <div className="mt-1">
                          <LiveCountdown targetTime={dateObj} compact={true} />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Title & Metadata */}
                  <div className="flex-1 flex items-start gap-4 min-w-0">
                    <div className={`w-12 h-12 rounded-xl shrink-0 flex flex-col items-center justify-center shadow-sm border ${
                      isLive 
                        ? "bg-rose-50 text-rose-600 border-rose-200" 
                        : isCompleted 
                        ? "bg-indigo-50 text-indigo-600 border-indigo-200" 
                        : "bg-blue-50 text-[#1F81FC] border-blue-200"
                    }`}>
                      {isLive ? (
                        <>
                          <Radio className="w-5 h-5 animate-pulse" />
                          <span className="text-[8px] font-extrabold uppercase tracking-wider mt-0.5">Live</span>
                        </>
                      ) : isCompleted ? (
                        <>
                          <Play className="w-5 h-5 fill-current" />
                          <span className="text-[8px] font-extrabold uppercase tracking-wider mt-0.5">Replay</span>
                        </>
                      ) : (
                        <>
                          <Video className="w-5 h-5" />
                          <span className="text-[8px] font-extrabold uppercase tracking-wider mt-0.5">Class</span>
                        </>
                      )}
                    </div>

                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 text-base mb-1 truncate leading-snug">
                        {lc.title}
                      </h4>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-1.5">
                        <span className="flex items-center gap-1.5 font-medium text-slate-700">
                          <div className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[9px] text-slate-700 font-bold">
                            {(lc.teacherName || 'Faculty')[0].toUpperCase()}
                          </div> 
                          <span>{lc.teacherName || 'Faculty'}</span>
                        </span>

                        <span className="inline-flex items-center px-2 py-0.5 rounded-full font-semibold text-[11px] bg-blue-50 text-blue-700 border border-blue-100">
                          {formatSubjectLabel(lc.subject, lc.course)}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 line-clamp-1">
                        {isCompleted 
                          ? (hasRealRecording ? 'Class concluded • Interactive recording replay available' : 'Class concluded • Recording archived') 
                          : isLive 
                          ? 'Interactive broadcast in progress • Join with audio & chat' 
                          : 'Scheduled live lecture session • Click to enter waiting room'}
                      </p>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full md:w-auto mt-2 md:mt-0 shrink-0">
                    {/* Add to Calendar button for scheduled classes */}
                    {isScheduled && (
                      <a
                        href={getGoogleCalendarUrl(calEvent)}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2.5 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                        title="Add to Google Calendar"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}

                    {isCompleted || liveTabFilter === 'recordings' ? (
                      hasRealRecording || lc.recordingStatus === 'ready' ? (
                        <button 
                          onClick={() => handleOpenRecording(lc)} 
                          className="flex-1 md:flex-none bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                          title="Watch interactive recording replay"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Watch Recording</span>
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleOpenRecording(lc)} 
                          className="flex-1 md:flex-none bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 border border-amber-300 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all"
                          title="Live stream ended • Video recording is currently processing"
                        >
                          <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                          <span>Processing Recording</span>
                        </button>
                      )
                    ) : isLive ? (
                      <button 
                        onClick={() => navigate(`/live-class/${lc.id}`)} 
                        className="flex-1 md:flex-none bg-gradient-to-r from-rose-600 to-red-600 text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold hover:opacity-95 transition-all shadow-md shadow-red-500/25 flex items-center justify-center gap-2 active:scale-95 animate-pulse"
                      >
                        <Radio className="w-4 h-4" />
                        <span>Join Live Now</span>
                      </button>
                    ) : (
                      <button 
                        onClick={() => navigate(`/live-class/${lc.id}`)} 
                        className="flex-1 md:flex-none bg-gradient-to-r from-[#1F81FC] to-[#7F26FE] text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold hover:opacity-95 transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 active:scale-95"
                      >
                        <span>Enter Waiting Room</span>
                        <ArrowRight className="w-4 h-4" />
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
