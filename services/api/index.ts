/**
 * services/api/index.ts
 *
 * Single import point for all API calls.
 * Instead of `import { api } from '../services/api'` and calling `api.getCourses()`,
 * you can now import specific modules: `import { courseApi } from '../services/api'`
 *
 * The legacy `api` object is also exported for backward compatibility during migration.
 */
export { authApi }               from './auth.api';
export { subjectApi, courseApi, noteApi, quizApi, vivaApi } from './content.api';
export { userApi, creditsApi, payoutApi, uploadApi }        from './user.api';
export { adminApi }              from './admin.api';
export type { CreditsInfo }      from './user.api';
export { fetchJson, authHeaders } from './client';

// ─── Legacy compatibility shim ────────────────────────────────────────────────
// Keeps existing call sites (`api.getCourses()` etc.) working without changes.
// Remove once all call sites are migrated to the named modules above.
import { authApi }                                           from './auth.api';
import { subjectApi, courseApi, noteApi, quizApi, vivaApi } from './content.api';
import { userApi, creditsApi, payoutApi, uploadApi }        from './user.api';
import { adminApi }                                          from './admin.api';

export const api = {
    // Auth
    login:              authApi.login,
    register:           authApi.register,
    superAdminLogin:    authApi.superAdminLogin,
    sendOTP:            authApi.sendOTP,
    verifyOTP:          authApi.verifyOTP,
    resetPassword:      authApi.resetPassword,
    checkSession:       authApi.checkSession,
    serverLogout:       authApi.logout,

    // Admin
    getUsers:           adminApi.getUsers,
    updateUserCredits:  adminApi.updateCredits,
    grantAccess:        adminApi.grantAccess,
    revokeAccess:       adminApi.revokeAccess,

    // Users
    getTeachers:        userApi.getTeachers,
    updateUser:         userApi.update,
    getTeacherStats:    userApi.getTeacherStats,

    // Subjects
    getSubjects:        subjectApi.getAll,
    createSubject:      subjectApi.create,

    // Courses
    getCourses:         courseApi.getAll,
    getCourseById:      courseApi.getById,
    createCourse:       courseApi.create,
    updateCourse:       courseApi.update,
    deleteCourse:       courseApi.delete,

    // Notes
    getNotes:           noteApi.getAll,
    getNoteById:        noteApi.getById,
    createNote:         noteApi.create,
    updateNote:         noteApi.update,
    deleteNote:         noteApi.delete,
    purchaseNote:       noteApi.purchaseFree,
    createNoteOrder:    noteApi.createOrder,
    verifyNotePurchase: noteApi.verifyPurchase,

    // Quizzes
    getQuizzes:         quizApi.getAll,
    getQuizById:        quizApi.getById,
    createQuiz:         quizApi.create,
    updateQuiz:         quizApi.update,
    deleteQuiz:         quizApi.delete,

    // Vivas
    getViva:            vivaApi.getAll,
    getVivaById:        vivaApi.getById,
    createViva:         vivaApi.create,
    updateViva:         vivaApi.update,
    deleteViva:         vivaApi.delete,

    // Credits
    getCredits:         creditsApi.get,
    consumeCredit:      creditsApi.consume,
    createCreditOrder:  creditsApi.createOrder,
    verifyCreditPayment: creditsApi.verifyPayment,

    // Payouts
    getTeachersWithStats: payoutApi.getTeachersWithStats,
    createPayout:       payoutApi.create,
    confirmPayout:      payoutApi.confirm,
    getTeacherPayoutHistory: payoutApi.getTeacherHistory,

    // Upload
    getPresignedUrl:    uploadApi.getPresignedUrl,
    processVideo:       uploadApi.processVideo,
    getVideoStatus:     uploadApi.getVideoStatus,
    deleteFiles:        uploadApi.deleteFiles,
};
