const https = require('https');

const req = https.request('https://unieval.in/api/courses', { method: 'GET' }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      let parsed = JSON.parse(data);
      const courses = Array.isArray(parsed) ? parsed : (parsed.courses || parsed.data || Object.values(parsed)[0]);
      
      const courseWithVideo = courses.find(c => c.modules && c.modules.some(m => m.videos && m.videos.length > 0));
      if (courseWithVideo) {
        const vid = courseWithVideo.modules.flatMap(m => m.videos)[0];
        console.log("PRODUCTION API RETURNED VIDEO ID:", vid.videoId);
        console.log("PRODUCTION API RETURNED URL:", vid.videoUrl);
      } else {
        console.log("NO COURSES WITH VIDEOS FOUND ON PROD API!");
      }
    } catch(e) { console.error("Error parsing", e); }
  });
});
req.end();
