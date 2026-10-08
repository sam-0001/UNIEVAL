require('dotenv').config();
const jwt = require('jsonwebtoken');
const token = jwt.sign({ id: 'jy9eiowqx', email: 'teacher@test.com', role: 'ADMIN' }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1h' });
console.log('Token:', token);

fetch('http://localhost:3000/api/live-classes/dummy-id/start', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token
  }
}).then(res => res.json()).then(console.log).catch(console.error);
