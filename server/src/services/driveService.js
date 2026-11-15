import fs from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';
import env from '../config/env.js';
import AppError from '../utils/AppError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Extract Google Drive File ID from various URL formats or plain ID.
 */
export function extractDriveFileId(urlOrId) {
  if (!urlOrId || typeof urlOrId !== 'string') return null;
  const str = urlOrId.trim();

  // Pattern 1: /file/d/<id>/
  const match1 = str.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match1) return match1[1];

  // Pattern 2: ?id=<id> or &id=<id>
  const match2 = str.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match2) return match2[1];

  // Pattern 3: direct ID string
  if (/^[a-zA-Z0-9_-]{20,60}$/.test(str)) {
    return str;
  }

  return null;
}

/**
 * Get authenticated Google Drive client using Service Account (if configured).
 */
export function getDriveClient() {
  const keyFilePath = path.resolve(__dirname, '../../', env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE);

  if (!fs.existsSync(keyFilePath)) {
    return { client: null, email: null, error: 'No key file' };
  }

  try {
    const keyData = JSON.parse(fs.readFileSync(keyFilePath, 'utf8'));
    const clientEmail = keyData.client_email;

    const auth = new google.auth.GoogleAuth({
      keyFile: keyFilePath,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    const drive = google.drive({ version: 'v3', auth });
    return { client: drive, email: clientEmail, error: null };
  } catch (err) {
    return { client: null, email: null, error: err.message };
  }
}

/**
 * Get direct download URL for public Google Drive links,
 * handling large-file confirmation tokens if necessary.
 */
async function resolvePublicDriveStream(fileId) {
  const primaryUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

  const res = await fetch(primaryUrl, {
    redirect: 'follow',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });

  const contentType = res.headers.get('content-type') || '';

  // Case 1: Direct file stream (e.g. video/mp4, application/octet-stream, etc.)
  if (res.ok && !contentType.includes('text/html')) {
    return res;
  }

  // Case 2: Google returned an HTML page (large file warning or login required)
  if (res.ok && contentType.includes('text/html')) {
    const html = await res.text();

    // Check for "download anyway" confirmation token in HTML
    const confirmMatch =
      html.match(/href="(\/uc\?[^"]*confirm=[^"]*)"/) ||
      html.match(/action="([^"]*confirm=[^"]*)"/) ||
      html.match(/confirm=([a-zA-Z0-9_-]+)/);

    let confirmUrl = null;
    if (confirmMatch) {
      const token = confirmMatch[1].startsWith('/')
        ? `https://drive.google.com${confirmMatch[1].replace(/&amp;/g, '&')}`
        : confirmMatch[1].includes('confirm=')
        ? confirmMatch[1].replace(/&amp;/g, '&')
        : `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=${confirmMatch[1]}`;
      confirmUrl = token;
    } else {
      // Direct usercontent fallback with confirm=t
      confirmUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;
    }

    const confirmedRes = await fetch(confirmUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    const confirmedType = confirmedRes.headers.get('content-type') || '';
    if (confirmedRes.ok && !confirmedType.includes('text/html')) {
      return confirmedRes;
    }
  }

  return null;
}

/**
 * Validate accessibility of a file ID on Google Drive.
 * Supports BOTH public "Anyone with link" access AND Service Account authentication.
 */
export async function validateDriveAccess(fileId) {
  // Method 1: Check if file is directly accessible (shared with "Anyone with link")
  try {
    const publicRes = await resolvePublicDriveStream(fileId);
    if (publicRes && publicRes.ok) {
      return {
        id: fileId,
        source: 'public',
        size: publicRes.headers.get('content-length'),
      };
    }
  } catch (err) {
    // If public check threw network error, proceed to service account check
  }

  // Method 2: If public access failed, try Google Service Account
  const { client, email } = getDriveClient();
  if (client) {
    try {
      const res = await client.files.get({
        fileId,
        fields: 'id, name, mimeType, size',
        supportsAllDrives: true,
      });
      return {
        id: res.data.id,
        name: res.data.name,
        source: 'service_account',
      };
    } catch (err) {
      throw new AppError(
        `Cannot access file on Google Drive (ID: ${fileId}). Please ensure the Google Drive file is either set to "Anyone with the link can view", or the folder is shared with your Service Account email: ${email}`,
        400
      );
    }
  }

  // If neither public access works nor a service account is configured
  throw new AppError(
    `Cannot access Google Drive file (ID: ${fileId}). Please open your Google Drive file, click "Share", and change General Access to "Anyone with the link" (Viewer).`,
    400
  );
}

/**
 * Stream-download file from Google Drive to local destination path.
 */
export async function downloadDriveFile(fileId, destinationPath) {
  // Method 1: Try public stream download
  try {
    const publicRes = await resolvePublicDriveStream(fileId);
    if (publicRes && publicRes.ok && publicRes.body) {
      const dest = fs.createWriteStream(destinationPath);
      await pipeline(Readable.fromWeb(publicRes.body), dest);
      return destinationPath;
    }
  } catch (err) {
    console.warn(`Public stream download failed: ${err.message}, falling back to service account...`);
  }

  // Method 2: Fallback to Service Account
  const { client, error } = getDriveClient();
  if (!client) {
    throw new Error(
      'Unable to download video. Please ensure the Drive link is shared as "Anyone with the link can view", or configure service-account.json.'
    );
  }

  const res = await client.files.get(
    { fileId, alt: 'media', supportsAllDrives: true },
    { responseType: 'stream' }
  );

  return new Promise((resolve, reject) => {
    const dest = fs.createWriteStream(destinationPath);
    res.data
      .on('error', (err) => reject(new Error(`Drive stream error: ${err.message}`)))
      .pipe(dest)
      .on('finish', () => resolve(destinationPath))
      .on('error', (err) => reject(new Error(`File write error: ${err.message}`)));
  });
}
