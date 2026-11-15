import { Router } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Batch from '../models/Batch.js';
import Lecture from '../models/Lecture.js';
import Question from '../models/Question.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import { getIO } from '../socket/index.js';

const router = Router();

// ── Schemas ──────────────────────────────────────────────────────────

const updateStudentSchema = {
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    action: z.enum(['resetBatchChange', 'moveBatch']),
    batchId: z.string().optional(),
  }),
};

const studentsQuerySchema = {
  query: z.object({
    batch: z.string().optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  }),
};

// ── Routes ───────────────────────────────────────────────────────────

/**
 * GET /stats — Dashboard stats for the trainer.
 */
router.get(
  '/stats',
  requireAuth,
  requireRole('trainer'),
  catchAsync(async (_req, res) => {
    const [totalStudents, studentsPerBatch, totalLectures, unansweredQuestions, recentQuestions] =
      await Promise.all([
        User.countDocuments({ role: 'student' }),

        User.aggregate([
          { $match: { role: 'student', batch: { $ne: null } } },
          { $group: { _id: '$batch', count: { $sum: 1 } } },
          {
            $lookup: {
              from: 'batches',
              localField: '_id',
              foreignField: '_id',
              as: 'batchInfo',
            },
          },
          { $unwind: '$batchInfo' },
          {
            $project: {
              _id: 0,
              batchId: '$_id',
              batchName: '$batchInfo.name',
              studentCount: '$count',
            },
          },
          { $sort: { batchName: 1 } },
        ]),

        Lecture.countDocuments(),

        Question.countDocuments({ status: 'open', readByTrainer: false }),

        Question.find()
          .sort({ createdAt: -1 })
          .limit(6)
          .populate('student', 'firstName lastName email')
          .populate('lecture', 'title')
          .populate('batch', 'name'),
      ]);

    res.status(200).json({
      success: true,
      data: { totalStudents, studentsPerBatch, totalLectures, unansweredQuestions, recentQuestions },
    });
  })
);

/**
 * GET /students — List students. Supports batch filter, search, pagination.
 */
router.get(
  '/students',
  requireAuth,
  requireRole('trainer'),
  validate(studentsQuerySchema),
  catchAsync(async (req, res) => {
    const { batch, search, page, limit } = req.query;

    const filter = { role: 'student' };

    if (batch) {
      filter.batch = new mongoose.Types.ObjectId(batch);
    }

    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [
        { firstName: regex },
        { lastName: regex },
        { email: regex },
      ];
    }

    const skip = (page - 1) * limit;

    const [students, total] = await Promise.all([
      User.find(filter)
        .populate('batch', 'name')
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        students,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  })
);

/**
 * PATCH /students/:id — Trainer actions on a student.
 *   action: 'resetBatchChange' | 'moveBatch'
 */
router.patch(
  '/students/:id',
  requireAuth,
  requireRole('trainer'),
  validate(updateStudentSchema),
  catchAsync(async (req, res) => {
    const { action, batchId } = req.body;
    const student = await User.findById(req.params.id);

    if (!student || student.role !== 'student') {
      throw new AppError('Student not found.', 404);
    }

    switch (action) {
      case 'resetBatchChange': {
        student.batchChangesUsed = 0;
        await student.save();
        break;
      }

      case 'moveBatch': {
        if (!batchId) {
          throw new AppError('batchId is required for moveBatch action.', 400);
        }
        const batch = await Batch.findById(batchId);
        if (!batch) {
          throw new AppError('Target batch not found.', 404);
        }

        if (student.batch) {
          student.batchHistory.push({ batch: student.batch, changedAt: new Date() });
        }
        student.batch = batch._id;
        await student.save();
        break;
      }

      default:
        throw new AppError('Invalid action.', 400);
    }

    const updated = await User.findById(student._id)
      .populate('batch', 'name')
      .select('-passwordHash');

    try {
      const io = getIO();
      io.to('role:trainer').emit('stats_update');
    } catch (err) {}

    res.status(200).json({ success: true, data: { student: updated } });
  })
);

export default router;
