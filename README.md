<div align="center">

<img src="docs/assets/hero-banner.svg" alt="Mentore Solution LMS — Animated Enterprise Banner" width="100%" />

[![React 18](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Vite 6](https://img.shields.io/badge/Vite-6.0-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4.0-06B6D4?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Node.js 20+](https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express 4.21](https://img.shields.io/badge/Express-4.21-0F172A?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB & GridFS](https://img.shields.io/badge/MongoDB-Atlas%20%7C%20GridFS-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-010101?style=flat-square&logo=socketdotio&logoColor=white)](https://socket.io/)
[![HLS.js AES-128](https://img.shields.io/badge/Streaming-AES--128%20HLS-0284C7?style=flat-square&logo=html5&logoColor=white)](https://github.com/video-dev/hls.js)
[![TensorFlow.js COCO-SSD](https://img.shields.io/badge/AI%20Proctor-TensorFlow.js-F43F5E?style=flat-square&logo=tensorflow&logoColor=white)](https://www.tensorflow.org/js)
[![RFC 6238 TOTP 2FA](https://img.shields.io/badge/Security-TOTP%202FA-10B981?style=flat-square&logo=authy&logoColor=white)](https://datatracker.ietf.org/doc/html/rfc6238)
[![Author: Shubham Gayke](https://img.shields.io/badge/Author-Shubham%20Gayke-0EA5E9?style=flat-square&logo=github&logoColor=white)](https://github.com/shubham-gayke)
[![Copyright](https://img.shields.io/badge/%C2%A9%202026-All%20Rights%20Reserved-8B5CF6?style=flat-square)](https://github.com/shubham-gayke/Learning-Management-System)

<img src="docs/assets/divider-pulse.svg" alt="Animated Divider" width="100%" />

<img src="docs/assets/vision-highlights.svg" alt="Platform Vision & Engineering Highlights" width="100%" />

<img src="docs/assets/divider-pulse.svg" alt="Animated Divider" width="100%" />

<img src="docs/assets/system-architecture.svg" alt="Animated Multi-Tier System Architecture" width="100%" />

<img src="docs/assets/divider-pulse.svg" alt="Animated Divider" width="100%" />

<img src="docs/assets/security-matrix.svg" alt="Animated 3D Layered Security & DRM Matrix" width="100%" />

<img src="docs/assets/divider-pulse.svg" alt="Animated Divider" width="100%" />

<img src="docs/assets/hls-player-demo.svg" alt="Animated Custom VLC Video Player & AES-128 HLS Transcoding Pipeline" width="100%" />

<img src="docs/assets/divider-pulse.svg" alt="Animated Divider" width="100%" />

<img src="docs/assets/ai-proctor-demo.svg" alt="Animated AI Proctoring Webcam HUD & Telemetry" width="100%" />

<img src="docs/assets/divider-pulse.svg" alt="Animated Divider" width="100%" />

<img src="docs/assets/totp-2fa-demo.svg" alt="Animated TOTP 2FA QR & Mandatory Enforcement Workflow" width="100%" />

<img src="docs/assets/divider-pulse.svg" alt="Animated Divider" width="100%" />

<img src="docs/assets/core-modules.svg" alt="Animated Ecosystem Feature Modules — Job Portal, Q&A, GridFS & Governance" width="100%" />

<img src="docs/assets/divider-pulse.svg" alt="Animated Divider" width="100%" />

<img src="docs/assets/tech-stack-showcase.svg" alt="Animated Full-Stack Technology Ecosystem" width="100%" />

<img src="docs/assets/divider-pulse.svg" alt="Animated Divider" width="100%" />

<img src="docs/assets/repo-structure.svg" alt="Animated Repository Architecture Explorer" width="100%" />

<img src="docs/assets/divider-pulse.svg" alt="Animated Divider" width="100%" />

<img src="docs/assets/getting-started.svg" alt="Animated Quickstart Terminal & Cloud Setup" width="100%" />

<img src="docs/assets/divider-pulse.svg" alt="Animated Divider" width="100%" />

<img src="docs/assets/deployment-topology.svg" alt="Animated Production Cloud Deployment Architecture" width="100%" />

<img src="docs/assets/divider-pulse.svg" alt="Animated Divider" width="100%" />

<img src="docs/assets/footer-wave.svg" alt="Lead Architect Shubham Gayke — © 2026 All Rights Reserved" width="100%" />

</div>

<details>
<summary><b>📋 Developer Reference: Click to Copy CLI Commands, .env Blueprint &amp; Package List</b></summary>
<br />

### Quick Start CLI
```bash
git clone https://github.com/shubham-gayke/Learning-Management-System.git
cd Learning-Management-System
npm run install:all
cp server/.env.example server/.env
cp client/.env.example client/.env
npm run seed
npm run dev
```

### Environment Blueprint (`server/.env`)
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/mentore_lms
JWT_SECRET=replace_with_your_32_plus_char_random_secret_key
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173

TRAINER_FIRST_NAME=Admin
TRAINER_LAST_NAME=Trainer
TRAINER_EMAIL=trainer@yourdomain.com
TRAINER_PASSWORD=<CreateYourStrongPasswordHere123!>

ALLOW_MULTIPLE_SESSIONS=false
GOOGLE_SERVICE_ACCOUNT_KEY_FILE=./secrets/service-account.json
STORAGE_DRIVER=local
HLS_STORAGE_PATH=./storage/hls
MAX_NOTE_SIZE_MB=15
```

### Verified Package Inventory
- **Client**: `react` `^18.3.1`, `vite` `^6.0.0`, `tailwindcss` `^4.0.0`, `react-router-dom` `^7.1.0`, `@tanstack/react-query` `^5.62.0`, `axios` `^1.7.9`, `hls.js` `^1.5.17`, `socket.io-client` `^4.8.1`, `lucide-react` `^0.468.0`, `react-hot-toast` `^2.4.1`, `@tensorflow/tfjs` `^4.22.0`, `@tensorflow-models/coco-ssd` `^2.2.3`.
- **Server**: `express` `^4.21.0`, `mongoose` `^8.7.0`, `socket.io` `^4.7.5`, `otpauth` `^9.6.0`, `qrcode` `^1.5.4`, `jsonwebtoken` `^9.0.2`, `bcryptjs` `^2.4.3`, `googleapis` `^140.0.1`, `fluent-ffmpeg` `^2.1.3`, `ffmpeg-static` `^5.2.0`, `ffprobe-static` `^3.1.0`, `p-queue` `^8.0.1`, `helmet` `^7.1.0`, `zod` `^3.23.8`, `express-rate-limit` `^7.4.0`, `express-mongo-sanitize` `^2.2.0`.

</details>
