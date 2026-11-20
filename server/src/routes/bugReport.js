import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import BugReport from '../models/BugReport.js';
import { optionalAuth, requireAuth, requireRole } from '../middleware/auth.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import { getIO } from '../socket/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, '../../uploads/bug-reports');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer disk storage for screenshot images and audio voice notes
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || (file.mimetype.includes('audio') ? '.webm' : '.png');
    const safeBase = file.fieldname.replace(/[^a-zA-Z0-9_-]/g, '');
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${safeBase}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB max
  },
});

const router = Router();

/**
 * POST /api/bug-reports — Submit a new bug report with text, voice note, and screenshot.
 */
router.post(
  '/',
  optionalAuth,
  upload.fields([
    { name: 'screenshot', maxCount: 1 },
    { name: 'voiceNote', maxCount: 1 },
  ]),
  catchAsync(async (req, res) => {
    const {
      title,
      category,
      severity,
      description,
      stepsToReproduce,
      reporterName,
      reporterEmail,
      voiceNoteDuration,
    } = req.body;

    if (!title || !title.trim()) {
      throw new AppError('Bug title is required.', 400);
    }
    if (!description || !description.trim()) {
      throw new AppError('Description of the issue is required.', 400);
    }

    let parsedDeviceInfo = {};
    if (req.body.deviceInfo) {
      try {
        parsedDeviceInfo = typeof req.body.deviceInfo === 'string'
          ? JSON.parse(req.body.deviceInfo)
          : req.body.deviceInfo;
      } catch {}
    }

    // Capture attachments from multer
    const screenshotFile = req.files?.['screenshot']?.[0];
    const voiceNoteFile = req.files?.['voiceNote']?.[0];

    const user = req.user;
    const finalReporterName = user
      ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Student'
      : (reporterName?.trim() || 'Guest User');
    const finalReporterEmail = user ? user.email : (reporterEmail?.trim().toLowerCase() || 'unknown@user.com');
    const finalReporterRole = user ? user.role : 'guest';

    const report = await BugReport.create({
      reporter: user?._id || null,
      reporterName: finalReporterName,
      reporterEmail: finalReporterEmail,
      reporterRole: finalReporterRole,
      title: title.trim(),
      category: category || 'ui_glitch',
      severity: severity || 'medium',
      description: description.trim(),
      stepsToReproduce: stepsToReproduce ? stepsToReproduce.trim() : '',
      screenshotFileName: screenshotFile ? screenshotFile.filename : null,
      screenshotOriginalName: screenshotFile ? screenshotFile.originalname : null,
      voiceNoteFileName: voiceNoteFile ? voiceNoteFile.filename : null,
      voiceNoteDuration: voiceNoteDuration ? parseFloat(voiceNoteDuration) : 0,
      deviceInfo: parsedDeviceInfo,
      status: 'open',
    });

    // Notify trainer / dev team in real-time via socket
    try {
      const io = getIO();
      io.to('role:trainer').emit('new_bug_report', {
        id: report._id,
        title: report.title,
        severity: report.severity,
        reporterName: finalReporterName,
        createdAt: report.createdAt,
      });
    } catch {}

    res.status(201).json({
      success: true,
      message: 'Bug report submitted successfully to the Dev Team. Thank you!',
      data: { report },
    });
  })
);

/**
 * GET /api/bug-reports — List bug reports (trainers and dev review).
 */
router.get(
  '/',
  requireAuth,
  requireRole('trainer'),
  catchAsync(async (req, res) => {
    const { status, category, search, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (category) filter.category = category;
    if (search && search.trim()) {
      filter.$or = [
        { title: new RegExp(search.trim(), 'i') },
        { description: new RegExp(search.trim(), 'i') },
        { reporterName: new RegExp(search.trim(), 'i') },
        { reporterEmail: new RegExp(search.trim(), 'i') },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [reports, total] = await Promise.all([
      BugReport.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      BugReport.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        reports,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum) || 1,
        },
      },
    });
  })
);

/**
 * GET /api/bug-reports/:id/attachment/:type — Stream screenshot or voice note audio.
 * :type = 'screenshot' | 'voice'
 */
router.get(
  '/:id/attachment/:type',
  catchAsync(async (req, res) => {
    const { id, type } = req.params;
    const report = await BugReport.findById(id);

    if (!report) {
      throw new AppError('Bug report not found.', 404);
    }

    let fileName = null;
    let contentType = 'application/octet-stream';

    if (type === 'screenshot') {
      fileName = report.screenshotFileName;
      if (fileName?.endsWith('.png')) contentType = 'image/png';
      else if (fileName?.endsWith('.jpg') || fileName?.endsWith('.jpeg')) contentType = 'image/jpeg';
      else if (fileName?.endsWith('.webp')) contentType = 'image/webp';
    } else if (type === 'voice') {
      fileName = report.voiceNoteFileName;
      contentType = 'audio/webm';
    }

    if (!fileName) {
      throw new AppError(`No ${type} attachment found for this report.`, 404);
    }

    const filePath = path.join(uploadDir, fileName);
    if (!fs.existsSync(filePath)) {
      throw new AppError('Attachment file missing from storage.', 404);
    }

    res.setHeader('Content-Type', contentType);
    fs.createReadStream(filePath).pipe(res);
  })
);

/**
 * PATCH /api/bug-reports/:id — Update bug report status or add developer notes.
 */
router.patch(
  '/:id',
  requireAuth,
  requireRole('trainer'),
  catchAsync(async (req, res) => {
    const { status, devNotes } = req.body;
    const report = await BugReport.findById(req.params.id);

    if (!report) {
      throw new AppError('Bug report not found.', 404);
    }

    if (status) report.status = status;
    if (devNotes !== undefined) report.devNotes = devNotes;

    await report.save();

    res.status(200).json({
      success: true,
      message: 'Bug report updated successfully.',
      data: { report },
    });
  })
);

export default router;
