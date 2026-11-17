import { Router } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import env from '../config/env.js';
import User from '../models/User.js';
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

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

const registerSchema = {
  body: z
    .object({
      firstName: z.string().trim().min(1, 'First name is required'),
      lastName: z.string().trim().min(1, 'Last name is required'),
      email: z.string().trim().email('Invalid email address').toLowerCase(),
      password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(
          passwordRegex,
          'Password must contain at least one uppercase letter, one lowercase letter, and one number'
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

    const existing = await User.findOne({ email });
    if (existing) {
      throw new AppError('An account with this email already exists.', 409);
    }

    const passwordHash = await User.hashPassword(password);
    const sessionId = uuidv4();

    const user = await User.create({
      firstName,
      lastName,
      email,
      passwordHash,
      role: 'student',
      activeSessionId: sessionId,
    });

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

export default router;
