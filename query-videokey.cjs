const mongoose = require('mongoose');
require('dotenv').config();
async function main() {
  await mongoose.connect(process.env.DATABASE_URL);
  const db = mongoose.connection.db;
  const key = await db.collection('videokeys').findOne({ videoId: "vid-1786888608269-312ef3c7-a7bd-401c-949b-94099d1215d6" });
  console.log(key ? "KEY FOUND!" : "KEY NOT FOUND!");
  process.exit(0);
}
main();
