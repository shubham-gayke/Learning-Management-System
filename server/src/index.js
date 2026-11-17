import dns from 'node:dns';
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {}

import http from 'http';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';

import env from './config/env.js';
import connectDB from './config/db.js';
import routes from './routes/index.js';
import errorHandler from './middleware/errorHandler.js';
import { initSocket } from './socket/index.js';

// ── Models (ensure they are registered before seed) ──────────────
import './models/User.js';
import './models/Batch.js';
import './models/Lecture.js';
import './models/Progress.js';
import './models/Note.js';
import './models/Question.js';
import './models/PrivateNote.js';

// ── Seed helper (inline, non-blocking) ───────────────────────────
import User from './models/User.js';
import Batch from './models/Batch.js';

async function seedOnStartup() {
  const BATCH_NAMES = ['B-26', 'B-27', 'B-28', 'B-29', 'B-30', 'B-31'];

  const trainersToSeed = [
    {
      firstName: env.TRAINER_FIRST_NAME || 'Shubham',
      lastName: env.TRAINER_LAST_NAME || 'Gayke',
      email: (env.TRAINER_EMAIL || 'trainer@mentoresolution.com').toLowerCase(),
      password: env.TRAINER_PASSWORD || 'Trainer@123456',
      role: 'trainer',
      allowedCategories: undefined, // full access
      canUploadNotes: true,
    },
    {
      firstName: 'Shrikant',
      lastName: 'Somwanshi',
      email: 'shrikant.somwanshi@mentoresolution.com',
      password: 'Trainer@123456',
      role: 'trainer',
      allowedCategories: ['Linux Lectures', 'AWS Lectures'],
      canUploadNotes: true,
    },
    {
      firstName: 'Suraj',
      lastName: 'Bele',
      email: 'suraj.bele@mentoresolution.com',
      password: 'Trainer@123456',
      role: 'trainer',
      allowedCategories: ['DevOps Lectures'],
      canUploadNotes: true,
    },
  ];

  try {
    let primaryTrainer = null;

    for (const t of trainersToSeed) {
      const passwordHash = await User.hashPassword(t.password);
      const trainerDoc = await User.findOneAndUpdate(
        { email: t.email },
        {
          firstName: t.firstName,
          lastName: t.lastName,
          email: t.email,
          passwordHash,
          role: t.role,
          allowedCategories: t.allowedCategories,
          canUploadNotes: t.canUploadNotes,
          twoFactorEnabled: false,
          twoFactorSecret: null,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      if (!primaryTrainer) primaryTrainer = trainerDoc;
    }

    for (const name of BATCH_NAMES) {
      await Batch.findOneAndUpdate(
        { name },
        { name, trainer: primaryTrainer._id },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    console.log('🌱 Auto-seed complete (trainers + batches).');
  } catch (err) {
    console.error('⚠️  Auto-seed failed (non-fatal):', err.message);
  }
}

// ── Bootstrap ────────────────────────────────────────────────────

async function bootstrap() {
  // 1. Connect to database
  await connectDB();

  // 2. Run seed
  await seedOnStartup();

  // 3. Create Express app
  const app = express();

  // Enable trust proxy for Render / Cloudflare / reverse proxy deployments
  app.set('trust proxy', 1);

  // 4. Global middleware
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginOpenerPolicy: false,
    })
  );

  const clientUrls = (env.CLIENT_URL || '')
    .split(',')
    .map((u) => u.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  const isAllowedOrigin = (origin) => {
    if (!origin) return true;
    const cleanOrigin = origin.replace(/\/+$/, '');
    if (clientUrls.includes(cleanOrigin)) return true;
    if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return true;
    if (/^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) return true;
    try {
      const parsed = new URL(origin);
      if (parsed.hostname.endsWith('.vercel.app')) return true;
    } catch {}
    return false;
  };

  const corsOptions = {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    optionsSuccessStatus: 200,
    exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length'],
  };

  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(morgan('dev'));
  app.use(mongoSanitize());

  // 5. Health-check (for Render uptime & status monitoring)
  app.get('/health', (_req, res) => {
    res.status(200).json({ success: true, message: 'Server is running', timestamp: new Date().toISOString() });
  });
  app.get('/api/health', (_req, res) => {
    res.status(200).json({ success: true, message: 'Server is running', timestamp: new Date().toISOString() });
  });

  // 6. API routes
  app.use('/api', routes);

  // 7. Centralized error handler (must be last)
  app.use(errorHandler);

  // 8. HTTP server + Socket.IO
  const server = http.createServer(app);
  initSocket(server);

  // 9. Listen
  const PORT = env.PORT || 5000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(
      `\n🚀 Mentore Solution LMS server running on port ${PORT} (${env.NODE_ENV})\n`
    );

    // 10. Self-heartbeat to keep Render instance active
    const renderExternalUrl =
      process.env.RENDER_EXTERNAL_URL || 'https://learning-management-system-h1ct.onrender.com';

    if (env.NODE_ENV === 'production' && renderExternalUrl) {
      const PING_INTERVAL_MS = 12 * 60 * 1000; // 12 minutes (Render timeout is 15 minutes)
      setInterval(async () => {
        try {
          const pingUrl = `${renderExternalUrl.replace(/\/+$/, '')}/health`;
          const res = await fetch(pingUrl);
          if (res.ok) {
            console.log(`💓 [Heartbeat] Successfully pinged self at ${pingUrl}`);
          }
        } catch (err) {
          console.warn(`⚠️ [Heartbeat] Self-ping notice:`, err.message);
        }
      }, PING_INTERVAL_MS);
    }
  });
}

bootstrap().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
