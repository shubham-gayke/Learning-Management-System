import { Router } from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import Note from '../models/Note.js';
import Lecture from '../models/Lecture.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import env from '../config/env.js';
import storageService from '../services/storageService.js';

const router = Router();

// Multer memory storage for file inspection before GridFS upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: (env.MAX_NOTE_SIZE_MB || 15) * 1024 * 1024,
  },
});

/**
 * Validate real file type by inspecting magic bytes.
 */
function validateMagicBytes(buffer, declaredMime) {
  if (!buffer || buffer.length < 4) return null;

  // PDF: %PDF- (25 50 44 46 2d)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return { type: 'pdf', mime: 'application/pdf' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return { type: 'image', mime: 'image/png' };
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { type: 'image', mime: 'image/jpeg' };
  }

  // WebP: RIFF ... WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer.length >= 12 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { type: 'image', mime: 'image/webp' };
  }

  return null;
}

/**
 * GET /api/lectures/:lectureId/notes — List all notes for a lecture
 */
router.get(
  '/lectures/:lectureId/notes',
  requireAuth,
  catchAsync(async (req, res) => {
    const lecture = await Lecture.findById(req.params.lectureId);
    if (!lecture) {
      throw new AppError('Lecture not found.', 404);
    }

    // Check batch permission for student
    if (req.user.role !== 'trainer') {
      if (!req.user.batch || req.user.batch.toString() !== lecture.batch.toString()) {
        throw new AppError('Forbidden: You are not enrolled in this batch.', 403);
      }
    }

    const notes = await Note.find({ lecture: lecture._id }).sort({ createdAt: 1 });

    res.status(200).json({ success: true, data: { notes } });
  })
);

/**
 * POST /api/lectures/:lectureId/notes — Upload note (Trainer only)
 */
router.post(
  '/lectures/:lectureId/notes',
  requireAuth,
  requireRole('trainer'),
  upload.single('file'),
  catchAsync(async (req, res) => {
    const { lectureId } = req.params;
    const { type, title, driveLink, textContent, allowDownload } = req.body;

    const lecture = await Lecture.findById(lectureId);
    if (!lecture) {
      throw new AppError('Lecture not found.', 404);
    }

    // Permission check for notes upload
    if (req.user.role === 'trainer') {
      if (req.user.canUploadNotes === false) {
        throw new AppError('Forbidden: You do not have permission to upload notes.', 403);
      }
      if (
        Array.isArray(req.user.allowedCategories) &&
        req.user.allowedCategories.length > 0 &&
        !req.user.allowedCategories.includes(lecture.category) &&
        lecture.createdBy?.toString() !== req.user._id.toString()
      ) {
        throw new AppError(
          `Forbidden: You are only authorized to upload notes for: ${req.user.allowedCategories.join(', ')}`,
          403
        );
      }
    }

    let noteType = type || (driveLink ? 'drive_link' : 'text');
    let fileId = null;

    if (driveLink && driveLink.trim()) {
      // Google Drive / Cloud Resource Link (Zero DB storage consumed)
      noteType = type || 'drive_link';
    } else if (req.file) {
      // Optional direct file upload into GridFS
      const detected = validateMagicBytes(req.file.buffer, req.file.mimetype);
      if (!detected) {
        throw new AppError(
          'Invalid file type. Only verified PDF, PNG, JPEG, and WebP files are permitted.',
          400
        );
      }

      noteType = detected.type;

      // Upload into MongoDB GridFS
      const bucket = storageService.getGridFSBucket();
      const uploadStream = bucket.openUploadStream(req.file.originalname, {
        contentType: detected.mime,
        metadata: {
          lectureId,
          uploadedBy: req.user._id,
        },
      });

      await new Promise((resolve, reject) => {
        uploadStream.end(req.file.buffer, (err) => {
          if (err) return reject(err);
          resolve();
        });
      });

      fileId = uploadStream.id;
    } else if (noteType !== 'text') {
      throw new AppError('Google Drive link or file is required.', 400);
    }

    const note = await Note.create({
      lecture: lectureId,
      type: noteType,
      title: title || (req.file ? req.file.originalname : 'Lecture Resource'),
      driveLink: driveLink ? driveLink.trim() : null,
      fileId,
      textContent: textContent || '',
      allowDownload: allowDownload === 'true' || allowDownload === true,
      uploadedBy: req.user._id,
    });

    res.status(201).json({ success: true, data: { note } });
  })
);

/**
 * GET /api/notes/:id/file — Stream file from GridFS
 */
router.get(
  '/notes/:id/file',
  requireAuth,
  catchAsync(async (req, res) => {
    const note = await Note.findById(req.params.id);
    if (!note || !note.fileId) {
      throw new AppError('File not found.', 404);
    }

    const lecture = await Lecture.findById(note.lecture);
    if (!lecture) {
      throw new AppError('Associated lecture not found.', 404);
    }

    // Check batch permission
    if (req.user.role !== 'trainer') {
      if (!req.user.batch || req.user.batch.toString() !== lecture.batch.toString()) {
        throw new AppError('Forbidden: You are not enrolled in this batch.', 403);
      }
    }

    const bucket = storageService.getGridFSBucket();
    const files = await bucket.find({ _id: new mongoose.Types.ObjectId(note.fileId) }).toArray();
    if (!files || files.length === 0) {
      throw new AppError('File content missing.', 404);
    }

    const fileMeta = files[0];
    const isDownloadRequest = req.query.download === 'true';

    // If student requests direct download, check allowDownload
    if (isDownloadRequest && req.user.role !== 'trainer' && !note.allowDownload) {
      throw new AppError('Download is disabled for this note.', 403);
    }

    const disposition = isDownloadRequest ? 'attachment' : 'inline';
    res.set({
      'Content-Type': fileMeta.contentType || 'application/octet-stream',
      'Content-Disposition': `${disposition}; filename="${fileMeta.filename}"`,
    });

    const downloadStream = bucket.openDownloadStream(note.fileId);
    downloadStream.pipe(res);
  })
);

/**
 * DELETE /api/notes/:id — Delete note (Trainer only)
 */
router.delete(
  '/notes/:id',
  requireAuth,
  requireRole('trainer'),
  catchAsync(async (req, res) => {
    const note = await Note.findById(req.params.id);
    if (!note) {
      throw new AppError('Note not found.', 404);
    }

    if (req.user.role === 'trainer') {
      if (req.user.canUploadNotes === false) {
        throw new AppError('Forbidden: You do not have permission to manage notes.', 403);
      }
      const lecture = await Lecture.findById(note.lecture);
      if (
        lecture &&
        Array.isArray(req.user.allowedCategories) &&
        req.user.allowedCategories.length > 0 &&
        !req.user.allowedCategories.includes(lecture.category) &&
        lecture.createdBy?.toString() !== req.user._id.toString()
      ) {
        throw new AppError(
          `Forbidden: You are only authorized to manage notes for: ${req.user.allowedCategories.join(', ')}`,
          403
        );
      }
    }

    // Delete file from GridFS if present
    if (note.fileId) {
      const bucket = storageService.getGridFSBucket();
      await bucket.delete(new mongoose.Types.ObjectId(note.fileId)).catch(() => {});
    }

    await note.deleteOne();

    res.status(200).json({ success: true, message: 'Note deleted successfully.' });
  })
);

export default router;
