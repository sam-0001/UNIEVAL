const mongoose = require('mongoose');
require('dotenv').config();

async function main() {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    const db = mongoose.connection.db;

    console.log("Clearing previous meetings...");
    await db.collection('liveclasses').deleteMany({});
    await db.collection('livechats').deleteMany({});
    await db.collection('livequestions').deleteMany({});
    await db.collection('livepolls').deleteMany({});
    await db.collection('livepollresponses').deleteMany({});
    
    console.log("All previous Live Classes and related data have been successfully deleted!");
  } catch (e) {
    console.error("Error clearing meetings:", e);
  } finally {
    process.exit(0);
  }
}
main();
