import { Router } from 'express';
import path from 'path';
import { existsSync } from 'fs';
import fs from 'fs/promises';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import Lecture from '../models/Lecture.js';
import { requireAuth } from '../middleware/auth.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import storageService from '../services/storageService.js';

const router = Router();

// Middleware: Verify student/trainer stream authorization
async function verifyStreamAccess(req, res, next) {
  const { lectureId } = req.params;
  const lecture = await Lecture.findById(lectureId);

  if (!lecture) {
    return next(new AppError('Lecture not found.', 404));
  }

  const isTrainer = req.user.role === 'trainer';

  if (!isTrainer) {
    // Student must belong to lecture's batch
    if (!req.user.batch || req.user.batch.toString() !== lecture.batch.toString()) {
      return next(new AppError('Forbidden: You are not enrolled in this batch.', 403));
    }
    // Must be published
    if (!lecture.isPublished) {
      return next(new AppError('Forbidden: This lecture is not available.', 403));
    }
  }

  req.lecture = lecture;
  next();
}

// In-memory cache for resolved Google Drive stream sessions (fileId -> { url, cookies, expiresAt })
const driveStreamCache = new Map();

async function getDriveStreamSession(fileId) {
  const cached = driveStreamCache.get(fileId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached;
  }

  const userAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  const initialUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download`;
  const initialRes = await fetch(initialUrl, {
    headers: { 'User-Agent': userAgent },
  });

  const contentType = initialRes.headers.get('content-type') || '';
  const cookies = initialRes.headers.get('set-cookie') || '';

  // If directly a video stream
  if (!contentType.includes('text/html')) {
    const session = {
      url: initialUrl,
      cookies,
      expiresAt: Date.now() + 15 * 60 * 1000,
    };
    driveStreamCache.set(fileId, session);
    return session;
  }

  // Virus scan warning page for large videos (> 25MB): extract uuid and cookies
  const html = await initialRes.text();
  const uuidMatch =
    html.match(/name="uuid"\s+value="([^"]+)"/i) || html.match(/uuid=([a-zA-Z0-9-]+)/i);

  if (uuidMatch) {
    const uuid = uuidMatch[1];
    const confirmUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t&uuid=${uuid}`;
    const session = {
      url: confirmUrl,
      cookies,
      expiresAt: Date.now() + 15 * 60 * 1000,
    };
    driveStreamCache.set(fileId, session);
    return session;
  }

  // Fallback try with confirm=t
  const session = {
    url: `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`,
    cookies,
    expiresAt: Date.now() + 5 * 60 * 1000,
  };
  driveStreamCache.set(fileId, session);
  return session;
}

/**
 * GET /:lectureId/video — Secure video streaming proxy with HTTP Range support.
 * Plays directly inside the LMS custom player with NO Drive redirects or link exposure.
 */
router.get(
  '/:lectureId/video',
  requireAuth,
  verifyStreamAccess,
  catchAsync(async (req, res) => {
    const fileId = req.lecture.driveFileId;
    if (!fileId) {
      throw new AppError('Video source ID missing.', 404);
    }

    let session = await getDriveStreamSession(fileId);

    const userAgent =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    const buildHeaders = (sess) => {
      const h = { 'User-Agent': userAgent };
      if (sess.cookies) h.Cookie = sess.cookies;
      if (req.headers.range) h.Range = req.headers.range;
      return h;
    };

    let driveRes = await fetch(session.url, {
      headers: buildHeaders(session),
    });

    // If response returned HTML (e.g. session token invalidated), flush cache and retry once
    const contentType = driveRes.headers.get('content-type') || '';
    if (contentType.includes('text/html') || (!driveRes.ok && driveRes.status !== 206)) {
      driveStreamCache.delete(fileId);
      session = await getDriveStreamSession(fileId);
      driveRes = await fetch(session.url, {
        headers: buildHeaders(session),
      });
    }

    if (!driveRes.ok && driveRes.status !== 206) {
      throw new AppError('Unable to stream video from Google Drive.', 502);
    }

    return forwardStream(driveRes, res);
  })
);

function forwardStream(upstreamRes, clientRes) {
  const status = upstreamRes.status === 206 ? 206 : 200;

  clientRes.status(status);
  clientRes.set({
    'Content-Type': upstreamRes.headers.get('content-type') || 'video/mp4',
    'Accept-Ranges': 'bytes',
    'Content-Disposition': 'inline',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
  });

  if (upstreamRes.headers.get('content-range')) {
    clientRes.set('Content-Range', upstreamRes.headers.get('content-range'));
  }
  if (upstreamRes.headers.get('content-length')) {
    clientRes.set('Content-Length', upstreamRes.headers.get('content-length'));
  }

  if (upstreamRes.body) {
    return pipeline(Readable.fromWeb(upstreamRes.body), clientRes);
  }
  clientRes.end();
}

/**
 * GET /:lectureId/thumbnail — Video snapshot image proxy
 */
router.get(
  '/:lectureId/thumbnail',
  requireAuth,
  verifyStreamAccess,
  catchAsync(async (req, res) => {
    const fileId = req.lecture.driveFileId;
    if (!fileId) {
      throw new AppError('Video ID missing.', 404);
    }

    const thumbUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1280`;
    const thumbRes = await fetch(thumbUrl);

    if (!thumbRes.ok || !thumbRes.body) {
      return res.redirect('/placeholder-thumbnail.svg');
    }

    res.set({
      'Content-Type': thumbRes.headers.get('content-type') || 'image/jpeg',
      'Cache-Control': 'public, max-age=86400',
    });

    return pipeline(Readable.fromWeb(thumbRes.body), res);
  })
);

/**
 * GET /:lectureId/master.m3u8 — Master playlist (for HLS assets)
 */
router.get(
  '/:lectureId/master.m3u8',
  requireAuth,
  verifyStreamAccess,
  catchAsync(async (req, res) => {
    const lectureDir = path.join(storageService.resolvedHlsRoot, req.lecture.hlsPath || '');
    const masterPath = path.join(lectureDir, 'master.m3u8');

    if (!existsSync(masterPath)) {
      // If HLS file does not exist, redirect to the direct secure video stream
      return res.redirect(`/api/stream/${req.lecture._id}/video`);
    }

    res.set({
      'Content-Type': 'application/vnd.apple.mpegurl',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    });

    const content = await fs.readFile(masterPath);
    res.send(content);
  })
);

/**
 * GET /:lectureId/key — Return AES-128 binary encryption key
 */
router.get(
  '/:lectureId/key',
  requireAuth,
  verifyStreamAccess,
  catchAsync(async (req, res) => {
    const lectureDir = path.join(storageService.resolvedHlsRoot, req.lecture.hlsPath || '');
    const keyPath = path.join(lectureDir, 'key.bin');

    if (existsSync(keyPath)) {
      const keyBuffer = await fs.readFile(keyPath);
      res.set({
        'Content-Type': 'application/octet-stream',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      });
      return res.send(keyBuffer);
    }

    throw new AppError('Decryption key not found.', 404);
  })
);

/**
 * GET /:lectureId/:rendition/:file — Variant playlist or segment
 */
router.get(
  '/:lectureId/:rendition/:file',
  requireAuth,
  verifyStreamAccess,
  catchAsync(async (req, res) => {
    const { rendition, file } = req.params;
    const lectureDir = path.join(storageService.resolvedHlsRoot, req.lecture.hlsPath || '');
    const targetFile = path.join(lectureDir, rendition, file);

    if (!existsSync(targetFile)) {
      throw new AppError('Stream asset not found.', 404);
    }

    if (file.endsWith('.m3u8')) {
      res.set({
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      });
      const content = await fs.readFile(targetFile);
      return res.send(content);
    }

    res.set({
      'Content-Type': 'video/mp2t',
      'Cache-Control': 'public, max-age=3600',
    });
    storageService.driver.getReadStream(`${req.lecture.hlsPath}/${rendition}/${file}`).pipe(res);
  })
);

/**
 * GET /:lectureId/embed — Return Google Drive embed URL
 */
router.get(
  '/:lectureId/embed',
  requireAuth,
  verifyStreamAccess,
  catchAsync(async (req, res) => {
    const fileId = req.lecture.driveFileId;
    if (!fileId) {
      throw new AppError('Video ID missing.', 404);
    }

    res.json({
      success: true,
      data: {
        embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
      },
    });
  })
);

export default router;
