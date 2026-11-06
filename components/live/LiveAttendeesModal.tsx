import React, { useState } from 'react';
import { Users, X, Shield, Search, GraduationCap } from 'lucide-react';

export interface Attendee {
  id: string;
  name: string;
}

export interface LiveAttendeesModalProps {
  isOpen: boolean;
  onClose: () => void;
  instructorName?: string;
  currentUserId?: string;
  currentUserName?: string;
  isInstructor?: boolean;
  attendees: Attendee[];
}

export const LiveAttendeesModal: React.FC<LiveAttendeesModalProps> = ({
  isOpen,
  onClose,
  instructorName = 'Course Instructor',
  currentUserId,
  currentUserName = 'You',
  isInstructor = false,
  attendees = []
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const totalConnected = attendees.length + 1; // +1 for the current viewer

  const filteredAttendees = attendees.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div 
        className="w-full max-w-md bg-[#131A3F] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-[#0B0F19] border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-[#1F81FC] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Classroom Roster
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {totalConnected} Online
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Live participants connected right now</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-3 bg-[#0B0F19]/50 border-b border-slate-800 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search participants by name..."
              className="w-full bg-[#131A3F] border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 outline-none focus:border-[#1F81FC]"
            />
          </div>
        </div>

        {/* Attendees List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-slate-800/60">
          {/* 1. Host / Instructor */}
          <div className="pt-2 first:pt-0 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-[#1F81FC] flex items-center justify-center text-xs font-bold text-white shadow-sm shrink-0">
                {(instructorName[0] || 'I').toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white truncate max-w-[170px]">
                    {instructorName}
                  </span>
                  {isInstructor && (
                    <span className="text-[10px] text-blue-400 font-semibold">(You)</span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-[#1F81FC]" />
                  <span>Instructor & Host</span>
                </div>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1F81FC]/15 text-[#1F81FC] border border-[#1F81FC]/30 shrink-0">
              HOST
            </span>
          </div>

          {/* 2. Current User (if not the instructor) */}
          {!isInstructor && (
            <div className="pt-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-xs font-bold text-emerald-300 shadow-sm shrink-0">
                  {(currentUserName[0] || 'U').toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white truncate max-w-[170px]">
                      {currentUserName}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-semibold">(You)</span>
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <GraduationCap className="w-3 h-3 text-emerald-400" />
                    <span>Enrolled Student</span>
                  </div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                ONLINE
              </span>
            </div>
          )}

          {/* 3. Peer Attendees */}
          {filteredAttendees.length > 0 ? (
            filteredAttendees.map((attendee) => (
              <div key={attendee.id} className="pt-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-medium text-slate-300 shrink-0">
                    {(attendee.name[0] || 'S').toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-slate-200 truncate block max-w-[190px]">
                      {attendee.name}
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <GraduationCap className="w-3 h-3 text-slate-400" />
                      <span>Student</span>
                    </span>
                  </div>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" title="Connected" />
              </div>
            ))
          ) : (
            attendees.length === 0 && (
              <div className="text-center py-6 text-slate-400 text-xs">
                {isInstructor 
                  ? 'No students have connected yet. Invite links are active.'
                  : 'You are the first student in the classroom!'}
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-[#0B0F19] border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
          <span>End-to-End Encrypted WebRTC</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-slate-800 text-slate-200 hover:text-white transition-colors text-xs font-semibold"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveAttendeesModal;
