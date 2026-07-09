import { User, UserRole, Subject, Course, Note, Quiz, Viva } from '../types';

const API_BASE = '/api';

// Returns Authorization Bearer header from stored JWT token
function authHeaders(): Record<string, string> {
  try {
    const token = localStorage.getItem('token');
    if (token) return { 'Authorization': `Bearer ${token}` };
  } catch {}
  return {};
}

async function fetchJson<T>(url: string, options?: RequestInit, timeoutMs = 15000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${API_BASE}${url}`, { ...options, signal: controller.signal });
    if (!response.ok) {
      // Try to parse JSON error body; fall back to status-based messages
      let errorMessage: string;
      try {
        const body = await response.json();
        errorMessage = body.error || body.message || `Request failed with status ${response.status}`;
      } catch {
        // Response was not JSON (e.g. Nginx HTML error page)
        if (response.status === 429) {
          errorMessage = 'Too many login attempts. Please wait a few minutes and try again.';
        } else if (response.status === 401) {
          errorMessage = 'Invalid email or password.';
        } else if (response.status === 404) {
          errorMessage = 'Account not found.';
        } else if (response.status >= 500) {
          errorMessage = 'Server error. Please try again shortly.';
        } else {
          errorMessage = `Request failed (${response.status}). Please try again.`;
        }
      }
      throw new Error(errorMessage);
    }
    return response.json();
  } catch (err: any) {
    if (err.name === 'AbortError') throw new Error('Request timed out. Please try again.');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  login: async (email: string, password?: string): Promise<{ token: string; user: User }> => {
    return fetchJson<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
  },

  loginWithPhone: async (phoneNumber: string, password: string): Promise<{ token: string; user: User }> => {
    return fetchJson<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber, password })
    });
  },

  checkPhone: async (phoneNumber: string): Promise<{ exists: boolean }> => {
    return fetchJson<{ exists: boolean }>('/auth/check-phone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber })
    });
  },

  register: async (name: string, email: string, role: UserRole, password?: string, phoneNumber?: string): Promise<{ token: string; user: User }> => {
    return fetchJson<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, role, password, phoneNumber })
    });
  },

  // FIX: Dedicated super admin OTP-based login — does NOT require a password.
  // Verifies OTP server-side and issues a JWT token directly.
  superAdminLogin: async (email: string, otp: string): Promise<{ token: string; user: User }> => {
    return fetchJson<{ token: string; user: User }>('/auth/super-admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp })
    });
  },

  getTeachers: async (): Promise<User[]> => {
    return fetchJson<User[]>('/users/teachers');
  },

  updateUser: async (user: User): Promise<User> => {
    return fetchJson<User>(`/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(user)
    });
  },

  getTeacherStats: async (teacherId: string): Promise<{ totalProducts: number; totalRevenue: number }> => {
    return fetchJson<{ totalProducts: number; totalRevenue: number }>(`/teachers/${teacherId}/stats`, {
      headers: authHeaders()
    });
  },

  getSubjects: async (branch?: string, year?: number): Promise<Subject[]> => {
    const params = new URLSearchParams();
    if (branch) params.append('branch', branch);
    if (year) params.append('year', year.toString());
    return fetchJson<Subject[]>(`/subjects?${params.toString()}`);
  },

  createSubject: async (name: string, branch: string, year: number, code?: string): Promise<Subject> => {
    return fetchJson<Subject>('/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ name, branch, year, code })
    });
  },

  getCourses: async (subjectId?: string): Promise<Course[]> => {
    const params = new URLSearchParams();
    if (subjectId) params.append('subjectId', subjectId);
    params.append('limit', '100');
    const res = await fetchJson<{ data: Course[] } | Course[]>(`/courses?${params.toString()}`);
    return Array.isArray(res) ? res : (res as { data: Course[] }).data ?? [];
  },

  getNotes: async (subjectId?: string): Promise<Note[]> => {
    const params = new URLSearchParams();
    if (subjectId) params.append('subjectId', subjectId);
    params.append('limit', '100');
    const res = await fetchJson<{ data: Note[] } | Note[]>(`/notes?${params.toString()}`);
    return Array.isArray(res) ? res : (res as { data: Note[] }).data ?? [];
  },

  getNoteById: async (noteId: string): Promise<Note | undefined> => {
    return fetchJson<Note>(`/notes/${noteId}`).catch(() => undefined);
  },

  purchaseNote: async (userId: string, noteId: string): Promise<User> => {
    const res = await fetchJson<{ success: boolean; user: User; message: string }>(`/notes/${noteId}/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ userId })
    });
    return res.user;
  },

  createNoteOrder: async (noteId: string, couponId?: string): Promise<{ orderId?: string; amount?: number; currency?: string; keyId?: string; devMode?: boolean; user?: User; couponId?: string | null; discountAmount?: number }> => {
    return fetchJson(`/notes/${noteId}/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ couponId }),
    });
  },

  verifyNotePurchase: async (noteId: string, data: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string; couponId?: string }): Promise<{ success: boolean; user: User }> => {
    return fetchJson(`/notes/${noteId}/verify-purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    });
  },

  // ─── Course purchase (with coupon support) ──────────────────────────────────
  enrollCourseFree: async (courseId: string): Promise<{ success: boolean; user: User; message: string }> => {
    return fetchJson(`/courses/${courseId}/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
    });
  },

  createCourseOrder: async (courseId: string, couponId?: string): Promise<{ orderId?: string; amount?: number; currency?: string; keyId?: string; devMode?: boolean; user?: User; couponId?: string | null; discountAmount?: number }> => {
    return fetchJson(`/courses/${courseId}/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ couponId }),
    });
  },

  verifyCoursePayment: async (courseId: string, data: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string; couponId?: string }): Promise<{ success: boolean; user: User }> => {
    return fetchJson(`/courses/${courseId}/verify-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    });
  },

  validateCoupon: async (
    code: string,
    productId: string,
  ): Promise<{
    valid: boolean;
    couponId?: string;
    discountType?: 'flat' | 'percent';
    discountValue?: number;
    originalPrice?: number;
    discountedPrice?: number;
    savings?: number;
    error?: string;
  }> => {
    return fetchJson('/coupons/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ code, productId }),
    });
  },

  createCoupon: async (data: {
    code: string;
    productId: string;
    productType: 'note' | 'course';
    discountType: 'flat' | 'percent';
    discountValue: number;
    maxUses: number | null;
    expiresAt: string | null;
  }): Promise<object> => {
    return fetchJson('/coupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    });
  },

  getCouponsForProduct: async (productId: string): Promise<any[]> => {
    return fetchJson(`/coupons/product/${productId}`, { headers: authHeaders() });
  },

  deactivateCoupon: async (couponId: string): Promise<object> => {
    return fetchJson(`/coupons/${couponId}/deactivate`, { method: 'PATCH', headers: authHeaders() });
  },

  activateCoupon: async (couponId: string): Promise<object> => {
    return fetchJson(`/coupons/${couponId}/activate`, { method: 'PATCH', headers: authHeaders() });
  },

  getQuizzes: async (subjectId?: string): Promise<Quiz[]> => {
    const params = new URLSearchParams();
    if (subjectId) params.append('subjectId', subjectId);
    params.append('limit', '100');
    const res = await fetchJson<{ data: Quiz[] } | Quiz[]>(`/quizzes?${params.toString()}`);
    return Array.isArray(res) ? res : (res as { data: Quiz[] }).data ?? [];
  },

  getQuizById: async (quizId: string): Promise<Quiz | undefined> => {
    return fetchJson<Quiz>(`/quizzes/${quizId}`).catch(() => undefined);
  },

  getViva: async (subjectId?: string): Promise<Viva[]> => {
    const params = new URLSearchParams();
    if (subjectId) params.append('subjectId', subjectId);
    params.append('limit', '100');
    const res = await fetchJson<{ data: Viva[] } | Viva[]>(`/vivas?${params.toString()}`);
    return Array.isArray(res) ? res : (res as { data: Viva[] }).data ?? [];
  },

  getVivaById: async (vivaId: string): Promise<Viva | undefined> => {
    return fetchJson<Viva>(`/vivas/${vivaId}`).catch(() => undefined);
  },

  getCourseById: async (courseId: string): Promise<Course | undefined> => {
    return fetchJson<Course>(`/courses/${courseId}`).catch(() => undefined);
  },

  createCourse: async (course: Omit<Course, 'id' | 'createdAt'>): Promise<Course> => {
    return fetchJson<Course>('/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(course)
    });
  },

  updateCourse: async (course: Course): Promise<Course> => {
    return fetchJson<Course>(`/courses/${course.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(course)
    });
  },

  deleteCourse: async (courseId: string): Promise<void> => {
    return fetchJson<void>(`/courses/${courseId}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
  },

  createNote: async (note: Omit<Note, 'id' | 'uploadedAt'>): Promise<Note> => {
    return fetchJson<Note>('/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(note)
    });
  },

  updateNote: async (note: Note): Promise<Note> => {
    return fetchJson<Note>(`/notes/${note.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(note)
    });
  },

  deleteNote: async (noteId: string): Promise<void> => {
    return fetchJson<void>(`/notes/${noteId}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
  },

  createQuiz: async (quiz: Omit<Quiz, 'id'>): Promise<Quiz> => {
    return fetchJson<Quiz>('/quizzes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(quiz)
    });
  },

  updateQuiz: async (quiz: Quiz): Promise<Quiz> => {
    return fetchJson<Quiz>(`/quizzes/${quiz.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(quiz)
    });
  },

  deleteQuiz: async (quizId: string): Promise<void> => {
    return fetchJson<void>(`/quizzes/${quizId}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
  },

  createViva: async (viva: Omit<Viva, 'id'>): Promise<Viva> => {
    return fetchJson<Viva>('/vivas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(viva)
    });
  },

  updateViva: async (viva: Viva): Promise<Viva> => {
    return fetchJson<Viva>(`/vivas/${viva.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(viva)
    });
  },

  deleteViva: async (vivaId: string): Promise<void> => {
    return fetchJson<void>(`/vivas/${vivaId}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
  },

  // --- OTP & PASSWORD RESET ---

  sendOTP: async (
    email: string,
    options?: { phoneNumber?: string; mode?: string }
  ): Promise<{ message: string; sentTo: string; smsSent?: boolean }> => {
    return fetchJson<{ message: string; sentTo: string; smsSent?: boolean }>('/auth/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        phoneNumber: options?.phoneNumber,
        mode: options?.mode,
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

  verifyPhoneOTP: async (email: string, otp: string): Promise<boolean> => {
    const res = await fetchJson<{ success: boolean }>('/auth/otp/verify-phone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp })
    });
    return res.success;
  },

  resetPassword: async (email: string, otp: string, newPassword: string): Promise<void> => {
    await fetchJson<{ success: boolean }>('/auth/password/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, newPassword })
    });
  },

  sendOtpByPhone: async (phoneNumber: string): Promise<{ message: string; sentTo: string }> => {
    return fetchJson<{ message: string; sentTo: string }>('/auth/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber })
    });
  },

  resetPasswordByPhone: async (phoneNumber: string, otp: string, newPassword: string): Promise<void> => {
    await fetchJson<{ success: boolean }>('/auth/password/reset-by-phone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber, otp, newPassword })
    });
  },

  // --- AWS / UPLOAD SERVICES ---

  getPresignedUrl: async (fileName: string, fileType: string, fileSize: number, isVideo = true): Promise<{ uploadUrl: string; publicUrl: string; key: string }> => {
    return fetchJson<{ uploadUrl: string; publicUrl: string; key: string }>('/upload/r2-presigned-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ fileName, fileType, fileSize, isVideo })
    });
  },

  processVideo: async (videoUrl: string, videoKey: string): Promise<{ message: string; videoId: string; url: string }> => {
    return fetchJson<{ message: string; videoId: string; url: string }>('/process-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ videoUrl, videoKey })
    });
  },

  getVideoStatus: async (videoId: string): Promise<{ status: 'processing' | 'finalizing' | 'ready' | 'error'; progress: number; url?: string; error?: string }> => {
    return fetchJson<{ status: 'processing' | 'finalizing' | 'ready' | 'error'; progress: number; url?: string; error?: string }>(`/video/status?videoId=${videoId}`, {
      headers: authHeaders()
    });
  },

  deleteFiles: async (urls: string[]): Promise<{ success: boolean; message: string }> => {
    return fetchJson<{ success: boolean; message: string }>('/delete-files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ urls })
    });
  },

  // ── Credit System ──
  getCredits: async (): Promise<{ credits: number; freeQuizUsed: number; freeQuizLimit: number; unlimitedPlan: { active: boolean; expiresAt: string | null } }> => {
    return fetchJson('/credits', { headers: authHeaders() });
  },

  consumeCredit: async (): Promise<{ ok: boolean; method: 'free' | 'credit' | 'unlimited'; credits: number; freeQuizUsed: number }> => {
    return fetchJson('/credits/consume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() }
    });
  },

  createCreditOrder: async (plan: string): Promise<{ orderId?: string; amount?: number; currency?: string; keyId?: string; devMode?: boolean; ok?: boolean; credits?: number }> => {
    return fetchJson('/credits/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ plan })
    });
  },

  verifyCreditPayment: async (data: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string; plan: string }): Promise<{ ok: boolean; credits?: number; unlimitedPlan?: { active: boolean; expiresAt: string } }> => {
    return fetchJson('/credits/verify-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data)
    });
  },

  // ── Payout System ──
  getTeachersWithStats: async (): Promise<any[]> => {
    return fetchJson('/payout/teachers-with-stats', { headers: authHeaders() });
  },

  createPayout: async (teacherId: string): Promise<{ payout: any; upiString: string; qrUrl: string }> => {
    return fetchJson('/payout/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ teacherId }),
    });
  },

  confirmPayout: async (payoutId: string, transactionId: string): Promise<{ success: boolean; payout: any }> => {
    return fetchJson('/payout/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ payoutId, transactionId }),
    });
  },

  getTeacherPayoutHistory: async (teacherId: string): Promise<{ payouts: any[]; stats: any }> => {
    return fetchJson(`/payout/teacher/${teacherId}`, { headers: authHeaders() });
  },

  // ── Single-device session ──
  checkSession: async (): Promise<{ valid: boolean }> => {
    return fetchJson('/auth/session-check', { headers: authHeaders() });
  },

  // FIX: Fetch fresh user data from server so admin-granted access reflects
  // immediately without requiring the student to log out and back in.
  getMe: async (): Promise<User> => {
    return fetchJson<User>('/auth/me', { headers: authHeaders() });
  },

  serverLogout: async (): Promise<void> => {
    await fetchJson('/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() }
    });
  },

  // ── Admin / Super Admin ──
  getUsers: async (search?: string, role?: string, page: number = 1, limit: number = 50): Promise<{ data: User[]; total: number; totalPages: number }> => {
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
    if (search) params.append('search', search);
    if (role) params.append('role', role);
    return fetchJson(`/admin/users?${params.toString()}`, { headers: authHeaders() });
  },

  updateUserCredits: async (userId: string, credits: number): Promise<User> => {
    return fetchJson(`/admin/users/${userId}/credits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ credits })
    });
  },

  grantAccess: async (userId: string, itemId: string, type: 'course' | 'note'): Promise<User> => {
    return fetchJson(`/admin/users/${userId}/access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ itemId, type })
    });
  },

  revokeAccess: async (userId: string, itemId: string, type: 'course' | 'note'): Promise<User> => {
    return fetchJson(`/admin/users/${userId}/access`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ itemId, type })
    });
  },

  /**
   * Returns the secure proxy URL for a note file.
   * The real R2 URL is NEVER sent to the browser — the server fetches it and streams it.
   * Append the JWT so the server can authenticate the streaming request.
   */
  getSecureFileUrl: (noteId: string, fileId: string): string => {
    const token = (() => { try { return localStorage.getItem('token') || ''; } catch { return ''; } })();
    return `${API_BASE}/secure-file/${noteId}/${fileId}?t=${encodeURIComponent(token)}`;
  },
};