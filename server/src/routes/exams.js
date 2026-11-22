import { Router } from 'express';
import mongoose from 'mongoose';
import Exam from '../models/Exam.js';
import ExamSubmission from '../models/ExamSubmission.js';
import User from '../models/User.js';
import Batch from '../models/Batch.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import { getIO } from '../socket/index.js';

const router = Router();

/**
 * Helper: Strip correct answers from exam questions for students taking an exam
 */
function sanitizeExamForStudent(examDoc) {
  const exam = examDoc.toObject ? examDoc.toObject() : { ...examDoc };
  if (exam.questions && Array.isArray(exam.questions)) {
    exam.questions = exam.questions.map((q) => {
      const { correctOptionIndex, explanation, ...sanitized } = q;
      return sanitized;
    });
  }
  return exam;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. LIST EXAMS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/exams
 * Trainer: Lists all scheduled exams with submission statistics.
 * Student: Lists active exams targeted to their batch (or all batches).
 */
router.get(
  '/',
  requireAuth,
  catchAsync(async (req, res) => {
    const isTrainer = req.user.role === 'trainer';

    if (isTrainer) {
      const { status, category, batch } = req.query;
      const filter = {};

      if (status && status !== 'all') {
        filter.status = status;
      }
      if (category && category !== 'all') {
        filter.category = category;
      }
      if (batch && batch !== 'all') {
        filter.$or = [{ isAllBatches: true }, { targetBatches: batch }];
      }

      const exams = await Exam.find(filter)
        .populate('targetBatches', 'name')
        .sort({ createdAt: -1 });

      // Attach submission counts to each exam
      const examIds = exams.map((e) => e._id);
      const submissionCounts = await ExamSubmission.aggregate([
        { $match: { exam: { $in: examIds } } },
        {
          $group: {
            _id: '$exam',
            totalSubmissions: { $sum: 1 },
            completedCount: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
            },
            terminatedCount: {
              $sum: { $cond: [{ $eq: ['$status', 'terminated'] }, 1, 0] },
            },
            passedCount: {
              $sum: { $cond: [{ $eq: ['$passed', true] }, 1, 0] },
            },
          },
        },
      ]);

      const countMap = {};
      submissionCounts.forEach((sc) => {
        countMap[sc._id.toString()] = sc;
      });

      const examsWithStats = exams.map((exam) => {
        const stats = countMap[exam._id.toString()] || {
          totalSubmissions: 0,
          completedCount: 0,
          terminatedCount: 0,
          passedCount: 0,
        };
        return {
          ...exam.toJSON(),
          stats,
        };
      });

      return res.json({
        success: true,
        count: examsWithStats.length,
        data: { exams: examsWithStats },
      });
    }

    // ── Student perspective ──
    const studentBatchId = req.user.batch?._id || req.user.batch;

    // Students only see active exams matching their batch or open to all batches
    const filter = {
      status: 'active',
    };

    if (studentBatchId) {
      filter.$or = [
        { isAllBatches: true },
        { targetBatches: studentBatchId },
      ];
    } else {
      filter.isAllBatches = true;
    }

    const exams = await Exam.find(filter)
      .populate('targetBatches', 'name')
      .sort({ createdAt: -1 });

    // Find this student's previous submissions to show current progress / result
    const studentSubmissions = await ExamSubmission.find({
      student: req.user._id,
      exam: { $in: exams.map((e) => e._id) },
    });

    const subMap = {};
    studentSubmissions.forEach((sub) => {
      subMap[sub.exam.toString()] = sub;
    });

    const studentExams = exams.map((exam) => {
      const sanitized = sanitizeExamForStudent(exam);
      const sub = subMap[exam._id.toString()];
      return {
        ...sanitized,
        mySubmission: sub
          ? {
              id: sub._id,
              status: sub.status,
              score: sub.score,
              totalMarks: sub.totalMarks,
              percentage: sub.percentage,
              passed: sub.passed,
              terminationReason: sub.terminationReason,
              submittedAt: sub.submittedAt,
            }
          : null,
      };
    });

    res.json({
      success: true,
      count: studentExams.length,
      data: { exams: studentExams },
    });
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// 2. EXCEL-STYLE MARKS MATRIX (TRAINER DASHBOARD)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/exams/marks-matrix
 * Comprehensive spreadsheet matrix of all students across all scheduled exams.
 */
router.get(
  '/marks-matrix',
  requireAuth,
  requireRole('trainer'),
  catchAsync(async (req, res) => {
    const { batch, search } = req.query;

    const studentFilter = { role: 'student' };
    if (batch && batch !== 'all') {
      studentFilter.batch = batch;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      studentFilter.$or = [
        { firstName: regex },
        { lastName: regex },
        { email: regex },
      ];
    }

    // Fetch students
    const students = await User.find(studentFilter)
      .populate('batch', 'name')
      .sort({ firstName: 1, lastName: 1 })
      .select('firstName lastName email batch createdAt');

    // Fetch all exams
    const exams = await Exam.find()
      .populate('targetBatches', 'name')
      .sort({ createdAt: -1 })
      .select('title category totalMarks duration passPercentage status createdAt');

    // Fetch all submissions for these students and exams
    const submissions = await ExamSubmission.find({
      student: { $in: students.map((s) => s._id) },
      exam: { $in: exams.map((e) => e._id) },
    }).select('exam student score totalMarks percentage passed status terminationReason submittedAt timeSpentSeconds');

    // Build fast lookup matrix: matrix[studentId][examId] = submissionData
    const matrix = {};
    const studentStats = {};

    students.forEach((s) => {
      const sId = s._id.toString();
      matrix[sId] = {};
      studentStats[sId] = {
        totalAttempted: 0,
        totalPassed: 0,
        totalTerminated: 0,
        totalScore: 0,
        totalMaxScore: 0,
        averagePercentage: 0,
      };
    });

    submissions.forEach((sub) => {
      const sId = sub.student.toString();
      const eId = sub.exam.toString();

      if (matrix[sId]) {
        matrix[sId][eId] = {
          submissionId: sub._id,
          score: sub.score,
          totalMarks: sub.totalMarks,
          percentage: sub.percentage,
          passed: sub.passed,
          status: sub.status,
          terminationReason: sub.terminationReason,
          submittedAt: sub.submittedAt,
          timeSpentSeconds: sub.timeSpentSeconds,
        };

        if (sub.status === 'completed' || sub.status === 'terminated') {
          studentStats[sId].totalAttempted += 1;
          if (sub.passed) studentStats[sId].totalPassed += 1;
          if (sub.status === 'terminated') studentStats[sId].totalTerminated += 1;
          studentStats[sId].totalScore += sub.score;
          studentStats[sId].totalMaxScore += sub.totalMarks;
        }
      }
    });

    // Compute average percentages
    Object.keys(studentStats).forEach((sId) => {
      const st = studentStats[sId];
      if (st.totalMaxScore > 0) {
        st.averagePercentage = Math.round((st.totalScore / st.totalMaxScore) * 100);
      }
    });

    res.json({
      success: true,
      data: {
        students,
        exams,
        matrix,
        studentStats,
      },
    });
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// 3. STUDENT PROGRESS DEEP-DIVE (TRAINER DASHBOARD)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/exams/student-progress/:studentId
 * View a candidate's complete exam history, performance, and proctoring telemetry.
 */
router.get(
  '/student-progress/:studentId',
  requireAuth,
  requireRole('trainer'),
  catchAsync(async (req, res) => {
    const { studentId } = req.params;

    const student = await User.findById(studentId)
      .populate('batch', 'name')
      .select('firstName lastName email batch role createdAt');

    if (!student) {
      throw new AppError('Student candidate not found', 404);
    }

    const submissions = await ExamSubmission.find({ student: studentId })
      .populate('exam', 'title category duration passPercentage totalMarks status')
      .sort({ createdAt: -1 });

    const totalAttempted = submissions.filter((s) => s.status !== 'in_progress').length;
    const totalPassed = submissions.filter((s) => s.passed).length;
    const totalTerminated = submissions.filter((s) => s.status === 'terminated').length;
    const totalScore = submissions.reduce((sum, s) => sum + (s.score || 0), 0);
    const totalMaxPossible = submissions.reduce((sum, s) => sum + (s.totalMarks || 0), 0);

    const averagePercentage =
      totalMaxPossible > 0 ? Math.round((totalScore / totalMaxPossible) * 100) : 0;

    res.json({
      success: true,
      data: {
        student,
        summary: {
          totalAttempted,
          totalPassed,
          totalTerminated,
          totalScore,
          totalMaxPossible,
          averagePercentage,
        },
        submissions,
      },
    });
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// 4. STUDENT'S OWN EXAM HISTORY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/exams/my-history
 * Returns the currently logged in student's exam records.
 */
router.get(
  '/my-history',
  requireAuth,
  catchAsync(async (req, res) => {
    const submissions = await ExamSubmission.find({ student: req.user._id })
      .populate('exam', 'title category duration passPercentage totalMarks')
      .populate('batch', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: submissions.length,
      data: { submissions },
    });
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// 5. GET SINGLE EXAM DETAILS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/exams/:id
 * Retrieve exam questions and metadata.
 */
router.get(
  '/:id',
  requireAuth,
  catchAsync(async (req, res) => {
    const exam = await Exam.findById(req.params.id).populate('targetBatches', 'name');
    if (!exam) {
      throw new AppError('Exam not found', 404);
    }

    const isTrainer = req.user.role === 'trainer';

    if (isTrainer) {
      return res.json({
        success: true,
        data: { exam },
      });
    }

    // Student perspective
    const studentBatchId = req.user.batch?._id || req.user.batch;
    const isEligibleBatch =
      exam.isAllBatches ||
      (studentBatchId &&
        exam.targetBatches.some((b) => b._id.toString() === studentBatchId.toString()));

    if (!isEligibleBatch) {
      throw new AppError('You are not authorized to access this exam.', 403);
    }

    // Check if student has already submitted
    const existingSubmission = await ExamSubmission.findOne({
      exam: exam._id,
      student: req.user._id,
    });

    if (existingSubmission && existingSubmission.status !== 'in_progress') {
      // Completed or terminated -> student is allowed to see the review with explanations
      return res.json({
        success: true,
        data: {
          exam,
          mySubmission: existingSubmission,
        },
      });
    }

    // During active exam attempt -> Strip correct answers
    const sanitizedExam = sanitizeExamForStudent(exam);

    res.json({
      success: true,
      data: {
        exam: sanitizedExam,
        mySubmission: existingSubmission,
      },
    });
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// 6. CREATE EXAM (TRAINER ONLY)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/exams
 * Create a new MCQ examination.
 */
router.post(
  '/',
  requireAuth,
  requireRole('trainer'),
  catchAsync(async (req, res) => {
    const {
      title,
      description,
      category,
      targetBatches,
      isAllBatches,
      duration,
      passPercentage,
      status,
      questions,
    } = req.body;

    if (!title || !title.trim()) {
      throw new AppError('Exam title is required', 400);
    }

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      throw new AppError('At least 1 question is required to create an exam', 400);
    }

    // Validate each question
    questions.forEach((q, idx) => {
      if (!q.questionText || !q.questionText.trim()) {
        throw new AppError(`Question #${idx + 1} is missing question prompt text.`, 400);
      }
      if (!q.options || !Array.isArray(q.options) || q.options.length < 2) {
        throw new AppError(`Question #${idx + 1} must have at least 2 options.`, 400);
      }
      if (
        typeof q.correctOptionIndex !== 'number' ||
        q.correctOptionIndex < 0 ||
        q.correctOptionIndex >= q.options.length
      ) {
        throw new AppError(
          `Question #${idx + 1} must designate a valid correct answer option.`,
          400
        );
      }
    });

    const parsedDuration = parseInt(duration, 10) || 30;
    const parsedPassPercentage = parseInt(passPercentage, 10) || 50;

    const exam = await Exam.create({
      title: title.trim(),
      description: description ? description.trim() : '',
      category: category || 'General',
      targetBatches: isAllBatches ? [] : targetBatches || [],
      isAllBatches: !!isAllBatches,
      duration: parsedDuration,
      passPercentage: parsedPassPercentage,
      status: status || 'draft',
      questions,
      totalMarks: questions.length, // 1 mark per MCQ
      createdBy: req.user._id,
      createdByName: `${req.user.firstName} ${req.user.lastName}`.trim(),
    });

    const populatedExam = await Exam.findById(exam._id).populate('targetBatches', 'name');

    // Notify connected clients
    try {
      const io = getIO();
      if (exam.status === 'active') {
        io.emit('exam_published', {
          id: exam._id,
          title: exam.title,
          category: exam.category,
        });
      }
    } catch (err) {}

    res.status(201).json({
      success: true,
      message: 'Exam created successfully',
      data: { exam: populatedExam },
    });
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// 7. UPDATE EXAM (TRAINER ONLY)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PUT /api/exams/:id
 */
router.put(
  '/:id',
  requireAuth,
  requireRole('trainer'),
  catchAsync(async (req, res) => {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      throw new AppError('Exam not found', 404);
    }

    const {
      title,
      description,
      category,
      targetBatches,
      isAllBatches,
      duration,
      passPercentage,
      status,
      questions,
    } = req.body;

    if (title) exam.title = title.trim();
    if (description !== undefined) exam.description = description.trim();
    if (category) exam.category = category;
    if (isAllBatches !== undefined) exam.isAllBatches = !!isAllBatches;
    if (targetBatches !== undefined) exam.targetBatches = exam.isAllBatches ? [] : targetBatches;
    if (duration) exam.duration = parseInt(duration, 10) || 30;
    if (passPercentage) exam.passPercentage = parseInt(passPercentage, 10) || 50;
    if (status) exam.status = status;

    if (questions && Array.isArray(questions) && questions.length > 0) {
      questions.forEach((q, idx) => {
        if (!q.questionText || !q.questionText.trim()) {
          throw new AppError(`Question #${idx + 1} prompt cannot be empty`, 400);
        }
        if (!q.options || q.options.length < 2) {
          throw new AppError(`Question #${idx + 1} must have at least 2 options`, 400);
        }
      });
      exam.questions = questions;
      exam.totalMarks = questions.length;
    }

    await exam.save();
    const updated = await Exam.findById(exam._id).populate('targetBatches', 'name');

    res.json({
      success: true,
      message: 'Exam updated successfully',
      data: { exam: updated },
    });
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// 8. TOGGLE EXAM STATUS (TRAINER ONLY)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PATCH /api/exams/:id/status
 * Toggle between 'draft', 'active', 'inactive'.
 */
router.patch(
  '/:id/status',
  requireAuth,
  requireRole('trainer'),
  catchAsync(async (req, res) => {
    const { status } = req.body;
    if (!['draft', 'active', 'inactive'].includes(status)) {
      throw new AppError('Invalid status value', 400);
    }

    const exam = await Exam.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).populate('targetBatches', 'name');

    if (!exam) {
      throw new AppError('Exam not found', 404);
    }

    // Real-time broadcast
    try {
      const io = getIO();
      io.emit('exam_status_changed', {
        id: exam._id,
        status: exam.status,
        title: exam.title,
      });
    } catch (err) {}

    res.json({
      success: true,
      message: `Exam status changed to ${status}`,
      data: { exam },
    });
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// 9. DELETE EXAM (TRAINER ONLY)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * DELETE /api/exams/:id
 */
router.delete(
  '/:id',
  requireAuth,
  requireRole('trainer'),
  catchAsync(async (req, res) => {
    const exam = await Exam.findByIdAndDelete(req.params.id);
    if (!exam) {
      throw new AppError('Exam not found', 404);
    }

    // Also remove associated submissions
    await ExamSubmission.deleteMany({ exam: req.params.id });

    res.json({
      success: true,
      message: 'Exam and all associated submissions deleted successfully',
    });
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// 10. START EXAM ATTEMPT (STUDENT)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/exams/:id/start
 * Verifies eligibility, initializes proctored session record.
 */
router.post(
  '/:id/start',
  requireAuth,
  catchAsync(async (req, res) => {
    if (req.user.role === 'trainer') {
      throw new AppError('Trainers cannot take exams as students', 403);
    }

    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      throw new AppError('Exam not found', 404);
    }

    if (exam.status !== 'active') {
      throw new AppError('This exam is currently inactive or not available.', 400);
    }

    const studentBatchId = req.user.batch?._id || req.user.batch;
    const isEligible =
      exam.isAllBatches ||
      (studentBatchId &&
        exam.targetBatches.some((b) => b.toString() === studentBatchId.toString()));

    if (!isEligible) {
      throw new AppError('Your batch is not enrolled in this scheduled exam.', 403);
    }

    let submission = await ExamSubmission.findOne({
      exam: exam._id,
      student: req.user._id,
    });

    if (submission) {
      if (submission.status === 'completed' || submission.status === 'terminated') {
        throw new AppError('You have already completed this exam.', 400);
      }
      // Resume existing in_progress submission
      return res.json({
        success: true,
        message: 'Resuming active exam attempt',
        data: { submission },
      });
    }

    // Create new attempt
    submission = await ExamSubmission.create({
      exam: exam._id,
      student: req.user._id,
      batch: studentBatchId || null,
      studentName: `${req.user.firstName} ${req.user.lastName}`.trim(),
      studentEmail: req.user.email,
      totalMarks: exam.totalMarks,
      startedAt: new Date(),
      status: 'in_progress',
    });

    res.status(201).json({
      success: true,
      message: 'Exam session started. Proctored environment active.',
      data: { submission },
    });
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// 11. SUBMIT EXAM (STUDENT)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/exams/:id/submit
 * Automated instant grading (1 mark per correct answer).
 */
router.post(
  '/:id/submit',
  requireAuth,
  catchAsync(async (req, res) => {
    const { answers, timeSpentSeconds, tabSwitchCount, phoneDetectionCount, violations } = req.body;

    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      throw new AppError('Exam not found', 404);
    }

    const submission = await ExamSubmission.findOne({
      exam: exam._id,
      student: req.user._id,
    });

    if (!submission) {
      throw new AppError('No active exam session found for this student', 404);
    }

    if (submission.status === 'completed' || submission.status === 'terminated') {
      throw new AppError('This exam has already been finalized and submitted.', 400);
    }

    // Grade answers
    let score = 0;
    const gradedAnswers = [];

    exam.questions.forEach((question, idx) => {
      const studentAnswer = (answers || []).find((a) => a.questionIndex === idx);
      const selectedOptionIndex =
        studentAnswer && typeof studentAnswer.selectedOptionIndex === 'number'
          ? studentAnswer.selectedOptionIndex
          : null;

      const isCorrect = selectedOptionIndex === question.correctOptionIndex;
      if (isCorrect) {
        score += 1;
      }

      gradedAnswers.push({
        questionIndex: idx,
        selectedOptionIndex,
        isCorrect,
      });
    });

    const totalMarks = exam.questions.length;
    const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
    const passed = percentage >= exam.passPercentage;

    submission.answers = gradedAnswers;
    submission.score = score;
    submission.totalMarks = totalMarks;
    submission.percentage = percentage;
    submission.passed = passed;
    submission.status = 'completed';
    submission.submittedAt = new Date();
    submission.timeSpentSeconds = parseInt(timeSpentSeconds, 10) || 0;
    submission.tabSwitchCount = parseInt(tabSwitchCount, 10) || 0;
    submission.phoneDetectionCount = parseInt(phoneDetectionCount, 10) || 0;
    if (Array.isArray(violations)) {
      submission.violations = violations;
    }

    await submission.save();

    // Notify trainer room
    try {
      const io = getIO();
      io.to('role:trainer').emit('exam_completed', {
        examId: exam._id,
        examTitle: exam.title,
        studentName: submission.studentName,
        score,
        totalMarks,
        passed,
      });
    } catch (err) {}

    res.json({
      success: true,
      message: 'Exam submitted successfully',
      data: {
        submission: {
          score,
          totalMarks,
          percentage,
          passed,
          status: submission.status,
          timeSpentSeconds: submission.timeSpentSeconds,
        },
      },
    });
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// 12. TERMINATE EXAM DUE TO CHEATING (STUDENT PROCTOR TRIGGER)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/exams/:id/terminate
 * Triggered when student exceeds tab switches (>5) or phone detections (>2).
 * Strictly awards 0 marks and marks as failed.
 */
router.post(
  '/:id/terminate',
  requireAuth,
  catchAsync(async (req, res) => {
    const { reason, tabSwitchCount, phoneDetectionCount, violations, timeSpentSeconds } = req.body;

    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      throw new AppError('Exam not found', 404);
    }

    let submission = await ExamSubmission.findOne({
      exam: exam._id,
      student: req.user._id,
    });

    if (!submission) {
      submission = new ExamSubmission({
        exam: exam._id,
        student: req.user._id,
        batch: req.user.batch?._id || req.user.batch || null,
        studentName: `${req.user.firstName} ${req.user.lastName}`.trim(),
        studentEmail: req.user.email,
      });
    }

    submission.score = 0;
    submission.totalMarks = exam.totalMarks || exam.questions.length;
    submission.percentage = 0;
    submission.passed = false;
    submission.status = 'terminated';
    submission.terminationReason =
      reason || 'Exam terminated due to proctoring security violation';
    submission.tabSwitchCount = parseInt(tabSwitchCount, 10) || 0;
    submission.phoneDetectionCount = parseInt(phoneDetectionCount, 10) || 0;
    submission.submittedAt = new Date();
    submission.timeSpentSeconds = parseInt(timeSpentSeconds, 10) || 0;

    if (Array.isArray(violations)) {
      submission.violations = violations;
    }

    await submission.save();

    // Emit security alert to trainers
    try {
      const io = getIO();
      io.to('role:trainer').emit('exam_security_violation', {
        examId: exam._id,
        examTitle: exam.title,
        studentName: submission.studentName,
        studentEmail: submission.studentEmail,
        reason: submission.terminationReason,
        tabSwitches: submission.tabSwitchCount,
        phoneDetections: submission.phoneDetectionCount,
      });
    } catch (err) {}

    res.json({
      success: true,
      message: 'Exam terminated due to security violation. 0 marks assigned.',
      data: {
        submission: {
          score: 0,
          totalMarks: submission.totalMarks,
          percentage: 0,
          passed: false,
          status: 'terminated',
          terminationReason: submission.terminationReason,
        },
      },
    });
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// 13. EXAM LEADERBOARD (BY BATCH OR OVERALL)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/exams/:id/leaderboard
 * Ranked leaderboard with batch filtering.
 */
router.get(
  '/:id/leaderboard',
  requireAuth,
  catchAsync(async (req, res) => {
    const { batch } = req.query;

    const exam = await Exam.findById(req.params.id).select('title totalMarks passPercentage');
    if (!exam) {
      throw new AppError('Exam not found', 404);
    }

    const filter = {
      exam: exam._id,
      status: { $in: ['completed', 'terminated'] },
    };

    if (batch && batch !== 'all') {
      filter.batch = batch;
    }

    const submissions = await ExamSubmission.find(filter)
      .populate('batch', 'name')
      .sort({ score: -1, timeSpentSeconds: 1, submittedAt: 1 });

    const leaderboard = submissions.map((sub, index) => ({
      rank: index + 1,
      submissionId: sub._id,
      studentId: sub.student,
      studentName: sub.studentName,
      studentEmail: sub.studentEmail,
      batchName: sub.batch?.name || 'General',
      score: sub.score,
      totalMarks: sub.totalMarks,
      percentage: sub.percentage,
      passed: sub.passed,
      status: sub.status,
      terminationReason: sub.terminationReason,
      timeSpentSeconds: sub.timeSpentSeconds,
      submittedAt: sub.submittedAt,
    }));

    res.json({
      success: true,
      data: {
        exam,
        leaderboard,
      },
    });
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// 14. EXAM SUBMISSIONS LIST (TRAINER ONLY)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/exams/:id/submissions
 */
router.get(
  '/:id/submissions',
  requireAuth,
  requireRole('trainer'),
  catchAsync(async (req, res) => {
    const submissions = await ExamSubmission.find({ exam: req.params.id })
      .populate('batch', 'name')
      .populate('student', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: submissions.length,
      data: { submissions },
    });
  })
);

export default router;
