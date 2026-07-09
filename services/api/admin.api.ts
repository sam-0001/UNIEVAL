import { User, UserRole } from '../../types';
import { fetchJson, authHeaders } from './client';

export const adminApi = {
    getUsers: (search?: string, role?: UserRole, page: number = 1, limit: number = 20) => {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString()
        });
        if (search) params.append('search', search);
        if (role) params.append('role', role);
        
        return fetchJson<{ data: User[]; total: number; totalPages: number }>(`/admin/users?${params.toString()}`, {
            headers: authHeaders()
        });
    },

    updateCredits: (userId: string, credits: number) =>
        fetchJson<User>(`/admin/users/${userId}/credits`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify({ credits })
        }),

    grantAccess: (userId: string, itemId: string, type: 'course' | 'note') =>
        fetchJson<User>(`/admin/users/${userId}/access`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify({ itemId, type })
        }),

    revokeAccess: (userId: string, itemId: string, type: 'course' | 'note') =>
        fetchJson<User>(`/admin/users/${userId}/access`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify({ itemId, type })
        })
};
