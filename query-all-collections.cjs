const mongoose = require('mongoose');
require('dotenv').config();
async function main() {
  await mongoose.connect(process.env.DATABASE_URL);
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  for (const c of collections) {
    const col = db.collection(c.name);
    const doc = await col.findOne({ $or: [
      { videoId: 'vid-1786300528626-aa095578-518e-4bae-a224-1a5ad6001a54' },
      { 'modules.videos.videoId': 'vid-1786300528626-aa095578-518e-4bae-a224-1a5ad6001a54' }
    ] });
    if (doc) console.log(`FOUND IN ${c.name}`, doc);
  }
  process.exit(0);
}
main();
