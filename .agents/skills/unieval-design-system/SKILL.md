---
name: unieval-design-system
description: Strict visual and architectural standards for the UniEval platform. Use this skill when building or modifying UI components.
---

# UNIEVAL Design System & Component Blueprint

This document defines the strict visual and architectural standards for the UniEval platform. The system is designed to look highly technical, academically authoritative, and premium, prioritizing the `STUDENT`, `TEACHER`, and `ADMIN` user experiences.

## 1. Visual Theme & Philosophy
*   **Theme:** Modern Academic Precision, Forward-Thinking Technology.
*   **Aesthetic:** Clean, geometric, and spacious. It prioritizes structure and legibility (no "AI Slop"). 
*   **Design Driver:** The dynamic interaction between **Deep Navy (Trust/Academy)** and the **Blue-to-Purple Gradient (Innovation/AI)**.

## 2. Color System & Semantic Roles

| Role | Hex/Value | Description/Usage |
| :--- | :--- | :--- |
| `Brand Navy` | `#131A3F` | The core brand anchor. Used for main headlines (`Text-Headings`) and solid primary buttons. |
| `Brand Cobalt` | `#1F81FC` | Action links, focus rings, and primary active states. |
| `Brand Indigo` | `#7F26FE` | Accent color, used in AI-feature glows and highlights. |
| `Gradient Main`| `linear-gradient(135deg, #1F81FC 0%, #7F26FE 100%)` | **Reserved strictly for high-impact CTAs** (e.g., "Start AI Viva", "Purchase Course") and AI states. |
| `Canvas Primary` | `#FFFFFF` | Main application background (Light Mode). |
| `Canvas Sub` | `#F8FAFC` | Subtle offset for sidebars (`AdminDashboard`, `BEToolkit`) and cards. |
| `Text Primary` | `#1F2937` | Body text (`Slate-800`). Never use pure `#000000`. |
| `Text Muted` | `#6B7280` | Helper text, timestamps, table headers. |
| `Success` | `#10B981` | Completed courses, Cashfree success, `.edu` verified badges. |
| `Warning` | `#FBBF24` | Review states, pending BullMQ processes. |
| `Destructive` | `#EF4444` | Deletion tasks, failed payments. |

## 3. Typography & 8px Grid System
*   **Sans-Serif (UI & Reading):** `Inter`
*   **Monospace (Technical Data):** `IBM Plex Mono` (Use for student IDs, transaction hashes, code snippets).
*   **Grid:** All spacing, padding, and margins MUST be a multiple of **8px** (Tailwind `p-2`, `m-4`, `gap-6`). Default to generous whitespace.
*   **Corners:** Use geometric `rounded-lg` (8px) for buttons/inputs, and `rounded-xl` (12px) for structural cards/modals. Avoid `rounded-full` except for avatars.

## 4. Feature-Specific UI Blueprints

The following component rules must be adhered to when building out the specific features of UniEval:

### 4.1 Student Experience (Learning & Preparation)
*   **`NotesLibrary.tsx` & `BEToolkit.tsx`:** 
    *   **Layout:** Dense, searchable grid layout (`grid-cols-1 md:grid-cols-3 lg:grid-cols-4`). 
    *   **Cards:** Hover states must slightly elevate the card (`shadow-md`, `translate-y-[-2px]`) with a `transition-all duration-200` effect.
    *   **Icons:** Use clean, standard Lucide icons (`BookOpen`, `GraduationCap`, `Calculator`).
*   **`NoteDetail.tsx` (Secure Viewer):**
    *   **Layout:** Immersive reader mode. The navbar should collapse or shrink. The PDF.js viewer canvas should take up maximum viewport height (`h-[calc(100vh-64px)]`).
    *   **Security UI:** Render an invisible, non-interactive `div` overlay over the canvas to block simple right-click/drag downloads. Include a subtle watermark of the student's email using `Text-Muted` with 10% opacity.
*   **`CourseDetail.tsx` (Encrypted Video Player):**
    *   **Player Container:** Strictly `bg-black` with rounded corners `rounded-xl`. 
    *   **HLS Indicator:** Include a small technical indicator below the video (e.g., `<Activity className="w-4 text-emerald-500" /> AES-128 Encrypted Stream`) to signal premium security.
*   **`VivaDetail.tsx` (AI Viva) & Exam Intelligence:**
    *   **AI State UI:** When Gemini/Groq is "thinking" or "listening", utilize the `$gradient-main` with a subtle pulsing animation (`animate-pulse`). 
    *   **Voice/Transcript Layout:** Split screen: Left side shows a stylized audio waveform or glowing AI orb; right side shows the real-time scrolling chat/transcript transcript.

### 4.2 Teacher Experience (Content Creation)
*   **`TeacherUpload.tsx`:**
    *   **Direct-to-Cloud Dropzone:** A large, dashed-border area (`border-2 border-dashed border-slate-300 bg-slate-50`). On `dragover`, border turns to `$brand-cobalt` and background to `bg-blue-50`.
    *   **Upload & Processing States:** 
        *   Uploading to R2: Show a real-time progress bar (`$brand-cobalt`).
        *   Processing (FFmpeg/BullMQ): Convert the progress bar to an indeterminate striped loader (`Warning` yellow or `$brand-indigo`) with text "Encoding secure HLS chunks...".
*   **Note Package Builder:** Use a drag-and-drop sortable list for modules. Fields should be clearly separated (Title, Description, Pricing, Attachments). 

### 4.3 Security & Monetization
*   **Cashfree Paywall:**
    *   Overlay the premium content with a beautiful glassmorphism blur (`backdrop-blur-sm bg-white/50`).
    *   Center a pricing card. The CTA button to trigger Cashfree must use the `$gradient-main`.
*   **`.edu` Domain Free Access Badge:**
    *   If a student is verified via college email, display a prominent badge: `bg-emerald-100 text-emerald-800 border border-emerald-200`. Include the Lucide `BadgeCheck` icon.
*   **RBAC (Role-Based Access Control):** Ensure `STUDENT`, `TEACHER`, and `SUPER_ADMIN` views are visibly distinct. Admin toolbars should be dark (`$brand-navy`) to contrast with the standard app canvas.

### 4.4 Administration (`SuperAdminDashboard.tsx` & `AdminDashboard.tsx`)
*   **Layout:** Full-width sidebar layout.
*   **Data Density:** Use compact data tables (`p-2` instead of `p-4` inside cells) for user management and content moderation.
*   **Infrastructure Metrics:** 
    *   Build specific visual "Status Cards" for real-time infrastructure monitoring.
    *   **Redis Cache:** Lucide `Database` icon with a pinging green dot if connected.
    *   **BullMQ Workers:** Display a badge with active vs. pending jobs in the queue.
*   **Typography:** Heavily utilize `IBM Plex Mono` for transaction IDs, user UUIDs, and system timestamps.

## 5. Standard Iconography (Lucide React)
Always use Lucide React icons (`strokeWidth={2}`). Do not mix icon libraries.
*   **Dashboard/Admin:** `LayoutDashboard`, `Settings`, `Users`, `ShieldCheck`
*   **Education:** `GraduationCap`, `BookOpen`, `FileText`, `ListVideo`, `Lightbulb`
*   **Technical/AI:** `Bot`, `Sparkles`, `Brain`, `Activity`, `Cloud`, `Lock`

## 6. Execution Rules for AI Agents
1.  **Strict Tailwind:** Only use Tailwind CSS utility classes.
2.  **Dark Mode Handling:** The platform is primarily light mode, except for the media/video viewing screens. Do not aggressively invert all components for dark mode unless specifically in `CourseDetail.tsx`.
3.  **No Placeholders:** If you are building a dashboard, fill it with realistic mock engineering data (e.g., "Advanced Thermodynamics Exam 2024", "Fluid Dynamics PDF", "User: arjun.m@iit.edu") rather than "Lorem Ipsum".
4.  **Loading States:** Never leave a screen blank while fetching data (e.g., waiting for Groq/Gemini). Always render a skeleton loader `animate-pulse bg-slate-200` that mimics the final layout.
