import env from '../config/env.js';
import AppError from '../utils/AppError.js';

/**
 * Centralized Express error-handling middleware.
 */
const errorHandler = (err, _req, res, _next) => {
  // Clone or normalise the error
  let error = { ...err, message: err.message, stack: err.stack };

  // ── Mongoose bad ObjectId ──────────────────────────────────────────
  if (err.name === 'CastError') {
    error = new AppError(`Invalid ${err.path}: ${err.value}`, 400);
  }

  // ── Mongoose validation error ──────────────────────────────────────
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    error = new AppError(`Validation failed: ${messages.join('. ')}`, 400);
  }

  // ── Mongoose duplicate key (code 11000) ────────────────────────────
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue).join(', ');
    error = new AppError(`Duplicate value for field(s): ${field}`, 409);
  }

  // ── JWT errors ─────────────────────────────────────────────────────
  if (err.name === 'JsonWebTokenError') {
    error = new AppError('Invalid token. Please log in again.', 401);
  }
  if (err.name === 'TokenExpiredError') {
    error = new AppError('Token expired. Please log in again.', 401);
  }

  const statusCode = error.statusCode || err.statusCode || 500;

  console.error('ERROR 💥', err);

  res.status(statusCode).json({
    success: false,
    message: error.message || 'Internal Server Error',
    ...(err.redirect ? { redirect: err.redirect } : {}),
    ...(env.NODE_ENV === 'development' ? { stack: error.stack } : {}),
  });
};

export { AppError };
export default errorHandler;
