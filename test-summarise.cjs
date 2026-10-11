const http = require('http');

const data = JSON.stringify({
  url: 'https://arxiv.org/pdf/2301.00001',
  title: 'Test Paper'
});

const req = http.request({
  hostname: 'localhost',
  port: 5000,
  path: '/api/be-toolkit/summarise-pdf',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log('Status:', res.statusCode, 'Body:', body));
});

req.on('error', e => console.error(e));
req.write(data);
req.end();
