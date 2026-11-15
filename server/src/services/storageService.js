import fs from 'fs/promises';
import { createReadStream, createWriteStream, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import env from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolved HLS root directory
const resolvedHlsRoot = path.resolve(__dirname, '../../', env.HLS_STORAGE_PATH);

// Ensure storage directory exists
async function ensureDir(dirPath) {
  if (!existsSync(dirPath)) {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

// ── Storage Driver Interface ──────────────────────────────────────────

class LocalStorageDriver {
  constructor(basePath) {
    this.basePath = basePath;
  }

  async init() {
    await ensureDir(this.basePath);
  }

  getFilePath(subPath) {
    return path.join(this.basePath, subPath);
  }

  async writeFile(subPath, content) {
    const fullPath = this.getFilePath(subPath);
    await ensureDir(path.dirname(fullPath));
    await fs.writeFile(fullPath, content);
    return fullPath;
  }

  async readFile(subPath) {
    const fullPath = this.getFilePath(subPath);
    return fs.readFile(fullPath);
  }

  getReadStream(subPath) {
    const fullPath = this.getFilePath(subPath);
    return createReadStream(fullPath);
  }

  async exists(subPath) {
    return existsSync(this.getFilePath(subPath));
  }

  async deleteFolder(subPath) {
    const fullPath = this.getFilePath(subPath);
    if (existsSync(fullPath)) {
      await fs.rm(fullPath, { recursive: true, force: true });
    }
  }
}

// Stub for S3/R2 storage driver (extensible for cloud deployment)
class S3StorageDriver {
  constructor(config = {}) {
    this.config = config;
  }

  async init() {
    // S3 client initialization
  }

  async writeFile(key, content) {
    // S3 PutObjectCommand
    throw new Error('S3 driver requires AWS/R2 SDK credentials.');
  }

  async readFile(key) {
    // S3 GetObjectCommand
    throw new Error('S3 driver requires AWS/R2 SDK credentials.');
  }

  getReadStream(key) {
    throw new Error('S3 driver requires AWS/R2 SDK credentials.');
  }

  async exists(key) {
    throw new Error('S3 driver requires AWS/R2 SDK credentials.');
  }

  async deleteFolder(prefix) {
    throw new Error('S3 driver requires AWS/R2 SDK credentials.');
  }
}

// Select active driver based on env.STORAGE_DRIVER
const driver =
  env.STORAGE_DRIVER === 's3'
    ? new S3StorageDriver()
    : new LocalStorageDriver(resolvedHlsRoot);

// Initialize driver storage path
driver.init().catch(console.error);

// ── GridFS Bucket for Notes ───────────────────────────────────────────

let gridfsBucket = null;

export function getGridFSBucket() {
  if (!gridfsBucket) {
    if (!mongoose.connection.db) {
      throw new Error('Mongoose connection not open yet.');
    }
    gridfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: 'notes',
    });
  }
  return gridfsBucket;
}

export default {
  driver,
  resolvedHlsRoot,
  getGridFSBucket,
};
