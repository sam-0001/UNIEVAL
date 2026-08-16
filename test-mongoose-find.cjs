const mongoose = require('mongoose');
require('dotenv').config();
const { Course } = require('./dist/server/models/course.model.js');

async function main() {
  await mongoose.connect(process.env.DATABASE_URL);
  const course = await Course.findOne({ 'modules.videos.videoId': 'vid-1786888608269-312ef3c7-a7bd-401c-949b-94099d1215d6' }).lean();
  console.log(course ? "COURSE FOUND WITH MONGOOSE!" : "COURSE NOT FOUND WITH MONGOOSE!");
  
  const { VideoKey } = require('./dist/server/models/videoKey.model.js');
  const record = await VideoKey.findOne({ videoId: 'vid-1786888608269-312ef3c7-a7bd-401c-949b-94099d1215d6' });
  console.log(record ? "VIDEO KEY FOUND WITH MONGOOSE!" : "VIDEO KEY NOT FOUND WITH MONGOOSE!");
  process.exit(0);
}
main();
