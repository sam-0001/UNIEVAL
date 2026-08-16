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

### Feature: Live Classes (Powered by Daily.co)
**Goal**: Enable real-time, interactive, and secure video classes directly within the platform using Daily.co, with strict access control and custom UI.

#### 1. Technical Flow & Architecture

**Backend (Express & MongoDB)**
*   **Daily.co API Integration**: The backend uses the Daily REST API (`https://api.daily.co/v1/rooms`) to create meeting rooms dynamically.
*   **Token Generation**: To enforce security and "app-only" access, the backend generates Daily.co meeting tokens (`https://api.daily.co/v1/meeting-tokens`). Tokens are signed with specific permissions (e.g., `is_owner` for teachers, restricted to specific `room_name`).
*   **Database**: 
    *   Create a `LiveClass` Mongoose model.
    *   Fields: `courseId`, `title`, `description`, `teacherId`, `scheduledStartTime`, `scheduledEndTime`, `dailyRoomName`, `dailyRoomUrl`, `status` (scheduled, live, completed), `recordingUrl`.
*   **Anti-Piracy (Concurrency Check)**:
    *   Before issuing a token to a student, the backend checks Redis to ensure the user does not already have an active session for this class.
    *   Once joined, the student's socket connection registers their presence. If a second login is detected, the first session is invalidated.
*   **Webhooks**: Configure Daily.co webhooks (`recording.ready`) to notify our Express server when a cloud recording is finished. The server then pulls the MP4 and uploads it to our Cloudflare R2 bucket.

**Frontend (React & Vite)**
*   **Library**: Install `@daily-co/daily-react` and `@daily-co/daily-js`.
*   **Custom UI Engine**: Instead of Daily's prebuilt UI, we use the `DailyProvider` to gain access to the raw video/audio tracks via hooks (`useLocalParticipant`, `useParticipantIds`, `useVideoTrack`). This allows 100% custom styling in Tailwind CSS.

#### 2. UI Design & Layout Recommendations

**Live Room Layout (`LiveClassRoom.tsx`)**
*   **Theme**: Dark mode preferred for video to reduce eye strain.
*   **Left Pane (Main Stage)**: Large responsive video player displaying the Teacher's camera or Screen Share.
*   **Right Sidebar (Collapsible)**:
    *   **Tab 1 - Chat**: Real-time messaging (powered by Socket.io).
    *   **Tab 2 - Participants**: List of active students. Features a "Raise Hand" icon next to students who request to speak.
*   **Bottom Control Bar**:
    *   **Teacher**: Mute/Unmute, Start/Stop Video, Screen Share, Start Recording, End Class for All.
    *   **Student**: Mute/Unmute (if allowed by teacher), Raise Hand, Leave Class.
*   **Floating Student Grid**: A small PIP (Picture-in-Picture) grid of student video feeds floating at the top or bottom of the Main Stage.

#### 3. Teacher's Side Workflow

1.  **Scheduling**: 
    *   Teacher navigates to the Course Management dashboard.
    *   Clicks "Schedule Live Class", enters Title, Date, and Time.
    *   *Behind the scenes*: Backend creates a Daily.co room with `exp` (expiration) set to a few hours after the scheduled time, saves to MongoDB.
2.  **Starting the Class**:
    *   At the scheduled time, Teacher clicks "Start Class".
    *   *Behind the scenes*: Backend generates an `is_owner: true` meeting token and sends it to the frontend.
3.  **Pre-Join Lobby**:
    *   Teacher sees a custom pre-join screen to test camera and microphone.
    *   Clicks "Join Room".
4.  **In-Class Controls**:
    *   Teacher has full control. Can forcefully mute students, accept "Hand Raises" to grant mic access, share screen, and click a prominent "Record" button.
5.  **Ending**:
    *   Teacher clicks "End Class for All". The backend terminates the Daily room, kicks all users, and updates the class status to `completed`.

#### 4. Student's Side Workflow

1.  **Discovery**:
    *   Student navigates to `CourseDetail.tsx`.
    *   Sees an "Upcoming Live Classes" section.
2.  **Joining**:
    *   When the class is LIVE, a pulsing red "Join Live" button appears.
    *   Student clicks "Join Live".
    *   *Behind the scenes*: Backend verifies enrollment, checks concurrency (ensuring no other active session for this user), and generates a read-only or restricted meeting token.
3.  **Pre-Join Lobby**:
    *   Student tests their local hardware on the pre-join screen.
    *   Clicks "Enter Class".
4.  **In-Class Experience**:
    *   Student is placed in the custom UI. Their mic is muted by default.
    *   They watch the stream, can type in the Socket.io chat sidebar, or click the "Raise Hand" button to request audio permissions from the Teacher.
5.  **Post-Class**:
    *   Once the teacher ends the class, the student is redirected back to the Course page. After the webhook processes the video, a "Watch Recording" button will appear in place of the live link.

---

## 📦 Implemented Features

*(Empty)*
