# UniEval Feature Planning & Architecture

This document serves as the brainstorming and architectural whiteboard for new features in the UniEval platform. 

## How we use this file
1. **Idea Pitch**: You propose a new feature.
2. **Analysis & Improvements**: I (your AI Architect) will suggest enhancements, UI/UX polish, and point out any technical constraints based on our current stack (Vite, Express, MongoDB, Cloudflare R2).
3. **Implementation Plan**: We finalize the best way to build it and document the technical steps here before writing code.

---

## 📝 Active Discussions

*(No active features being discussed yet. Pitch your first idea!)*

---

## 🚀 Approved Features (Ready for Implementation)

### Feature: Live Classes (Powered by Daily.co & Socket.io)
**Goal**: Enable real-time, interactive, and secure video classes directly within the platform. The UI will mirror our `CustomVideoPlayer` for a seamless full-screen experience, enhanced with real-time Chat, Q&A, and interactive Live Polls.

#### 1. Technical Flow, Architecture, and Data Structures

**Backend (Express, MongoDB, & Socket.io)**
*   **Video Delivery**: Daily.co API Integration for dynamic room creation and token generation.
*   **Real-time Engine (Socket.io)**: 
    *   Create a dedicated namespace or room for each Live Class (`room_${classId}`).
    *   Handle events for Chat (`CHAT_MESSAGE`), Q&A (`NEW_QUESTION`, `UPVOTE_QUESTION`), and Polls (`POLL_START`, `POLL_ANSWER`, `POLL_END`).
*   **Database Models (MongoDB)**: 
    *   `LiveClass`: Fields for `courseId`, `title`, `scheduledStartTime`, `dailyRoomName`, `status`.
    *   `LiveChat` (Optional persistence): Array of messages `{ senderId, text, timestamp }`.
    *   `LiveQuestion`: `{ classId, studentId, content, upvotes: [studentIds], timestamp, isAnswered }`.
    *   `LivePoll`: `{ classId, question, options: [{ id, text }], correctOptionId, status: 'active' | 'closed' }`.
    *   `LivePollResponse`: `{ pollId, studentId, selectedOptionId, responseTime }`.
*   **Anti-Piracy (Concurrency Check)**:
    *   Redis checks ensure a student only has one active connection.

#### 2. UI Design & Layout Recommendations

**Live Room Layout (`LiveClassRoom.tsx`)**
*   **Immersive Video Player Engine**: The layout will closely mimic `CustomVideoPlayer`.
*   **Main Stage (Full-Screen)**: The Teacher's video feed or Screen Share will occupy the entire screen for students. No distracting floating student grids.
*   **Auto-hiding Controls**: Like a standard video player, mouse inactivity hides the bottom control bar and overlays.
*   **Side Drawer / Overlay Panel (The "Interactive Zone")**: A toggleable right-side drawer containing tabs:
    *   **Tab 1 - Chat**: A global chat room visible to all students and the teacher. Auto-scrolls to the newest message.
    *   **Tab 2 - Q&A**: 
        *   Students can submit questions.
        *   Each question has a "Heart/Upvote" button.
        *   List is dynamically sorted by `upvote` count to bubble up common doubts.
    *   **Tab 3 - Polls / Leaderboard**: Appears when a poll is active or recently closed.

#### 3. Interactive Features Details

**A. Live Polls (Teacher Side)**
*   **Creation**: Teacher clicks a "Create Poll" icon. A modal prompts for the Question, Options, and marking the Correct Option.
*   **Execution**: Teacher clicks "Launch". Emits `POLL_START`.
*   **Analytics**: When the poll closes, the teacher receives real-time UI charts showing the percentage of students who chose each option.

**B. Live Polls (Student Side & Leaderboard)**
*   **Taking the Poll**: An overlay appears on the student's screen with the poll question and a countdown timer.
*   **Answering**: Student clicks an option. Emits `POLL_ANSWER` with the selected option and timestamp.
*   **Leaderboard**: After the poll closes, a leaderboard overlay appears highlighting the students who answered **correctly** and **fastest**.

#### 4. Workflows

**Teacher Workflow**:
1. Starts class via scheduled link.
2. Gets full-screen UI with specialized controls (Manage Polls, View Q&A sorted by upvotes).
3. Can launch polls on the fly and monitor comprehension analytics.
4. Ends class, triggering cloud recording upload to R2.

**Student Workflow**:
1. Joins class via a pulsing "Join Live" button.
2. Enters a full-screen, cinema-like view of the teacher.
3. Can open the side drawer to chat, ask/upvote questions, and participate in lightning-fast polls to climb the leaderboard.

---

## 📦 Implemented Features

*(Empty)*

---

### Feature: Live Class Recording & Archival Workflow
**Goal**: Seamlessly transition completed Live Classes into permanent VOD (Video on Demand) resources in the assigned Course Modules, while offloading the heavy video processing (HLS + AES encryption) to the admin's local machine to save VPS CPU load.

#### 1. Scheduling & UI/UX (Teacher Side)
*   **Module Assignment**: The "Schedule Live Class" modal will include a new "Assign to Module" dropdown.
*   **On-the-Fly Creation**: The dropdown will list existing modules (e.g., "Unit 1") and a "Create New Module" option, which reveals an inline text input to instantly create a new section for the recording.

#### 2. Cloud Recording & Webhook (Backend)
*   **Recording Trigger**: When the teacher ends the live class, Daily.co generates a raw cloud `.mp4` recording.
*   **Webhook & Storage**: The backend listens for Daily.co's `recording.ready` webhook. Instead of processing it, the backend downloads the raw `.mp4` and uploads it to a *private* Cloudflare R2 bucket (e.g., `raw-recordings/`). This secures the raw video independently of Daily.co's retention policy.
*   **Queueing**: The backend creates a `PendingRecording` document in MongoDB, storing the raw R2 link and the assigned `moduleId`.

#### 3. Local Processing & Archival (The Distributed Worker)
*   **Pending Queue UI**: The Admin Dashboard features a "Pending Recordings" queue.
*   **Local FFmpeg Processing**: The teacher clicks "Process" from their local development environment. The local machine downloads the raw `.mp4` from the private R2 bucket and uses FFmpeg to generate the AES-128 encrypted HLS streams (`.m3u8` / `.ts`).
*   **Finalization**: 
    1. The local machine uploads the processed chunks to the public Cloudflare R2 bucket.
    2. A permanent `VideoResource` is added to the assigned Course Module in MongoDB.
    3. The backend deletes the raw `.mp4` from R2 to save space.
    4. The backend completely deletes the original `LiveClass` and `PendingRecording` documents, leaving the database perfectly clean.
