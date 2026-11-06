# UniEval — Complete Platform Feature Catalog & Master Specification

> **Platform**: UniEval ([unieval.in](https://unieval.in))  
> **Founder & Lead Architect**: Soham Chaudhari  
> **Target Audience**: Savitribai Phule Pune University (SPPU) Engineering Students (FE, SE, TE, BE), Educators, and Administrators  
> **Core Stack**: React, Vite, Tailwind CSS, Node.js, Express, MongoDB (Atlas), Cloudflare R2, FFmpeg, Cashfree, WebRTC, Socket.io

---

## Table of Contents
1. [Core Academic & Learning Features](#1-core-academic--learning-features)
2. [Official SPPU 2024 Pattern Syllabus Archive](#2-official-sppu-2024-pattern-syllabus-archive)
3. [Secure Study Notes & Document Engine](#3-secure-study-notes--document-engine)
4. [Encrypted Video Streaming & Adaptive Bitrate Player](#4-encrypted-video-streaming--adaptive-bitrate-player)
5. [State-of-the-Art Interactive Live Classrooms](#5-state-of-the-art-interactive-live-classrooms)
6. [Exam Intelligence & Question Paper Analysis](#6-exam-intelligence--question-paper-analysis)
7. [AI Voice Viva & Diagnostic Quizzes](#7-ai-voice-viva--diagnostic-quizzes)
8. [BE Final Year Capstone & Research Toolkit](#8-be-final-year-capstone--research-toolkit)
9. [Student Experience & Dashboard](#9-student-experience--dashboard)
10. [Teacher & Content Creator Experience](#10-teacher--content-creator-experience)
11. [Administration & Super Admin Operations](#11-administration--super-admin-operations)
12. [Payments, Monetization & Validity Engine](#12-payments-monetization--validity-engine)
13. [Security, Digital Rights Management (DRM) & Forensic Watermarking](#13-security-digital-rights-management-drm--forensic-watermarking)
14. [PWA, Web Push Notifications & Mobile Integration](#14-pwa-web-push-notifications--mobile-integration)
15. [SEO, Generative Engine Optimization (GEO) & LLM Standards](#15-seo-generative-engine-optimization-geo--llm-standards)
16. [DevOps, Cloud Architecture & Worker Offloading](#16-devops-cloud-architecture--worker-offloading)

---

## 1. Core Academic & Learning Features

### Curriculum Specialization
- **Strict SPPU Credit Pattern Alignment**: Fully mapped to the Savitribai Phule Pune University (Pune University) 2024 NEP Credit Pattern and previous 2019 Pattern schemes.
- **Academic Hierarchy**: Hierarchical content mapping: `Academic Year -> Branch -> Subject -> Course / Note Package -> Unit / Module -> Videos / Notes / PYQs`.
- **Insem & Endsem Exam Segmentation**: All study materials, question papers, and notes are partitioned by university exam splits:
  - **Insem Exam (30 Marks)**: Units 1 and 2 focus.
  - **Endsem Exam (70 Marks)**: Units 3, 4, 5, and 6 comprehensive prep.
- **12 Supported Engineering Disciplines**:
  1. Computer Engineering (CSE / Comp)
  2. Information Technology (IT)
  3. Artificial Intelligence & Data Science (AI&DS)
  4. Artificial Intelligence & Machine Learning (AIML)
  5. Electronics & Telecommunication (E&TC)
  6. Electronics (VLSI Design & Technology)
  7. Electrical Engineering (EE)
  8. Mechanical Engineering (Mech)
  9. Mechanical Sandwich Engineering
  10. Civil Engineering (Civil)
  11. Chemical Engineering
  12. Robotics & Automation
- **Multi-Year Academic Coverage**:
  - **First Year (FE)**: Universal common foundational curriculum across all engineering colleges in Pune.
  - **Second Year (SE)**: 12 branch foundations and core department modules.
  - **Third Year (TE)**: 9 branch advanced NEP specializations and electives.
  - **Final Year (BE)**: Elective tracks, capstone project tools, and viva voce preparation.

---

## 2. Official SPPU 2024 Pattern Syllabus Archive

### Public Syllabus Repository (`/syllabus`)
- **Complete Official Archive**: Direct indexed access to all 22 official SPPU 2024 Pattern curriculum PDFs approved by the SPPU Academic Council.
- **In-App Google Drive PDF Preview**: Instant modal preview without forcing file downloads (`/preview`).
- **Interactive Drive Folder Embed**: Full folder embedded view (`/embeddedfolderview`) allowing students to browse the raw archive.
- **Natural Language & Tokenized Branch Search**:
  - Stop-word filtering (`sppu`, `syllabus`, `engineering`, `pdf`).
  - Acronym alias expansion (`comp` / `cse` -> Computer Engineering, `aids` -> AI & Data Science, `entc` -> Electronics & Telecommunication, `mech` -> Mechanical).
  - Branch-priority sorting ensuring queries like *"SE computer Engineering Syllabus sppu"* resolve to the exact branch PDF in 1 match.
- **Academic Year Filtering**: Instant tab toggles for FE (Common), SE (12 Branches), and TE (9 Branches).
- **Google AI Overview Knowledge Box**: Direct high-density citation card answering syllabus queries for LLMs and Google Search users.
- **Comprehensive Syllabus FAQ Accordion**: Answers pattern changes, NEP 2020 credits, Insem/Endsem marks distribution, and backlog rules.

---

## 3. Secure Study Notes & Document Engine

### Secure PDF Reader (`SecurePdfViewer.tsx`)
- **Unit 1 PDF Free Demo Preview**: The first PDF of any note package is unlocked for all visitors (including unauthenticated guests and non-enrolled students) without payment or signup.
- **HTTP Range Requests (206 Partial Content)**: PDF.js progressively streams bytes (`Accept-Ranges: bytes`). Page 1 loads in under 100ms without downloading the full multi-megabyte document.
- **Server-Side In-Memory Decryption Cache (LRU)**: Decrypted buffers are held in a 150-file in-memory LRU pool with a 30-minute TTL. Range chunks resolve from RAM in 0.1ms.
- **In-Flight Singleflight Deduplication**: Eliminates cache stampedes. When 500+ students open the same unit PDF at peak exam hours, only 1 fetch from Cloudflare R2 and 1 AES-256 decryption runs; all concurrent requests share the result.
- **Dynamic Forensic Watermarking**: Multi-line diagonal watermark across every canvas rendering student email, masked phone number, and timestamped session hash to eliminate piracy.
- **Content Protection**: Invisible DOM security layer blocks right-click context menus, image dragging, canvas scraping, print dialogs, and iframe hijacking.
- **Local PDF.js Worker**: Self-hosted `pdf.worker.min.js` in `/public/` guarantees zero CDN downtime, bypasses ISP blocks, and aligns HTTP MIME types (`application/javascript`).
- **Secure HTML Bundle Viewer (`SecureHtmlViewer.tsx`)**: Sandboxed iframe renderer for rich multi-asset interactive document bundles.

---

## 4. Encrypted Video Streaming & Adaptive Bitrate Player

### Video Architecture & Security (`CustomVideoPlayer.tsx`)
- **Adaptive Bitrate Streaming (ABS)**: FFmpeg transcodes uploaded master videos into HLS multi-bitrate streams (`.m3u8` playlists and `.ts` chunk segments) supporting 360p, 480p, 720p, and 1080p.
- **AES-128 Chunk Encryption**: Every `.ts` segment is encrypted at rest using AES-128. Decryption keys are stored in MongoDB (`VideoKey`) and served strictly through authenticated routes.
- **Dynamic Forensic Video Watermark**: Transparent watermark displaying student phone number, email, and user ID dynamically shifts position across the video player every few seconds to prevent screen recording and illicit re-broadcasting.
- **Local Video Worker Offload (Distributed VPS Architecture)**:
  - Heavy FFmpeg encoding can be run on an admin development machine (`API_BASE_URL=https://unieval.in`).
  - Transcoded chunks upload directly to Cloudflare R2, baking the production key URL into playlists with **zero VPS CPU load**.
- **Player Controls**:
  - Playback speeds (0.5x, 0.75x, 1x, 1.25x, 1.5x, 1.75x, 2x).
  - Resolution selector (Auto, 1080p, 720p, 480p, 360p).
  - Forward / Rewind 10-second shortcuts.
  - Theater mode and Fullscreen mode.
  - Automatic horizontal landscape lock on mobile devices (`screen.orientation.lock('landscape')`).

---

## 5. State-of-the-Art Interactive Live Classrooms

### Live Classroom Experience (`LiveClassRoom.tsx` & `LiveClassLobby.tsx`)
- **WebRTC Studio Integration**: High-definition, low-latency live streaming powered by Webinar.gg studio integration with real-time video, audio, and screen sharing.
- **Pre-flight Device Hardware Check (`PreflightDeviceCheck.tsx`)**:
  - Live webcam preview with mirror toggle.
  - Interactive microphone volume level meter powered by Web Audio API (`AudioContext` and `AnalyserNode`).
  - Synthesized dual-tone harmonic chime test (C5 & E5) for speakers with zero external audio assets.
  - Audio/Video device dropdowns and strict track release on unmount.
- **Live Classroom HUD & Controls**:
  - Real-time live elapsed duration timer (`00:45:12`).
  - Active participant roster drawer (`LiveAttendeesModal.tsx`): lists instructor (Host), current user (You), and connected student peers via Socket.io with search filtering.
  - Classroom Guide & Shortcuts modal (`ClassroomShortcutsModal.tsx`).
  - WebRTC connection health pill (`HD 1080p • Low Latency`).
  - Automatic screen share and host camera auto-pin notification banners.
- **Immersive Fullscreen HUD**:
  - YouTube/Zoom-grade floating minimal HUD showing live status, elapsed timer, online attendee counter, and Exit button.
  - Auto-hides after 2s of inactivity for a 100% unobstructed stream.
  - Automatic mobile landscape lock and unlock on exit.
- **Interactive Waiting Lobby & Auto-Enter (`LiveCountdown.tsx` & `CalendarUtils.ts`)**:
  - Precision countdown timer ticking down (Days : Hours : Mins : Secs) to lecture start.
  - *Auto-Enter on Broadcast*: Background poller automatically enters the live room the moment the teacher goes live, sounding a notification chime without requiring manual reloads.
  - 1-Click Google Calendar event generator and Apple/Outlook `.ics` calendar download.
- **Automated Class Completion & Recording Synchronization**:
  - Detects teacher studio termination via Webinar.gg REST API.
  - Automatically switches classroom screen to "Class Concluded" state.
  - Real-time 3-step radar progress tracker for processing recordings ("Audio/Video Captured" -> "Transcoding HLS" -> "Ready").
  - Background auto-polling smoothly loads the in-app `CustomVideoPlayer` as soon as the recording is ready.

---

## 6. Exam Intelligence & Question Paper Analysis

### Intelligence Engine (`ExamIntelligence.tsx`)
- **Past University Paper Synthesis**: Statistical analysis of past 5-10 years of SPPU question papers.
- **Weightage Priority Badges**:
  - 🔥 **High Priority (Must Prepare)**: Recurring 8-10 mark questions appearing in 80%+ of university exam cycles.
  - ⚡ **Medium Priority**: Frequently appearing concepts (4-6 marks).
  - ❄️ **Low Priority**: Rarely tested or fringe topics.
- **Model Answer Templates**: Step-by-step point-wise answer structures adhering strictly to the SPPU examiner marking scheme format.
- **Diagnostic Practice Generator**: Generates targeted unit question sets for Insem and Endsem preparation.

---

## 7. AI Voice Viva & Diagnostic Quizzes

### AI Voice Simulator (`VivaDetail.tsx`)
- **Simulated University Viva Defense**: AI-driven oral examination simulator powered by Gemini / Groq LLMs.
- **Voice Interaction**: Integrated browser speech recognition (`webkitSpeechRecognition`) and real-time audio waveform visualizer.
- **Scoring & Performance Feedback**: Evaluates student conceptual depth, technical accuracy, and conciseness, providing question-by-question improvement rubrics.

### Interactive Quizzes (`QuizDetail.tsx`)
- **Timed Assessment Engine**: Countdown timer per quiz session with question navigation drawer.
- **Instant Result Analytics**: Instant score calculation, correct vs. incorrect answers breakdown, and comprehensive explanations for every option.
- **Review Mode**: Review past completed attempts to reinforce exam weak spots.

---

## 8. BE Final Year Capstone & Research Toolkit

### Engineering Capstone Hub (`BEToolkit.tsx`)
- **Project Topic Explorer**: Curated engineering project ideas categorized by branch and domain (IoT, Machine Learning, Robotics, VLSI, Cloud, Renewable Energy).
- **Research Paper Search**: Integrated arXiv and Semantic Scholar API search for exploring IEEE and open-access research papers.
- **Abstract & Problem Statement Formulator**: Helps final-year students draft formal project proposals and synopsis documents.
- **Viva-Voce Question Bank**: Standard defense questions asked by external university examiners during project reviews.

---

## 9. Student Experience & Dashboard

### Personalized Student Learning Portal (`StudentDashboard.tsx`)
- **Fast Mount Split**: Core materials load first to unlock the screen in ~200ms; schedule and validity counts load in the background without UI blocking.
- **Multi-Year Academic Segmentation**:
  - Dynamic year filter pills (`All Academic Years`, `FE`, `SE`, `TE`, `BE`) with live package counts.
  - Grouped year section cards with "Focus on Year" isolation.
  - Real-time keyword search across all purchased course and note titles.
- **Live Classes Tab (`LiveClassesTab.tsx`)**:
  - Glowing rose border and pulsing live indicator on active broadcasts.
  - Compact countdown pills and 1-click calendar sync directly on upcoming class cards.
  - Instant recording replay modal (`RecordingPlayerModal.tsx`).
- **Access Validity Tracking**: Real-time badges displaying countdowns (e.g. `Expires in 42 days` or `Expires today`).
- **Instant PWA Installation**: Prompts students to install UniEval on iOS, Android, and Desktop for native app-like access.

---

## 10. Teacher & Content Creator Experience

### Instructor Studio & Management (`TeacherLiveClasses.tsx` & `TeacherUpload.tsx`)
- **Course & Module Builder**: Create courses, organize modules, and upload videos and PDF resources.
- **Direct-to-Cloud Presigned Uploads**: Direct chunk uploads to Cloudflare R2 bypassing application server bandwidth bottlenecks.
- **Content Ownership & RBAC Guard**: Teachers are strictly restricted to editing and deleting only courses, notes, and live classes that they authored (`teacherId === currentUser.id`).
- **Teacher Live Studio**:
  - 1-Click Instant Meeting launch.
  - Scheduled lecture modal with duration selector (1 to 6 hours).
  - Copy student invite link with toast feedback.
  - Recording manager to attach or update video stream replay URLs.
- **Author Preview Mode**: Teachers can preview their own paid courses, video streams, and encrypted notes without requiring student purchase records.

---

## 11. Administration & Super Admin Operations

### Admin Dashboard (`AdminDashboard.tsx`)
- **Polymorphic Content Management**: Add, update, and manage Course catalogs, Note Packages, Quizzes, and Vivas.
- **16:9 Thumbnail Uploader**: Direct presigned R2 thumbnail upload with 16:9 widescreen canvas enforcement and `object-contain` rendering.
- **Permanent Polymorphic Deletion Engine**:
  - Video Assets: Purges HLS directories (`videos/${videoId}/*`), raw uploads (`raw-uploads/*`), thumbnails, and MongoDB `VideoKey` records.
  - Notes: Purges secure files (`secure-files/*`), HTML bundles, and MongoDB `FileKey` records.
- **Access Grant & Revocation**: Grant student course/note access with accurate validity calculation (`calculateItemExpiryDate`) and clean purchase synchronization.

### Super Admin Operations (`SuperAdminDashboard.tsx`)
- **System Metrics & Monitoring**:
  - Redis cache health and latency ping.
  - BullMQ background worker queue state (active, waiting, failed jobs).
  - Real-time registered users, active students, and content counts.
- **Financial Analytics**: Cashfree transaction histories, order IDs, payment statuses, and revenue aggregates.
- **Push Notification Broadcast (`AdminNotificationModal.tsx`)**: Web Push broadcast engine to send instant updates and study alerts to subscribed mobile and desktop devices.
- **Super Admin Email Lock**: Strict environment variable check for root administrative actions.

---

## 12. Payments, Monetization & Validity Engine

### Payment Infrastructure (`cashfreeCheckout.ts` & `server/routes/payment.ts`)
- **Cashfree Gateway Integration**: Seamless checkout supporting UPI (GPay, PhonePe, Paytm), Credit/Debit Cards, Net Banking, and Wallets.
- **Webhook Payment Verification**: Asynchronous webhook handler with signature validation and duplicate transaction idempotency.
- **Two Validity Modes (`validity.service.ts`)**:
  - **Duration in Months**: Relative validity from payment date (default 6 months). Safe month-end date clamping (e.g., Oct 31 + 6 months becomes April 30, avoiding May rollover).
  - **Exact Calendar Expiry Date**: Hard expiration at 11:59 PM on a specific date.
- **Real-Time Entitlement Revocation**: Prunes expired access tokens during `/api/auth/me` calls and streaming key requests; secure file proxy returns 403 Forbidden on expired access.
- **Daily Automated Expiration Cron**: Background scheduler (`scheduler.service.ts`) runs at midnight to clean up expired enrollments across the entire database.
- **College-Specific Free Access System**:
  - Optional toggle to grant free enrollment to verified university domains (e.g. `*.pict.edu`, `*.coep.ac.in`).
  - Strict 3-character domain suffix matching prevents unauthorized access.
  - Full `$unset: { collegeConfig: 1 }` database cleanup when disabled.

---

## 13. Security, DRM & Forensic Watermarking

### Platform Security Architecture
- **Zero Raw Storage Leakage**: API responses automatically mask Cloudflare R2 bucket URLs; students and visitors inspecting network traffic only see secure proxy endpoints (`/api/secure-file/:noteId/:fileId`).
- **AES-256-GCM Encryption at Rest**: All note documents, bundles, and solution PDFs are stored encrypted at rest with unique encryption keys managed in MongoDB `FileKey`.
- **Mass-Assignment Defense**: Strict payload sanitization in `updateUser` strips sensitive parameters (`credits`, `purchasedCourseIds`, `purchasedNoteIds`, `unlimitedPlan`, `sessionToken`) preventing self-privilege escalation.
- **HTTP/2 Protocol Error Prevention**: Compression middleware (`compression()`) filters out binary file streaming endpoints, preventing `ERR_HTTP2_PROTOCOL_ERROR` stream length mismatches.
- **Strict Content Security Policy (CSP)**: Hardened HTTP headers in `server.ts` whitelisting WebRTC media domains (`webinar-socket.classx.co.in`, `*.zego.im`, `*.zegocloud.com`, `*.daily.co`), Cashfree SDKs, and Google Drive iframes.
- **Zero Fake Reviews Guarantee**: 100% academic transparency with zero bot testimonials or inflated feedback ratings.

---

## 14. PWA, Web Push Notifications & Mobile Integration

### Mobile-First Progressive Web App
- **Web App Manifest (`manifest.webmanifest`)**: Standalone display mode, high-res icons, and splash screens for iOS and Android.
- **Dynamic Viewport Unit Standardization (`100dvh`)**: Prevents iOS Safari and Android Chrome address bar clipping, jitter, and layout distortion in live classrooms and video players.
- **Web Push Notifications (`sw.js` & `notification.service.ts`)**:
  - Dual-curve VAPID key exchange.
  - Automatic pruning of dead 404/410 subscriptions.
  - Broadcast alerts for new live sessions, note updates, and exam alerts.
- **One-Tap PWA Install Banner (`InstallPwaBanner.tsx`)**: Native install prompt for desktop and mobile home screens.
- **Permission Management (`NotificationPermissionBanner.tsx`)**: Subtle, non-intrusive prompt explaining notification utility before requesting browser permission.

---

## 15. SEO, Generative Engine Optimization (GEO) & LLM Standards

### Search & AI Discoverability
- **JSON-LD Structured Data Hierarchy**:
  - `Dataset`: Official SPPU 2024 Pattern syllabus catalog.
  - `EducationalOrganization`: UniEval entity with founder attribution (Soham Chaudhari).
  - `ItemList`: Branch curriculum archive items.
  - `FAQPage`: Comprehensive syllabus and examination rules for Google rich snippets and AI Overviews.
  - `WebSite` & `BreadcrumbList`: Navigation hierarchy.
- **Dynamic SEO Engine (`useSEO.ts`)**: Updates canonical URLs, meta descriptions, Open Graph cards, Twitter cards, and targeted branch keywords per route.
- **Search Engine Crawl Standards**:
  - `public/sitemap.xml`: Complete URL directory with priority scoring.
  - `public/robots.txt`: Permissive crawling for Googlebot, Bingbot, and AI crawlers (`Google-Extended`, `GPTBot`, `PerplexityBot`, `ClaudeBot`).
  - `public/llms.txt` & `public/llms-full.txt`: Concise and full markdown knowledge files formatted for LLM context ingestion and search retrieval.

---

## 16. DevOps, Cloud Architecture & Worker Offloading

### Production Infrastructure
- **Single-Server Production Deployment**: Vite builds a high-performance Single Page Application (SPA), served directly by the Express backend with asset caching.
- **Cloudflare R2 Storage**: Zero-egress fee object storage for video playlists, encrypted segments, PDF notes, and thumbnails.
- **High-Concurrency RAM Pool**: 150-file in-memory LRU cache holding virtually the entire active catalog in RAM (~250 MB footprint) for sub-millisecond responses during peak exam weeks.
- **Socket.io Hybrid Polling Upgrade**: Gracefully falls back to HTTP long-polling when client networks or reverse proxies block raw WebSocket upgrades.
- **Database Indexing**: Compound indexes across MongoDB collections (`courses`, `notes`, `liveclasses`, `purchases`, `users`, `filekeys`, `videokeys`) ensuring queries execute in <2ms.

---

*Specification verified against the UniEval production codebase. Founder: Soham Chaudhari.*
