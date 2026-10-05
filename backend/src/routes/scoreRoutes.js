// backend/src/routes/scoreRoutes.js
import { Router } from 'express';
import { scoreController } from '../controllers/scoreController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { scoreSchemas } from '../validations/schemas.js';

const router = Router();

// Submitting score command: Scorekeeper, Official, Admin
router.post(
  '/matches/:matchId/score',
  authenticate,
  authorize('SCOREKEEPER', 'OFFICIAL', 'ADMIN'),
  validate(scoreSchemas.scoreCommand),
  scoreController.submitScore
);

// Authorized correction / reversal workflow: Official or Admin only
router.post(
  '/matches/:matchId/corrections',
  authenticate,
  authorize('OFFICIAL', 'ADMIN'),
  validate(scoreSchemas.correctionCommand),
  scoreController.correctScore
);

// Event history review: All authenticated users
router.get(
  '/matches/:matchId/events',
  authenticate,
  scoreController.listEvents
);

// Reconciliation verification: Official, Admin
router.get(
  '/matches/:matchId/reconcile',
  authenticate,
  authorize('OFFICIAL', 'ADMIN'),
  scoreController.reconcile
);

export default router;
