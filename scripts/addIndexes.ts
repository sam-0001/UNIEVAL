/**
 * scripts/addIndexes.ts
 * Creates all MongoDB indexes needed for 50k+ users.
 * Run once after deploy: npx tsx scripts/addIndexes.ts
 * Safe to re-run — MongoDB skips indexes that already exist.
 */
import 'dotenv/config';
import mongoose from 'mongoose';

const DATABASE_URL = process.env.DATABASE_URL || 'mongodb://localhost:27017/unieval';

async function addIndexes() {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(DATABASE_URL);
    const db = mongoose.connection.db!;
    console.log('Connected. Creating indexes...\n');

    async function ensureIndex(col: string, spec: any, opts: any = {}) {
        try {
            await db.collection(col).createIndex(spec, opts);
        } catch (err: any) {
            if (err.message && err.message.includes('already exists')) {
                // Index already exists under default or different name, safe to continue
                return;
            }
            console.warn(`  ⚠️ [${col}]`, err.message);
        }
    }

    // ─── Users ────────────────────────────────────────────────────────────────
    await ensureIndex('users', { id: 1 }, { unique: true });
    await ensureIndex('users', { email: 1 }, { unique: true });
    await ensureIndex('users', { phoneNumber: 1 });
    await ensureIndex('users', { role: 1, id: 1 });
    console.log('✅ users');

    // ─── Purchases ────────────────────────────────────────────────────────────
    await ensureIndex('purchases', { teacherId: 1, createdAt: -1 });
    await ensureIndex('purchases', { userId: 1, productId: 1 });
    await ensureIndex('purchases', { productId: 1 });
    console.log('✅ purchases');

    // ─── Courses ──────────────────────────────────────────────────────────────
    await ensureIndex('courses', { id: 1 }, { unique: true });
    await ensureIndex('courses', { subjectId: 1, teacherId: 1 });
    await ensureIndex('courses', { 'modules.videos.videoId': 1 });
    console.log('✅ courses');

    // ─── Notes ────────────────────────────────────────────────────────────────
    await ensureIndex('notes', { id: 1 }, { unique: true });
    await ensureIndex('notes', { subjectId: 1, teacherId: 1 });
    console.log('✅ notes');

    // ─── Quizzes & Vivas ──────────────────────────────────────────────────────
    await ensureIndex('quizzes', { id: 1 }, { unique: true });
    await ensureIndex('quizzes', { subjectId: 1, teacherId: 1 });
    await ensureIndex('vivas', { id: 1 }, { unique: true });
    await ensureIndex('vivas', { subjectId: 1, teacherId: 1 });
    console.log('✅ quizzes, vivas');

    // ─── Subjects ─────────────────────────────────────────────────────────────
    await ensureIndex('subjects', { id: 1 }, { unique: true });
    await ensureIndex('subjects', { branch: 1, year: 1 });
    console.log('✅ subjects');

    // ─── Quiz Pool (hot path — AI quiz generation) ────────────────────────────
    await ensureIndex('quizpools', { id: 1 }, { unique: true });
    await ensureIndex('quizpools', { branch: 1, subject: 1, semester: 1, unit: 1 }, { unique: true });
    console.log('✅ quizpools');

    // ─── Exam Intelligence ────────────────────────────────────────────────────
    await ensureIndex('examintelligences', { id: 1 }, { unique: true });
    await ensureIndex('examintelligences', { branch: 1, subject: 1, semester: 1 }, { unique: true });
    console.log('✅ examintelligences');

    // ─── Payouts ──────────────────────────────────────────────────────────────
    await ensureIndex('payouts', { id: 1 }, { unique: true });
    await ensureIndex('payouts', { teacherId: 1, status: 1, createdAt: -1 });
    console.log('✅ payouts');

    // ─── OTPs ─────────────────────────────────────────────────────────────────
    await ensureIndex('otps', { email: 1 });
    console.log('✅ otps');

    console.log('\n✅ All indexes ensured successfully!');
    await mongoose.disconnect();
}

addIndexes().catch((err) => {
    console.error('\n❌ Failed:', err.message);
    process.exit(1);
});
