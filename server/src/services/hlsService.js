import fs from 'fs/promises';
import { existsSync, createWriteStream } from 'fs';
import path from 'path';
import crypto from 'crypto';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import storageService from './storageService.js';

// Configure fluent-ffmpeg binaries
ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic.path);

// Standard resolution ladder
const RESOLUTIONS = [
  { name: '1080p', height: 1080, width: 1920, videoBitrate: '3000k', audioBitrate: '128k', bandwidth: 3200000 },
  { name: '720p',  height: 720,  width: 1280, videoBitrate: '1800k', audioBitrate: '128k', bandwidth: 2000000 },
  { name: '480p',  height: 480,  width: 854,  videoBitrate: '1000k', audioBitrate: '96k',  bandwidth: 1100000 },
  { name: '360p',  height: 360,  width: 640,  videoBitrate: '600k',  audioBitrate: '96k',  bandwidth: 700000  },
  { name: '240p',  height: 240,  width: 426,  videoBitrate: '350k',  audioBitrate: '64k',  bandwidth: 420000  },
  { name: '144p',  height: 144,  width: 256,  videoBitrate: '180k',  audioBitrate: '64k',  bandwidth: 250000  },
];

/**
 * Probe video to extract duration (seconds) and height/width.
 */
export function probeVideo(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(new Error(`ffprobe failed: ${err.message}`));

      const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
      const duration = parseFloat(metadata.format.duration || 0);
      const height = videoStream ? parseInt(videoStream.height, 10) : 720;
      const width = videoStream ? parseInt(videoStream.width, 10) : 1280;

      resolve({ duration, height, width, format: metadata.format });
    });
  });
}

/**
 * Generate 16-byte random AES-128 key.
 */
export function generateAESKey() {
  const key = crypto.randomBytes(16);
  const iv = crypto.randomBytes(16);
  return {
    keyBuffer: key,
    keyHex: key.toString('hex'),
    ivHex: iv.toString('hex'),
  };
}

/**
 * Transcode single rendition into HLS with AES-128 encryption.
 */
function transcodeRendition({
  inputPath,
  outputDir,
  rendition,
  keyInfoFilePath,
  onProgress,
  totalDuration,
}) {
  return new Promise((resolve, reject) => {
    const renditionDir = path.join(outputDir, rendition.name);
    const playlistFile = path.join(renditionDir, 'index.m3u8');
    const segmentPattern = path.join(renditionDir, 'segment_%03d.ts');

    const normalizedKeyInfoPath = keyInfoFilePath.replace(/\\/g, '/');
    const normalizedSegmentPattern = segmentPattern.replace(/\\/g, '/');

    ffmpeg(inputPath)
      .outputOptions([
        '-c:v libx264',
        '-preset veryfast',
        `-b:v ${rendition.videoBitrate}`,
        `-vf scale=w=${rendition.width}:h=${rendition.height}:force_original_aspect_ratio=decrease,pad=${rendition.width}:${rendition.height}:(ow-iw)/2:(oh-ih)/2`,
        '-c:a aac',
        `-b:a ${rendition.audioBitrate}`,
        '-ac 2',
        '-f hls',
        '-hls_time 6',
        '-hls_list_size 0',
        '-hls_playlist_type vod',
        `-hls_segment_filename ${normalizedSegmentPattern}`,
        `-hls_key_info_file ${normalizedKeyInfoPath}`,
      ])
      .output(playlistFile)
      .on('progress', (p) => {
        if (onProgress && totalDuration > 0 && p.timemark) {
          const parts = p.timemark.split(':');
          const seconds = (+parts[0]) * 3600 + (+parts[1]) * 60 + (+parts[2]);
          const percent = Math.min(99, Math.round((seconds / totalDuration) * 100));
          onProgress(percent);
        }
      })
      .on('end', () => resolve(rendition.name))
      .on('error', (err) => reject(new Error(`Transcoding ${rendition.name} failed: ${err.message}`)))
      .run();
  });
}

/**
 * Generate Master M3U8 playlist referencing all available renditions.
 */
export async function createMasterPlaylist(outputDir, availableRenditions) {
  let content = '#EXTM3U\n#EXT-X-VERSION:3\n\n';

  for (const r of availableRenditions) {
    content += `#EXT-X-STREAM-INF:BANDWIDTH=${r.bandwidth},RESOLUTION=${r.width}x${r.height},NAME="${r.name}"\n`;
    content += `${r.name}/index.m3u8\n\n`;
  }

  const masterPath = path.join(outputDir, 'master.m3u8');
  await fs.writeFile(masterPath, content, 'utf8');
  return masterPath;
}

/**
 * Complete HLS Transcoding Pipeline for a lecture.
 */
export async function processVideoToHLS({
  lectureId,
  inputFilePath,
  hlsStorageId,
  onProgress,
}) {
  // Output directory for this lecture
  const outputDir = path.join(storageService.resolvedHlsRoot, hlsStorageId);
  await fs.mkdir(outputDir, { recursive: true });

  // 1. Probe input video
  const { duration, height: sourceHeight } = await probeVideo(inputFilePath);

  // 2. Filter resolutions at or below source height
  let targetResolutions = RESOLUTIONS.filter((r) => r.height <= sourceHeight);
  // Ensure at least lowest resolution is available
  if (targetResolutions.length === 0) {
    targetResolutions = [RESOLUTIONS[RESOLUTIONS.length - 1]];
  }

  // 3. Generate AES-128 Encryption Key & Key Info File
  const { keyBuffer, keyHex, ivHex } = generateAESKey();
  const binaryKeyPath = path.join(outputDir, 'key.bin');
  await fs.writeFile(binaryKeyPath, keyBuffer);

  // Key URL requested by player is relative "key" or authenticated route
  // Using relative "key" means requesting /api/stream/:lectureId/:rendition/key which resolves to the key
  const keyInfoFilePath = path.join(outputDir, 'key_info.txt');
  // Format:
  // URI to fetch key
  // local path to key
  // optional IV
  const keyUrl = `/api/stream/${lectureId}/key`;
  const normalizedKeyPath = binaryKeyPath.replace(/\\/g, '/');
  const keyInfoContent = `${keyUrl}\n${normalizedKeyPath}\n${ivHex}\n`;
  await fs.writeFile(keyInfoFilePath, keyInfoContent, 'utf8');

  // 4. Create subdirectories for each rendition
  for (const r of targetResolutions) {
    await fs.mkdir(path.join(outputDir, r.name), { recursive: true });
  }

  // 5. Transcode each rendition
  const totalRenditions = targetResolutions.length;
  const completedRenditions = [];

  for (let i = 0; i < totalRenditions; i++) {
    const rendition = targetResolutions[i];
    await transcodeRendition({
      inputPath: inputFilePath,
      outputDir,
      rendition,
      keyInfoFilePath,
      totalDuration: duration,
      onProgress: (percent) => {
        // Overall pipeline progress across renditions
        const overall = Math.round(((i + percent / 100) / totalRenditions) * 95);
        if (onProgress) onProgress(overall);
      },
    });
    completedRenditions.push(rendition);
  }

  // 6. Generate Master Playlist
  await createMasterPlaylist(outputDir, completedRenditions);

  // Clean up key_info.txt (keep binary key for secure serving)
  if (existsSync(keyInfoFilePath)) {
    await fs.unlink(keyInfoFilePath).catch(() => {});
  }

  return {
    duration: Math.round(duration),
    availableQualities: completedRenditions.map((r) => r.name),
    encryptionKeyHex: keyHex,
  };
}
