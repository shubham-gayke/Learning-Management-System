import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../../.env') });

const required = ['MONGODB_URI', 'JWT_SECRET'];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`❌ Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const env = {
  PORT: parseInt(process.env.PORT, 10) || 5000,
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  NODE_ENV: process.env.NODE_ENV || 'development',

  TRAINER_FIRST_NAME: process.env.TRAINER_FIRST_NAME || 'Shubham',
  TRAINER_LAST_NAME: process.env.TRAINER_LAST_NAME || 'Gayke',
  TRAINER_EMAIL: process.env.TRAINER_EMAIL || '',
  TRAINER_PASSWORD: process.env.TRAINER_PASSWORD || '',

  ALLOW_MULTIPLE_SESSIONS: process.env.ALLOW_MULTIPLE_SESSIONS === 'true',

  GOOGLE_SERVICE_ACCOUNT_KEY_FILE:
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE || './secrets/service-account.json',
  STORAGE_DRIVER: process.env.STORAGE_DRIVER || 'local',
  HLS_STORAGE_PATH: process.env.HLS_STORAGE_PATH || './storage/hls',
  MAX_NOTE_SIZE_MB: parseInt(process.env.MAX_NOTE_SIZE_MB, 10) || 15,
};

export default env;
