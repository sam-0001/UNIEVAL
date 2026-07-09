import { User, UserRole } from '../../types';
import { fetchJson, authHeaders } from './client';

export const authApi = {
    login: (email: string, password: string) =>
        fetchJson<{ token: string; user: User }>('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        }),

    register: (name: string, email: string, role: UserRole, password: string, phoneNumber?: string) =>
        fetchJson<{ token: string; user: User }>('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, role, password, phoneNumber })
        }),

    superAdminLogin: (email: string, otp: string) =>
        fetchJson<{ token: string; user: User }>('/auth/super-admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp })
        }),

    /**
     * sendOTP
     *
     * @param email            - always required
     * @param options.mode     - "signup" → OTP sent to email + SMS
     *                           omitted   → email only (reset / other flows)
     * @param options.phoneNumber - required when mode="signup" so the server
     *                              can fire the SMS alongside the email.
     */
    sendOTP: async (
        email: string,
        options?: { phoneNumber?: string; mode?: 'signup' | 'default' }
    ): Promise<{ message: string; sentTo: string }> => {
        return fetchJson<{ message: string; sentTo: string }>('/auth/otp/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                phoneNumber: options?.phoneNumber,
                mode: options?.mode ?? 'default',
            })
        });
    },

    verifyOTP: async (email: string, otp: string): Promise<boolean> => {
        const res = await fetchJson<{ success: boolean }>('/auth/otp/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp })
        });
        return res.success;
    },

    resetPassword: (email: string, otp: string, newPassword: string) =>
        fetchJson<{ success: boolean }>('/auth/password/reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp, newPassword })
        }),

    checkSession: () =>
        fetchJson<{ valid: boolean }>('/auth/session-check', { headers: authHeaders() }),

    logout: () =>
        fetchJson<void>('/auth/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() }
        }),
};