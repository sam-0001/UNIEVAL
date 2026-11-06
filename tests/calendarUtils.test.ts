import { describe, it, expect } from 'vitest';
import { getGoogleCalendarUrl } from '../components/live/CalendarUtils';

describe('Calendar Utilities', () => {
  it('generates a valid Google Calendar URL with correct parameters', () => {
    const event = {
      title: 'SE Computer Engineering - Operating Systems Lecture',
      description: 'Unit 3 Process Synchronization Live Lecture',
      startTime: '2026-11-10T14:00:00.000Z',
      endTime: '2026-11-10T16:00:00.000Z',
      location: 'https://unieval.in/live-class/class-123'
    };

    const url = getGoogleCalendarUrl(event);
    expect(url).toContain('https://calendar.google.com/calendar/render?');
    expect(url).toContain('action=TEMPLATE');
    expect(url).toContain('text=SE+Computer+Engineering+-+Operating+Systems+Lecture');
    expect(url).toContain('location=https%3A%2F%2Funieval.in%2Flive-class%2Fclass-123');
    expect(url).toContain('20261110T140000Z');
    expect(url).toContain('20261110T160000Z');
  });

  it('defaults to a 2-hour duration if endTime is omitted', () => {
    const event = {
      title: 'Quick Viva',
      startTime: '2026-11-10T10:00:00.000Z'
    };

    const url = getGoogleCalendarUrl(event);
    expect(url).toContain('20261110T100000Z');
    expect(url).toContain('20261110T120000Z');
  });
});
