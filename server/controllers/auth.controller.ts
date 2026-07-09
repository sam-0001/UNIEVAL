import express from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { User, OTP } from '../models/index.js';
import { sendEmail } from '../email.js';
import { sendSmsOtp } from '../sms.js';
import { signToken } from '../middleware/auth.js';
import { UserRole } from '../../types.js';
import logger from '../logger.js';

// ─── Helpers (private to this module) ────────────────────────────────────────

export function generateId(): string {
    return randomUUID();
}

export function validatePassword(password: string): { valid: boolean; error?: string } {
    if (!password || password.length < 8) return { valid: false, error: 'Password must be at least 8 characters long' };
    if (!/[A-Z]/.test(password)) return { valid: false, error: 'Password must contain at least one uppercase letter' };
    if (!/[a-z]/.test(password)) return { valid: false, error: 'Password must contain at least one lowercase letter' };
    if (!/[0-9]/.test(password)) return { valid: false, error: 'Password must contain at least one number' };
    return { valid: true };
}

export async function findUserByEmail(email: string) {
    const normalized = email.toLowerCase().trim();
    const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return User.findOne({ email: { $regex: new RegExp(`^${escaped}$`, 'i') } });
}

/**
 * Normalizes phone numbers to standard 10-digit format
 * e.g., "+91 73504 84629" -> "7350484629"
 * "917350484629"    -> "7350484629"
 */
export function normalizePhone(phone: string | undefined): string {
    if (!phone) return '';
    const digits = String(phone).replace(/\D/g, '');
    // If it includes country code (12 digits starting with 91), extract last 10 digits
    if (digits.length === 12 && digits.startsWith('91')) {
        return digits.slice(2);
    }
    return digits;
}

export async function findUserByPhone(phone: string) {
    const normalized = normalizePhone(phone);
    return User.findOne({ phoneNumber: normalized });
}

export async function checkPhone(req: express.Request, res: express.Response): Promise<void> {
    const phoneNumber = req.body.phoneNumber as string;
    if (!phoneNumber) { res.status(400).json({ error: 'phoneNumber required' }); return; }
    const user = await findUserByPhone(phoneNumber);
    res.json({ exists: !!user });
}

export function sanitizeUser(user: any) {
    const obj = user.toObject ? user.toObject() : { ...user };
    delete obj.password;
    delete obj.__v;
    delete obj._id;
    return obj;
}

// ─── OTP Verify & Consume ─────────────────────────────────────────────────────
async function verifyAndConsumeOtp(email: string, otp: string): Promise<{ ok: boolean; error?: string; status?: number }> {
    const record = await OTP.findOne({ email: email.toLowerCase().trim() });
    if (!record) return { ok: false, error: 'Invalid or expired OTP', status: 400 };
    if ((record as any).locked) return { ok: false, error: 'Too many failed attempts. Please request a new OTP.', status: 429 };

    const age = Date.now() - new Date(record.createdAt).getTime();
    if (age > 10 * 60 * 1000) {
        await OTP.deleteOne({ _id: record._id });
        return { ok: false, error: 'OTP has expired. Please request a new one.', status: 400 };
    }

    if (record.otp !== otp) {
        const attempts = ((record as any).attempts || 0) + 1;
        if (attempts >= 5) {
            await OTP.findOneAndUpdate({ _id: record._id }, { attempts, locked: true });
            return { ok: false, error: 'Too many failed attempts. Please request a new OTP.', status: 429 };
        }
        await OTP.findOneAndUpdate({ _id: record._id }, { attempts });
        return { ok: false, error: `Invalid OTP. ${5 - attempts} attempt(s) remaining.`, status: 400 };
    }

    // If a phoneNumber is stored, this is signup — generate + send the SMS OTP now
    // that email is confirmed, then keep the record alive for step 3.
    if ((record as any).phoneNumber) {
        const newPhoneOtp = Math.floor(100000 + Math.random() * 900000).toString();
        await OTP.findOneAndUpdate(
            { _id: record._id },
            { otp: '', locked: false, attempts: 0, phoneOtp: newPhoneOtp }
        );
        sendSmsOtp((record as any).phoneNumber, newPhoneOtp).catch((err) =>
            logger.error('[Auth] verifyAndConsumeOtp SMS dispatch failed:', err)
        );
    } else {
        await OTP.deleteOne({ _id: record._id });
    }
    return { ok: true };
}

// ─── Controllers ─────────────────────────────────────────────────────────────

export async function login(req: express.Request, res: express.Response): Promise<void> {
    const { password } = req.body;
    const email = req.body.email as string | undefined;
    const phoneNumber = req.body.phoneNumber as string | undefined;

    if ((!email && !phoneNumber) || !password) {
        res.status(400).json({ error: 'Email or phone number, and password are required' }); return;
    }

    try {
        let user = null;
        if (phoneNumber) {
            user = await findUserByPhone(phoneNumber);
            if (!user) { res.status(401).json({ error: 'No account found with this mobile number' }); return; }
        } else {
            user = await findUserByEmail(email!);
        }

        if (!user?.password) { res.status(401).json({ error: 'Invalid credentials' }); return; }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) { res.status(401).json({ error: 'Invalid credentials' }); return; }

        const sessionToken = randomUUID();
        await User.updateOne({ id: user.id }, { sessionToken });
        const token = signToken({ userId: user.id, role: user.role as UserRole, sessionToken });
        res.json({ token, user: sanitizeUser(user) });
    } catch (err) {
        logger.error('[Auth] login:', err);
        res.status(500).json({ error: 'An internal error occurred' });
    }
}

export async function register(req: express.Request, res: express.Response): Promise<void> {
    const { name, role, password } = req.body;
    const email = req.body.email as string;
    const phoneNumber = req.body.phoneNumber as string;

    if (!email || !name || !role) { res.status(400).json({ error: 'Name, email, and role are required' }); return; }
    if (!password) { res.status(400).json({ error: 'Password is required' }); return; }
    
    const normalizedPhone = normalizePhone(phoneNumber);
    if (!normalizedPhone || normalizedPhone.length !== 10) {
        res.status(400).json({ error: 'Valid 10-digit mobile number is required' }); return;
    }

    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) { res.status(400).json({ error: pwCheck.error }); return; }

    const allowedRoles: UserRole[] = [UserRole.STUDENT, UserRole.TEACHER];
    if (!allowedRoles.includes(role as UserRole)) {
        res.status(403).json({ error: 'Cannot register with this role' }); return;
    }

    try {
        const existing = await findUserByEmail(email);
        if (existing) { res.status(400).json({ error: 'Email already registered' }); return; }

        const existingPhone = await findUserByPhone(normalizedPhone);
        if (existingPhone) {
            res.status(400).json({ error: 'PHONE_EXISTS' }); return;
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = await User.create({
            id: generateId(), name, email: email.toLowerCase().trim(),
            password: hashedPassword, role,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
            purchasedNoteIds: [], purchasedCourseIds: [],
            phoneNumber: normalizedPhone
        });

        const sessionToken = randomUUID();
        await User.updateOne({ id: newUser.id }, { sessionToken });
        const token = signToken({ userId: newUser.id, role: newUser.role as UserRole, sessionToken });
        res.json({ token, user: sanitizeUser(newUser) });
    } catch (err) {
        logger.error('[Auth] register:', err);
        res.status(500).json({ error: 'An internal error occurred' });
    }
}

export async function sessionCheck(req: express.Request, res: express.Response): Promise<void> {
    try {
        const user = (req as any).currentUser;
        const tokenSession = (req as any).sessionToken;
        res.json({ valid: !!(user.sessionToken && user.sessionToken === tokenSession) });
    } catch {
        res.json({ valid: false });
    }
}

export async function getMe(req: express.Request, res: express.Response): Promise<void> {
    try {
        const user = (req as any).currentUser;
        res.json(sanitizeUser(user));
    } catch (err) {
        logger.error('[Auth] getMe:', err);
        res.status(500).json({ error: 'An internal error occurred' });
    }
}

export async function logout(req: express.Request, res: express.Response): Promise<void> {
    try {
        const user = (req as any).currentUser;
        await User.updateOne({ id: user.id }, { sessionToken: null });
        res.json({ ok: true });
    } catch {
        res.json({ ok: true });
    }
}

export async function sendOtp(req: express.Request, res: express.Response): Promise<void> {
    const rawEmail = req.body.email as string | undefined;
    const rawPhone = req.body.phoneNumber as string | undefined;
    const mode     = (req.body.mode as string | undefined) || 'default';

    let email = rawEmail;
    let smsPhone: string | null = null;

    if (mode === 'signup') {
        if (!rawEmail) { res.status(400).json({ error: 'Email is required' }); return; }
        if (rawPhone) {
            smsPhone = normalizePhone(rawPhone);
        }

        // ── Duplicate checks BEFORE spending an OTP ──────────────────────────
        const [existingEmailUser, existingPhoneUser] = await Promise.all([
            findUserByEmail(rawEmail),
            smsPhone ? findUserByPhone(smsPhone) : Promise.resolve(null),
        ]);
        if (existingEmailUser) {
            res.status(409).json({ error: 'EMAIL_EXISTS' }); return;
        }
        if (existingPhoneUser) {
            res.status(409).json({ error: 'PHONE_EXISTS' }); return;
        }
        // ─────────────────────────────────────────────────────────────────────
    } else {
        if (rawPhone && !email) {
            const user = await findUserByPhone(rawPhone);
            if (!user) {
                res.status(404).json({ error: 'No account found with this mobile number' }); return;
            }
            email = user.email;
        }
    }

    if (!email) { res.status(400).json({ error: 'Email or mobile number is required' }); return; }

    // ── Resend cooldown: 45 seconds ──────────────────────────────────────────
    const existing = await OTP.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
        const age = Date.now() - new Date((existing as any).createdAt).getTime();
        const cooldownMs = 45 * 1000;
        if (age < cooldownMs) {
            const waitSec = Math.ceil((cooldownMs - age) / 1000);
            res.status(429).json({
                error: `Please wait ${waitSec} second${waitSec !== 1 ? 's' : ''} before requesting a new OTP.`,
                waitSeconds: waitSec,
            });
            return;
        }
    }

    // ── Generate OTP(s) ──────────────────────────────────────────────────────
    const emailOtp = Math.floor(100000 + Math.random() * 900000).toString();
    // phoneOtp is NOT generated here — it will be generated and sent after email is verified

    try {
        await OTP.findOneAndUpdate(
            { email: email.toLowerCase().trim() },
            {
                otp: emailOtp,
                phoneOtp: null,               // will be populated after email verification
                phoneNumber: smsPhone ?? null, // store phone so we know where to send SMS later
                createdAt: new Date(),
                attempts: 0,
                phoneAttempts: 0,
                locked: false,
                phoneLocked: false,
            },
            { upsert: true }
        );

        // ── Send email OTP only ──────────────────────────────────────────────
        await sendEmail(email, 'Your Email Verification Code - UNIEVAL',
            `<div style="font-family:sans-serif;padding:20px;max-width:480px;margin:0 auto;">
                <h2 style="color:#4f46e5;margin-bottom:8px;">Email Verification Code</h2>
                <p style="color:#374151;margin-bottom:16px;">Use the code below to verify your <strong>email address</strong>. It expires in <strong>10 minutes</strong>.</p>
                <div style="background:#f3f4f6;border-radius:12px;padding:24px;text-align:center;margin-bottom:16px;">
                    <span style="font-size:36px;font-weight:800;letter-spacing:10px;color:#111827;font-family:monospace;">${emailOtp}</span>
                </div>
                <p style="color:#9ca3af;font-size:12px;">If you did not request this, please ignore this email.</p>
            </div>`
        );
        // SMS will be sent automatically once email OTP is verified (see verifyAndConsumeOtp)

        const masked = email.replace(/(.)(.*)(@.*)/, (_, a, b, c) => a + '*'.repeat(Math.max(b.length - 2, 2)) + b.slice(-1) + c);
        res.json({
            message: 'OTP sent successfully',
            sentTo: masked,
            smsOtpSent: false, // SMS not sent yet — triggered after email verification
        });
    } catch (err) {
        logger.error('[Auth] sendOtp:', err);
        res.status(500).json({ error: 'An internal error occurred' });
    }
}

export async function resetPasswordByPhone(req: express.Request, res: express.Response): Promise<void> {
    const phoneNumber = req.body.phoneNumber as string;
    const otp = req.body.otp as string;
    const newPassword = req.body.newPassword as string;

    if (!phoneNumber || !otp || !newPassword) {
        res.status(400).json({ error: 'Mobile number, OTP, and new password are required' }); return;
    }
    const pwCheck = validatePassword(newPassword);
    if (!pwCheck.valid) { res.status(400).json({ error: pwCheck.error }); return; }

    const user = await findUserByPhone(phoneNumber);
    if (!user) { res.status(404).json({ error: 'No account found with this mobile number' }); return; }

    const result = await verifyAndConsumeOtp(user.email, otp);
    if (!result.ok) { res.status(result.status ?? 400).json({ error: result.error }); return; }

    try {
        user.password = await bcrypt.hash(newPassword, 12);
        await user.save();
        res.json({ success: true, message: 'Password reset successfully' });
    } catch (err) {
        logger.error('[Auth] resetPasswordByPhone:', err);
        res.status(500).json({ error: 'An internal error occurred' });
    }
}

export async function verifyOtp(req: express.Request, res: express.Response): Promise<void> {
    const email = req.body.email as string;
    const otp = req.body.otp as string;
    if (!email || !otp) { res.status(400).json({ error: 'Email and OTP are required' }); return; }

    const result = await verifyAndConsumeOtp(email, otp);
    if (!result.ok) { res.status(result.status ?? 400).json({ error: result.error }); return; }
    res.json({ success: true });
}

export async function resetPassword(req: express.Request, res: express.Response): Promise<void> {
    const email = req.body.email as string;
    const otp = req.body.otp as string;
    const newPassword = req.body.newPassword as string;

    if (!email || !otp || !newPassword) {
        res.status(400).json({ error: 'Email, OTP, and new password are required' }); return;
    }
    const pwCheck = validatePassword(newPassword);
    if (!pwCheck.valid) { res.status(400).json({ error: pwCheck.error }); return; }

    const result = await verifyAndConsumeOtp(email, otp);
    if (!result.ok) { res.status(result.status ?? 400).json({ error: result.error }); return; }

    try {
        const user = await findUserByEmail(email);
        if (user) {
            user.password = await bcrypt.hash(newPassword, 12);
            await user.save();
        }
        res.json({ success: true, message: 'Password reset successfully' });
    } catch (err) {
        logger.error('[Auth] resetPassword:', err);
        res.status(500).json({ error: 'An internal error occurred' });
    }
}

// ─── Verify Phone OTP (signup only) ──────────────────────────────────────────
export async function verifyPhoneOtp(req: express.Request, res: express.Response): Promise<void> {
    const email = req.body.email as string;
    const otp   = req.body.otp as string;

    if (!email || !otp) { res.status(400).json({ error: 'Email and OTP are required' }); return; }

    const record = await OTP.findOne({ email: email.toLowerCase().trim() });
    if (!record || !(record as any).phoneOtp) {
        res.status(400).json({ error: 'No mobile OTP found. Please restart signup.' }); return;
    }
    if ((record as any).phoneLocked) {
        res.status(429).json({ error: 'Too many failed attempts. Please request a new OTP.' }); return;
    }

    const age = Date.now() - new Date(record.createdAt).getTime();
    if (age > 10 * 60 * 1000) {
        await OTP.deleteOne({ _id: record._id });
        res.status(400).json({ error: 'OTP has expired. Please request a new one.' }); return;
    }

    if ((record as any).phoneOtp !== otp) {
        const phoneAttempts = ((record as any).phoneAttempts || 0) + 1;
        if (phoneAttempts >= 5) {
            await OTP.findOneAndUpdate({ _id: record._id }, { phoneAttempts, phoneLocked: true });
            res.status(429).json({ error: 'Too many failed attempts. Please request a new OTP.' }); return;
        }
        await OTP.findOneAndUpdate({ _id: record._id }, { phoneAttempts });
        res.status(400).json({ error: `Invalid OTP. ${5 - phoneAttempts} attempt(s) remaining.` }); return;
    }

    // Both email and phone are now verified — delete the whole record
    await OTP.deleteOne({ _id: record._id });
    res.json({ success: true });
}