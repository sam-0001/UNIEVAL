import express from 'express';
import { randomUUID } from 'crypto';
import { User, Course, Note, Quiz, Viva, Payout, Purchase } from '../models/index.js';
import { requireRole } from '../middleware/auth.js';
import { UserRole } from '../../types.js';
import logger from '../logger.js';

const router = express.Router();

function handleError(res: express.Response, error: unknown, op: string) {
    const msg = error instanceof Error ? error.message : 'Operation failed';
    logger.error(`[Payout] ${op}:`, msg);
    res.status(500).json({ error: 'An internal error occurred' });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function calcTeacherStats(teacherId: string) {
    const [courses, notes, quizzes, vivas] = await Promise.all([
        Course.find({ teacherId }, { id: 1 }).lean(),
        Note.find({ teacherId }, { id: 1 }).lean(),
        Quiz.find({ teacherId }, { id: 1 }).lean(),
        Viva.find({ teacherId }, { id: 1 }).lean(),
    ]);

    // FIX: Sum actual amounts paid from Purchase ledger — never use current product price.
    // This correctly handles: price changes, free products, and real Razorpay amounts.
    const revenueAgg = await Purchase.aggregate([
        { $match: { teacherId } },
        { $group: { _id: null, total: { $sum: '$amountPaid' }, count: { $sum: 1 } } }
    ]);
    const totalSales = revenueAgg[0]?.total || 0;
    const totalTransactions = revenueAgg[0]?.count || 0;

    // Sum all COMPLETED payouts for this teacher
    const paidAgg = await Payout.aggregate([
        { $match: { teacherId, status: 'COMPLETED' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalPaid = paidAgg[0]?.total || 0;

    const platformFee   = totalSales * 0.10;
    const netPayable    = totalSales - platformFee;
    const pendingPayout = Math.max(0, netPayable - totalPaid);

    return {
        totalProducts:     courses.length + notes.length + quizzes.length + vivas.length,
        totalCourses:      courses.length,
        totalNotes:        notes.length,
        totalQuizzes:      quizzes.length,
        totalVivas:        vivas.length,
        totalTransactions,
        totalSales,
        platformFee,
        netPayable,
        totalPaid,
        pendingPayout,
    };
}

// ── GET /api/payout/teachers-with-stats ───────────────────────────────────────
// Returns all teachers with sales stats + current payout status

router.get(
    '/payout/teachers-with-stats',
    requireRole(UserRole.SUPER_ADMIN),
    async (req, res) => {
        try {
            const teachers = await User.find(
                { role: UserRole.TEACHER },
                { password: 0, __v: 0 }
            ).lean();

            const results = await Promise.all(teachers.map(async (t: any) => {
                const stats = await calcTeacherStats(t.id);

                // Fetch latest payout record for this teacher
                const pendingPayout = await Payout.findOne(
                    { teacherId: t.id, status: 'PENDING' }
                ).lean();
                const lastCompleted = await Payout.findOne(
                    { teacherId: t.id, status: 'COMPLETED' },
                    {},
                    { sort: { completedAt: -1 } }
                ).lean();

                return {
                    teacher: t,
                    stats,
                    pendingPayout: pendingPayout || null,
                    lastCompleted: lastCompleted || null,
                };
            }));

            res.json(results);
        } catch (err) { handleError(res, err, 'teachers-with-stats'); }
    }
);

// ── POST /api/payout/create ───────────────────────────────────────────────────
// Creates a new PENDING payout + returns UPI QR string. Blocks if one already pending.

router.post(
    '/payout/create',
    requireRole(UserRole.SUPER_ADMIN),
    async (req, res) => {
        const { teacherId } = req.body as { teacherId: string };
        if (!teacherId) { res.status(400).json({ error: 'teacherId is required' }); return; }

        try {
            // Block if a PENDING payout already exists
            const existing = await Payout.findOne({ teacherId, status: 'PENDING' });
            if (existing) {
                res.status(409).json({ error: 'Pending payout already exists for this teacher' });
                return;
            }

            const teacher = await User.findOne({ id: teacherId });
            if (!teacher) { res.status(404).json({ error: 'Teacher not found' }); return; }
            if (!teacher.upiId) { res.status(400).json({ error: 'Teacher has no UPI ID set' }); return; }

            const stats = await calcTeacherStats(teacherId);
            if (stats.pendingPayout <= 0) {
                res.status(400).json({ error: 'No pending amount to pay out' });
                return;
            }

            const payout = await Payout.create({
                id:          randomUUID(),
                teacherId,
                amount:      stats.pendingPayout,
                grossAmount: stats.totalSales,
                platformFee: stats.platformFee,
                status:      'PENDING',
            });

            const upiString = `upi://pay?pa=${encodeURIComponent(teacher.upiId)}&pn=${encodeURIComponent(teacher.name)}&am=${stats.pendingPayout.toFixed(2)}&cu=INR`;

            res.json({
                payout,
                upiString,
                qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiString)}`,
            });
        } catch (err) { handleError(res, err, 'create payout'); }
    }
);

// ── POST /api/payout/confirm ──────────────────────────────────────────────────
// Marks a PENDING payout as COMPLETED with a UPI transaction ID.

router.post(
    '/payout/confirm',
    requireRole(UserRole.SUPER_ADMIN),
    async (req, res) => {
        const { payoutId, transactionId } = req.body as { payoutId: string; transactionId: string };
        if (!payoutId || !transactionId) {
            res.status(400).json({ error: 'payoutId and transactionId are required' });
            return;
        }

        try {
            const payout = await Payout.findOne({ id: payoutId });
            if (!payout) { res.status(404).json({ error: 'Payout not found' }); return; }
            if (payout.status === 'COMPLETED') {
                res.status(409).json({ error: 'Payout already completed' });
                return;
            }

            payout.status        = 'COMPLETED';
            payout.transactionId = transactionId;
            payout.completedAt   = new Date();
            await payout.save();

            res.json({ success: true, payout });
        } catch (err) { handleError(res, err, 'confirm payout'); }
    }
);

// ── GET /api/payout/teacher/:id ───────────────────────────────────────────────
// Full payout history for a teacher (used in teacher dashboard).

router.get('/payout/teacher/:id', async (req, res) => {
    const teacherId = req.params.id as string;
    try {
        const [payouts, stats] = await Promise.all([
            Payout.find({ teacherId }).sort({ createdAt: -1 }).lean(),
            calcTeacherStats(teacherId),
        ]);
        res.json({ payouts, stats });
    } catch (err) { handleError(res, err, 'teacher payout history'); }
});

export default router;