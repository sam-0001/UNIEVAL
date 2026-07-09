import mongoose from 'mongoose';
import 'dotenv/config';
import { User } from '../server/models/index.js';

async function checkUsers() {
    const uri = process.env.DATABASE_URL || '';
    if (!uri) {
        console.error('DATABASE_URL is empty');
        return;
    }
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const counts = await User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    console.log('User counts by role:', JSON.stringify(counts, null, 2));

    const samples = await User.find({}, { id: 1, name: 1, email: 1, role: 1 }).limit(10);
    console.log('Sample users:', JSON.stringify(samples, null, 2));

    await mongoose.disconnect();
}

checkUsers().catch(console.error);
