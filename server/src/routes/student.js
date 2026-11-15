import { Router } from 'express';
import { z } from 'zod';
import User from '../models/User.js';
import Batch from '../models/Batch.js';
import { requireAuth } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import { getIO } from '../socket/index.js';

const router = Router();

// ── Schemas ──────────────────────────────────────────────────────────

const changeBatchSchema = {
  body: z.object({
    batchId: z.string().min(1, 'batchId is required'),
  }),
};

// ── Routes ───────────────────────────────────────────────────────────

/**
 * GET /profile — Return current student profile with batch populated.
 */
router.get(
  '/profile',
  requireAuth,
  catchAsync(async (req, res) => {
    const user = await User.findById(req.user._id).populate('batch');
    res.status(200).json({ success: true, data: { user } });
  })
);

/**
 * PATCH /batch — Select or change batch (one-change rule enforced server-side).
 *
 *  • First selection (no current batch) → set batch, do NOT increment batchChangesUsed.
 *  • Subsequent change (batchChangesUsed < 1) → set new batch, increment to 1, push history.
 *  • Already used the change allowance → 403.
 */
router.patch(
  '/batch',
  requireAuth,
  validate(changeBatchSchema),
  catchAsync(async (req, res) => {
    const { batchId } = req.body;
    const user = await User.findById(req.user._id);

    // Validate target batch exists and is active
    const batch = await Batch.findById(batchId);
    if (!batch || !batch.isActive) {
      throw new AppError('Batch not found or is inactive.', 400);
    }

    // ── First selection ──────────────────────────────────────────────
    if (!user.batch) {
      user.batch = batch._id;
      await user.save();

      const populated = await User.findById(user._id).populate('batch');

      try {
        const io = getIO();
        io.to('role:trainer').emit('student_enrolled', {
          student: {
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            batch: populated.batch,
          },
          batchId: batch._id,
          batchName: batch.name,
        });
        io.to('role:trainer').emit('stats_update');
      } catch (err) {}

      return res.status(200).json({
        success: true,
        message: 'Batch selected successfully.',
        data: { user: populated },
      });
    }

    // ── Already used the one allowed change ──────────────────────────
    if (user.batchChangesUsed >= 1) {
      throw new AppError('You have used your one batch change allowance.', 403);
    }

    // ── Allow the change ─────────────────────────────────────────────
    user.batchHistory.push({ batch: user.batch, changedAt: new Date() });
    user.batch = batch._id;
    user.batchChangesUsed = 1;
    await user.save();

    const populated = await User.findById(user._id).populate('batch');

    try {
      const io = getIO();
      io.to('role:trainer').emit('student_enrolled', {
        student: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          batch: populated.batch,
        },
        batchId: batch._id,
        batchName: batch.name,
      });
      io.to('role:trainer').emit('stats_update');
    } catch (err) {}

    res.status(200).json({
      success: true,
      message: 'Batch changed successfully. You have no remaining batch changes.',
      data: { user: populated },
    });
  })
);

export default router;
