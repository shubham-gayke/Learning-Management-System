import { Router } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { TOTP, Secret } from 'otpauth';
import env from '../config/env.js';
import User from '../models/User.js';
import AllowedEmail from '../models/AllowedEmail.js';
import validate from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import { getIO } from '../socket/index.js';

const router = Router();

// ── Helpers ──────────────────────────────────────────────────────────

/** Convert JWT_EXPIRES_IN (e.g. '1d') to milliseconds for the cookie maxAge. */
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

function signToken(user, sessionId) {
  return jwt.sign(
    { id: user._id, role: user.role, sessionId },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

// ── Schemas ──────────────────────────────────────────────────────────

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/;

const registerSchema = {
  body: z
    .object({
      firstName: z.string().trim().min(1, 'First name is required'),
      lastName: z.string().trim().min(1, 'Last name is required'),
      email: z.string().trim().email('Invalid email address').toLowerCase(),
      password: z
        .string()
        .min(6, 'Password must be at least 6 characters')
        .regex(
          passwordRegex,
          'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
        ),
      confirmPassword: z.string().optional(),
    })
    .refine((d) => !d.confirmPassword || d.password === d.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    }),
};

const loginSchema = {
  body: z.object({
    email: z.string().trim().email('Invalid email address').toLowerCase(),
    password: z.string().min(1, 'Password is required'),
  }),
};

// ── Routes ───────────────────────────────────────────────────────────

/**
 * POST /register
 */
router.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  catchAsync(async (req, res) => {
    const { firstName, lastName, email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Security Checkpoint: Verify email exists in pre-approved allowlist
    const allowedEntry = await AllowedEmail.findOne({ email: normalizedEmail });
    if (!allowedEntry) {
      throw new AppError(
        'You are not eligible to create an account. Contact the admin section of Mentore Solution.',
        403
      );
    }

    // 2. Check if user already exists
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      throw new AppError('An account with this email already exists.', 409);
    }

    const passwordHash = await User.hashPassword(password);
    const sessionId = uuidv4();

    const user = await User.create({
      firstName,
      lastName,
      email: normalizedEmail,
      passwordHash,
      role: 'student',
      batch: allowedEntry.batch || null,
      activeSessionId: sessionId,
    });

    // Mark email as claimed/registered in allowlist
    allowedEntry.registered = true;
    allowedEntry.registeredAt = new Date();
    await allowedEntry.save();

    const token = signToken(user, sessionId);

    // Broadcast real-time student registration to trainer dashboard
    try {
      const io = getIO();
      io.to('role:trainer').emit('student_enrolled', {
        student: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
        },
      });
      io.to('role:trainer').emit('stats_update');
    } catch (err) {}

    res.cookie('token', token, cookieOptions());
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: { user, token },
    });
  })
);

/**
 * POST /login
 */
router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  catchAsync(async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      throw new AppError('Invalid email or password.', 401);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new AppError('Invalid email or password.', 401);
    }

    // Generate a new session (invalidates previous sessions)
    const sessionId = uuidv4();
    user.activeSessionId = sessionId;
    await user.save();

    // If 2FA is enabled (and user is NOT a trainer), require 2FA verification
    if (user.twoFactorEnabled && user.role !== 'trainer') {
      const twoFactorToken = jwt.sign(
        { id: user._id, purpose: '2fa', sessionId },
        env.JWT_SECRET,
        { expiresIn: '5m' }
      );
      return res.status(200).json({
        success: true,
        requiresTwoFactor: true,
        twoFactorToken,
      });
    }

    const token = signToken(user, sessionId);

    res.cookie('token', token, cookieOptions());
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: { user, token },
    });
  })
);

/**
 * POST /logout
 */
router.post(
  '/logout',
  catchAsync(async (_req, res) => {
    res.cookie('token', '', {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 0,
      path: '/',
    });

    res.status(200).json({ success: true, message: 'Logged out successfully' });
  })
);

/**
 * GET /me
 */
router.get(
  '/me',
  requireAuth,
  catchAsync(async (req, res) => {
    const user = await User.findById(req.user._id).populate('batch');

    res.status(200).json({ success: true, data: { user } });
  })
);

// ── Forgot Password Flow with Admin Checkpoint & 2FA ─────────────────

/**
 * POST /forgot-password/verify-email
 * Step 1: Check if email exists in database and if student, check AllowedEmail list.
 */
router.post(
  '/forgot-password/verify-email',
  authLimiter,
  catchAsync(async (req, res) => {
    const { email } = req.body;
    if (!email || !email.trim()) {
      throw new AppError('Please enter your email address.', 400);
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Check if user exists in the database
    const user = await User.findOne({ email: normalizedEmail }).select('+twoFactorSecret');
    if (!user) {
      throw new AppError(
        'No registered account found with this email address. Please contact Mentore Solution Admin.',
        404
      );
    }

    // 2. Check AllowedEmail checkpoint (only for students)
    if (user.role === 'student') {
      const allowed = await AllowedEmail.findOne({ email: normalizedEmail });
      if (!allowed) {
        throw new AppError(
          'This email is not authorized in Mentore Solution database. Please contact Admin.',
          403
        );
      }
    }

    // 3. Determine if 2FA verification is required
    const has2FA = !!(user.twoFactorEnabled && user.twoFactorSecret);

    if (has2FA) {
      const resetToken = jwt.sign(
        { id: user._id, email: user.email, purpose: 'pwd_reset_2fa' },
        env.JWT_SECRET,
        { expiresIn: '15m' }
      );

      return res.status(200).json({
        success: true,
        requiresTwoFactor: true,
        resetToken,
        email: user.email,
        message: 'Email verified. Please enter the 6-digit code from your Authenticator app.',
      });
    }

    // Fallback if 2FA was not enabled (e.g., trainer or unconfigured)
    const verifiedToken = jwt.sign(
      { id: user._id, email: user.email, purpose: 'pwd_reset_verified' },
      env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.status(200).json({
      success: true,
      requiresTwoFactor: false,
      verifiedToken,
      email: user.email,
      message: 'Email verified. Please enter your new password.',
    });
  })
);

/**
 * POST /forgot-password/verify-2fa
 * Step 2: Validate 6-digit TOTP code from user's Authenticator app
 */
router.post(
  '/forgot-password/verify-2fa',
  authLimiter,
  catchAsync(async (req, res) => {
    const { resetToken, code } = req.body;

    if (!code || String(code).trim().length !== 6) {
      throw new AppError('A valid 6-digit verification code is required.', 400);
    }
    if (!resetToken) {
      throw new AppError('Reset session expired or missing. Please start over.', 400);
    }

    let payload;
    try {
      payload = jwt.verify(resetToken, env.JWT_SECRET);
    } catch {
      throw new AppError('Verification session expired. Please verify your email again.', 401);
    }

    if (payload.purpose !== 'pwd_reset_2fa') {
      throw new AppError('Invalid reset token purpose.', 401);
    }

    const user = await User.findById(payload.id).select('+twoFactorSecret');
    if (!user || !user.twoFactorSecret) {
      throw new AppError('User account or 2FA credentials not found.', 404);
    }

    const totp = new TOTP({
      issuer: 'Mentore Solution',
      label: user.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: Secret.fromBase32(user.twoFactorSecret),
    });

    const delta = totp.validate({ token: String(code).trim(), window: 1 });
    if (delta === null) {
      throw new AppError('Invalid 6-digit code. Please check your Authenticator app and try again.', 400);
    }

    // Issue verified token allowing password change
    const verifiedToken = jwt.sign(
      { id: user._id, email: user.email, purpose: 'pwd_reset_verified' },
      env.JWT_SECRET,
      { expiresIn: '10m' }
    );

    res.status(200).json({
      success: true,
      verifiedToken,
      message: '2FA code verified successfully. You may now set your new password.',
    });
  })
);

/**
 * POST /forgot-password/reset
 * Step 3: Set and update new password in database
 */
router.post(
  '/forgot-password/reset',
  authLimiter,
  catchAsync(async (req, res) => {
    const { verifiedToken, newPassword, confirmPassword } = req.body;

    if (!verifiedToken) {
      throw new AppError('Verification token missing. Please start password reset again.', 400);
    }
    if (!newPassword || newPassword.length < 6) {
      throw new AppError('Password must be at least 6 characters long.', 400);
    }
    if (!passwordRegex.test(newPassword)) {
      throw new AppError(
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
        400
      );
    }
    if (newPassword !== confirmPassword) {
      throw new AppError('Passwords do not match.', 400);
    }

    let payload;
    try {
      payload = jwt.verify(verifiedToken, env.JWT_SECRET);
    } catch {
      throw new AppError('Reset session expired. Please verify your email and 2FA again.', 401);
    }

    if (payload.purpose !== 'pwd_reset_verified') {
      throw new AppError('Invalid verification token.', 401);
    }

    const user = await User.findById(payload.id);
    if (!user) {
      throw new AppError('User not found.', 404);
    }

    // Hash and update new password in database
    user.passwordHash = await User.hashPassword(newPassword);
    // Invalidate existing sessions for security
    user.activeSessionId = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password updated successfully! You can now log in with your new password.',
    });
  })
);

export default router;
