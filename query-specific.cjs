const mongoose = require('mongoose');
require('dotenv').config();
async function main() {
  await mongoose.connect(process.env.DATABASE_URL);
  const db = mongoose.connection.db;
  const course = await db.collection('courses').findOne({ 'modules.videos.videoId': 'vid-1786300528626-aa095578-518e-4bae-a224-1a5ad6001a54' });
  console.log(course ? "FOUND: " + JSON.stringify(course.modules.flatMap(m => m.videos).filter(v => v.videoId === 'vid-1786300528626-aa095578-518e-4bae-a224-1a5ad6001a54')) : "NOT FOUND IN DB");
  process.exit(0);
}
main();
