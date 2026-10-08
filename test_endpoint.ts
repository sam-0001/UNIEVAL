import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { User } from './server/models.js';
dotenv.config();

mongoose.connect(process.env.DATABASE_URL as string).then(async () => {
    // get a user
    const user = await User.findOne();
    const token = jwt.sign({ userId: user?.id, role: user?.role }, process.env.JWT_SECRET as string, { expiresIn: '1d' });
    
    const res = await fetch('http://localhost:3000/api/live-classes/info/6ccfe18f-2e2f-4918-acca-efec84a89b94', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    
    console.log(res.status);
    console.log(await res.json());
    process.exit(0);
});
