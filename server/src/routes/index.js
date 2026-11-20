import { Router } from 'express';
import authRoutes from './auth.js';
import twoFactorRoutes from './twoFactor.js';
import batchRoutes from './batch.js';
import studentRoutes from './student.js';
import trainerRoutes from './trainer.js';
import lectureRoutes from './lecture.js';
import streamRoutes from './stream.js';
import notesRoutes from './notes.js';
import questionsRoutes from './questions.js';
import progressRoutes from './progress.js';
import bugReportRoutes from './bugReport.js';
import { generalLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Stream routes (media streaming with HTTP range requests — no rate limits)
router.use('/stream', streamRoutes);

// Apply general rate limiter to standard API endpoints
router.use(generalLimiter);

// ── Mount All Sub-routers ─────────────────────────────────────────────
router.use('/auth', authRoutes);
router.use('/auth/2fa', twoFactorRoutes);
router.use('/batches', batchRoutes);
router.use('/student', studentRoutes);
router.use('/trainer', trainerRoutes);
router.use('/lectures', lectureRoutes);
router.use('/', notesRoutes);         // /lectures/:id/notes and /notes/:id/file
router.use('/', questionsRoutes);     // /lectures/:id/questions, /questions/*, /notifications/unread
router.use('/', progressRoutes);      // /lectures/:id/progress and /lectures/:id/private-note
router.use('/bug-reports', bugReportRoutes); // Bug & glitch reporting system

export default router;
