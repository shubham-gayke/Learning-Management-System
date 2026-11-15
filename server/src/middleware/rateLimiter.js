import rateLimit from 'express-rate-limit';

/**
 * Limiter for auth endpoints (login / register).
 * 50 requests per 15-minute window.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV !== 'production',
  message: {
    success: false,
    message: 'Too many login/registration attempts. Please try again after 15 minutes.',
  },
});

/**
 * General limiter for standard API endpoints.
 * Completely skips in non-production environments and never throttles media streams,
 * polling, questions, notes, or progress updates.
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (process.env.NODE_ENV !== 'production') return true;
    const url = req.originalUrl || req.url || req.path || '';
    return (
      url.includes('/stream') ||
      url.includes('/notifications') ||
      url.includes('/progress') ||
      url.includes('/notes') ||
      url.includes('/questions')
    );
  },
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
  },
});
