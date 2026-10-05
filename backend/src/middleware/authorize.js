// backend/src/middleware/authorize.js
import { AppError } from './errorHandler.js';

export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('UNAUTHORIZED', 'Authentication required.', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError(
        'FORBIDDEN',
        `Forbidden: Role '${req.user.role}' is not authorized to perform this action. Required: ${allowedRoles.join(', ')}`,
        403
      ));
    }

    next();
  };
}
