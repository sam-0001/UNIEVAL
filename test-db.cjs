const mongoose = require('mongoose');
require('dotenv').config();
async function main() {
  await mongoose.connect(process.env.DATABASE_URL);
  const db = mongoose.connection.db;
  const courses = await db.collection('courses').find().toArray();
  const vids = courses.flatMap(c => c.modules.flatMap(m => m.videos || []));
  console.log("DB HAS", vids.length, "VIDEOS");
  vids.forEach(v => console.log(v.videoId));
  process.exit(0);
}
main();
