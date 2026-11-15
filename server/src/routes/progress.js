import { Router } from 'express';
import { z } from 'zod';
import Progress from '../models/Progress.js';
import PrivateNote from '../models/PrivateNote.js';
import Lecture from '../models/Lecture.js';
import { requireAuth } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';

const router = Router();

const updateProgressSchema = {
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    lastPosition: z.number().min(0),
    completed: z.boolean().optional(),
  }),
};

const updatePrivateNoteSchema = {
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    text: z.string(),
  }),
};

/**
 * GET /api/lectures/:id/progress — Get saved progress
 */
router.get(
  '/lectures/:id/progress',
  requireAuth,
  catchAsync(async (req, res) => {
    const progress = await Progress.findOne({
      student: req.user._id,
      lecture: req.params.id,
    });

    res.status(200).json({
      success: true,
      data: {
        lastPosition: progress ? progress.lastPosition : 0,
        completed: progress ? progress.completed : false,
      },
    });
  })
);

/**
 * PUT /api/lectures/:id/progress — Save playback progress every 10s
 */
router.put(
  '/lectures/:id/progress',
  requireAuth,
  validate(updateProgressSchema),
  catchAsync(async (req, res) => {
    const { lastPosition, completed } = req.body;

    const progress = await Progress.findOneAndUpdate(
      { student: req.user._id, lecture: req.params.id },
      {
        lastPosition,
        ...(completed !== undefined && { completed }),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ success: true, data: { progress } });
  })
);

/**
 * GET /api/lectures/:id/private-note — Get student's private notes
 */
router.get(
  '/lectures/:id/private-note',
  requireAuth,
  catchAsync(async (req, res) => {
    const note = await PrivateNote.findOne({
      student: req.user._id,
      lecture: req.params.id,
    });

    res.status(200).json({
      success: true,
      data: { text: note ? note.text : '' },
    });
  })
);

/**
 * PUT /api/lectures/:id/private-note — Autosave student's private notes
 */
router.put(
  '/lectures/:id/private-note',
  requireAuth,
  validate(updatePrivateNoteSchema),
  catchAsync(async (req, res) => {
    const { text } = req.body;

    const note = await PrivateNote.findOneAndUpdate(
      { student: req.user._id, lecture: req.params.id },
      { text },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ success: true, data: { text: note.text } });
  })
);

export default router;
