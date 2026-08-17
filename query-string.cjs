const mongoose = require('mongoose');
require('dotenv').config();
async function main() {
  await mongoose.connect(process.env.DATABASE_URL);
  const db = mongoose.connection.db;
  const courses = await db.collection('courses').find().toArray();
  const found = courses.filter(c => JSON.stringify(c).includes('vid-1786300528626'));
  console.log(found.length > 0 ? "FOUND: " + found[0]._id : "NOT FOUND ANYWHERE IN COURSES");
  process.exit(0);
}
main();
