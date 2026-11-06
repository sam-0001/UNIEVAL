/**
 * server/services/cashfree.service.ts
 * Centralized Cashfree Payments Gateway Service for UniEval.
 * Handles API key retrieval, order initialization, and server-side payment verification.
 */

import logger from '../logger.js';

export function getCashfreeKeys(): { appId: string | null; secretKey: string | null } {
    const appId = process.env.CASHFREE_APP_ID || null;
    const secretKey = process.env.CASHFREE_SECRET_KEY || null;
    return { appId, secretKey };
}

export function getCashfreeBaseUrl(): string {
    return process.env.NODE_ENV === 'production'
        ? 'https://api.cashfree.com/pg'
        : 'https://sandbox.cashfree.com/pg';
}

export interface CreateOrderParams {
    amountInPaise: number;
    receiptId: string;
    customerNotes: Record<string, string>;
    appId: string;
    secretKey: string;
    customerPhone?: string;
}

export async function createCashfreeOrder(
    amountInPaise: number,
    receiptId: string,
    customerNotes: Record<string, string>,
    appId: string,
    secretKey: string,
    customerPhone: string = '9999999999'
): Promise<any> {
    const baseUrl = getCashfreeBaseUrl();
    const orderRes = await fetch(`${baseUrl}/orders`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-client-id': appId,
            'x-client-secret': secretKey,
            'x-api-version': '2023-08-01'
        },
        body: JSON.stringify({
            order_amount: amountInPaise / 100, // Cashfree expects INR rupees
            order_currency: 'INR',
            order_id: receiptId,
            customer_details: {
                customer_id: customerNotes.userId || 'user_123',
                customer_phone: customerPhone || '9999999999',
            },
            order_meta: {
                return_url: `https://unieval.in/payment-callback?order_id={order_id}`
            },
            order_tags: customerNotes
        })
    });

    const order = await orderRes.json() as any;
    if (!orderRes.ok) {
        logger.error('[Cashfree] Order creation error:', order);
        throw new Error(order.message || 'Failed to create payment order');
    }
    return order;
}

export async function verifyCashfreePayment(
    orderId: string,
    appId: string,
    secretKey: string
): Promise<boolean> {
    const baseUrl = getCashfreeBaseUrl();
    const res = await fetch(`${baseUrl}/orders/${orderId}`, {
        headers: {
            'x-client-id': appId,
            'x-client-secret': secretKey,
            'x-api-version': '2023-08-01'
        }
    });

    if (!res.ok) {
        logger.warn(`[Cashfree] Verification request failed for order ${orderId}: ${res.status}`);
        return false;
    }

    const data = await res.json() as any;
    return data.order_status === 'PAID';
}
