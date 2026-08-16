import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import fs from 'fs';
import dotenv from 'dotenv';

import mongoose from 'mongoose';
import { User } from './server/models.js';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.DATABASE_URL || '');
  const user = await User.findOne({ email: 'sohamchaudhari911@gmail.com' });
  const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET || '');

  const res = await fetch('http://localhost:3000/api/live-classes/schedule', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      courseId: "dummy",
      title: "Test",
      scheduledStartTime: "2026-08-16T10:00:00Z",
      scheduledEndTime: "2026-08-16T11:00:00Z"
    })
  });
  
  console.log('Status:', res.status);
  console.log('Body:', await res.text());
  process.exit(0);
}
run();
