const mongoose = require('mongoose');
require('dotenv').config();
async function main() {
  await mongoose.connect(process.env.DATABASE_URL);
  const db = mongoose.connection.db;
  const course = await db.collection('courses').findOne({ 'modules.videos.videoId': 'vid-1786888608269-312ef3c7-a7bd-401c-949b-94099d1215d6' });
  console.log(course ? "COURSE FOUND!" : "COURSE NOT FOUND!");
  process.exit(0);
}
main();
