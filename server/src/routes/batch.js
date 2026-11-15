import { Router } from 'express';
import { z } from 'zod';
import Batch from '../models/Batch.js';
import User from '../models/User.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';

const router = Router();

// ── Schemas ──────────────────────────────────────────────────────────

const createBatchSchema = {
  body: z.object({
    name: z.string().trim().min(1, 'Batch name is required'),
    description: z.string().trim().optional(),
    isActive: z.boolean().optional(),
  }),
};

const updateBatchSchema = {
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    name: z.string().trim().min(1).optional(),
    description: z.string().trim().optional(),
    isActive: z.boolean().optional(),
  }),
};

// ── Routes ───────────────────────────────────────────────────────────

/**
 * GET / — List active batches with student count.
 */
router.get(
  '/',
  requireAuth,
  catchAsync(async (_req, res) => {
    const batches = await Batch.aggregate([
      { $match: { isActive: true } },
      {
        $lookup: {
          from: 'users',
          let: { batchId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$batch', '$$batchId'] },
                    { $eq: ['$role', 'student'] },
                  ],
                },
              },
            },
            { $count: 'count' },
          ],
          as: 'studentData',
        },
      },
      {
        $addFields: {
          studentCount: {
            $ifNull: [{ $arrayElemAt: ['$studentData.count', 0] }, 0],
          },
        },
      },
      { $project: { studentData: 0 } },
      { $sort: { name: 1 } },
    ]);

    res.status(200).json({ success: true, data: { batches } });
  })
);

/**
 * POST / — Create a new batch (trainer only).
 */
router.post(
  '/',
  requireAuth,
  requireRole('trainer'),
  validate(createBatchSchema),
  catchAsync(async (req, res) => {
    const { name, description, isActive } = req.body;

    const batch = await Batch.create({
      name,
      description,
      isActive,
      trainer: req.user._id,
    });

    res.status(201).json({ success: true, data: { batch } });
  })
);

/**
 * PATCH /:id — Update a batch (trainer only).
 */
router.patch(
  '/:id',
  requireAuth,
  requireRole('trainer'),
  validate(updateBatchSchema),
  catchAsync(async (req, res) => {
    const { name, description, isActive } = req.body;

    const batch = await Batch.findByIdAndUpdate(
      req.params.id,
      { ...(name !== undefined && { name }), ...(description !== undefined && { description }), ...(isActive !== undefined && { isActive }) },
      { new: true, runValidators: true }
    );

    if (!batch) {
      throw new AppError('Batch not found.', 404);
    }

    res.status(200).json({ success: true, data: { batch } });
  })
);

export default router;
