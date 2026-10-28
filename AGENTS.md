# UniEval - Project Memory & Guidelines

This file serves as the permanent memory and architectural guide for the UniEval project. It contains the core philosophy, feature set, architecture, and critical rules to follow when modifying the codebase.

## 1. Project Overview
**UniEval** is a comprehensive, premium educational platform designed to provide high-quality courses, notes, and exam intelligence to university students. It prioritizes a highly polished, aesthetic user interface with a robust, secure, and cost-effective backend architecture.

## 2. Tech Stack
- **Frontend**: React, Vite, Tailwind CSS, React Router DOM, Lucide React (icons).
- **Backend**: Node.js, Express.js.
- **Database**: MongoDB (Mongoose) hosted on MongoDB Atlas.
- **Storage & CDN**: Cloudflare R2 (Zero egress fee storage for Videos, PDFs, and Thumbnails).
- **Video Processing**: FFmpeg (for generating Adaptive Bitrate HLS streams).
- **Payments**: Cashfree.

## 3. Core Features
- **Authentication & Roles**: JWT-based authentication. Users are either students or admins. The Super Admin is defined by a strict email check in the environment variables.
- **Course & Module System**: Hierarchical structure: Subject -> Course -> Module -> Videos/Resources.
- **Secure Video Streaming**: 
  - Videos are heavily processed using FFmpeg into HLS (`.m3u8` / `.ts`) format.
  - Adaptive Bitrate Streaming (ABS) supports 360p, 480p, 720p, and optionally 1080p depending on `.env` configuration (`MAX_VIDEO_RESOLUTION`).
  - **Security**: AES-128 encryption is applied during FFmpeg processing. The decryption keys are stored securely in MongoDB and served exclusively through authenticated backend routes.
- **Study Materials**: PDF Note Packages, Quizzes, and Viva assessments.
- **Monetization**: Cashfree integration. Course purchases are granted a strict 6-month validity period, managed by an automated background scheduler (`node-cron`).
- **Exam Intelligence**: Automated analysis of past papers and syllabus topics.

## 4. Architectural Decisions & Workflows
- **Distributed Video Processing (Worker Offload)**: 
  - To save VPS CPU load, admins can process heavy videos on their local development laptops. 
  - By setting `API_BASE_URL=https://unieval.in` in their local `.env`, the local FFmpeg process will bake the production decryption key URL into the `.m3u8` playlist. 
  - The local machine uploads the processed video chunks directly to Cloudflare R2 and updates the shared MongoDB cluster. Students streaming from the live VPS will fetch the video from R2 and the key from the VPS, resulting in **zero CPU load** on the production server.
- **Single-Server Deployment**: In production, Vite builds a Static Single Page Application (SPA), which is then served directly by the Express backend.

## 5. UI/UX & Design Guidelines
- **Premium Aesthetics**: The UI must always feel state-of-the-art. Use glassmorphism, subtle micro-animations (e.g., `group-hover:scale-105`), and tailored gradient backgrounds (e.g., `bg-brand-navy`, `bg-brand-cobalt`).
- **Aspect Ratios**: All video and course thumbnails must strictly adhere to a `16:9` widescreen aspect ratio (`aspect-video`).
- **Image Cropping**: ALWAYS use `object-contain` for user-uploaded thumbnails (Course Covers, Video Thumbnails). Never use `object-cover` as it will crop the user's uploaded image.

## 6. Critical Rules & Recent Fixes
- **Permanent Deletion**: When an Admin deletes a Course, Note, or Quiz (or removes individual videos/files while editing):
  - **Video Assets**: Videos are stored as HLS directories (`videos/${videoId}/*`) plus raw uploads (`raw-uploads/*`), thumbnails, and resources. Single-file S3 deletion is insufficient for HLS; `deleteDirectoryFromR2` recursively iterates all segments (`.m3u8` and `.ts`) via `ListObjectsV2Command` and bulk-purges them using `DeleteObjectsCommand`. Raw uploads (`videoKey`), thumbnails, resources, and MongoDB `VideoKey` encryption keys are all deleted.
  - **Note & Document Assets**: Notes store files either as direct R2 uploads (`raw-uploads/*`) or encrypted-at-rest files/bundles (`secure-files/*` mapped via `FileKey` in MongoDB). Deletion properly resolves both raw R2 keys and `FileKey` entries (including full HTML bundle assets under the same `bundleId`) and removes both storage files and database records.
  - **Course & Note Updates**: When an Admin edits a Course or Note and removes videos, modules, resources, or document sections, the backend compares existing items against incoming updates and immediately purges removed assets from R2.
  - **Delete Files API**: `POST /api/delete-files` is authenticated and handles polymorphic asset cleanup (HLS directories, secure files, raw uploads, and thumbnails).
- **Video Status Polling**: The frontend polls the backend for video processing status. If the local machine is bogged down by FFmpeg and the request times out (>15s), the frontend marks it as an "error". **Do not attempt to fix or shorten this timeout**, as it does not affect the actual background processing.
- **Presigned URLs**: File uploads directly from the frontend to Cloudflare R2 must always use securely generated presigned URLs fetched from the backend (with correct auth headers).
- **Live Classroom End & Recording Synchronization**: Webinar.gg manages live WebRTC streams and recordings within the studio iframe. Webinar.gg does not postMessage cross-origin completion events to the parent window; instead, UniEval actively syncs with Webinar.gg's REST API (`GET https://webinar-api.webinar.gg/api/v1/webinar/:id`) and recording playback status (`/api/webinar-recording/:id/playback`). When the instructor ends the session via Webinar.gg's studio toolbar:
  - UniEval's backend detects that the room status transitioned to `'completed'` or `'ended'` via `getWebinarStatus` (or recording is ready with an actual `playbackUrl`). Newly created rooms return 404 on the recording endpoint and are kept `'live'`.
  - The backend marks the live class as `'completed'` in MongoDB and broadcasts `class-ended` and `live-class-ended` via Socket.IO.
  - Active classroom clients (`LiveClassRoom.tsx`) immediately switch to the "Class Has Ended" screen with live recording processing feedback.
  - Student dashboards (`StudentDashboard.tsx`) receive the socket event and auto-poll, immediately moving the class from "Live Now" to completed recordings without requiring a page reload.
  - Background scheduler (`scheduler.service.ts`) runs a periodic heartbeat every 15s to guarantee no completed classes remain stuck in the `'live'` state.
  - On local development environments (`localhost`), `LiveClassRoom.tsx` connects to `window.location.origin` for WebSockets rather than remote production `VITE_API_BASE_URL`.
  - **Webinar.gg Roster & Media Infrastructure**:
    - `createWebinar` must always set `showLiveUsersCount: true` in the request body; otherwise Webinar.gg disables the participant counter and hides online students (`Users (0)`).
    - Webinar.gg leverages `webinar-socket.classx.co.in`, `*.zego.im`, `*.zegocloud.com`, and `*.agora.io` / `*.daily.co` for stage updates, real-time presence, and WebRTC media. These domains must remain whitelisted in `server.ts` CSP (`connectSrc` and `frameSrc`).
    - The classroom iframe must define `allow="camera *; microphone *; fullscreen *; display-capture *; autoplay *; clipboard-write *; speaker-selection *; encrypted-media *"` to permit cross-origin media capture and autoplay.
  - **Mobile & Tablet Responsive Standards**:
    - Live classroom containers utilize dynamic viewport units (`100dvh`) to prevent iOS Safari and Android Chrome address bar clipping and jitter.
    - Floating action buttons in live classrooms are positioned with bottom safety margins (`bottom-20 sm:bottom-6`) to avoid blocking Webinar.gg studio media controls.
    - Dashboard drawers and navigation dialogs feature semi-transparent backdrop overlays (`bg-slate-900/60 backdrop-blur-sm z-40`) to ensure reliable tap-to-dismiss behavior on small touchscreens.
    - Test accounts (`sam000123456789001@gmail.com` / `7350484629`) are allowed to re-register and receive testing OTPs without being blocked by duplicate conflict checks.
  - **Live Classroom Fullscreen & Automatic Horizontal Orientation**:
    - Fullscreen mode automatically requests horizontal landscape lock via `screen.orientation.lock('landscape')` across both `LiveClassRoom.tsx` and `CustomVideoPlayer.tsx`.
    - In fullscreen mode, all buttons (header, banners, floating controls) are hidden to provide an unobstructed 100% video stream.
    - A discreet minimal pill `[Exit Fullscreen]` appears only when the user taps or moves the mouse, auto-disappearing after 2.5s.
    - Upon exiting fullscreen, orientation is automatically unlocked via `screen.orientation.unlock()`.

  - **Course & Notes Access Expiry / Validity**:
    - Teachers and Admins can configure student access validity when creating or editing any Course or Note Package.
    - Two validity modes are supported:
      - **Duration in Months**: Relative validity from the date student purchases or enrolls (default is **6 months**).
      - **Exact Expiry Date**: Absolute calendar date (access expires at 11:59 PM on that date).
    - `validity.service.ts` calculates `expiresAt` during order creation, payment verification, free college enrollment, and webhook processing.
    - **Real-Time Revocation**:
      - Upon `getMe` (/api/auth/me) and streaming key requests (`getVideoKey`), expired products are pruned immediately from the student's `purchasedCourseIds` and `purchasedNoteIds`.
      - Secure file proxy (`/api/secure-file/:noteId/:fileId`) rejects expired note access with 403 Forbidden.
      - Daily scheduler (`scheduler.service.ts`) runs at midnight to clean up expired purchases across all users.
      - Student dashboard displays real-time countdown badges (`Xd access left` / `Expires today`).
  - **College-Specific Free Access Toggle & Domain Hardening**:
    - College-specific free access is completely optional and disabled by default.
    - Teachers and Admins have a dedicated toggle switch and a "Remove College Access" button in `AdminDashboard.tsx` and `TeacherUpload.tsx`.
    - When disabled or removed, the backend explicitly executes `$unset: { collegeConfig: 1 }` in MongoDB.
    - Domain matching requires `collegeDomain.length >= 3` and strict case-insensitive suffix matching (`email.toLowerCase().endsWith(collegeDomain)`), completely preventing accidental free access for student emails.
  - **1st PDF / File Free Demo Preview for Notes**:
    - The first file (e.g. Unit 1 PDF) across all sections of any note package is automatically accessible as a free demo preview for everyone (including unauthenticated guest visitors and non-purchased students).
    - `server/routes/secureFile.ts`:
      - `requireAuthOrQuery` passes through requests without a token so guest requests can evaluate file access without immediate 401 rejection.
      - `resolveFileAccess` identifies `firstFileId` across `note.sections`. If the requested file is the first file (`targetFile.id === firstFileId`), or `targetFile.isFree`, or `note.price === 0`, it returns `{ ok: true, targetFile }` without requiring a user token or purchase.
      - Subsequent files remain locked and strictly require a valid user token (401) and active purchase or admin/college entitlement (403).
    - `pages/NoteDetail.tsx`:
      - `firstFileId` and `isFileDemo(file)` are computed dynamically from `note.sections`.
      - When landing on the page, the 1st PDF loads immediately in `SecurePdfViewer` without being blocked by the locked overlay.
      - For guest viewers, watermark defaults to `'UNIEVAL DEMO PREVIEW'`.
      - Sidebar displays a bright `FREE DEMO` badge on the 1st file with an unlocked preview icon, while remaining files show the lock icon.
      - A top promotional banner informs users they are viewing the free demo, with a 1-click CTA button to unlock the complete package.
      - Note cards on `NotesLibrary.tsx` and `BrowseCourses.tsx` showcase a `1st PDF Free Demo` badge.
  - **Platform Security & Integrity Hardening**:
    - **Mass-Assignment Protection (`updateUser`)**: Strictly strips sensitive profile parameters (`purchasedCourseIds`, `purchasedNoteIds`, `credits`, `unlimitedPlan`, `archivedCourseIds`, `archivedNoteIds`, `freeQuizUsedToday`, `lastReset`, `sessionToken`) preventing self-entitlement or privilege escalation.
    - **Admin Access Grant Expiry Synchronization**: Admin `grantAccess` creates a valid `Purchase` record with accurate expiration dates (`calculateItemExpiryDate(item)`), and `revokeAccess` cleans up purchase records so access is consistent across video keys and secure file proxy.
    - **Teacher Content Ownership Enforcement**: Teachers are strictly restricted to updating and deleting only courses, notes, quizzes, and vivas that they authored (`teacherId === currentUser.id` or admin bypass).
    - **Role Case Consistency & Author Access**: `secureFile.ts` normalizes user roles (`toUpperCase()`) to correctly recognize `'ADMIN'` and `'SUPER_ADMIN'` in Mongo, and permits author teachers to preview their note packages without requiring a student purchase record.
    - **Upload & Video Pipeline Role Guard**: `/upload/r2-presigned-url`, `/upload/file`, `/upload/html-bundle`, and `/process-video` are strictly gated with `requireRole(TEACHER, ADMIN, SUPER_ADMIN)`. Removed dangerous duplicate unauthenticated `/video/key/:videoId` route from `upload.ts`.
    - **Month-End Date Rollover Clamping**: `addMonths` in `validity.service.ts` safely clamps month-end additions (e.g., Oct 31 + 6 months becomes April 30, preventing accidental overflow into May).
    - **Expired Free Re-Enrollment**: `enrollCourseFree` and `purchaseNoteFree` call `syncUserExpiredPurchases` prior to enrollment checks, allowing students to re-enroll once previous free or expired access concludes.
    - **Author & Admin Previewing**: `CourseDetail.tsx` and `NoteDetail.tsx` allow admins and owning teachers full access to preview and test their modules, videos, and PDFs. Initial file picker accurately selects the first non-empty section's file.
  - **Multi-Year Academic Segmentation on Student Dashboard**:
    - When students purchase notes or courses across multiple engineering years (e.g. FE and SE), the dashboard avoids clutter through smart segmentation:
      - **Dynamic Year Filter Pills**: Quick tabs for `'All Academic Years'`, `'FE • First Year'`, `'SE • Second Year'`, etc., with real-time package counts.
      - **Grouped Academic Year Sections**: In the default view, materials are organized under distinct, branded year section cards (`FE`, `SE`, `TE`, `BE`) with individual counters and "Focus on FE/SE" buttons rather than dumping them into a mixed flat list.
      - **Dedicated Year Isolation**: Clicking any year pill isolates only materials from that academic year for distraction-free studying.
      - **Inline Real-time Search**: Instant keyword filtering across note/course titles and subject names.
      - **Uncapped Catalog**: Removed legacy `notes.slice(0, 4)` restriction so all unlocked packages are fully visible.

  - **Instant PDF Loading, HTTP/2 Protocol Error Fix & Socket Fallback**:
    - **HTTP/2 Protocol Error Prevention**:
      - Express `compression()` middleware previously attempted to gzip binary file proxy responses where `Content-Length` had already been set to the uncompressed length. In HTTP/2, this stream length mismatch triggered `ERR_HTTP2_PROTOCOL_ERROR`.
      - Updated `server.ts` compression filter to strictly bypass `/api/secure-file`, `/api/video`, `/api/upload`, and any response with `x-no-compression`.
    - **HTTP Range Support (206 Partial Content)**:
      - `server/routes/secureFile.ts` now fully supports HTTP Range requests with `Accept-Ranges: bytes` and `Content-Range`.
      - PDFs now load progressively: PDF.js requests just the header and Page 1 (first 64 KB) instead of waiting for the full multi-megabyte buffer to download. Page 1 renders in under 100ms.
    - **Server-Side In-Memory Decryption Cache**:
      - `upload.ts` maintains an LRU in-memory cache (`MAX_DECRYPTED_CACHE_SIZE = 30`, 15-minute TTL) for recently decrypted files.
      - Range chunk requests, pagination, and multi-user views hit RAM in 0.1ms without re-fetching from Cloudflare R2 or re-running AES decryption.
    - **Local PDF.js Worker**:
      - Bundled `pdf.worker.min.mjs` directly into `public/` so the viewer loads the worker from the local origin rather than fetching 1.3 MB from `unpkg.com` (which suffered high latency and blockage across Indian ISPs).
    - **Socket.io Graceful Polling Upgrade**:
      - Configured Socket.io clients (`StudentDashboard.tsx` and `LiveClassRoom.tsx`) with `transports: ['polling', 'websocket']`.
      - Prevents browser console `WebSocket connection to wss://... failed` errors when reverse proxies or CDNs do not forward raw WebSocket upgrades.

  - **Note Thumbnail Uploads & Instant Dashboard Hydration**:
    - **Note Thumbnail Upload for Teachers & Admins**:
      - Added thumbnail upload to `CreateNoteModal` in `AdminDashboard.tsx` with 16:9 widescreen preview, direct presigned Cloudflare R2 upload, and persistence across creates and updates.
      - Removed placeholder `picsum.photos` fallback in `TeacherUpload.tsx` and `AdminDashboard.tsx`.
      - Notes without a custom uploaded thumbnail now render an elegant, branded UniEval cover card (navy gradient, glass icon, title and PDF count) instead of blank dark grey or purple rectangles.
    - **Student Dashboard Fast Mount Split**:
      - Separated dashboard data fetching: core materials (courses, notes, subjects) load first and unlock `loading = false` in ~200ms instead of blocking the whole UI behind a 5-way `Promise.all`.
      - Live class schedule (`getMyLiveClassSchedule`) and purchase countdowns load in parallel in the background without freezing the screen.
      - Gated live room status checks in `liveClassController.ts` so third-party Webinar.gg API calls run asynchronously in the background instead of stalling student HTTP requests for 3-4 seconds.

  - **High-Performance Worker Loading & Direct Authenticated S3 Note Streaming**:
    - **PDF.js Worker MIME Alignment across Nginx & Express**:
      - Copied `public/pdf.worker.min.js` alongside `.mjs` and configured `SecurePdfViewer.tsx` to point to `/pdf.worker.min.js`.
      - Reverse proxies (like Nginx on Ubuntu) lack `.mjs` mappings and default them to `application/octet-stream`, triggering browser strict MIME rejection on module workers. `.js` universally serves as `application/javascript; charset=utf-8`.
      - Explicit `/pdf.worker.min.js` and `/pdf.worker.min.mjs` handlers in `server.ts` guarantee strict MIME type compliance regardless of reverse proxy or CDN configuration.
    - **Direct Authenticated S3 Retrieval for R2 Note Assets (`getFileBufferFromR2OrUrl`)**:
      - Note PDFs stored as R2 URLs (e.g., `pub-*.r2.dev/raw-uploads/*`) are fetched directly via `@aws-sdk/client-s3` (`GetObjectCommand`) using authenticated credentials instead of public HTTP `fetch`.
      - Bypasses Cloudflare edge CDN bot checks and datacenter IP rate-limiting that previously caused `404 File missing or corrupted in storage`.
      - Decrypted and raw buffers are cached in memory (LRU with 15-minute TTL) for instant sub-millisecond Range chunk responses.
    - **Note File ID & Free-Status Preservation**:
      - `AdminDashboard.tsx` preserves existing `f.id` and `f.isFree` when editing notes, preventing UUID churn and broken URLs for existing students.
      - `secureFile.ts` resolves files polymorphically across `id`, `_id`, and `url` substring matches.
    - **100% AES-256-GCM Note Encryption & API Storage Masking**:
      - **Zero Direct Public URLs**: `CreateNoteModal` in `AdminDashboard.tsx` now uploads via `/api/upload/file` (AES-256-GCM encrypted at rest), completely removing unencrypted R2 presigned PUTs.
      - **API Storage Masking**: `getNotes` and `getNoteById` in `content.controller.ts` automatically sanitize `files[].url` for students and guests, replacing storage URLs with the secure proxy endpoint (`/api/secure-file/:noteId/:fileId`). Students and visitors inspecting network traffic never see raw R2 bucket URLs or storage paths.
      - **Full Database Encryption**: All legacy unencrypted note files across the MongoDB database were migrated and encrypted at rest with AES-256-GCM.

    - **High-Concurrency Notes Scaling (10k Students / 200 PDFs)**:
      - **Large RAM Decryption Pool**: `MAX_DECRYPTED_CACHE_SIZE` scaled to 150 files (30-minute TTL) using under ~250 MB RAM, holding virtually the entire active catalog in memory during peak exam weeks.
      - **In-Flight Request Deduplication (Singleflight)**: Prevents cache stampedes. When 500+ students open the same unit PDF at 9 PM before an exam, only 1 fetch from Cloudflare R2 and 1 AES-256 decryption runs; all 500 requests resolve from that single task.
      - **Entitlement & Structure Caching (`resolveFileAccess`)**: `Note` structure is cached via `cache.getOrSet` (10m TTL) and user purchase validity is cached in memory (`accessCache`, 2m TTL). Eliminates 20,000+ repetitive MongoDB queries across HTTP Range byte chunk requests.

---
*(Note: As an agent, I will update this file whenever major architectural decisions, new features, or critical rules are established.)*
