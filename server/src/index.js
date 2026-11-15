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

  if (!env.TRAINER_EMAIL || !env.TRAINER_PASSWORD) {
    console.warn('⚠️  Trainer env vars not set — skipping auto-seed.');
    return;
  }

  try {
    const passwordHash = await User.hashPassword(env.TRAINER_PASSWORD);

    const trainer = await User.findOneAndUpdate(
      { email: env.TRAINER_EMAIL.toLowerCase() },
      {
        firstName: env.TRAINER_FIRST_NAME,
        lastName: env.TRAINER_LAST_NAME,
        email: env.TRAINER_EMAIL.toLowerCase(),
        passwordHash,
        role: 'trainer',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    for (const name of BATCH_NAMES) {
      await Batch.findOneAndUpdate(
        { name },
        { name, trainer: trainer._id },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    console.log('🌱 Auto-seed complete (trainer + batches).');
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

  // 4. Global middleware
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );
  const isAllowedOrigin = (origin) => {
    if (!origin) return true;
    if (origin === env.CLIENT_URL) return true;
    if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return true;
    if (/^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) return true;
    return false;
  };

  app.use(
    cors({
      origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(morgan('dev'));
  app.use(mongoSanitize());

  // 5. Health-check
  app.get('/health', (_req, res) => {
    res.status(200).json({ success: true, message: 'Server is running' });
  });

  // 6. API routes
  app.use('/api', routes);

  // 7. Centralized error handler (must be last)
  app.use(errorHandler);

  // 8. HTTP server + Socket.IO
  const server = http.createServer(app);
  initSocket(server);

  // 9. Listen
  server.listen(env.PORT, () => {
    console.log(
      `\n🚀 Mentore Solution LMS server running on port ${env.PORT} (${env.NODE_ENV})\n`
    );
  });
}

bootstrap().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
