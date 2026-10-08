import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.DATABASE_URL as string).then(async () => {
    const liveClassSchema = new mongoose.Schema({
        id: { type: String }
    }, { strict: false });
    const LiveClass = mongoose.model('LiveClass', liveClassSchema, 'liveclasses');
    
    const lc = await LiveClass.findOne({ id: '6ccfe18f-2e2f-4918-acca-efec84a89b94' });
    console.log(lc);
    process.exit(0);
});
