# Project Context

## Purpose
This document provides high-level context on the UniEval project architecture and business logic. It serves as an orientation guide for developers and agents.

## Platform Summary
UniEval is an educational platform offering Courses (video), Notes (PDF/Docs), Quizzes, and Vivas. Users consist of Students, Teachers, Admins, and Super Admins. It includes monetization through Cashfree, enabling individual purchases or credit-based usage.

## Architecture
- **Frontend:** React SPA built with Vite.
- **Backend:** Express API, serving the static frontend in production.
- **Database:** MongoDB via Mongoose.
- **Caching:** Redis with a memory fallback.
- **Storage:** Cloudflare R2 for heavy assets.
- **Video Delivery:** FFmpeg processes videos into AES-128 encrypted HLS streams. The `.m3u8` playlists and `.ts` segments reside on R2, while the decryption keys reside in MongoDB, gated by auth checks.
- **Document Delivery:** Notes are AES-256-GCM encrypted and stored in R2. The server decrypts them in-memory and serves them directly to the client to prevent saving or direct URL sharing.

## Recent Audit
The project underwent a deep bug audit (see `PROJECT_AUDIT.md`) which stabilized the test suite, fixed critical payment/subscription bugs, and corrected UI deviations.
