const https = require('https');
const req = https.request('https://unieval.in/api/courses', { method: 'GET' }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      let parsed = JSON.parse(data);
      const courses = Array.isArray(parsed) ? parsed : (parsed.courses || parsed.data || Object.values(parsed)[0]);
      const c = courses.find(c => c.modules && c.modules.some(m => m.videos && m.videos.length > 0));
      if (c) {
        console.log("PRODUCTION API RETURNED COURSE:", c._id);
        const vid = c.modules.flatMap(m => m.videos)[0];
        console.log("PRODUCTION API RETURNED VIDEO ID:", vid.videoId);
        console.log("PRODUCTION API RETURNED URL:", vid.videoUrl);
      }
    } catch(e) {}
  });
});
req.end();
