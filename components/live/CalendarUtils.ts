/**
 * Calendar Utilities for UniEval Live Classes
 * Generates 1-click Google Calendar URLs and .ics calendar files.
 */

export interface CalendarEvent {
  title: string;
  description?: string;
  startTime: string | Date;
  endTime?: string | Date;
  location?: string;
}

const getOriginFallback = () => {
  if (typeof window !== 'undefined' && window.location?.href) {
    return window.location.href;
  }
  return 'https://unieval.in';
};

/**
 * Format date to UTC string format required by calendar services: YYYYMMDDTHHmmssZ
 */
const formatToUtcCalendarString = (dateInput: string | Date): string => {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
};

/**
 * Generate 1-click Google Calendar event creation URL
 */
export const getGoogleCalendarUrl = (event: CalendarEvent): string => {
  const start = new Date(event.startTime);
  const end = event.endTime ? new Date(event.endTime) : new Date(start.getTime() + 2 * 60 * 60 * 1000); // default 2h

  const startUtc = formatToUtcCalendarString(start);
  const endUtc = formatToUtcCalendarString(end);
  const eventLocation = event.location || getOriginFallback();

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${startUtc}/${endUtc}`,
    details: event.description || `UniEval Interactive Live Classroom session.\nJoin link: ${eventLocation}`,
    location: eventLocation,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

/**
 * Generate and download an .ics file for Apple Calendar, Outlook, and mobile calendar apps
 */
export const downloadIcsFile = (event: CalendarEvent): void => {
  if (typeof window === 'undefined') return;

  const start = new Date(event.startTime);
  const end = event.endTime ? new Date(event.endTime) : new Date(start.getTime() + 2 * 60 * 60 * 1000);

  const startUtc = formatToUtcCalendarString(start);
  const endUtc = formatToUtcCalendarString(end);
  const nowUtc = formatToUtcCalendarString(new Date());
  const eventLocation = event.location || getOriginFallback();

  const sanitizeIcsText = (text: string) => text.replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//UniEval//Live Classroom//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${Date.now()}-${Math.random().toString(36).slice(2, 9)}@unieval.in`,
    `DTSTAMP:${nowUtc}`,
    `DTSTART:${startUtc}`,
    `DTEND:${endUtc}`,
    `SUMMARY:${sanitizeIcsText(event.title)}`,
    `DESCRIPTION:${sanitizeIcsText(event.description || `UniEval Live Class: ${eventLocation}`)}`,
    `LOCATION:${sanitizeIcsText(eventLocation)}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder: UniEval Live Class starts in 15 minutes',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${event.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Web Audio API gentle notification chime generator
 * Synthesizes a pleasant 2-tone chime without external audio files.
 */
export const playClassStartChime = (): void => {
  if (typeof window === 'undefined') return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Tone 1: 523.25 Hz (C5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.2, now + 0.05);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.55);

    // Tone 2: 659.25 Hz (E5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, now + 0.2);
    gain2.gain.setValueAtTime(0, now + 0.2);
    gain2.gain.linearRampToValueAtTime(0.25, now + 0.25);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.2);
    osc2.stop(now + 0.85);
  } catch (err) {
    // Audio context may be restricted by autoplay policy
  }
};
