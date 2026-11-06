import express from 'express';
import { getVapidPublicKey, subscribeDevice, unsubscribeDevice, getNotificationStats, broadcastPushNotification } from '../services/notification.service.js';
import logger from '../logger.js';

export async function getVapidKey(_req: express.Request, res: express.Response): Promise<void> {
    try {
        const publicKey = getVapidPublicKey();
        res.json({ publicKey });
    } catch (err: any) {
        logger.error('[Notifications] getVapidKey error:', err);
        res.status(500).json({ error: 'Failed to retrieve VAPID public key' });
    }
}

export async function subscribe(req: express.Request, res: express.Response): Promise<void> {
    try {
        const { subscription, deviceType } = req.body;
        if (!subscription || !subscription.endpoint || !subscription.keys) {
            res.status(400).json({ error: 'Valid PushSubscription is required' });
            return;
        }

        const currentUser = (req as any).currentUser;
        const userAgent = req.headers['user-agent'] || '';

        const record = await subscribeDevice({
            endpoint: subscription.endpoint,
            keys: subscription.keys,
            userId: currentUser?.id || null,
            userRole: currentUser?.role || 'GUEST',
            userEmail: currentUser?.email || null,
            userAgent,
            deviceType: deviceType || (/mobile|android|iphone|ipad/i.test(userAgent) ? 'mobile' : 'desktop')
        });

        res.json({ ok: true, id: record._id });
    } catch (err: any) {
        logger.error('[Notifications] subscribe error:', err);
        res.status(500).json({ error: 'Failed to save push subscription' });
    }
}

export async function unsubscribe(req: express.Request, res: express.Response): Promise<void> {
    try {
        const { endpoint } = req.body;
        if (!endpoint) {
            res.status(400).json({ error: 'endpoint is required' });
            return;
        }

        await unsubscribeDevice(endpoint);
        res.json({ ok: true });
    } catch (err: any) {
        logger.error('[Notifications] unsubscribe error:', err);
        res.status(500).json({ error: 'Failed to unsubscribe' });
    }
}

export async function getStats(_req: express.Request, res: express.Response): Promise<void> {
    try {
        const stats = await getNotificationStats();
        res.json(stats);
    } catch (err: any) {
        logger.error('[Notifications] getStats error:', err);
        res.status(500).json({ error: 'Failed to get notification stats' });
    }
}

export async function broadcast(req: express.Request, res: express.Response): Promise<void> {
    try {
        const { title, body, url, target } = req.body;
        if (!title || !title.trim() || !body || !body.trim()) {
            res.status(400).json({ error: 'Title and body are required' });
            return;
        }

        const result = await broadcastPushNotification({
            title: title.trim(),
            body: body.trim(),
            url: url ? url.trim() : '/dashboard',
            target: target || 'all'
        });

        res.json({ ok: true, ...result });
    } catch (err: any) {
        logger.error('[Notifications] broadcast error:', err);
        res.status(500).json({ error: 'Failed to send notification broadcast' });
    }
}
