import { Router } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import Lecture from '../models/Lecture.js';
import Batch from '../models/Batch.js';
import Note from '../models/Note.js';
import Question from '../models/Question.js';
import Progress from '../models/Progress.js';
import PrivateNote from '../models/PrivateNote.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import { getIO } from '../socket/index.js';
import { extractDriveFileId, validateDriveAccess } from '../services/driveService.js';
import { enqueueLecture } from '../jobs/videoQueue.js';
import storageService from '../services/storageService.js';

const router = Router();

// ── Validation Schemas ────────────────────────────────────────────────

const LECTURE_CATEGORIES = [
  'Linux Lectures',
  'AWS Lectures',
  'DevOps Lectures',
  'AI Lectures',
  'Communication Skill Lectures',
  'Job Portal Optimization + Resume Building Session',
];

const createLectureSchema = {
  body: z.object({
    batchId: z.string().min(1, 'Batch is required'),
    title: z.string().trim().min(1, 'Video name is required'),
    driveLink: z.string().trim().min(1, 'Google Drive link is required'),
    category: z.enum(LECTURE_CATEGORIES).optional().default('Linux Lectures'),
    isPublished: z.boolean().optional().default(true),
  }),
};

const updateLectureSchema = {
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    title: z.string().trim().min(1).optional(),
    isPublished: z.boolean().optional(),
    batchId: z.string().optional(),
    category: z.enum(LECTURE_CATEGORIES).optional(),
  }),
};

// ── Routes ───────────────────────────────────────────────────────────

/**
 * GET / — List lectures
 *   - Students: only lectures of their batch and published.
 *   - Trainers: can filter by batch and search.
 */
router.get(
  '/',
  requireAuth,
  catchAsync(async (req, res) => {
    const isTrainer = req.user.role === 'trainer';
    const { batch, search, category, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (category && category !== 'all') {
      filter.category = category;
    }

    if (isTrainer) {
      if (batch) filter.batch = new mongoose.Types.ObjectId(batch);
      if (search) filter.title = new RegExp(search, 'i');
      if (Array.isArray(req.user.allowedCategories) && req.user.allowedCategories.length > 0) {
        if (category && category !== 'all') {
          if (!req.user.allowedCategories.includes(category)) {
            throw new AppError(
              `Forbidden: You are not authorized to view ${category}. Allowed: ${req.user.allowedCategories.join(', ')}`,
              403
            );
          }
          filter.category = category;
        } else {
          filter.category = { $in: req.user.allowedCategories };
        }
      } else if (category && category !== 'all') {
        filter.category = category;
      }
    } else {
      // Student rule: ONLY own batch
      if (!req.user.batch) {
        return res.status(200).json({
          success: true,
          data: { lectures: [], pagination: { total: 0, page: 1, limit: 20, pages: 0 } },
        });
      }
      filter.batch = req.user.batch;
      filter.isPublished = true;
      filter.status = 'ready';
      if (category && category !== 'all') {
        filter.category = category;
      }
      if (search) filter.title = new RegExp(search, 'i');
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const [lectures, total] = await Promise.all([
      Lecture.find(filter)
        .populate('batch', 'name')
        .populate('createdBy', 'firstName lastName')
        .sort({ recordedAt: -1 })
        .skip(skip)
        .limit(take),
      Lecture.countDocuments(filter),
    ]);

    // Student safe serialization
    const sanitizedLectures = isTrainer
      ? lectures
      : lectures.map((l) => l.toStudentJSON());

    res.status(200).json({
      success: true,
      data: {
        lectures: sanitizedLectures,
        pagination: {
          total,
          page: parseInt(page, 10),
          limit: take,
          pages: Math.ceil(total / take),
        },
      },
    });
  })
);

/**
 * GET /:id — Get single lecture details
 */
router.get(
  '/:id',
  requireAuth,
  catchAsync(async (req, res) => {
    const lecture = await Lecture.findById(req.params.id)
      .populate('batch', 'name')
      .populate('createdBy', 'firstName lastName');
    if (!lecture) {
      throw new AppError('Lecture not found.', 404);
    }

    const isTrainer = req.user.role === 'trainer';

    if (!isTrainer) {
      // Authorization check: must belong to the same batch
      if (!req.user.batch || req.user.batch.toString() !== lecture.batch._id.toString()) {
        throw new AppError('Forbidden: You do not have access to this lecture.', 403);
      }
      if (!lecture.isPublished) {
        throw new AppError('Lecture is not yet published.', 403);
      }
      return res.status(200).json({
        success: true,
        data: { lecture: lecture.toStudentJSON() },
      });
    }

    res.status(200).json({
      success: true,
      data: { lecture },
    });
  })
);

/**
 * POST / — Create and enqueue lecture (Trainer only)
 */
router.post(
  '/',
  requireAuth,
  requireRole('trainer'),
  validate(createLectureSchema),
  catchAsync(async (req, res) => {
    const { batchId, title, driveLink, isPublished, category } = req.body;
    const lectureCategory = category || 'Linux Lectures';

    // Verify trainer track authorization
    if (
      req.user.role === 'trainer' &&
      Array.isArray(req.user.allowedCategories) &&
      req.user.allowedCategories.length > 0
    ) {
      if (!req.user.allowedCategories.includes(lectureCategory)) {
        throw new AppError(
          `Forbidden: You are only authorized to upload videos for: ${req.user.allowedCategories.join(', ')}`,
          403
        );
      }
    }

    const batch = await Batch.findById(batchId);
    if (!batch) {
      throw new AppError('Batch not found.', 404);
    }

    const fileId = extractDriveFileId(driveLink);
    if (!fileId) {
      throw new AppError('Invalid Google Drive link or file ID.', 400);
    }

    // Validate Google Drive access
    await validateDriveAccess(fileId);

    // Automatic server timestamp (Asia/Kolkata)
    const recordedAt = new Date();

    const lecture = await Lecture.create({
      title,
      batch: batch._id,
      category: lectureCategory,
      driveFileId: fileId,
      driveLink,
      recordedAt,
      isPublished: isPublished ?? true,
      status: 'ready',
      progressPercent: 100,
      createdBy: req.user._id,
    });

    try {
      const io = getIO();
      io.to('role:trainer').emit('stats_update');
      io.to(`batch:${batch._id}`).emit('new_lecture', { lecture });
    } catch (err) {}

    res.status(201).json({
      success: true,
      message: 'Lecture published and ready to watch!',
      data: { lecture },
    });
  })
);

/**
 * PATCH /:id — Update lecture title or publish state (Trainer only)
 */
router.patch(
  '/:id',
  requireAuth,
  requireRole('trainer'),
  validate(updateLectureSchema),
  catchAsync(async (req, res) => {
    const { title, isPublished, batchId, category } = req.body;

    const existingLecture = await Lecture.findById(req.params.id);
    if (!existingLecture) {
      throw new AppError('Lecture not found.', 404);
    }

    if (
      req.user.role === 'trainer' &&
      Array.isArray(req.user.allowedCategories) &&
      req.user.allowedCategories.length > 0
    ) {
      if (!req.user.allowedCategories.includes(existingLecture.category)) {
        throw new AppError(
          `Forbidden: You are only authorized to modify lectures in: ${req.user.allowedCategories.join(', ')}`,
          403
        );
      }
      if (category && !req.user.allowedCategories.includes(category)) {
        throw new AppError(
          `Forbidden: You cannot change category to ${category}. Authorized: ${req.user.allowedCategories.join(', ')}`,
          403
        );
      }
    }

    const update = {};
    if (title !== undefined) update.title = title;
    if (isPublished !== undefined) update.isPublished = isPublished;
    if (batchId !== undefined) update.batch = batchId;
    if (category !== undefined) update.category = category;

    const lecture = await Lecture.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    })
      .populate('batch', 'name')
      .populate('createdBy', 'firstName lastName');

    res.status(200).json({ success: true, data: { lecture } });
  })
);

/**
 * DELETE /:id — Delete lecture and all associated files/data (Trainer only)
 */
router.delete(
  '/:id',
  requireAuth,
  requireRole('trainer'),
  catchAsync(async (req, res) => {
    const lecture = await Lecture.findById(req.params.id);
    if (!lecture) {
      throw new AppError('Lecture not found.', 404);
    }

    if (
      req.user.role === 'trainer' &&
      Array.isArray(req.user.allowedCategories) &&
      req.user.allowedCategories.length > 0
    ) {
      if (!req.user.allowedCategories.includes(lecture.category)) {
        throw new AppError(
          `Forbidden: You are only authorized to delete lectures in: ${req.user.allowedCategories.join(', ')}`,
          403
        );
      }
    }

    // 1. Delete HLS storage directory
    if (lecture.hlsPath) {
      await storageService.driver.deleteFolder(lecture.hlsPath).catch(console.error);
    }

    // 2. Delete Notes and GridFS files
    const notes = await Note.find({ lecture: lecture._id });
    const bucket = storageService.getGridFSBucket();
    for (const note of notes) {
      if (note.fileId) {
        await bucket.delete(note.fileId).catch(() => {});
      }
    }
    await Note.deleteMany({ lecture: lecture._id });

    // 3. Delete Questions, Progress, and Private Notes
    await Question.deleteMany({ lecture: lecture._id });
    await Progress.deleteMany({ lecture: lecture._id });
    await PrivateNote.deleteMany({ lecture: lecture._id });

    // 4. Delete Lecture
    await lecture.deleteOne();

    try {
      const io = getIO();
      io.to('role:trainer').emit('stats_update');
    } catch (err) {}

    res.status(200).json({
      success: true,
      message: 'Lecture and all associated data deleted successfully.',
    });
  })
);

/**
 * POST /:id/retry — Retry failed lecture processing (Trainer only)
 */
router.post(
  '/:id/retry',
  requireAuth,
  requireRole('trainer'),
  catchAsync(async (req, res) => {
    const lecture = await Lecture.findById(req.params.id);
    if (!lecture) {
      throw new AppError('Lecture not found.', 404);
    }

    lecture.status = 'queued';
    lecture.progressPercent = 0;
    lecture.errorMessage = null;
    await lecture.save();

    enqueueLecture(lecture._id);

    res.status(200).json({
      success: true,
      message: 'Lecture re-queued for processing.',
      data: { lecture },
    });
  })
);

export default router;
