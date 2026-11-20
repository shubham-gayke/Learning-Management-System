import { Router } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Batch from '../models/Batch.js';
import Lecture from '../models/Lecture.js';
import Question from '../models/Question.js';
import AllowedEmail from '../models/AllowedEmail.js';
import Progress from '../models/Progress.js';
import PrivateNote from '../models/PrivateNote.js';
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
  catchAsync(async (req, res) => {
    // Isolate lecture count to this trainer's assigned categories or uploaded lectures
    const lectureFilter =
      Array.isArray(req.user.allowedCategories) && req.user.allowedCategories.length > 0
        ? {
            $or: [
              { createdBy: req.user._id },
              { category: { $in: req.user.allowedCategories } },
            ],
          }
        : { createdBy: req.user._id };

    // Isolate questions strictly to this trainer
    const questionFilter = { trainer: req.user._id };

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

        Lecture.countDocuments(lectureFilter),

        Question.countDocuments({ ...questionFilter, status: 'open', readByTrainer: false }),

        Question.find(questionFilter)
          .sort({ createdAt: -1 })
          .limit(6)
          .populate('student', 'firstName lastName email')
          .populate('lecture', 'title category')
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

/**
 * DELETE /students/:id — Delete a student completely from the system.
 */
router.delete(
  '/students/:id',
  requireAuth,
  requireRole('trainer'),
  catchAsync(async (req, res) => {
    const student = await User.findById(req.params.id);

    if (!student || student.role !== 'student') {
      throw new AppError('Student not found or cannot be deleted.', 404);
    }

    const studentId = student._id;
    const studentEmail = student.email;

    // Cascade delete all student-specific data
    await Promise.all([
      User.findByIdAndDelete(studentId),
      Progress.deleteMany({ student: studentId }),
      PrivateNote.deleteMany({ student: studentId }),
      Question.deleteMany({ student: studentId }),
      AllowedEmail.deleteMany({ email: studentEmail }),
    ]);

    try {
      const io = getIO();
      io.to('role:trainer').emit('stats_update');
      io.to('role:trainer').emit('student_deleted', { studentId });
    } catch (err) {}

    res.status(200).json({
      success: true,
      message: `Student ${student.firstName} ${student.lastName} (${studentEmail}) was completely removed from the system.`,
    });
  })
);

/**
 * GET /allowed-emails — List allowed student emails with search, filter, and pagination.
 */
router.get(
  '/allowed-emails',
  requireAuth,
  requireRole('trainer'),
  catchAsync(async (req, res) => {
    const { batch, search, status, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const filter = {};

    if (status === 'registered') {
      filter.registered = true;
    } else if (status === 'pending') {
      filter.registered = false;
    }

    if (batch) {
      filter.batch = new mongoose.Types.ObjectId(batch);
    }

    if (search && search.trim()) {
      filter.email = new RegExp(search.trim(), 'i');
    }

    const skip = (pageNum - 1) * limitNum;

    const [allowedEmails, total, totalAll, totalRegistered, totalPending] = await Promise.all([
      AllowedEmail.find(filter)
        .populate('batch', 'name')
        .populate('addedBy', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      AllowedEmail.countDocuments(filter),
      AllowedEmail.countDocuments({}),
      AllowedEmail.countDocuments({ registered: true }),
      AllowedEmail.countDocuments({ registered: false }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        allowedEmails,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum) || 1,
        },
        stats: {
          total: totalAll,
          registered: totalRegistered,
          pending: totalPending,
        },
      },
    });
  })
);

/**
 * POST /allowed-emails — Add single or bulk allowed student emails.
 */
router.post(
  '/allowed-emails',
  requireAuth,
  requireRole('trainer'),
  catchAsync(async (req, res) => {
    let { emails, batchId, note } = req.body;

    let emailList = [];
    if (Array.isArray(emails)) {
      emailList = emails;
    } else if (typeof emails === 'string') {
      emailList = emails
        .split(/[\s,;\n\r]+/)
        .map((e) => e.trim())
        .filter(Boolean);
    }

    // Email regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validEmails = Array.from(
      new Set(
        emailList
          .map((e) => (typeof e === 'string' ? e.toLowerCase().trim() : ''))
          .filter((e) => e && emailRegex.test(e))
      )
    );

    if (validEmails.length === 0) {
      throw new AppError('No valid email addresses provided.', 400);
    }

    // Check which emails already exist in AllowedEmail
    const existingEntries = await AllowedEmail.find({ email: { $in: validEmails } }).select('email');
    const existingSet = new Set(existingEntries.map((entry) => entry.email));

    const newEmails = validEmails.filter((email) => !existingSet.has(email));
    const duplicates = validEmails.filter((email) => existingSet.has(email));

    if (newEmails.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'All provided emails are already in the allowed list.',
        data: {
          addedCount: 0,
          skippedCount: duplicates.length,
          duplicates,
          addedEmails: [],
        },
      });
    }

    // Check if any of the new emails already have existing user accounts
    const existingUsers = await User.find({ email: { $in: newEmails } }).select('email createdAt');
    const userMap = new Map(existingUsers.map((u) => [u.email, u]));

    const docsToInsert = newEmails.map((email) => {
      const existingUser = userMap.get(email);
      return {
        email,
        addedBy: req.user._id,
        batch: batchId || null,
        note: note ? note.trim() : '',
        registered: Boolean(existingUser),
        registeredAt: existingUser ? existingUser.createdAt : null,
      };
    });

    await AllowedEmail.insertMany(docsToInsert);

    res.status(201).json({
      success: true,
      message: `Successfully added ${docsToInsert.length} email(s) to the allowed list.${
        duplicates.length > 0 ? ` (${duplicates.length} already existed and were skipped)` : ''
      }`,
      data: {
        addedCount: docsToInsert.length,
        skippedCount: duplicates.length,
        duplicates,
        addedEmails: newEmails,
      },
    });
  })
);

/**
 * DELETE /allowed-emails/:id — Remove an email from the allowlist.
 */
router.delete(
  '/allowed-emails/:id',
  requireAuth,
  requireRole('trainer'),
  catchAsync(async (req, res) => {
    const entry = await AllowedEmail.findByIdAndDelete(req.params.id);
    if (!entry) {
      throw new AppError('Allowed email record not found.', 404);
    }

    res.status(200).json({
      success: true,
      message: `Removed ${entry.email} from the allowed list.`,
    });
  })
);

export default router;
