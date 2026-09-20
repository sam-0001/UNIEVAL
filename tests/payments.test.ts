import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { verifyNotePurchase, verifyCoursePayment, verifyCreditPayment } from '../server/controllers/user.controller.js';
import mongoose from 'mongoose';

vi.mock('mongoose', () => ({
    default: {
        startSession: vi.fn().mockResolvedValue({
            startTransaction: vi.fn(),
            commitTransaction: vi.fn(),
            abortTransaction: vi.fn(),
            endSession: vi.fn(),
        })
    }
}));

// Mock the environment variables needed for Cashfree Keys
process.env.CASHFREE_APP_ID = 'test_app_id';
process.env.CASHFREE_SECRET_KEY = 'test_secret_key';

// Create a minimal express app to test the controller functions
const app = express();
app.use(express.json());

// Mock current user middleware
app.use((req, res, next) => {
    (req as any).currentUser = { id: 'test_user_id' };
    next();
});

app.post('/api/notes/:id/verify-purchase', verifyNotePurchase);
app.post('/api/courses/:id/verify-purchase', verifyCoursePayment);
app.post('/api/credits/verify', verifyCreditPayment);

describe('Payment Verification Replay Attack Protection (BUG-001)', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('should reject note purchase verify if order_tags.noteId does not match the requested note', async () => {
        // Mock global fetch to simulate Cashfree returning an order for a DIFFERENT note (the replay attack)
        global.fetch = vi.fn().mockResolvedValue({
            json: vi.fn().mockResolvedValue({
                order_status: 'PAID',
                order_tags: {
                    noteId: 'cheap_note_123', // Paid for cheap note
                    userId: 'test_user_id'
                }
            })
        } as any);

        const response = await request(app)
            .post('/api/notes/expensive_note_999/verify-purchase') // Trying to unlock expensive note
            .send({
                cashfree_order_id: 'order_abc123',
                cashfree_payment_session_id: 'session_abc123'
            });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Invalid payment signature');
    });

    it('should reject course purchase verify if order_tags.courseId does not match the requested course', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            json: vi.fn().mockResolvedValue({
                order_status: 'PAID',
                order_tags: {
                    courseId: 'cheap_course_123',
                    userId: 'test_user_id'
                }
            })
        } as any);

        const response = await request(app)
            .post('/api/courses/expensive_course_999/verify-purchase')
            .send({
                cashfree_order_id: 'order_xyz789',
                cashfree_payment_session_id: 'session_xyz789'
            });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Invalid payment signature');
    });

    it('should reject credit purchase verify if order_tags.plan does not match the requested plan', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            json: vi.fn().mockResolvedValue({
                order_status: 'PAID',
                order_tags: {
                    plan: '15', // Paid for the cheap plan
                    userId: 'test_user_id'
                }
            })
        } as any);

        const response = await request(app)
            .post('/api/credits/verify')
            .send({
                plan: '1000', // Requesting the expensive plan
                cashfree_order_id: 'order_credit_1',
                cashfree_payment_session_id: 'session_credit_1'
            });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Invalid payment signature');
    });

    it('should reject if order_tags.userId does not match the requesting user', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            json: vi.fn().mockResolvedValue({
                order_status: 'PAID',
                order_tags: {
                    noteId: 'my_note',
                    userId: 'different_user_id' // Order belongs to someone else
                }
            })
        } as any);

        const response = await request(app)
            .post('/api/notes/my_note/verify-purchase')
            .send({
                cashfree_order_id: 'order_stolen',
                cashfree_payment_session_id: 'session_stolen'
            });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Invalid payment signature');
    });
});
