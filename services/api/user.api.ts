import { User } from '../../types';
import { fetchJson, authHeaders } from './client';

// ─── Users ────────────────────────────────────────────────────────────────────

export const userApi = {
    getTeachers: () =>
        fetchJson<User[]>('/users/teachers'),

    update: (user: User) =>
        fetchJson<User>(`/users/${user.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify(user)
        }),

    getTeacherStats: (teacherId: string) =>
        fetchJson<{ totalProducts: number; totalRevenue: number; totalUnitsSold: number; products: any[] }>(
            `/teachers/${teacherId}/stats`,
            { headers: authHeaders() }
        ),
};

// ─── Credits ──────────────────────────────────────────────────────────────────

export interface CreditsInfo {
    credits: number;
    freeQuizUsed: number;
    freeQuizLimit: number;
    unlimitedPlan: { active: boolean; expiresAt: string | null };
}

export const creditsApi = {
    get: () =>
        fetchJson<CreditsInfo>('/credits', { headers: authHeaders() }),

    consume: () =>
        fetchJson<{ ok: boolean; method: 'free' | 'credit' | 'unlimited'; credits: number; freeQuizUsed: number }>(
            '/credits/consume',
            { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() } }
        ),

    createOrder: (plan: string) =>
        fetchJson<{ orderId?: string; amount?: number; currency?: string; appId?: string; devMode?: boolean; ok?: boolean; credits?: number }>(
            '/credits/create-order',
            { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ plan }) }
        ),

    verifyPayment: (data: { cashfree_order_id: string; cashfree_payment_session_id: string; plan: string }) =>
        fetchJson<{ ok: boolean; credits?: number; unlimitedPlan?: { active: boolean; expiresAt: string } }>(
            '/credits/verify-payment',
            { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify(data) }
        ),
};

// ─── Payouts ──────────────────────────────────────────────────────────────────

export const payoutApi = {
    getTeachersWithStats: () =>
        fetchJson<any[]>('/payout/teachers-with-stats', { headers: authHeaders() }),

    create: (teacherId: string) =>
        fetchJson<{ payout: any; upiString: string; qrUrl: string }>('/payout/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify({ teacherId }),
        }),

    confirm: (payoutId: string, transactionId: string) =>
        fetchJson<{ success: boolean; payout: any }>('/payout/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify({ payoutId, transactionId }),
        }),

    getTeacherHistory: (teacherId: string) =>
        fetchJson<{ payouts: any[]; stats: any }>(`/payout/teacher/${teacherId}`, { headers: authHeaders() }),
};

// ─── Upload / Video ───────────────────────────────────────────────────────────

export const uploadApi = {
    getPresignedUrl: (fileName: string, fileType: string, fileSize: number, isVideo = true) =>
        fetchJson<{ uploadUrl: string; publicUrl: string; key: string }>('/upload/r2-presigned-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify({ fileName, fileType, fileSize, isVideo })
        }),

    processVideo: (videoUrl: string, videoKey: string) =>
        fetchJson<{ message: string; videoId: string; url: string }>('/process-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify({ videoUrl, videoKey })
        }),

    getVideoStatus: (videoId: string) =>
        fetchJson<{ status: 'processing' | 'finalizing' | 'ready' | 'error'; progress: number; url?: string; error?: string }>(
            `/video/status?videoId=${videoId}`,
            { headers: authHeaders() }
        ),

    deleteFiles: (urls: string[]) =>
        fetchJson<{ success: boolean; message: string }>('/delete-files', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify({ urls })
        }),
};
