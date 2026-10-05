// backend/src/middleware/errorHandler.js
import { logger } from '../config/logger.js';

export function errorHandler(err, req, res, next) {
  // Generate a correlation ID if not already present
  const correlationId = req.headers['x-correlation-id'] || req.correlationId || Date.now().toString(36);

  logger.error('API Error Encountered:', {
    correlationId,
    method: req.method,
    url: req.originalUrl,
    errorName: err.name,
    errorMessage: err.message,
    code: err.code,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  // Known custom application errors
  if (err.statusCode && err.code) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details || null,
        correlationId
      }
    });
  }

  // Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: err.errors ? err.errors.map(e => ({ field: e.path.join('.'), message: e.message })) : err.message,
        correlationId
      }
    });
  }

  // PostgreSQL unique constraint violation
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_RESOURCE',
        message: 'A resource with this key or unique identifier already exists.',
        details: err.detail || null,
        correlationId
      }
    });
  }

  // Fallback for unhandled unexpected errors (sanitized for client)
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected internal server error occurred.',
      correlationId
    }
  });
}

export class AppError extends Error {
  constructor(code, message, statusCode = 400, details = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}
