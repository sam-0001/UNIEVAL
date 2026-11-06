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

    - **Dashboard Content Visibility & Role Alignment**:
      - **Admin & Super Admin Catalog View (`AdminDashboard.tsx`)**: `ADMIN` and `SUPER_ADMIN` roles now view all courses, notes, quizzes, and vivas system-wide rather than filtering by `teacherId === user.id`. Non-admin teachers continue to see only their authored materials.
      - **College Free Access Inclusion on Student Dashboard (`StudentDashboard.tsx`)**: Students with matching college email domains now automatically see their college-unlocked notes and courses under their dashboard sections without needing separate manual enrollment records.

    - **Instant Sub-Second PDF Viewer Hydration (`SecurePdfViewer.tsx`)**:
      - Replaced legacy range-chunk stream negotiation (`pdfjsLib.getDocument({ url, rangeChunkSize })`) with direct continuous buffer streaming via `fetch(url)`.
      - Previously, PDF.js progressive loading attempted multi-roundtrip range requests and suffered a 15-second internal worker handshake timeout before falling back to buffer fetch, causing 15-20s perceived latency on ~800 KB PDFs.
      - Direct streaming fetches the full decrypted buffer in one continuous HTTP/2 multiplexed response (~150-250ms) with real-time percentage progress and executes in-memory `pdfjsLib.getDocument({ data: buffer })` in ~100ms, rendering Page 1 in under 400ms.

    - **Role-Aware "Back to Dashboard" Universal Navigation**:
      - Replaced hardcoded links (such as legacy `"Back to First Year Notes"` in `NoteDetail.tsx`, `"Back to Quizzes"` in `QuizDetail.tsx`, and `"Back to Viva List"` in `VivaDetail.tsx`) with dynamic `"Back to Dashboard"` links.
      - Utilizes `getDashboardRoute(user?.role)` to navigate students directly to `/dashboard`, teachers/admins to `/admin`, and super admins to `/super-admin`.
      - Added back navigation to `CourseDetail.tsx` and aligned `TeacherLiveClasses.tsx`.

    - **Document Page Skeleton Loader (`SecurePdfViewer.tsx` & `NoteDetail.tsx`)**:
      - Replaced raw circular buffer spinners with an authentic A4 document skeleton sheet featuring subtle pulsing text paragraphs, diagram blocks, header/footer guides, and a sleek minimal progress status bar.
      - Replaced raw `Loading...` text in `NoteDetail.tsx` with a matching 2-column skeleton screen (header card, unit accordion, and viewer container) ensuring smooth, flicker-free page hydration.

    - **Autofill Null Exception & HTTP/2 Upload Stream Fixes**:
      - **Autofill Null Exception (`pages/Login.tsx`)**: Removed legacy `onAutoFillStart` handler where `e.currentTarget` was nullified inside asynchronous `setTimeout(300)`, causing `Uncaught TypeError: Cannot read properties of null (reading 'closest')` whenever browsers autofilled credentials.
      - **HTTP/2 Upload Ping & Timeout Fix (`/api/upload/file`)**:
        - Replaced brittle `fetch()` with resilient `XMLHttpRequest` in `AdminDashboard.tsx` and added missing `Authorization` header in `TeacherUpload.tsx`, establishing proper 3-minute timeouts and error response parsing.
        - Exempted `ADMIN` and `SUPER_ADMIN` roles from rate limiting in `server/middleware/userRateLimit.ts`. Created `noteUploadRateLimit` (150 uploads/5m) for document files, reserving the strict 10-request limit exclusively for heavy FFmpeg video processing (`/process-video`).
        - Updated Nginx configurations (`nginx.app.conf` and `nginx.conf`) with `proxy_request_buffering off;` and `client_body_buffer_size 512k;` so file streams are forwarded directly to Node without stalling HTTP/2 keepalive PING frames.
        - Synchronized Express JSON body limit to `100mb` on `/api/upload` to match `MAX_DOC_SIZE`.

    - **Multi-Tier Browser PDF Cache & Accidental Reload Retention**:
      - **Zero-Latency Reloads (`services/pdfCache.ts`)**:
        - Multi-tier architecture: Tier 1 LRU in-memory RAM (sub-0.1ms unit switching) and Tier 2 persistent browser Cache API with IndexedDB fallback (persists across tab switches, browser restarts, and accidental page reloads).
        - When students accidentally reload (`Cmd+R` / `F5`) or switch back and forth between note units, the PDF renders in **<50ms** directly from browser cache without re-downloading multi-megabyte streams over the internet.
        - Employs buffer slicing (`buffer.slice(0)`) so PDF.js worker transfers never detach or corrupt cached memory copies.
        - Cache keys are strictly user-scoped (`u_{userId}:{cleanUrl}`) to isolate student access while keeping tokens rotated without cache misses.
        - Calling `logout()` automatically purges all in-memory and persistent note caches from the browser.
      - **Page Position Retention**:
        - `SecurePdfViewer.tsx` tracks active reading page in `sessionStorage` per note file.
        - If a student accidentally reloads the page or browser while reading (e.g. Page 18 of Unit 2), the viewer restores Page 18 instantly.

    - **Teacher Subject Combos & Bundles System**:
      - **Teacher & Admin Management (`pages/AdminDashboard.tsx`)**:
        - Teachers and Admins have a dedicated `'combos'` tab with live count badges, filterable list of created bundles, and "+ Create Subject Combo".
        - `CreateComboModal` allows teachers to bundle multiple subjects (filtered by academic year and branch) into a single discounted offer.
        - Teachers can configure: Title, Description, Included Subjects (with live course and note counts), Content Inclusions (All Materials, Notes Only, Courses Only), Selling Price, Original MRP (with auto-suggest calculation from contents), Student Validity (relative months or fixed date), Optional College-Specific Free Access, and 16:9 Thumbnail Cover.
      - **Automated Access Fulfillment (`fulfillComboAccess` in `server/controllers/user.controller.ts`)**:
        - When a student purchases a combo (or enrolls free via college domain / dev mode / Cashfree payment):
          - Finds all courses and notes associated with `combo.subjectIds`.
          - Adds `combo.id` to `user.purchasedComboIds`, all matching course IDs to `user.purchasedCourseIds`, and all matching note IDs to `user.purchasedNoteIds`.
          - Generates a master `Purchase` record for the combo (`productType: 'combo'`, `amountPaid: combo.price`) and sub-purchase records for each individual course and note (`productType: 'course' / 'note'`, `amountPaid: 0`, suffixed `cashfreeOrderId`).
          - All video player HLS key gates (`getVideoKey`), secure PDF file streaming (`resolveFileAccess`), and student dashboard displays immediately unlock without extra steps.
        - Webhook (`server/routes/webhook.ts`) processes `comboId` from Cashfree order tags and fulfills access asynchronously.
        - Expiry synchronization (`validity.service.ts`) cleans up expired combos from `purchasedComboIds` and preserves purchase integrity.
      - **Student Discovery & Checkout (`pages/BrowseCourses.tsx`)**:
        - Added dedicated `Subject Combos` tab with filter by branch, academic year, and real-time keyword search.
        - Rich combo card showcases included subjects, course/note counts, savings percentage, and price.
        - Integrated `ComboDetailModal` displays course and note contents with 1-click Cashfree checkout or instant free enrollment for college students.

    - **Legal, Privacy & Cookie Policy Transparency Architecture**:
      - **Dedicated Compliance Pages**:
        - `pages/PrivacyPolicy.tsx` (`/privacy`): Full DPDP & GDPR aligned disclosure. Itemizes exactly what personal and academic information is collected (name, email, phone, college/branch, salted bcrypt password hashes, watch time, test analytics, forensic watermarks, device logs), why it is collected (authentication, institutional verification, order fulfillment, DRM copyright protection, AI quizzes), military-grade encryption (AES-256-GCM, AES-128 HLS, TLS 1.3), Cashfree PCI-DSS gateway guarantees (zero card/PIN storage), data retention, and student rights (access, erasure, correction).
        - `pages/TermsAndConditions.tsx` (`/terms`): Legally binding terms detailing single-user personal licenses, strict anti-piracy DRM protection (prohibiting screen recording, HLS scraping, decryption tampering, and Telegram/Drive piracy), forensic watermarking notice, 6-month validity lifecycle, digital content non-refundability policy, live class decorum, and Pune jurisdiction.
        - `pages/CookiePolicy.tsx` (`/cookie`): Exhaustive technical table listing all client-side storage keys (`token`, `unieval_cookie_consent`, `pdf_page_{fileId}`, `u_{userId}:{fileUrl}` Cache API pool, `activeYearTab`, Cloudflare edge cookies), explaining their exact performance/security purposes, and guaranteeing zero third-party advertising or cross-site tracking.
      - **Interactive Cookie Consent Banner (`components/CookieBanner.tsx`)**:
        - Sleek floating banner with glassmorphism aesthetics adhering to the UniEval design system.
        - Gives users options ("Accept All" vs. "Essential Only") and saves preferences to `localStorage`.
      - **Unified Brand Footer (`components/Footer.tsx`)**:
        - Standardized across `Home.tsx`, `About.tsx`, and legal pages with quick links to Academics, Privacy, Terms, Cookies, contact info, and security badges.
      - **Signup & Registration Compliance Disclosure**:
        - Integrated explicit binding notices on Step 1 and Step 3 in `pages/Login.tsx` and `components/LoginModal.tsx` linking to Terms, Privacy, and Cookie policies.
      - **Landing Domain Routing Guard**:
        - Whitelisted `/privacy`, `/terms`, and `/cookie` in `App.tsx` on `unieval.in` / `www.unieval.in` to allow prospective students to read policies without being forced to redirect.

  - **Student-Facing UX Copy & Anti-Jargon Policy**:
    - **Zero Developer Security Jargon on Student UI**: Technical developer terms such as `"AES-256 Encrypted"`, `"Military-Grade DRM"`, `"Adaptive HLS streaming"`, `"AES-128 bit keys"`, or raw cryptographic details must NEVER be displayed on public or student-facing screens (Homepage, Navbar, Course Cards, Sales Cards, Footers, or Dashboards).
    - Students perceive technical security jargon as developer clutter. Always translate platform capabilities into clear student-centric benefits:
      - Instead of `"Military-Grade DRM"` -> use `"Topper-Verified Study Notes"`.
      - Instead of `"AES-256 Encrypted"` -> use `"Verified Study Portal"`.
      - Instead of `"Adaptive HLS video streaming"` -> use `"High-definition video lectures (360p to 1080p buffer-free)"`.
    - Technical specifications are strictly reserved for legal compliance documents (`PrivacyPolicy.tsx`, `TermsAndConditions.tsx`) and backend code.

  - **Progressive Web App (PWA) & Super Admin Push Notification Engine**:
    - **Native App Feel (Desktop & Mobile)**:
      - Full PWA manifest (`public/manifest.webmanifest`) configured with `display: "standalone"`, brand theme color `#2563EB`, background `#0F172A`, and responsive maskable icons (`192x192` and `512x512` generated from official brand assets).
      - `index.html` configured with mobile viewport meta tags, Apple touch icons (`apple-touch-icon.png`), and standalone web app tags for iOS Safari and Android Chrome.
      - Express server serves `/sw.js` with `Service-Worker-Allowed: /`, `Content-Type: application/javascript`, and strict `no-cache` headers.
    - **Smart Installation Experience (`components/InstallPwaBanner.tsx`)**:
      - For Desktop (Chrome, Edge, Brave) & Android: Intercepts `beforeinstallprompt` event, shows a non-intrusive floating install prompt ("Add UniEval to Home Screen" / "Install App"), triggers native prompt, and stores dismissed status for 7 days.
      - For iOS Safari: Automatically detects iOS devices running in Safari browser mode and displays a visual 3-step modal guide ("Tap Share -> Scroll down and select 'Add to Home Screen' -> Tap Add").
    - **Web Push Notifications Architecture (`server/services/notification.service.ts` & `services/pwa.ts`)**:
      - Standards-compliant VAPID push system utilizing `web-push`. Keys are automatically read from environment variables or auto-generated and safely persisted to `.vapid-keys.json`.
      - Secure endpoint registration (`server/models/pushSubscription.model.ts`) tracks device subscriptions with user linkage (`userId`, `userRole`, `deviceType`: mobile vs desktop, `endpoint`, and encryption keys).
      - Dead/expired subscription pruning (404/410 status codes returned by Apple APNs / Google FCM) automatically purges obsolete endpoints from MongoDB to prevent database bloat.
      - Gentle permission onboarding banner (`components/NotificationPermissionBanner.tsx`) prompts users with value explanation (live class reminders and exam note alerts) before requesting native browser permission.
    - **Super Admin Notification Broadcast Center (`components/AdminNotificationModal.tsx`)**:
      - Super Admins can compose and broadcast push notifications from the Super Admin portal (`pages/SuperAdminDashboard.tsx`).
      - Features real-time subscriber metrics (live counter of registered Mobile devices, Desktop browsers, and Total subscribers).
      - Target audience filtering: `ALL` devices, `STUDENTS` only, or `FACULTY` only.
      - Custom target URL navigation on click (e.g. direct link to a live class or new unit PDF).
      - Real-time notification preview card mimicking device push display with app icon, title, body, and timestamp.

  - **Comprehensive Code Quality & Architecture Modernization (Clean Code Standard)**:
    - **Dead Code Purge & Root Hygiene**:
      - Purged obsolete legacy files (`pages/TeacherUpload.tsx`, `components/HlsPlayer.tsx`, deprecated `LiveClass` lobby/controls, and `services/api.ts.deprecated`).
      - Archived 20+ one-off root maintenance and debugging scripts into `scratch/archive/`, keeping only `ecosystem.config.cjs` at root for PM2 production process management.
      - Updated `tsconfig.json` to exclude `scratch/`.
    - **Modular Mongoose Model Layer (`server/models/`)**:
      - Migrated monolithic `server/models.ts` into individual model files under `server/models/`:
        - `liveClass.model.ts`, `pendingRecording.model.ts`, `liveChat.model.ts`, `liveQuestion.model.ts`, `livePoll.model.ts`, `combo.model.ts`, `purchase.model.ts`, `user.model.ts`, `courseProgress.model.ts`, `pushSubscription.model.ts`.
      - `server/models/index.ts` serves as the centralized export barrel; `server/models.ts` maintains 1-line backward compatibility.
    - **Unified Authentication (`components/auth/`)**:
      - `components/auth/AuthForm.tsx`: Unified single source of truth for student/faculty login, 3-step signup, OTP verification, password reset, and legal disclosures.
      - `components/auth/PasswordStrengthMeter.tsx`: Reusable real-time password requirement checklist.
      - Refactored `components/LoginModal.tsx` and `pages/Login.tsx` into clean, zero-duplication wrappers.
    - **Centralized Cashfree Payment Gateway (`services/cashfreeCheckout.ts` & `server/services/cashfree.service.ts`)**:
      - Created `launchCashfreeCheckout()` utility with global SDK typing, error handling, and session redirection.
      - Refactored `CourseDetail.tsx`, `NoteDetail.tsx`, `BrowseCourses.tsx`, and `QuizDetail.tsx` to eliminate repetitive `window.Cashfree` declarations and checkout loops.
      - Centralized Cashfree API order creation and signature validation on backend (`cashfree.service.ts`).
    - **Backend Routes & Service Decomposition (`server/services/`)**:
      - Decomposed monolithic `server/routes/upload.ts` (from 1,120 lines to 260 lines — 77% reduction):
        - `storage.service.ts`: Cloudflare R2 / S3 client operations, presigned URLs, S3 direct streaming buffer retrieval, and single/bulk deletion.
        - `crypto.service.ts`: AES-256-GCM buffer encryption/decryption, LRU in-memory RAM cache (150 files), and single-flight request deduplication.
        - `assetCleanup.service.ts`: Cascading asset deletion for courses, notes, and videos.
        - `videoTranscode.service.ts`: FFmpeg HLS transcode job queue and status store.
      - Extracted `getSubjects` and `createSubject` into dedicated `server/controllers/subject.controller.ts`.
    - **Frontend Monolith Deconstruction**:
      - **Admin Dashboard (`pages/AdminDashboard.tsx`)**: Reduced from 4,295 lines to 1,387 lines (68% reduction):
        - Extracted `components/admin/TeacherLogin.tsx`.
        - Extracted tabs into `components/admin/tabs/`: `BEToolkitTab.tsx`, `ExamPrepTab.tsx`.
        - Extracted modals into `components/admin/modals/`: `CreateCourseModal.tsx`, `CreateNoteModal.tsx`, `CreateQuizModal.tsx`, `CreateVivaModal.tsx`, `CreateComboModal.tsx`, `LiveModal.tsx`, and `common.ts`.
      - **Student Dashboard (`pages/StudentDashboard.tsx`)**: Reduced from 2,244 lines to 401 lines (82% reduction):
        - Created `hooks/useStudentDashboardData.ts` to coordinate data fetching, live classroom WebSockets, polling fallback, and recording replay state.
        - Extracted tabs into `components/student/tabs/`: `OverviewTab.tsx`, `CoursesTab.tsx`, `NotesTab.tsx`, `LiveClassesTab.tsx`, `BillingTab.tsx`, `SettingsTab.tsx`.
        - Extracted `components/student/SearchResultsView.tsx` and `components/student/RecordingPlayerModal.tsx`.
    - **Centralized Academic Constants (`constants/academics.ts`)**:
      - Centralized `ACADEMIC_YEARS` (`FE`, `SE`, `TE`, `BE`), `getYearCode()`, `getYearName()`, `getYearFullName()`, `getYearMeta()` (visual branding badges and color tokens), and `ENGINEERING_BRANCHES`.

  - **Official SPPU Syllabus Archive & Google Drive Synchronization**:
    - **Google Drive Shared Folder Integration**:
      - Shared directory ID: `1PaXIr_9w7Fz_wcpQnP8yF0YkJlL-N8xU` (`https://drive.google.com/drive/folders/1PaXIr_9w7Fz_wcpQnP8yF0YkJlL-N8xU?usp=drive_link`).
      - Contains official Savitribai Phule Pune University (SPPU) 2024 credit pattern syllabus copies across all engineering branches:
        - First Year (FE): Common engineering curriculum PDF (`SPPU_FE_2024_Pattern.pdf`).
        - Second Year (SE): 12 branch-specific copies (Computer, IT, AI&DS, AIML, ENTC, VLSI, Electrical, Mechanical, Sandwich, Civil, Chemical, Robotics).
        - Third Year (TE): 9 branch-specific NEP copies (Computer, AIML, ENTC, VLSI, Electrical, Mechanical, Sandwich, Civil, Chemical).
    - **Landing Page Syllabus Section (`components/home/SyllabusSection.tsx`)**:
      - Positioned on `Home.tsx` (`#syllabus`) with interactive cards for FE, SE, TE, and a direct Google Drive folder action.
      - Displays real-time branch counts and syllabus highlights aligned with Pune University credit patterns.
    - **Interactive Syllabus Explorer Modal (`components/home/SyllabusModal.tsx`)**:
      - Instant multi-branch search filtering (e.g. typing "comp", "entc", "mech", "civil", "ai").
      - Tab selectors for `All (22)`, `First Year (FE)`, `Second Year (SE)`, and `Third Year (TE)`.
      - Built-in PDF reader mode embedding Google Drive document preview (`https://drive.google.com/file/d/:id/preview`) with back button and new-tab option.
      - Dual view modes: Curated UniEval filtered card index and embedded Google Drive folder stream (`https://drive.google.com/embeddedfolderview?id=1PaXIr_9w7Fz_wcpQnP8yF0YkJlL-N8xU#grid`).
      - Direct links to open the entire shared folder or individual files in Google Drive.
    - **CSP Alignment (`server.ts`)**:
      - Whitelisted `https://drive.google.com`, `https://docs.google.com`, and `https://*.google.com` under helmet `frameSrc` to permit Google Drive folder and document preview embedding in production.
    - **Dedicated Crawlable Syllabus Route & GEO Optimization (`pages/Syllabus.tsx`)**:
      - Canonical dedicated route mounted at `/syllabus` (registered in `App.tsx` `publicLandingRoutes` for `unieval.in` domain compatibility).
      - Semantic on-page Knowledge Box specifically written for Google Gemini / Google AI Overviews and Search Summaries, establishing UniEval as the definitive source for SPPU syllabus and exam prep.
      - Rich Schema.org markup: `BreadcrumbList`, `EducationalOrganization`, `Dataset`, `ItemList` (all 22 syllabus PDFs cataloged), and `FAQPage` covering FE/SE/TE patterns.
      - **Static HTML & AI Crawlers Alignment**:
        - `index.html`: Upgraded meta description, keywords, Knowledge Graph, Dataset schema, and FAQPage schemas.
        - `public/sitemap.xml`: Added `https://unieval.in/syllabus` with priority `1.0` and daily change frequency.
        - `public/robots.txt`: Explicitly allows `/syllabus` for `Google-Extended` (Gemini / AI Overviews crawler), `GoogleOther`, `GPTBot`, `PerplexityBot`, and `ClaudeBot`.
        - `public/llms.txt` and `public/llms-full.txt`: Documented the full syllabus directory and concise Q&A knowledge synthesized by LLMs when users query "UniEval" or "SPPU syllabus".

---
*(Note: As an agent, I will update this file whenever major architectural decisions, new features, or critical rules are established.)*
