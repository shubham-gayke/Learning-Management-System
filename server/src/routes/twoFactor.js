import { Router } from 'express';
import { TOTP, Secret } from 'otpauth';
import QRCode from 'qrcode';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';

const router = Router();

function expiresInToMs(expiresIn) {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) return 24 * 60 * 60 * 1000; // default 1 day
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return value * (multipliers[unit] || 86_400_000);
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: expiresInToMs(env.JWT_EXPIRES_IN),
    path: '/',
  };
}

function createTOTP(secret, email) {
  return new TOTP({
    issuer: 'Mentore Solution',
    label: email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secret),
  });
}

/**
 * POST /generate
 * Generate TOTP secret and QR code for setup
 */
router.post(
  '/generate',
  requireAuth,
  catchAsync(async (req, res) => {
    const user = await User.findById(req.user._id);
    if (!user) throw new AppError('User not found', 404);

    if (user.twoFactorEnabled) {
      throw new AppError('Two-factor authentication is already enabled', 400);
    }

    const secret = new Secret({ size: 20 });
    const base32Secret = secret.base32;

    user.twoFactorSecret = base32Secret;
    await user.save();

    const totp = createTOTP(base32Secret, user.email);
    const otpauthUrl = totp.toString();
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    res.json({
      success: true,
      data: {
        qrCode: qrCodeDataUrl,
        secret: base32Secret,
        otpauthUrl,
      },
    });
  })
);

/**
 * POST /verify-setup
 * Verify 6-digit code to enable 2FA
 */
router.post(
  '/verify-setup',
  requireAuth,
  catchAsync(async (req, res) => {
    const { code } = req.body;
    if (!code || code.length !== 6) {
      throw new AppError('A valid 6-digit code is required', 400);
    }

    const user = await User.findById(req.user._id).select('+twoFactorSecret');
    if (!user) throw new AppError('User not found', 404);
    if (!user.twoFactorSecret) {
      throw new AppError('Please generate a 2FA secret first', 400);
    }
    if (user.twoFactorEnabled) {
      throw new AppError('Two-factor authentication is already enabled', 400);
    }

    const totp = createTOTP(user.twoFactorSecret, user.email);
    const delta = totp.validate({ token: code, window: 1 });

    if (delta === null) {
      throw new AppError('Invalid verification code. Please try again.', 400);
    }

    user.twoFactorEnabled = true;
    await user.save();

    res.json({
      success: true,
      message: 'Two-factor authentication enabled successfully',
      data: { user },
    });
  })
);

/**
 * POST /verify-login
 * Verify 2FA code during login using temp JWT token
 */
router.post(
  '/verify-login',
  catchAsync(async (req, res) => {
    const { code, twoFactorToken } = req.body;

    if (!code || code.length !== 6) {
      throw new AppError('A valid 6-digit code is required', 400);
    }
    if (!twoFactorToken) {
      throw new AppError('Two-factor token is required', 400);
    }

    let payload;
    try {
      payload = jwt.verify(twoFactorToken, env.JWT_SECRET);
    } catch {
      throw new AppError('Two-factor token expired or invalid. Please login again.', 401);
    }

    if (payload.purpose !== '2fa') {
      throw new AppError('Invalid token', 401);
    }

    const user = await User.findById(payload.id).select('+twoFactorSecret').populate('batch');
    if (!user) throw new AppError('User not found', 404);

    const totp = createTOTP(user.twoFactorSecret, user.email);
    const delta = totp.validate({ token: code, window: 1 });

    if (delta === null) {
      throw new AppError('Invalid verification code. Please try again.', 400);
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, sessionId: payload.sessionId },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    res.cookie('token', token, cookieOptions());
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: { user },
    });
  })
);

/**
 * POST /disable
 * Disable 2FA using current TOTP code
 */
router.post(
  '/disable',
  requireAuth,
  catchAsync(async (req, res) => {
    const { code } = req.body;
    if (!code || code.length !== 6) {
      throw new AppError('A valid 6-digit code is required', 400);
    }

    const user = await User.findById(req.user._id).select('+twoFactorSecret');
    if (!user) throw new AppError('User not found', 404);
    if (!user.twoFactorEnabled) {
      throw new AppError('Two-factor authentication is not enabled', 400);
    }

    const totp = createTOTP(user.twoFactorSecret, user.email);
    const delta = totp.validate({ token: code, window: 1 });

    if (delta === null) {
      throw new AppError('Invalid verification code', 400);
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    await user.save();

    res.json({
      success: true,
      message: 'Two-factor authentication disabled successfully',
      data: { user },
    });
  })
);

export default router;
