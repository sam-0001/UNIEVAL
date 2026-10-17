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
- **Permanent Deletion**: When an Admin deletes a Course, Note, or Quiz, the backend actively reaches out to Cloudflare R2 to permanently delete all associated `.m3u8`, `.ts`, `.pdf`, and image files to save storage space. The UI must always warn the user explicitly about this.
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

---
*(Note: As an agent, I will update this file whenever major architectural decisions, new features, or critical rules are established.)*
