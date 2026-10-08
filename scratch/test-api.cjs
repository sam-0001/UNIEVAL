const jwt = require('jsonwebtoken');
require('dotenv').config();
const token = jwt.sign({ id: 'jy9eiowqx', email: 'teacher@test.com', role: 'ADMIN' }, process.env.JWT_SECRET || 'unieval_secure_jwt_secret_2024_prod', { expiresIn: '1h' });

async function test() {
  const res = await fetch('http://localhost:3000/api/live-classes/dummy-id/start', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token
    }
  });
  console.log(res.status);
  console.log(await res.text());
}
test();
