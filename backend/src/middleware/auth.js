// backend/src/middleware/auth.js
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from './errorHandler.js';

export function authenticate(req, res, next) {
  let token = null;

  // Check Bearer header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.cookies && req.cookies.auth_token) {
    token = req.cookies.auth_token;
  }

  if (!token) {
    return next(new AppError('UNAUTHORIZED', 'Authentication token required.', 401));
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('TOKEN_EXPIRED', 'Your session has expired. Please log in again.', 401));
    }
    return next(new AppError('INVALID_TOKEN', 'Authentication token is invalid.', 401));
  }
}
