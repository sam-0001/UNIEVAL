const mongoose = require('mongoose');
require('dotenv').config();
async function main() {
  await mongoose.connect(process.env.DATABASE_URL);
  const db = mongoose.connection.db;
  const videos = await db.collection('courses').find({"modules.videos": {$exists: true}}).toArray();
  const allVids = videos.flatMap(c => c.modules.flatMap(m => m.videos));
  for (const v of allVids.slice(-5)) {
    console.log(v.videoId, v.videoUrl);
  }
  process.exit(0);
}
main();
