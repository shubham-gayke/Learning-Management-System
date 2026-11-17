import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';

/**
 * Require a valid JWT in the httpOnly "token" cookie.
 * Attaches the user document to req.user.
 */
export const requireAuth = async (req, _res, next) => {
  try {
    let token = req.cookies?.token;

    // Fallback to Authorization header (Bearer <token> or raw token)
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization.trim();
      if (authHeader.toLowerCase().startsWith('bearer ')) {
        token = authHeader.slice(7).trim();
      } else {
        token = authHeader;
      }
    }

    // Fallback to x-access-token header
    if (!token && req.headers['x-access-token']) {
      token = String(req.headers['x-access-token']).trim();
    }

    // Fallback to ?token query parameter (immune to iOS Safari cookie & header restrictions)
    if (!token && req.query?.token) {
      token = String(req.query.token).trim();
    }

    if (!token) {
      throw new AppError('Not authenticated. Please log in.', 401);
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('+passwordHash');
    if (!user) {
      throw new AppError('User belonging to this token no longer exists.', 401);
    }

    // ── Single-session enforcement ──────────────────────────────────
    if (
      !env.ALLOW_MULTIPLE_SESSIONS &&
      decoded.sessionId &&
      user.activeSessionId &&
      decoded.sessionId !== user.activeSessionId
    ) {
      throw new AppError(
        'Session expired. You have been logged in from another location.',
        401
      );
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Factory: restrict access to specific roles.
 * @param  {...string} roles
 */
export const requireRole = (...roles) => {
  return (req, _res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action.', 403)
      );
    }
    next();
  };
};

/**
 * Ensure the student has selected a batch before proceeding.
 */
export const requireBatchSelected = (req, _res, next) => {
  if (req.user.role === 'trainer') return next(); // trainers bypass

  if (!req.user.batch) {
    const err = new AppError('Please select a batch first.', 403);
    err.redirect = '/select-batch';
    return next(err);
  }
  next();
};
