import webpush from 'web-push';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PushSubscription } from '../models/index.js';
import logger from '../logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const VAPID_KEYS_FILE = path.resolve(__dirname, '../../.vapid-keys.json');

interface VapidKeys {
    publicKey: string;
    privateKey: string;
}

let vapidKeys: VapidKeys;

// Load or generate VAPID keys
function initVapidKeys(): VapidKeys {
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
        return {
            publicKey: process.env.VAPID_PUBLIC_KEY.trim(),
            privateKey: process.env.VAPID_PRIVATE_KEY.trim()
        };
    }

    if (fs.existsSync(VAPID_KEYS_FILE)) {
        try {
            const raw = fs.readFileSync(VAPID_KEYS_FILE, 'utf-8');
            const parsed = JSON.parse(raw);
            if (parsed.publicKey && parsed.privateKey) {
                return parsed;
            }
        } catch (e) {
            logger.warn('[Push] Error reading existing .vapid-keys.json, generating new pair');
        }
    }

    // Generate new VAPID keys and persist
    const newKeys = webpush.generateVAPIDKeys();
    try {
        fs.writeFileSync(VAPID_KEYS_FILE, JSON.stringify(newKeys, null, 2), 'utf-8');
        logger.info('[Push] Generated and saved new VAPID keys to .vapid-keys.json');
    } catch (e: any) {
        logger.error('[Push] Failed to save .vapid-keys.json:', e.message);
    }
    return newKeys;
}

vapidKeys = initVapidKeys();

const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@unieval.in';

try {
    webpush.setVapidDetails(
        VAPID_SUBJECT,
        vapidKeys.publicKey,
        vapidKeys.privateKey
    );
    logger.info('[Push] WebPush initialized successfully');
} catch (err: any) {
    logger.error('[Push] WebPush setVapidDetails error:', err.message);
}

export function getVapidPublicKey(): string {
    return vapidKeys.publicKey;
}

export async function subscribeDevice(params: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
    userId?: string | null;
    userRole?: string;
    userEmail?: string | null;
    userAgent?: string;
    deviceType?: 'mobile' | 'desktop' | 'tablet';
}) {
    const { endpoint, keys, userId, userRole, userEmail, userAgent, deviceType } = params;
    return await PushSubscription.findOneAndUpdate(
        { endpoint },
        {
            endpoint,
            keys,
            userId: userId || null,
            userRole: userRole || 'GUEST',
            userEmail: userEmail || null,
            userAgent: userAgent || '',
            deviceType: deviceType || 'desktop'
        },
        { upsert: true, new: true }
    );
}

export async function unsubscribeDevice(endpoint: string) {
    return await PushSubscription.deleteOne({ endpoint });
}

export async function getNotificationStats() {
    const [total, mobile, desktop, students, teachers] = await Promise.all([
        PushSubscription.countDocuments(),
        PushSubscription.countDocuments({ deviceType: 'mobile' }),
        PushSubscription.countDocuments({ deviceType: 'desktop' }),
        PushSubscription.countDocuments({ userRole: 'STUDENT' }),
        PushSubscription.countDocuments({ userRole: { $in: ['TEACHER', 'ADMIN', 'SUPER_ADMIN'] } })
    ]);

    return {
        total,
        mobile,
        desktop,
        students,
        teachers,
        guests: Math.max(0, total - (students + teachers))
    };
}

export async function broadcastPushNotification(options: {
    title: string;
    body: string;
    url?: string;
    target?: 'all' | 'students' | 'teachers';
    tag?: string;
}) {
    const { title, body, url = '/dashboard', target = 'all', tag } = options;

    let filter: Record<string, any> = {};
    if (target === 'students') {
        filter = { userRole: 'STUDENT' };
    } else if (target === 'teachers') {
        filter = { userRole: { $in: ['TEACHER', 'ADMIN', 'SUPER_ADMIN'] } };
    }

    const subscriptions = await PushSubscription.find(filter).lean();
    logger.info(`[Push Broadcast] Sending "${title}" to ${subscriptions.length} devices (target: ${target})`);

    const payload = JSON.stringify({
        title,
        body,
        url,
        tag: tag || `unieval-${Date.now()}`,
        icon: '/img/icon-192.png',
        badge: '/img/icon-192.png'
    });

    let sent = 0;
    let failed = 0;
    let pruned = 0;

    const deadEndpoints: string[] = [];

    // Send in chunks of 25 to avoid socket exhaustion
    const CHUNK_SIZE = 25;
    for (let i = 0; i < subscriptions.length; i += CHUNK_SIZE) {
        const chunk = subscriptions.slice(i, i + CHUNK_SIZE);
        await Promise.all(
            chunk.map(async (sub) => {
                if (!sub.keys?.p256dh || !sub.keys?.auth) {
                    failed++;
                    return;
                }
                try {
                    await webpush.sendNotification(
                        {
                            endpoint: sub.endpoint,
                            keys: {
                                p256dh: sub.keys.p256dh,
                                auth: sub.keys.auth
                            }
                        },
                        payload,
                        {
                            TTL: 60 * 60 * 24 // 24 hours
                        }
                    );
                    sent++;
                } catch (err: any) {
                    failed++;
                    if (err.statusCode === 404 || err.statusCode === 410) {
                        deadEndpoints.push(sub.endpoint);
                    } else {
                        logger.warn(`[Push] Delivery error for device: ${err.message}`);
                    }
                }
            })
        );
    }

    // Prune expired/unsubscribed endpoints from MongoDB
    if (deadEndpoints.length > 0) {
        const deleteRes = await PushSubscription.deleteMany({ endpoint: { $in: deadEndpoints } });
        pruned = deleteRes.deletedCount || deadEndpoints.length;
        logger.info(`[Push] Auto-pruned ${pruned} dead push subscriptions from DB`);
    }

    return {
        total: subscriptions.length,
        sent,
        failed,
        pruned
    };
}
