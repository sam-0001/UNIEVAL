import { Course, Note, Quiz, Viva, Subject } from '../../types';
import { fetchJson, authHeaders, unwrapList } from './client';

// ─── Subjects ─────────────────────────────────────────────────────────────────

export const subjectApi = {
    getAll: (branch?: string, year?: number) => {
        const params = new URLSearchParams();
        if (branch) params.append('branch', branch);
        if (year)   params.append('year', year.toString());
        return fetchJson<Subject[]>(`/subjects?${params}`);
    },

    create: (name: string, branch: string, year: number, code?: string) =>
        fetchJson<Subject>('/subjects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify({ name, branch, year, code })
        }),
};

// ─── Courses ──────────────────────────────────────────────────────────────────

export const courseApi = {
    getAll: async (subjectId?: string): Promise<Course[]> => {
        const params = new URLSearchParams({ limit: '100' });
        if (subjectId) params.append('subjectId', subjectId);
        return unwrapList(await fetchJson<{ data: Course[] } | Course[]>(`/courses?${params}`));
    },

    getById: (id: string) =>
        fetchJson<Course>(`/courses/${id}`).catch(() => undefined),

    create: (course: Omit<Course, 'id' | 'createdAt'>) =>
        fetchJson<Course>('/courses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify(course)
        }),

    update: (course: Course) =>
        fetchJson<Course>(`/courses/${course.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify(course)
        }),

    delete: (id: string) =>
        fetchJson<void>(`/courses/${id}`, { method: 'DELETE', headers: authHeaders() }),
};

// ─── Notes ────────────────────────────────────────────────────────────────────

export const noteApi = {
    getAll: async (subjectId?: string): Promise<Note[]> => {
        const params = new URLSearchParams({ limit: '100' });
        if (subjectId) params.append('subjectId', subjectId);
        return unwrapList(await fetchJson<{ data: Note[] } | Note[]>(`/notes?${params}`));
    },

    getById: (id: string) =>
        fetchJson<Note>(`/notes/${id}`).catch(() => undefined),

    create: (note: Omit<Note, 'id' | 'uploadedAt'>) =>
        fetchJson<Note>('/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify(note)
        }),

    update: (note: Note) =>
        fetchJson<Note>(`/notes/${note.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify(note)
        }),

    delete: (id: string) =>
        fetchJson<void>(`/notes/${id}`, { method: 'DELETE', headers: authHeaders() }),

    purchaseFree: async (noteId: string): Promise<import('../../types').User> => {
        const res = await fetchJson<{ success: boolean; user: import('../../types').User }>(`/notes/${noteId}/purchase`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify({})
        });
        return res.user;
    },

    createOrder: (noteId: string) =>
        fetchJson<{ orderId?: string; amount?: number; currency?: string; appId?: string; devMode?: boolean; user?: import('../../types').User }>(`/notes/${noteId}/create-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
        }),

    verifyPurchase: (noteId: string, data: { cashfree_order_id: string; cashfree_payment_session_id: string;  }) =>
        fetchJson<{ success: boolean; user: import('../../types').User }>(`/notes/${noteId}/verify-purchase`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify(data),
        }),
};

// ─── Quizzes ──────────────────────────────────────────────────────────────────

export const quizApi = {
    getAll: async (subjectId?: string): Promise<Quiz[]> => {
        const params = new URLSearchParams({ limit: '100' });
        if (subjectId) params.append('subjectId', subjectId);
        return unwrapList(await fetchJson<{ data: Quiz[] } | Quiz[]>(`/quizzes?${params}`));
    },

    getById: (id: string) =>
        fetchJson<Quiz>(`/quizzes/${id}`).catch(() => undefined),

    create: (quiz: Omit<Quiz, 'id'>) =>
        fetchJson<Quiz>('/quizzes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify(quiz)
        }),

    update: (quiz: Quiz) =>
        fetchJson<Quiz>(`/quizzes/${quiz.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify(quiz)
        }),

    delete: (id: string) =>
        fetchJson<void>(`/quizzes/${id}`, { method: 'DELETE', headers: authHeaders() }),
};

// ─── Vivas ────────────────────────────────────────────────────────────────────

export const vivaApi = {
    getAll: async (subjectId?: string): Promise<Viva[]> => {
        const params = new URLSearchParams({ limit: '100' });
        if (subjectId) params.append('subjectId', subjectId);
        return unwrapList(await fetchJson<{ data: Viva[] } | Viva[]>(`/vivas?${params}`));
    },

    getById: (id: string) =>
        fetchJson<Viva>(`/vivas/${id}`).catch(() => undefined),

    create: (viva: Omit<Viva, 'id'>) =>
        fetchJson<Viva>('/vivas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify(viva)
        }),

    update: (viva: Viva) =>
        fetchJson<Viva>(`/vivas/${viva.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify(viva)
        }),

    delete: (id: string) =>
        fetchJson<void>(`/vivas/${id}`, { method: 'DELETE', headers: authHeaders() }),
};
