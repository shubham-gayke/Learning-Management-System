import { Router } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import Question from '../models/Question.js';
import Lecture from '../models/Lecture.js';
import User from '../models/User.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import { getIO } from '../socket/index.js';

const router = Router();

// ── Validation Schemas ────────────────────────────────────────────────

const createQuestionSchema = {
  body: z.object({
    text: z.string().trim().min(1, 'Question text is required').max(1000, 'Max 1000 characters'),
    videoTimestamp: z.number().nullable().optional(),
    isAnonymous: z.boolean().optional().default(false),
    isPrivate: z.boolean().optional().default(false),
  }),
};

const addMessageSchema = {
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    text: z.string().trim().min(1, 'Message text is required').max(1000),
  }),
};

const updateQuestionSchema = {
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    status: z.enum(['open', 'resolved']).optional(),
    isPrivate: z.boolean().optional(),
  }),
};

// ── Helper: Format Question according to viewer's role and identity ──

function formatQuestion(q, currentUserId, isTrainer) {
  if (!q) return null;
  const qObj = q.toObject ? q.toObject() : { ...q };

  const authorId = q.student?._id
    ? q.student._id.toString()
    : q.student
    ? q.student.toString()
    : null;

  const isAuthor = Boolean(
    currentUserId && authorId && authorId === currentUserId.toString()
  );

  if (q.isAnonymous && !isTrainer && !isAuthor) {
    qObj.student = {
      _id: null,
      firstName: 'Anonymous',
      lastName: 'Student',
    };
  }

  return qObj;
}

// ── Routes ───────────────────────────────────────────────────────────

/**
 * GET /api/lectures/:lectureId/questions — List questions for a lecture
 */
router.get(
  '/lectures/:lectureId/questions',
  requireAuth,
  catchAsync(async (req, res) => {
    const lecture = await Lecture.findById(req.params.lectureId);
    if (!lecture) {
      throw new AppError('Lecture not found.', 404);
    }

    const isTrainer = req.user.role === 'trainer';

    let filter = { lecture: lecture._id };

    if (!isTrainer) {
      // Must be enrolled in batch
      if (!req.user.batch || req.user.batch.toString() !== lecture.batch.toString()) {
        throw new AppError('Forbidden: Not enrolled in this batch.', 403);
      }
      // Students see: their own questions OR public questions
      filter = {
        lecture: lecture._id,
        $or: [
          { student: req.user._id },
          { isPrivate: false },
        ],
      };
    } else {
      // Trainer rule: ONLY the instructor assigned to this lecture/category can view its questions
      const isLectureTrainer =
        lecture.createdBy?.toString() === req.user._id.toString() ||
        (Array.isArray(req.user.allowedCategories) &&
          req.user.allowedCategories.length > 0 &&
          req.user.allowedCategories.includes(lecture.category)) ||
        (!req.user.allowedCategories?.length && !lecture.createdBy);

      if (!isLectureTrainer) {
        return res.status(200).json({ success: true, data: { questions: [] } });
      }
    }

    const questions = await Question.find(filter)
      .populate('student', 'firstName lastName email role')
      .populate('messages.sender', 'firstName lastName role')
      .sort({ createdAt: -1 });

    const formatted = questions.map((q) => formatQuestion(q, req.user._id, isTrainer));

    res.status(200).json({ success: true, data: { questions: formatted } });
  })
);

/**
 * POST /api/lectures/:lectureId/questions — Ask a question
 */
router.post(
  '/lectures/:lectureId/questions',
  requireAuth,
  validate(createQuestionSchema),
  catchAsync(async (req, res) => {
    const { lectureId } = req.params;
    const { text, videoTimestamp, isAnonymous, isPrivate } = req.body;

    const lecture = await Lecture.findById(lectureId);
    if (!lecture) {
      throw new AppError('Lecture not found.', 404);
    }

    // Student batch check
    if (req.user.role !== 'trainer') {
      if (!req.user.batch || req.user.batch.toString() !== lecture.batch.toString()) {
        throw new AppError('Forbidden: Not enrolled in this batch.', 403);
      }
    }

    // Resolve assigned trainer for this lecture
    let targetTrainerId = lecture.createdBy;
    if (!targetTrainerId) {
      if (['Linux Lectures', 'AWS Lectures'].includes(lecture.category)) {
        const shrikant = await User.findOne({ email: 'shrikant.somwanshi@mentoresolution.com' });
        targetTrainerId = shrikant?._id;
      } else if (['DevOps Lectures'].includes(lecture.category)) {
        const suraj = await User.findOne({ email: 'suraj.bele@mentoresolution.com' });
        targetTrainerId = suraj?._id;
      } else {
        const lead = await User.findOne({ email: 'trainer@mentoresolution.com' });
        targetTrainerId = lead?._id;
      }
    }

    const question = await Question.create({
      lecture: lecture._id,
      trainer: targetTrainerId,
      batch: lecture.batch,
      student: req.user._id,
      text,
      videoTimestamp: videoTimestamp ?? null,
      isAnonymous: !!isAnonymous,
      isPrivate: !!isPrivate,
      status: 'open',
      readByTrainer: false,
      readByStudent: true,
      messages: [
        {
          sender: req.user._id,
          role: req.user.role,
          text,
          createdAt: new Date(),
        },
      ],
    });

    const populated = await Question.findById(question._id)
      .populate('student', 'firstName lastName email role')
      .populate('trainer', 'firstName lastName email')
      .populate('messages.sender', 'firstName lastName role')
      .populate('lecture', 'title category createdBy')
      .populate('batch', 'name');

    // Real-time socket broadcast: Notify ONLY this question's specific trainer
    try {
      const io = getIO();
      // Notify students in lecture room
      io.to(`lecture:${lectureId}`).emit('new_question', {
        question: formatQuestion(populated, null, false),
      });
      // Notify ONLY the assigned trainer's private room
      if (targetTrainerId) {
        io.to(`trainer:${targetTrainerId}`).emit('trainer_new_question', {
          question: populated,
        });
        io.to(`trainer:${targetTrainerId}`).emit('stats_update');
      }
    } catch (err) {
      console.error('[Socket Broadcast Error in new question]:', err);
    }

    res.status(201).json({
      success: true,
      data: { question: formatQuestion(populated, req.user._id, req.user.role === 'trainer') },
    });
  })
);

/**
 * POST /api/questions/:id/messages — Add a reply/message to a question thread
 */
router.post(
  '/questions/:id/messages',
  requireAuth,
  validate(addMessageSchema),
  catchAsync(async (req, res) => {
    const { text } = req.body;
    const question = await Question.findById(req.params.id);

    if (!question) {
      throw new AppError('Question not found.', 404);
    }

    const isTrainer = req.user.role === 'trainer';
    const isAuthor = question.student.toString() === req.user._id.toString();

    if (isTrainer) {
      // ONLY the assigned trainer can reply to this question!
      if (question.trainer && question.trainer.toString() !== req.user._id.toString()) {
        throw new AppError('Forbidden: Only the assigned trainer can reply to this question.', 403);
      }
    } else if (!isAuthor) {
      throw new AppError('Forbidden: You cannot reply to this question.', 403);
    }

    const newMessage = {
      sender: req.user._id,
      role: req.user.role,
      text,
      createdAt: new Date(),
    };

    question.messages.push(newMessage);

    if (isTrainer) {
      question.readByStudent = false; // student needs to see reply
      question.readByTrainer = true;
    } else {
      question.readByTrainer = false; // trainer needs to see student's follow-up
      question.readByStudent = true;
    }

    await question.save();

    const populated = await Question.findById(question._id)
      .populate('student', 'firstName lastName email role')
      .populate('trainer', 'firstName lastName email')
      .populate('messages.sender', 'firstName lastName role');

    // Real-time socket emit: Target only thread student and this question's specific trainer
    try {
      const io = getIO();
      // Notify question thread student
      io.to(`user:${question.student}`).emit('question_message', {
        questionId: question._id,
        message: populated.messages[populated.messages.length - 1],
      });
      // Notify ONLY this specific trainer's room
      if (question.trainer) {
        io.to(`trainer:${question.trainer}`).emit('question_message', {
          questionId: question._id,
          message: populated.messages[populated.messages.length - 1],
        });
        io.to(`trainer:${question.trainer}`).emit('stats_update');
      }
      io.to(`lecture:${question.lecture}`).emit('question_updated', {
        question: formatQuestion(populated, null, false),
      });
    } catch (err) {
      console.error('[Socket Broadcast Error in question message]:', err);
    }

    res.status(200).json({
      success: true,
      data: { question: formatQuestion(populated, req.user._id, isTrainer) },
    });
  })
);

/**
 * PATCH /api/questions/:id — Resolve or toggle privacy
 */
router.patch(
  '/questions/:id',
  requireAuth,
  validate(updateQuestionSchema),
  catchAsync(async (req, res) => {
    const question = await Question.findById(req.params.id);
    if (!question) {
      throw new AppError('Question not found.', 404);
    }

    const isTrainer = req.user.role === 'trainer';
    const isAuthor = question.student.toString() === req.user._id.toString();

    if (isTrainer) {
      if (question.trainer && question.trainer.toString() !== req.user._id.toString()) {
        throw new AppError('Forbidden: Only the assigned trainer can modify this question.', 403);
      }
    } else if (!isAuthor) {
      throw new AppError('Forbidden: Cannot modify this question.', 403);
    }

    const { status, isPrivate } = req.body;
    if (status !== undefined) question.status = status;
    if (isPrivate !== undefined && isTrainer) question.isPrivate = isPrivate;

    // Mark as read when opened
    if (isTrainer) question.readByTrainer = true;
    if (isAuthor) question.readByStudent = true;

    await question.save();

    const populated = await Question.findById(question._id)
      .populate('student', 'firstName lastName email role')
      .populate('trainer', 'firstName lastName email')
      .populate('messages.sender', 'firstName lastName role');

    try {
      const io = getIO();
      io.to(`lecture:${question.lecture}`).emit('question_updated', {
        question: formatQuestion(populated, null, false),
      });
      if (question.trainer) {
        io.to(`trainer:${question.trainer}`).emit('trainer_question_updated', {
          question: populated,
        });
        io.to(`trainer:${question.trainer}`).emit('stats_update');
      }
    } catch (err) {
      console.error('[Socket Broadcast Error in question update]:', err);
    }

    res.status(200).json({
      success: true,
      data: { question: formatQuestion(populated, req.user._id, isTrainer) },
    });
  })
);

/**
 * DELETE /api/questions/:id — Delete question (Trainer only)
 */
router.delete(
  '/questions/:id',
  requireAuth,
  requireRole('trainer'),
  catchAsync(async (req, res) => {
    const question = await Question.findById(req.params.id);
    if (!question) {
      throw new AppError('Question not found.', 404);
    }

    if (question.trainer && question.trainer.toString() !== req.user._id.toString()) {
      throw new AppError('Forbidden: Only the assigned trainer can delete this question.', 403);
    }

    await question.deleteOne();

    try {
      const io = getIO();
      io.to(`lecture:${question.lecture}`).emit('question_deleted', {
        questionId: question._id,
      });
      if (question.trainer) {
        io.to(`trainer:${question.trainer}`).emit('trainer_question_deleted', {
          questionId: question._id,
        });
        io.to(`trainer:${question.trainer}`).emit('stats_update');
      }
    } catch (err) {
      console.error('[Socket Broadcast Error in question delete]:', err);
    }

    res.status(200).json({ success: true, message: 'Question deleted successfully.' });
  })
);

/**
 * GET /api/student/questions — "My Questions" for the logged-in student
 */
router.get(
  '/student/questions',
  requireAuth,
  catchAsync(async (req, res) => {
    const questions = await Question.find({ student: req.user._id })
      .populate('lecture', 'title batch recordedAt')
      .populate('trainer', 'firstName lastName email')
      .populate('messages.sender', 'firstName lastName role')
      .sort({ updatedAt: -1 });

    res.status(200).json({ success: true, data: { questions } });
  })
);

/**
 * GET /api/trainer/questions — Trainer Q&A Inbox (Specific to logged-in trainer)
 */
router.get(
  '/trainer/questions',
  requireAuth,
  requireRole('trainer'),
  catchAsync(async (req, res) => {
    const { batch, lecture, status, search, page = 1, limit = 20 } = req.query;

    // Filter strictly by the current trainer!
    const filter = { trainer: req.user._id };
    if (batch) filter.batch = new mongoose.Types.ObjectId(batch);
    if (lecture) filter.lecture = new mongoose.Types.ObjectId(lecture);
    if (status) filter.status = status;
    if (search) filter.text = new RegExp(search, 'i');

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const [questions, total] = await Promise.all([
      Question.find(filter)
        .populate('student', 'firstName lastName email')
        .populate('trainer', 'firstName lastName email')
        .populate('lecture', 'title batch')
        .populate('batch', 'name')
        .populate('messages.sender', 'firstName lastName role')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(take),
      Question.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        questions,
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
 * GET /api/notifications/unread — Unread question count (Specific to current user)
 */
router.get(
  '/notifications/unread',
  requireAuth,
  catchAsync(async (req, res) => {
    let unreadCount = 0;

    if (req.user.role === 'trainer') {
      unreadCount = await Question.countDocuments({
        trainer: req.user._id,
        readByTrainer: false,
      });
    } else {
      unreadCount = await Question.countDocuments({
        student: req.user._id,
        readByStudent: false,
      });
    }

    res.status(200).json({ success: true, data: { unreadCount } });
  })
);

export default router;
