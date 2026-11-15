import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PQueue from 'p-queue';
import { v4 as uuidv4 } from 'uuid';
import Lecture from '../models/Lecture.js';
import { downloadDriveFile, getDriveClient } from '../services/driveService.js';
import { processVideoToHLS } from '../services/hlsService.js';
import { getIO } from '../socket/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tempDir = path.resolve(__dirname, '../../temp');

// Create queue with concurrency 1
const videoQueue = new PQueue({ concurrency: 1 });

// Helper to broadcast socket updates
function emitLectureUpdate(lectureId, data) {
  try {
    const io = getIO();
    io.emit('lecture_progress', { lectureId, ...data });
    io.to(`lecture:${lectureId}`).emit('lecture_progress', { lectureId, ...data });
    io.to('role:trainer').emit('lecture_progress', { lectureId, ...data });
  } catch (err) {
    // Socket might not be initialized during test runs
  }
}

/**
 * Worker function to process a single lecture.
 */
async function processLecture(lectureId) {
  const lecture = await Lecture.findById(lectureId);
  if (!lecture) return;

  // Prepare temp dir
  if (!existsSync(tempDir)) {
    await fs.mkdir(tempDir, { recursive: true });
  }

  const tempFilePath = path.join(tempDir, `${lecture._id}_source.mp4`);
  const hlsStorageId = lecture.hlsPath || uuidv4();

  try {
    lecture.status = 'processing';
    lecture.progressPercent = 5;
    lecture.hlsPath = hlsStorageId;
    lecture.errorMessage = null;
    await lecture.save();

    emitLectureUpdate(lectureId, {
      status: 'processing',
      progressPercent: 5,
      message: 'Downloading video from Google Drive...',
    });

    // 1. Download file from Google Drive
    await downloadDriveFile(lecture.driveFileId, tempFilePath);

    lecture.progressPercent = 25;
    await lecture.save();
    emitLectureUpdate(lectureId, {
      status: 'processing',
      progressPercent: 25,
      message: 'Analyzing and transcoding HLS renditions...',
    });

    // 2. Transcode to HLS with AES-128 encryption
    const result = await processVideoToHLS({
      lectureId: lecture._id.toString(),
      inputFilePath: tempFilePath,
      hlsStorageId,
      onProgress: async (percent) => {
        // Map 0-95% transcoding to 25-95% overall
        const mapped = Math.min(95, Math.round(25 + percent * 0.7));
        lecture.progressPercent = mapped;
        await lecture.save();
        emitLectureUpdate(lectureId, {
          status: 'processing',
          progressPercent: mapped,
        });
      },
    });

    // 3. Mark as ready
    lecture.status = 'ready';
    lecture.progressPercent = 100;
    lecture.duration = result.duration;
    lecture.availableQualities = result.availableQualities;
    lecture.encryptionKeyHex = result.encryptionKeyHex;
    lecture.errorMessage = null;
    await lecture.save();

    emitLectureUpdate(lectureId, {
      status: 'ready',
      progressPercent: 100,
      duration: result.duration,
      availableQualities: result.availableQualities,
    });
  } catch (err) {
    console.error(`❌ Lecture ${lectureId} processing failed:`, err);
    lecture.status = 'failed';
    lecture.errorMessage = err.message || 'Processing failed';
    await lecture.save();

    emitLectureUpdate(lectureId, {
      status: 'failed',
      errorMessage: lecture.errorMessage,
    });
  } finally {
    // Clean up temporary source video
    if (existsSync(tempFilePath)) {
      await fs.unlink(tempFilePath).catch(() => {});
    }
  }
}

/**
 * Enqueue a lecture for background HLS processing.
 */
export function enqueueLecture(lectureId) {
  return videoQueue.add(() => processLecture(lectureId));
}

export default {
  enqueueLecture,
  videoQueue,
};
