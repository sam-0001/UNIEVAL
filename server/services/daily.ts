import logger from '../logger.js';

const DAILY_API_URL = 'https://api.daily.co/v1';

const getHeaders = () => {
  const DAILY_API_KEY = process.env.DAILY_API_KEY || '';
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${DAILY_API_KEY}`,
  };
};

export const createDailyRoom = async (exp: number) => {
  try {
    const res = await fetch(`${DAILY_API_URL}/rooms`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        properties: {
          exp, // Expiration time in seconds since epoch
          enable_chat: true,
          enable_screenshare: true,
          owner_only_broadcast: true
        },
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Daily.co API error: ${error}`);
    }

    const data = await res.json();
    return data;
  } catch (err: any) {
    logger.error('Error creating Daily room', { error: err.message });
    throw err;
  }
};

export const createMeetingToken = async (roomName: string, isOwner: boolean = false, userName: string) => {
  try {
    const res = await fetch(`${DAILY_API_URL}/meeting-tokens`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          is_owner: isOwner,
          user_name: userName,
        },
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Daily.co API error: ${error}`);
    }

    const data = await res.json();
    return data.token;
  } catch (err: any) {
    logger.error('Error creating Daily meeting token', { error: err.message });
    throw err;
  }
};

export const deleteDailyRoom = async (roomName: string) => {
  try {
    const res = await fetch(`${DAILY_API_URL}/rooms/${roomName}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Daily.co API error: ${error}`);
    }

    return true;
  } catch (err: any) {
    logger.error('Error deleting Daily room', { error: err.message });
    throw err;
  }
};
