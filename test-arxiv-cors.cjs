const https = require('https');
https.get('https://arxiv.org/pdf/2301.00001', (res) => {
  console.log(res.headers);
});
