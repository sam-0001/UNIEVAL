import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Course, Note, UserRole, PurchaseRecord, Subject } from '../types';
import { io } from 'socket.io-client';

export interface StudentProgressItem {
  completedLectures: string[];
  completed: boolean;
  lastWatchedLectureId: string | null;
  completedCount: number;
}

export function useStudentDashboardData(activeTab: string) {
  const { user } = useAuth();

  const [allCoursesState, setAllCoursesState] = useState<Course[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [allNotesState, setAllNotesState] = useState<Note[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [liveClasses, setLiveClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [myPurchases, setMyPurchases] = useState<Record<string, PurchaseRecord>>({});
  const [loading, setLoading] = useState(true);

  // Playback & recording state
  const [activeRecording, setActiveRecording] = useState<any | null>(null);
  const [playbackStreamUrl, setPlaybackStreamUrl] = useState<string | null>(null);
  const [playbackLoading, setPlaybackLoading] = useState(false);
  const [playbackProcessing, setPlaybackProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [playbackError, setPlaybackError] = useState('');
  const [studentProgressMap, setStudentProgressMap] = useState<Record<string, StudentProgressItem>>({});

  const isCollegeFreeItem = useCallback((item: { collegeConfig?: { name?: string; emailDomain?: string } | null }) => {
    if (!user || !user.email || !item?.collegeConfig?.emailDomain) return false;
    const domain = item.collegeConfig.emailDomain.trim();
    if (!domain || domain.length < 3) return false;
    return user.email.toLowerCase().endsWith(domain.toLowerCase());
  }, [user]);

  const handleOpenRecording = async (lc: any) => {
    setActiveRecording(lc);
    setPlaybackLoading(true);
    setPlaybackError('');
    setPlaybackProcessing(false);
    setProcessingMessage('');
    setPlaybackStreamUrl(null);

    // If direct MP4 / external video URL
    if (lc.recordingUrl && !lc.recordingUrl.includes('webinar.gg') && !lc.recordingUrl.endsWith(lc.dailyRoomName || '')) {
      setPlaybackStreamUrl(lc.recordingUrl);
      setPlaybackLoading(false);
      return;
    }

    try {
      const res = await api.getLiveClassPlayback(lc.id);
      if (res.status === 'processing') {
        setPlaybackProcessing(true);
        setProcessingMessage(res.message || 'The live session has ended and the recording is currently being processed. It will be available here in a few minutes — please check back shortly.');
      } else if (res.playbackUrl) {
        setPlaybackStreamUrl(res.playbackUrl);
        setLiveClasses(prev => prev.map(item => item.id === lc.id ? { ...item, recordingUrl: res.playbackUrl, recordingStatus: 'ready' } : item));
      } else {
        throw new Error('Playback URL unavailable');
      }
    } catch (err: any) {
      console.error('Error opening recording:', err);
      const fallback = lc.recordingUrl;
      if (fallback && !fallback.endsWith(lc.dailyRoomName || '')) {
        setPlaybackStreamUrl(fallback);
      } else {
        setPlaybackError(err.message || 'Failed to initialize secure recording replay session');
      }
    } finally {
      setPlaybackLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === UserRole.STUDENT) {
      const fetchPurchases = async () => {
        try {
          // 1. Fetch core catalog & subjects first so dashboard renders instantly in ~200ms
          const [allCourses, allNotes, allSubjects] = await Promise.all([
            api.getCourses(), 
            api.getNotes(), 
            api.getSubjects(),
          ]);

          setAllCoursesState(allCourses);
          setCourses(allCourses.filter(c => user.purchasedCourseIds?.includes(c.id) || isCollegeFreeItem(c)));
          setAllNotesState(allNotes);
          setNotes(allNotes.filter(n => user.purchasedNoteIds?.includes(n.id) || isCollegeFreeItem(n)));
          setSubjects(allSubjects || []);
          setLoading(false); // Dashboard unlocks immediately without waiting for secondary APIs!

          // 2. Fetch purchases, live schedule, and course progress in parallel in background
          Promise.all([
            api.getMyPurchases().catch(() => []),
            api.getMyLiveClassSchedule().catch(() => ({ liveClasses: [] })),
            api.getAllStudentProgress().catch(() => ({ progress: {} }))
          ]).then(([purchasesList, scheduleRes, progressRes]) => {
            if (Array.isArray(purchasesList)) {
              const pMap: Record<string, PurchaseRecord> = {};
              purchasesList.forEach(p => { pMap[p.productId] = p; });
              setMyPurchases(pMap);
            }
            if (scheduleRes && Array.isArray(scheduleRes.liveClasses)) {
              setLiveClasses(scheduleRes.liveClasses);
            }
            if (progressRes && (progressRes as any).progress) {
              setStudentProgressMap((progressRes as any).progress);
            }
          }).catch(err => {
            console.warn('[Dashboard] Background metadata fetch:', err);
          });
        } catch (error) {
          console.error('Failed to fetch dashboard content', error);
          setLoading(false);
        }
      };
      fetchPurchases();
    } else {
      setLoading(false);
    }
  }, [user, isCollegeFreeItem]);

  const refreshLiveSchedule = useCallback(async () => {
    try {
      const scheduleRes = await api.getMyLiveClassSchedule();
      if (Array.isArray(scheduleRes?.liveClasses)) {
        setLiveClasses(scheduleRes.liveClasses);
      }
    } catch {
      // Ignore background refresh errors
    }
  }, []);

  // Real-time synchronization for live classes
  useEffect(() => {
    if (!user || user.role !== UserRole.STUDENT) return;

    let socket: any = null;
    try {
      socket = io(window.location.origin, {
        transports: ['polling', 'websocket'],
        reconnectionAttempts: 3,
        timeout: 5000,
      });

      socket.on('connect_error', () => {});
      socket.on('live-class-status-changed', () => { refreshLiveSchedule(); });
      socket.on('live-class-ended', () => { refreshLiveSchedule(); });
      socket.on('class-ended', () => { refreshLiveSchedule(); });
    } catch {
      // Fallback to polling
    }

    const pollInterval = setInterval(() => {
      refreshLiveSchedule();
    }, activeTab === 'live' ? 4000 : 15000);

    return () => {
      if (socket) {
        socket.disconnect();
      }
      clearInterval(pollInterval);
    };
  }, [user, activeTab, refreshLiveSchedule]);

  useEffect(() => {
    if (activeTab === 'live') {
      refreshLiveSchedule();
    }
  }, [activeTab, refreshLiveSchedule]);

  const getItemYear = useCallback((subjectId: string): number => {
    const subject = subjects.find(s => s.id === subjectId);
    if (subject?.year && typeof subject.year === 'number') {
      return subject.year;
    }
    const lower = (subjectId || '').toLowerCase();
    if (lower.startsWith('fe') || lower.includes('fe-') || lower.includes('first')) return 1;
    if (lower.startsWith('se') || lower.includes('se-') || lower.includes('second')) return 2;
    if (lower.startsWith('te') || lower.includes('te-') || lower.includes('third')) return 3;
    if (lower.startsWith('be') || lower.includes('be-') || lower.includes('final')) return 4;
    return 1;
  }, [subjects]);

  const notesByYear = useMemo(() => {
    const groups: Record<number, Note[]> = { 1: [], 2: [], 3: [], 4: [] };
    for (const n of notes) {
      const yr = getItemYear(n.subjectId);
      if (!groups[yr]) groups[yr] = [];
      groups[yr].push(n);
    }
    return groups;
  }, [notes, getItemYear]);

  const studentNoteYears = useMemo(() => {
    const years = new Set<number>();
    for (const n of notes) {
      years.add(getItemYear(n.subjectId));
    }
    return Array.from(years).sort((a, b) => a - b);
  }, [notes, getItemYear]);

  const coursesByYear = useMemo(() => {
    const groups: Record<number, Course[]> = { 1: [], 2: [], 3: [], 4: [] };
    for (const c of courses) {
      const yr = getItemYear(c.subjectId);
      if (!groups[yr]) groups[yr] = [];
      groups[yr].push(c);
    }
    return groups;
  }, [courses, getItemYear]);

  const studentCourseYears = useMemo(() => {
    const years = new Set<number>();
    for (const c of courses) {
      years.add(getItemYear(c.subjectId));
    }
    return Array.from(years).sort((a, b) => a - b);
  }, [courses, getItemYear]);

  const getSubjectBadge = (subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return subjectId.replace(/[0-9]/g, '').toUpperCase();
    return subject.year === 1 ? 'FE' : subject.year === 2 ? 'SE' : subject.year === 3 ? 'TE' : 'BE';
  };

  const getSubjectName = (subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject ? subject.name : '';
  };

  const formatSubjectLabel = (rawSubject?: string, rawCourse?: string) => {
    const sFound = subjects.find(s => s.id === rawSubject || (rawSubject && s.name.toLowerCase() === rawSubject.toLowerCase()));
    if (sFound) return sFound.name;
    const cFound = subjects.find(s => s.id === rawCourse || (rawCourse && s.name.toLowerCase() === rawCourse.toLowerCase()));
    if (cFound) return cFound.name;

    const parseText = (t: string) => {
      if (/^fe[-_ ]?1$/i.test(t)) return 'First Year (FE) • Sem 1';
      if (/^fe[-_ ]?2$/i.test(t)) return 'First Year (FE) • Sem 2';
      if (/^se[-_ ]?1$/i.test(t)) return 'Second Year (SE) • Sem 1';
      if (/^se[-_ ]?2$/i.test(t)) return 'Second Year (SE) • Sem 2';
      if (/^te[-_ ]?1$/i.test(t)) return 'Third Year (TE) • Sem 1';
      if (/^te[-_ ]?2$/i.test(t)) return 'Third Year (TE) • Sem 2';
      if (/^be[-_ ]?1$/i.test(t)) return 'Final Year (BE) • Sem 1';
      if (/^be[-_ ]?2$/i.test(t)) return 'Final Year (BE) • Sem 2';
      if (/^fe$/i.test(t)) return 'First Year (FE)';
      if (/^se$/i.test(t)) return 'Second Year (SE)';
      if (/^te$/i.test(t)) return 'Third Year (TE)';
      if (/^be$/i.test(t)) return 'Final Year (BE)';
      return '';
    };

    if (rawSubject) {
      const parsed = parseText(rawSubject.trim());
      if (parsed) return parsed;
    }
    if (rawCourse) {
      const parsed = parseText(rawCourse.trim());
      if (parsed) return parsed;
    }
    return rawCourse || rawSubject || 'Pune University';
  };

  return {
    courses,
    allCoursesState,
    notes,
    allNotesState,
    subjects,
    myPurchases,
    liveClasses,
    loading,
    activeRecording,
    playbackStreamUrl,
    playbackLoading,
    playbackProcessing,
    processingMessage,
    playbackError,
    studentProgressMap,
    notesByYear,
    coursesByYear,
    studentNoteYears,
    studentCourseYears,
    getItemYear,
    getSubjectBadge,
    getSubjectName,
    formatSubjectLabel,
    isCollegeFreeItem,
    handleOpenRecording,
    setActiveRecording,
    setPlaybackStreamUrl
  };
}
