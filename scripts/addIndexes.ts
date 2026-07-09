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

    // ─── Users ────────────────────────────────────────────────────────────────
    await db.collection('users').createIndexes([
        { key: { id: 1 },          name: 'user_id',       unique: true },
        { key: { email: 1 },       name: 'user_email',    unique: true },
        { key: { role: 1, id: 1 }, name: 'user_role_id' },
    ]);
    console.log('✅ users');

    // ─── Purchases ────────────────────────────────────────────────────────────
    // Most queried collection at scale — teacher stats, purchase checks
    await db.collection('purchases').createIndexes([
        { key: { teacherId: 1, createdAt: -1 }, name: 'purchase_teacher_date' },
        { key: { userId: 1, productId: 1 },     name: 'purchase_user_product' },
        { key: { productId: 1 },                name: 'purchase_product' },
    ]);
    console.log('✅ purchases');

    // ─── Courses ──────────────────────────────────────────────────────────────
    await db.collection('courses').createIndexes([
        { key: { id: 1 },                          name: 'course_id',           unique: true },
        { key: { subjectId: 1, teacherId: 1 },     name: 'course_subject_teacher' },
        { key: { 'modules.videos.videoId': 1 },    name: 'course_video_id' },
    ]);
    console.log('✅ courses');

    // ─── Notes ────────────────────────────────────────────────────────────────
    await db.collection('notes').createIndexes([
        { key: { id: 1 },                      name: 'note_id',             unique: true },
        { key: { subjectId: 1, teacherId: 1 }, name: 'note_subject_teacher' },
    ]);
    console.log('✅ notes');

    // ─── Quizzes & Vivas ──────────────────────────────────────────────────────
    await db.collection('quizzes').createIndexes([
        { key: { id: 1 },                      name: 'quiz_id',             unique: true },
        { key: { subjectId: 1, teacherId: 1 }, name: 'quiz_subject_teacher' },
    ]);
    await db.collection('vivas').createIndexes([
        { key: { id: 1 },                      name: 'viva_id',             unique: true },
        { key: { subjectId: 1, teacherId: 1 }, name: 'viva_subject_teacher' },
    ]);
    console.log('✅ quizzes, vivas');

    // ─── Subjects ─────────────────────────────────────────────────────────────
    await db.collection('subjects').createIndexes([
        { key: { id: 1 },             name: 'subject_id',          unique: true },
        { key: { branch: 1, year: 1 }, name: 'subject_branch_year' },
    ]);
    console.log('✅ subjects');

    // ─── Quiz Pool (hot path — AI quiz generation) ────────────────────────────
    await db.collection('quizpools').createIndexes([
        { key: { id: 1 },                                              name: 'pool_id',        unique: true },
        { key: { branch: 1, subject: 1, semester: 1, unit: 1 },       name: 'pool_lookup',    unique: true },
    ]);
    console.log('✅ quizpools');

    // ─── Exam Intelligence ────────────────────────────────────────────────────
    await db.collection('examintelligences').createIndexes([
        { key: { id: 1 },                              name: 'exam_id',         unique: true },
        { key: { branch: 1, subject: 1, semester: 1 }, name: 'exam_lookup',     unique: true },
    ]);
    console.log('✅ examintelligences');

    // ─── Payouts ──────────────────────────────────────────────────────────────
    await db.collection('payouts').createIndexes([
        { key: { id: 1 },                           name: 'payout_id',          unique: true },
        { key: { teacherId: 1, status: 1, createdAt: -1 }, name: 'payout_teacher_status' },
    ]);
    console.log('✅ payouts');

    // ─── OTPs ─────────────────────────────────────────────────────────────────
    await db.collection('otps').createIndexes([
        { key: { email: 1 }, name: 'otp_email' },
    ]);
    console.log('✅ otps');

    console.log('\n✅ All indexes created successfully');
    await mongoose.disconnect();
}

addIndexes().catch((err) => {
    console.error('\n❌ Failed:', err.message);
    process.exit(1);
});
