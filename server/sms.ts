/**
 * server/sms.ts
 * APITxT SMS service — sends OTP via SMS (no DLT route).
 *
 * Usage:
 * await sendSmsOtp('9876543210', '123456');
 *
 * ENV vars required:
 * APITXT_AUTH_KEY   — your APITxT auth key (from dashboard)
 *
 * Optional (defaults shown):
 * SMS_ENABLED       — set "false" to disable  (default: "true")
 */

import logger from './logger.js';

const APITXT_BASE = 'https://apitxt.com/api/sendOTP';

export async function sendSmsOtp(phoneNumber: string, otp: string): Promise<void> {
    // Allow disabling SMS in dev/test without removing the call sites
    if (process.env.SMS_ENABLED === 'false') {
        logger.info(`[SMS] Skipped (SMS_ENABLED=false) → ${phoneNumber} OTP: ${otp}`);
        return;
    }

    const authkey = process.env.APITXT_AUTH_KEY;
    if (!authkey) {
        logger.warn('[SMS] APITXT_AUTH_KEY not set — skipping SMS send.');
        return;
    }

    // Normalise: strip non-digits, prepend 91 (India) if needed
    const digits = String(phoneNumber).replace(/\D/g, '');
    const mobile = digits.startsWith('91') && digits.length === 12 ? digits : `91${digits}`;

    // Pure No-DLT route: Pass only authkey, mobile, and otp
    // Do NOT add 'message', 'sender', 'template_id', or 'pe_id'
    const url =
        `${APITXT_BASE}` +
        `?authkey=${authkey}` +
        `&mobile=${mobile}` +
        `&otp=${otp}`;

    try {
        const res = await fetch(url, { method: 'GET' });
        const text = await res.text();
        
        let data;
        try {
            // Attempt to parse as JSON for detailed error checking
            data = JSON.parse(text);
        } catch (parseErr) {
            // Fallback: If the API returns raw text instead of JSON
            logger.info(`[SMS] APITxT raw response for ${mobile}: ${text}`);
            return;
        }

        // Check for common error flags in the gateway's JSON response
        if (data.status === 'error' || data.error) {
            logger.error(`[SMS] APITxT Gateway Error for ${mobile}:`, data);
        } else {
            logger.info(`[SMS] Successfully dispatched to ${mobile}. ID: ${data.message_id || 'unknown'}`);
        }
    } catch (err) {
        // SMS failure should never block signup — just log it
        logger.error('[SMS] Network or execution failed while sending OTP:', err);
    }
}