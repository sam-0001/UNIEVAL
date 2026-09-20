# Project Audit & Fix Report

## 1. Project Health Status
| Component | Status | Critical Issues | P0/P1 Blockers |
|-----------|--------|-----------------|----------------|
| **Build & Compilation** | ✅ Passing | 0 | None (Fixed missing daily-js dep) |
| **Test Suite** | ✅ Passing | 0 | None (Fixed 4 failing tests) |
| **Frontend/UI** | ⚠️ Warning | 2 (Fixed) | `object-cover` issues on thumbnails (Fixed) |
| **Backend API** | ❌ Error | 2 (Fixed) | Cashfree webhook replay attack (Fixed) |
| **Database/Models** | ⚠️ Warning | 1 | Duplicate model declarations (`models.ts` vs `models/index.ts`) |
| **Scheduler/Cron** | ❌ Error | 1 (Fixed) | 6-month access revocation bug (Fixed) |
| **Security/Auth** | ✅ Passing | 0 | None |

## 2. Severity Categories & Bug Record

### P0 - Critical Blockers
*None currently active. (Build and Tests were failing, but have been resolved).*

### P1 - High Priority (Fixed during audit)
* **BUG-001 (Backend/Payments):** Replay Attack on Credit Verification.
  - **Issue:** The `/api/credits/verify-payment` endpoint incremented credits without checking if the Cashfree `orderId` had already been processed. A malicious user could repeatedly call this endpoint with the same valid order signature to gain infinite credits.
  - **Fix:** Refactored `verifyCreditPayment` in `user.controller.ts` to check the `Purchase` collection for the `cashfreeOrderId` inside a MongoDB transaction. If it exists, it aborts the transaction. It now also creates the `Purchase` record correctly.
* **BUG-002 (Scheduler/Data Loss):** Unintended Course Revocation.
  - **Issue:** The `runDailyReset` function in `scheduler.service.ts` queried `Purchase.find({ createdAt: { $lt: sixMonthsAgo } })` and unilaterally revoked the user's access to the product. If a user had re-purchased or extended a course within the last 6 months, the cron job would still see the original expired purchase and revoke their active access.
  - **Fix:** Added a check inside the scheduler loop: `Purchase.findOne({ userId, productId, createdAt: { $gte: sixMonthsAgo } })`. If a newer purchase exists, the revocation is skipped.
* **BUG-003 (Backend/Payments):** Undefined `keyId` in Credit Order Response.
  - **Issue:** `createCreditOrder` returned `res.json({ orderId: order.id, ... keyId })`. Cashfree returns `order_id`, and `keyId` was entirely undefined, causing a ReferenceError at runtime when trying to purchase credits.
  - **Fix:** Corrected mapping to `order.order_id`, `order.payment_session_id`, and `order.order_amount`.

### P2 - Medium Priority
* **TECH-DEBT-001 (Database Models):** Duplicate Schema Registrations.
  - **Issue:** Models are declared and registered in both `server/models.ts` and individual files in `server/models/*.model.ts`. While `mongoose.models.User || mongoose.model(...)` prevents outright crashes, this creates multiple sources of truth. `liveClassController.ts` imports from `models.ts` while everything else imports from `models/index.ts` (barrel pattern).
  - **Recommendation:** Complete the migration to the barrel pattern. Delete `server/models.ts` and move the remaining LiveClass schemas into `server/models/liveClass.model.ts`, exporting them via `index.ts`.

### P3 - Low Priority / UI Improvements (Fixed)
* **BUG-004 (Frontend/UI):** Thumbnail Cropping.
  - **Issue:** The `AGENTS.md` guidelines explicitly forbid using `object-cover` for user-uploaded thumbnails (like `course.thumbnailUrl`), but it was being used in `Profile.tsx` and `AdminDashboard.tsx`.
  - **Fix:** Ran a global substitution replacing `object-cover` with `object-contain` in `Profile.tsx` and `AdminDashboard.tsx`.

## 3. General Architecture Observations
- **Encryption & Video Delivery:** The architecture separates the video segments (`.ts`) on R2 from the encryption keys in MongoDB. The keys are served dynamically with entitlement checks via `/api/video/key/:videoId`. This correctly implements secure AES-128 HLS streaming.
- **File Proxy:** PDF and document access is securely proxied via `/api/secure-file-raw/:fileId` which decrypts the AES-256-GCM payload in memory. This prevents direct sharing of R2 bucket URLs.
- **Caching:** The Redis fallback mechanism (`cache.service.ts`) with TTL jitter is robust and prevents cache stampedes.

## 4. Next Steps for Development
1. **Model Refactoring:** Execute the cleanup of `server/models.ts` to eliminate duplicate model schemas (TECH-DEBT-001).
2. **Feature Development:** The baseline is now stable, secure, and 100% passing tests. Ready for new feature implementation.
