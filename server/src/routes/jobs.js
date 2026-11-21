import { Router } from 'express';
import Job from '../models/Job.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import { getIO } from '../socket/index.js';

const router = Router();

// Helper to normalize URLs
const normalizeUrl = (url) => {
  if (!url) return '';
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
};

/**
 * GET /api/jobs
 * List jobs with filtering.
 * Students only see active jobs. Trainers can view all or filter by status.
 */
router.get(
  '/',
  requireAuth,
  catchAsync(async (req, res) => {
    const { search, status, jobType, batch } = req.query;
    const filter = {};

    // Students only ever see active jobs
    if (req.user.role === 'student') {
      filter.status = 'active';
    } else if (status && status !== 'all') {
      filter.status = status;
    }

    if (jobType && jobType !== 'all') {
      filter.jobType = jobType;
    }

    if (batch && batch !== 'all') {
      filter.$or = [{ targetBatch: 'All Batches' }, { targetBatch: batch }];
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { title: regex },
          { company: regex },
          { location: regex },
          { skills: { $in: [regex] } },
          { description: regex },
        ],
      });
    }

    const jobs = await Job.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: jobs.length,
      data: {
        jobs,
      },
    });
  })
);

/**
 * GET /api/jobs/:id
 * Get single job detail.
 */
router.get(
  '/:id',
  requireAuth,
  catchAsync(async (req, res) => {
    const job = await Job.findById(req.params.id);
    if (!job) {
      throw new AppError('Job opening not found.', 404);
    }

    // If student and job is not active, disallow viewing
    if (req.user.role === 'student' && job.status !== 'active') {
      throw new AppError('This job opportunity is no longer active.', 404);
    }

    res.status(200).json({
      success: true,
      data: { job },
    });
  })
);

/**
 * POST /api/jobs
 * Trainer creates/uploads new job posting.
 */
router.post(
  '/',
  requireAuth,
  requireRole('trainer'),
  catchAsync(async (req, res) => {
    const {
      title,
      company,
      location,
      jobType,
      experience,
      salary,
      applyUrl,
      description,
      skills,
      targetBatch,
      status,
      deadline,
    } = req.body;

    if (!title || !title.trim()) {
      throw new AppError('Job title is required.', 400);
    }
    if (!company || !company.trim()) {
      throw new AppError('Company name is required.', 400);
    }
    if (!applyUrl || !applyUrl.trim()) {
      throw new AppError('Application link / URL is required.', 400);
    }
    if (!description || !description.trim()) {
      throw new AppError('Job description and requirements are required.', 400);
    }

    // Process skills into array
    let skillsArray = [];
    if (Array.isArray(skills)) {
      skillsArray = skills.map((s) => String(s).trim()).filter(Boolean);
    } else if (typeof skills === 'string') {
      skillsArray = skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }

    const job = await Job.create({
      title: title.trim(),
      company: company.trim(),
      location: (location || 'Pune / Hybrid').trim(),
      jobType: jobType || 'Full-time',
      experience: (experience || '0-2 Years / Freshers').trim(),
      salary: (salary || 'Competitive / Best in Industry').trim(),
      applyUrl: normalizeUrl(applyUrl),
      description: description.trim(),
      skills: skillsArray,
      targetBatch: (targetBatch || 'All Batches').trim(),
      status: status === 'closed' ? 'closed' : 'active',
      deadline: deadline ? new Date(deadline) : null,
      postedBy: req.user._id,
      postedByName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 'Mentore Solution Placement Team',
    });

    // Notify connected students via WebSocket
    try {
      getIO().emit('new_job_posted', {
        id: job._id,
        title: job.title,
        company: job.company,
        targetBatch: job.targetBatch,
      });
    } catch {}

    res.status(201).json({
      success: true,
      message: 'Job opportunity published to Mentore Solution Job Portal successfully.',
      data: { job },
    });
  })
);

/**
 * PUT /api/jobs/:id
 * Trainer updates existing job posting.
 */
router.put(
  '/:id',
  requireAuth,
  requireRole('trainer'),
  catchAsync(async (req, res) => {
    const job = await Job.findById(req.params.id);
    if (!job) {
      throw new AppError('Job opening not found.', 404);
    }

    const {
      title,
      company,
      location,
      jobType,
      experience,
      salary,
      applyUrl,
      description,
      skills,
      targetBatch,
      status,
      deadline,
    } = req.body;

    if (title !== undefined) job.title = title.trim();
    if (company !== undefined) job.company = company.trim();
    if (location !== undefined) job.location = location.trim();
    if (jobType !== undefined) job.jobType = jobType;
    if (experience !== undefined) job.experience = experience.trim();
    if (salary !== undefined) job.salary = salary.trim();
    if (applyUrl !== undefined) job.applyUrl = normalizeUrl(applyUrl);
    if (description !== undefined) job.description = description.trim();
    if (targetBatch !== undefined) job.targetBatch = targetBatch.trim();
    if (status !== undefined) job.status = status;
    if (deadline !== undefined) job.deadline = deadline ? new Date(deadline) : null;

    if (skills !== undefined) {
      if (Array.isArray(skills)) {
        job.skills = skills.map((s) => String(s).trim()).filter(Boolean);
      } else if (typeof skills === 'string') {
        job.skills = skills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }

    await job.save();

    res.status(200).json({
      success: true,
      message: 'Job posting updated successfully.',
      data: { job },
    });
  })
);

/**
 * PATCH /api/jobs/:id/status
 * Quickly toggle or update status (active / closed).
 */
router.patch(
  '/:id/status',
  requireAuth,
  requireRole('trainer'),
  catchAsync(async (req, res) => {
    const { status } = req.body;
    if (!['active', 'closed'].includes(status)) {
      throw new AppError('Invalid status. Must be "active" or "closed".', 400);
    }

    const job = await Job.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!job) {
      throw new AppError('Job opening not found.', 404);
    }

    res.status(200).json({
      success: true,
      message: `Job status changed to ${status}.`,
      data: { job },
    });
  })
);

/**
 * DELETE /api/jobs/:id
 * Trainer deletes job posting.
 */
router.delete(
  '/:id',
  requireAuth,
  requireRole('trainer'),
  catchAsync(async (req, res) => {
    const job = await Job.findByIdAndDelete(req.params.id);
    if (!job) {
      throw new AppError('Job opening not found.', 404);
    }

    res.status(200).json({
      success: true,
      message: 'Job posting removed successfully.',
    });
  })
);

export default router;
