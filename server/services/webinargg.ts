import logger from '../logger.js';

const WEBINAR_GG_API_URL = process.env.WEBINAR_GG_API_URL || 'https://webinar-api.webinar.gg/api/v1';

const getHeaders = () => {
  const WEBINAR_GG_API_KEY = process.env.WEBINAR_GG_API_KEY || '';
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${WEBINAR_GG_API_KEY}`,
  };
};

export const createWebinar = async (title: string, startTime: string, durationMinutes: number, timezone = 'Asia/Kolkata', passcode = '') => {
  try {
    const d = new Date(startTime);

    // Format date and time in the specified timezone so that it matches what Webinar.gg expects
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).formatToParts(d);

    const getPart = (type: string) => parts.find(p => p.type === type)?.value || '';
    const date = `${getPart('year')}-${getPart('month')}-${getPart('day')}`;
    const time = `${getPart('hour')}:${getPart('minute')}`;
    const meridiem = (getPart('dayPeriod') || 'AM').toUpperCase();

    const requestBody: any = {
      title,
      date,
      time,
      meridiem,
      timezone,
      durationMinutes,
      recordingEnabled: true,
      authentication: false,
      requireLogin: false,
    };
    if (passcode) {
      requestBody.passcode = passcode;
    }

    const res = await fetch(`${WEBINAR_GG_API_URL}/webinar/`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Webinar.gg API error: ${error}`);
    }

    const json = await res.json();
    return json.data; // The spec says response is `{ success: true, data: { id: "..." } }`
  } catch (err: any) {
    logger.error('Error creating Webinar.gg room', { error: err.message });
    throw err;
  }
};

export const getWebinarToken = async (webinarId: string, role: 'host' | 'attendee', name: string, email: string, passcode = '') => {
  try {
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || 'User';
    const lastName = nameParts.slice(1).join(' ') || 'Name';

    const payload = {
      webinarId,
      firstName,
      lastName,
      email,
      phone: '0000000000',
      passcode: passcode || '',
    };

    const res = await fetch(`${WEBINAR_GG_API_URL}/webinar/join-token`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Webinar.gg API error: ${error}`);
    }

    const json = await res.json();
    return json.data.token; // Spec says `{ success: true, data: { token: "..." } }`
  } catch (err: any) {
    logger.error('Error creating Webinar.gg token', { error: err.message });
    throw err;
  }
};

export const deleteWebinar = async (webinarId: string) => {
  try {
    const res = await fetch(`${WEBINAR_GG_API_URL}/webinar/${webinarId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Webinar.gg API error: ${error}`);
    }

    return true;
  } catch (err: any) {
    logger.error('Error deleting Webinar.gg room', { error: err.message });
    throw err;
  }
};
