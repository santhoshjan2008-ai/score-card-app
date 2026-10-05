// backend/src/routes/authRoutes.js
import { Router } from 'express';
import { authController } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { loginRateLimiter } from '../middleware/rateLimiter.js';
import { authSchemas } from '../validations/schemas.js';

const router = Router();

router.post('/login', loginRateLimiter, validate(authSchemas.login), authController.login);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);

export default router;
