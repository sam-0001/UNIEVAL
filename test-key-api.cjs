const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config();

async function main() {
  await mongoose.connect(process.env.DATABASE_URL);
  const db = mongoose.connection.db;
  const admin = await db.collection('users').findOne({ email: process.env.SUPER_ADMIN_EMAIL });
  if (!admin) { console.log("Admin not found"); process.exit(1); }
  
  const token = jwt.sign({ id: admin._id.toString() }, process.env.JWT_SECRET, { expiresIn: '1d' });
  
  try {
    const res = await axios.get(`https://unieval.in/api/video/key/vid-1786888608269-312ef3c7-a7bd-401c-949b-94099d1215d6`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("SUCCESS! Key length:", res.data.length);
  } catch (error) {
    console.error("FAILED:", error.response ? error.response.status : error.message);
    if (error.response) console.error("Body:", error.response.data);
  }
  process.exit(0);
}
main();
