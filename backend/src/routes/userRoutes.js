// backend/src/routes/userRoutes.js
import { Router } from 'express';
import { userController } from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { userSchemas } from '../validations/schemas.js';

const router = Router();

// User management endpoints: strictly restricted to ADMIN role
router.get(
  '/users',
  authenticate,
  authorize('ADMIN'),
  userController.list
);

router.post(
  '/users',
  authenticate,
  authorize('ADMIN'),
  validate(userSchemas.create),
  userController.create
);

router.patch(
  '/users/:id/role',
  authenticate,
  authorize('ADMIN'),
  validate(userSchemas.updateRole),
  userController.updateRole
);

export default router;
