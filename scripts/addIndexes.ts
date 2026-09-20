import 'dotenv/config';
import mongoose from 'mongoose';
import { User, Purchase, Course, Note, Quiz, Viva, Subject, QuizPool, ExamIntelligence, Payout, OTP } from '../server/models/index.js';

const DATABASE_URL = process.env.DATABASE_URL || 'mongodb://localhost:27017/unieval';

async function syncAllIndexes() {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(DATABASE_URL);
    console.log('Connected. Syncing indexes from Mongoose schemas...\n');

    const models = [User, Purchase, Course, Note, Quiz, Viva, Subject, QuizPool, ExamIntelligence, Payout, OTP];
    
    for (const model of models) {
        try {
            await model.syncIndexes();
            console.log('✅ ' + model.modelName + ' indexes synced');
        } catch (err: any) {
            console.error('❌ Failed to sync ' + model.modelName + ': ' + err.message);
        }
    }

    console.log('\n✅ All indexes synced successfully');
    await mongoose.disconnect();
}

syncAllIndexes().catch((err: any) => {
    console.error('\n❌ Fatal:', err.message);
    process.exit(1);
});
