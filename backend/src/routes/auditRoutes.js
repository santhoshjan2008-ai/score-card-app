// backend/src/routes/auditRoutes.js
import { Router } from 'express';
import { auditController } from '../controllers/auditController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

// Audit log review: Admin and Official only
router.get(
  '/audit',
  authenticate,
  authorize('ADMIN', 'OFFICIAL'),
  auditController.list
);

export default router;
