import dotenv from 'dotenv';
dotenv.config();
const DAILY_API_KEY = process.env.DAILY_API_KEY;

async function check() {
  const res = await fetch('https://api.daily.co/v1/meeting-tokens', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DAILY_API_KEY}`
    },
    body: JSON.stringify({
      properties: {
        room_name: 'uSXrxRlf6s1WsaeHNUPx',
        is_owner: true,
        user_name: 'Teacher'
      }
    })
  });
  const data = await res.json();
  console.log("Token:", data);
}
check();
