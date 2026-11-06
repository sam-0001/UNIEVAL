/**
 * tests/notification.test.ts
 * Unit tests for PWA push notification services and broadcast logic.
 * Run: npm test
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    getVapidPublicKey,
    subscribeDevice,
    unsubscribeDevice,
    getNotificationStats,
    broadcastPushNotification
} from '../server/services/notification.service.js';
import { PushSubscription } from '../server/models/index.js';
import webpush from 'web-push';

vi.mock('web-push', () => ({
    default: {
        setVapidDetails: vi.fn(),
        generateVAPIDKeys: vi.fn(() => ({
            publicKey: 'mock-public-key-12345',
            privateKey: 'mock-private-key-67890'
        })),
        sendNotification: vi.fn().mockResolvedValue({})
    }
}));

describe('PWA Notification Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getVapidPublicKey', () => {
        it('returns a valid string public key', () => {
            const key = getVapidPublicKey();
            expect(typeof key).toBe('string');
            expect(key.length).toBeGreaterThan(10);
        });
    });

    describe('subscribeDevice', () => {
        it('stores or updates a device push subscription', async () => {
            const findOneAndUpdateSpy = vi.spyOn(PushSubscription, 'findOneAndUpdate').mockResolvedValue({
                endpoint: 'https://fcm.googleapis.com/fcm/send/test1234',
                userId: 'user1',
                deviceType: 'mobile'
            } as any);

            const result = await subscribeDevice({
                endpoint: 'https://fcm.googleapis.com/fcm/send/test1234',
                keys: {
                    p256dh: 'p256dh_key',
                    auth: 'auth_key'
                },
                userId: 'user1',
                userEmail: 'student@unieval.in',
                userRole: 'STUDENT',
                userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'
            });

            expect(findOneAndUpdateSpy).toHaveBeenCalled();
            expect(result).toBeDefined();
            expect(result.endpoint).toBe('https://fcm.googleapis.com/fcm/send/test1234');
        });
    });

    describe('unsubscribeDevice', () => {
        it('deletes subscription by endpoint', async () => {
            const deleteOneSpy = vi.spyOn(PushSubscription, 'deleteOne').mockResolvedValue({ deletedCount: 1 } as any);

            const result = await unsubscribeDevice('https://fcm.googleapis.com/fcm/send/test1234');
            expect(deleteOneSpy).toHaveBeenCalledWith({ endpoint: 'https://fcm.googleapis.com/fcm/send/test1234' });
            expect(result.deletedCount).toBe(1);
        });
    });

    describe('getNotificationStats', () => {
        it('aggregates subscriber stats across device types', async () => {
            vi.spyOn(PushSubscription, 'countDocuments')
                .mockResolvedValueOnce(45) // total
                .mockResolvedValueOnce(30) // mobile
                .mockResolvedValueOnce(15) // desktop
                .mockResolvedValueOnce(35) // students
                .mockResolvedValueOnce(5); // teachers

            const stats = await getNotificationStats();
            expect(stats.total).toBe(45);
            expect(stats.mobile).toBe(30);
            expect(stats.desktop).toBe(15);
            expect(stats.students).toBe(35);
            expect(stats.teachers).toBe(5);
            expect(stats.guests).toBe(5);
        });
    });

    describe('broadcastPushNotification', () => {
        it('broadcasts to matching subscriptions and handles delivery metrics', async () => {
            const mockSubs = [
                {
                    endpoint: 'https://push.example.com/sub1',
                    keys: { p256dh: 'key1', auth: 'auth1' }
                },
                {
                    endpoint: 'https://push.example.com/sub2',
                    keys: { p256dh: 'key2', auth: 'auth2' }
                }
            ];

            vi.spyOn(PushSubscription, 'find').mockReturnValue({
                lean: vi.fn().mockResolvedValue(mockSubs)
            } as any);
            const deleteManySpy = vi.spyOn(PushSubscription, 'deleteMany').mockResolvedValue({ deletedCount: 0 } as any);

            const result = await broadcastPushNotification({
                title: 'New Unit Notes Available',
                body: 'Unit 4 Exam Notes for Computer Networks are now live.',
                target: 'all'
            });

            expect(result.total).toBe(2);
            expect(result.sent).toBe(2);
            expect(result.failed).toBe(0);
            expect(result.pruned).toBe(0);
        });

        it('prunes dead 404/410 subscriptions automatically', async () => {
            const mockSubs = [
                {
                    endpoint: 'https://push.example.com/dead',
                    keys: { p256dh: 'key_dead', auth: 'auth_dead' }
                }
            ];

            vi.spyOn(PushSubscription, 'find').mockReturnValue({
                lean: vi.fn().mockResolvedValue(mockSubs)
            } as any);
            vi.mocked(webpush.sendNotification).mockRejectedValueOnce({ statusCode: 410, message: 'Gone' });
            const deleteManySpy = vi.spyOn(PushSubscription, 'deleteMany').mockResolvedValue({ deletedCount: 1 } as any);

            const result = await broadcastPushNotification({
                title: 'Test',
                body: 'Test Notification',
                target: 'all'
            });

            expect(result.total).toBe(1);
            expect(result.sent).toBe(0);
            expect(result.failed).toBe(1);
            expect(result.pruned).toBe(1);
            expect(deleteManySpy).toHaveBeenCalledWith({
                endpoint: { $in: ['https://push.example.com/dead'] }
            });
        });
    });
});
