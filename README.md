# Mentore Solution LMS — Full-stack MERN Learning Management System

> Built for Trainer **Shubham Gayke** (Mentore Solution) to stream OBS recordings with custom VLC-like playback, AES-128 HLS encryption, Google Drive integration, real-time Q&A, and lecture study notes.

---

## 🚀 Key Features

- **Custom VLC-like Video Player**:
  - In-page playback with zero Google Drive redirects.
  - No download button, no context menu, `controlsList="nodownload noremoteplayback"`, no raw MP4 URLs.
  - Multi-quality selector (144p to 1080p) via `hls.js` with remembered preference.
  - Speed controls (0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x).
  - Seek bar with buffered range & hover preview.
  - Volume slider with mute toggle.
  - Skip ±5s (buttons, keyboard arrow keys, and mobile double-tap on left/right screen with ripple animation).
  - Mobile landscape lock with auto-fullscreen on orientation rotate and iOS Safari fallback.
  - Keyboard shortcuts (Space/K for play/pause, ←/→ for ±5s, ↑/↓ for volume, M for mute, F for fullscreen).
  - Resumes playback from last position (autosaved every 10 seconds).
- **Dynamic Watermark Protection**:
  - Semi-transparent overlay of the student's name and email moving to random positions every 15-20 seconds (visible in fullscreen) to discourage screen-recording leaks.
  - *Security Notice*: No web app can 100% prevent screen recording; these measures prevent direct downloading, link sharing, and unauthorized recording attribution.
- **Strict One-Batch-Change Rule**:
  - Free initial batch selection (B-26 to B-31).
  - Exactly **ONE** change allowed later, strictly enforced on the server (`PATCH /api/student/batch` returns `403 Forbidden` if exceeded).
  - Trainer can view batch history, reset student allowances, or move students manually.
- **Automated Video Processing Pipeline**:
  - Trainer submits Google Drive link.
  - Backend extracts file ID and validates access via Google Service Account (Drive API v3).
  - Background queue (`p-queue`, concurrency 1) downloads the video to a temp file, runs `ffprobe` for source resolution and duration, and executes `fluent-ffmpeg` to generate multi-quality AES-128 encrypted HLS renditions with unique keys.
  - Real-time progress updates (0% to 100%) delivered over Socket.IO.
- **Lecture Study Notes**:
  - Trainer uploads PDF documents, images (PNG/JPEG/WebP), or text/markdown messages stored securely in MongoDB GridFS.
  - Magic-byte verification prevents MIME spoofing.
  - In-page PDF reader and image lightbox viewer.
  - Configurable download permission per note (`allowDownload`).
  - Private autosaving notes box per student per lecture.
- **Real-Time Q&A Discussion**:
  - Students ask questions with optional video timestamp attachment (clicking jumps the player directly to that second).
  - "Ask anonymously" (name hidden from peers, visible to trainer with tag).
  - "Ask privately" (only visible between trainer and student).
  - Chat-style threads with real-time Socket.IO updates and notification bell with unread badge.
- **Multi-Session Invalidation**:
  - When `ALLOW_MULTIPLE_SESSIONS=false`, logging in on a new device invalidates previous sessions via unique `activeSessionId`.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS v4, React Router v7, Axios, TanStack Query v5, HLS.js, Socket.IO Client, Lucide React, React Hot Toast.
- **Backend**: Node.js 20+, Express, Mongoose, Socket.IO, JSON Web Tokens, bcryptjs, Zod, Helmet, CORS, Cookie-Parser, Express-Rate-Limit, Express-Mongo-Sanitize, Morgan, Multer, Google APIs, Fluent-FFmpeg with `ffmpeg-static` and `ffprobe-static` (no manual system FFmpeg installation required), P-Queue.
- **Database**: MongoDB (Atlas or local) via Mongoose + GridFS for note files.
- **Storage**: Storage abstraction layer (`local` driver default, extensible for AWS S3 and Cloudflare R2).

---

## 📂 Project Structure

```
c:/New LMS/
├── package.json                 # Monorepo root with concurrently dev script
├── .gitignore
├── README.md
├── client/
│   ├── .env.example
│   ├── .env
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── api/                 # Axios API clients (auth, batches, lectures, notes, questions, students)
│       ├── components/
│       │   ├── common/          # Button, Input, Modal, Skeleton, EmptyState
│       │   ├── layout/          # Navbar, StudentLayout, TrainerLayout, BatchGuard
│       │   ├── lecture/         # NotesTab, AskTrainerTab, LectureInfoTab
│       │   └── player/          # CustomVideoPlayer, Watermark
│       ├── contexts/            # AuthContext, ThemeContext, SocketContext
│       ├── lib/                 # Utility helpers (cn, formatters)
│       └── pages/
│           ├── auth/            # LoginPage, RegisterPage
│           ├── student/         # DashboardPage, SelectBatchPage, LecturePage, ProfilePage, MyQuestionsPage
│           └── trainer/         # TrainerDashboard, BatchesPage, UploadLecturePage, ManageLecturesPage, StudentsPage, QAInboxPage
└── server/
    ├── .env.example
    ├── .env
    ├── package.json
    ├── secrets/                 # Google Service Account JSON (gitignored)
    ├── storage/hls/             # Encrypted HLS directory (gitignored)
    ├── temp/                    # Temp download directory during transcoding (gitignored)
    └── src/
        ├── config/              # env.js, db.js
        ├── jobs/                # videoQueue.js (p-queue concurrency 1)
        ├── middleware/          # auth.js, errorHandler.js, rateLimiter.js, validate.js
        ├── models/              # User, Batch, Lecture, Note, Question, Progress, PrivateNote
        ├── routes/              # auth, batch, student, trainer, lecture, stream, notes, questions, progress
        ├── services/            # driveService.js, hlsService.js, storageService.js
        ├── socket/              # index.js (Socket.IO with rooms)
        ├── seed.js              # Standalone seed script
        ├── testRunner.js        # Automated integration test suite
        └── index.js             # Main server bootstrap
```

---

## ⚙️ Environment Variables

### `server/.env`

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/mentore_lms
JWT_SECRET=mentore_super_secret_jwt_key_2026_shubham_gayke
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
NODE_ENV=development

# Seeded Trainer Credentials
TRAINER_FIRST_NAME=Shubham
TRAINER_LAST_NAME=Gayke
TRAINER_EMAIL=trainer@mentoresolution.com
TRAINER_PASSWORD=Trainer@123456

# Account Sharing Prevention
ALLOW_MULTIPLE_SESSIONS=false

# Google Drive Integration
GOOGLE_SERVICE_ACCOUNT_KEY_FILE=./secrets/service-account.json

# Storage Configuration
STORAGE_DRIVER=local
HLS_STORAGE_PATH=./storage/hls
MAX_NOTE_SIZE_MB=15
```

### `client/.env`

```env
VITE_API_URL=http://localhost:5000
```

---

## 🔑 Google Service Account Setup (For OBS Recordings)

To allow the LMS to download your recorded OBS lectures directly from Google Drive:

1. **Go to Google Cloud Console**:
   - Navigate to [https://console.cloud.google.com/](https://console.cloud.google.com/) and create a project (e.g. `Mentore-Solution-LMS`).
2. **Enable Google Drive API**:
   - In **APIs & Services > Library**, search for **Google Drive API** and click **Enable**.
3. **Create Service Account**:
   - Go to **APIs & Services > Credentials** > **Create Credentials** > **Service Account**.
   - Name it `lms-drive-reader` and grant it the basic **Viewer** role.
4. **Generate Key**:
   - Click on the created service account, go to the **Keys** tab, click **Add Key > Create new key**, and choose **JSON**.
   - Download the file and save it to:
     ```
     server/secrets/service-account.json
     ```
5. **Share Your Google Drive Folder**:
   - Open Google Drive in your browser.
   - Locate your OBS recordings folder (or specific video).
   - Click **Share** and paste the Service Account's email address (e.g., `lms-drive-reader@mentore-solution-lms.iam.gserviceaccount.com`) with **Viewer** access.
6. When uploading a lecture in the LMS, simply paste the share link (`https://drive.google.com/file/d/.../view`). The backend will automatically extract the ID and process it.

---

## 📦 Installation & Quick Start

### 1. Install all dependencies
From the repository root:
```bash
npm run install:all
```
*(Or run `npm install` in the root, `/server`, and `/client` directories individually).*

### 2. Seed Database
Seeds trainer **Shubham Gayke** (`trainer@mentoresolution.com`) and batches **B-26** through **B-31**:
```bash
npm run seed
```

### 3. Run Automated Integration Tests
Verifies the batch-change enforcement, cross-batch stream isolation (403), registration, and trainer login:
```bash
cd server
node src/testRunner.js
```

### 4. Start Development Servers
Starts both the Express backend (`http://localhost:5000`) and Vite frontend (`http://localhost:5173`) concurrently:
```bash
npm run dev
```

---

## 📱 Responsive Breakpoints Verified

The UI is built mobile-first and tested at:
- **360px** (Small mobile devices, e.g. Galaxy S8 / compact Androids): zero horizontal scroll, bottom bar navigation, full-width touch targets.
- **390px** (iPhone 12/13/14/15/16): sticky video header on lecture view with scrolling tabs below.
- **768px** (iPads and tablets): responsive grid layouts, compact drawer navigation.
- **1280px+** (Laptops & Desktops): spacious sidebars, cinema player mode, multi-column cards.

---

## ☁️ Production Deployment Notes

1. **CPU & Storage Requirements**:
   - Transcoding multi-quality HLS streams (1080p, 720p, 480p, 360p, 240p, 144p) with FFmpeg is CPU-intensive.
   - **Do NOT deploy the backend to serverless platforms** (e.g., Vercel Functions, AWS Lambda, or Render Free tier) because they will hit 30s-60s timeout limits and lack persistent disk storage for HLS segments.
   - Use a dedicated VPS or container (e.g. Hetzner, DigitalOcean Droplet, AWS EC2, or Railway with persistent volumes) with at least **2 vCPUs** and **4GB RAM**.
2. **Cloudflare R2 / AWS S3 Storage Driver**:
   - For high scale, change `STORAGE_DRIVER=s3` in `server/.env`.
   - The modular `storageService.js` abstraction allows offloading HLS segments directly to an S3-compatible bucket or Cloudflare R2 bucket while maintaining authenticated segment proxying.

---

## 🔒 Security Architecture Highlights

- **Zero Drive Link Exposure**: The client never receives Google Drive URLs or file IDs. Responses from `/api/lectures` automatically strip sensitive attributes.
- **Authenticated Stream Gateway**: Requests to `/api/stream/:lectureId/master.m3u8`, `/api/stream/:lectureId/:rendition/:file`, and `/api/stream/:lectureId/key` enforce:
  - Valid JWT session cookie.
  - Active session matching (`ALLOW_MULTIPLE_SESSIONS=false`).
  - Batch enrollment check (`req.user.batch == lecture.batch`).
  - `Cache-Control: no-store` prevents browser/proxy caching of master keys.
- **AES-128 Encryption**: Every lecture generates a 16-byte cryptographically secure random key. Segments are encrypted at rest and in transit.
- **Dynamic Student Watermark**: Name and email overlay smoothly relocates every 16 seconds to deter unauthorized recording leaks.
