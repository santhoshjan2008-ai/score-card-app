// backend/src/routes/matchRoutes.js
import { Router } from 'express';
import { matchController } from '../controllers/matchController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { matchSchemas } from '../validations/schemas.js';

const router = Router();

router.get('/tournaments/:tournamentId/matches', authenticate, matchController.listByTournament);
router.post(
  '/tournaments/:tournamentId/matches',
  authenticate,
  authorize('ADMIN', 'OFFICIAL'),
  validate(matchSchemas.create),
  matchController.create
);

router.get('/matches/:id', authenticate, validate(matchSchemas.idParam), matchController.getById);

// Lifecycle transitions
router.post(
  '/matches/:id/start',
  authenticate,
  authorize('SCOREKEEPER', 'OFFICIAL', 'ADMIN'),
  validate(matchSchemas.idParam),
  matchController.start
);

router.post(
  '/matches/:id/finish',
  authenticate,
  authorize('OFFICIAL', 'ADMIN'),
  validate(matchSchemas.idParam),
  matchController.finish
);

router.post(
  '/matches/:id/lock',
  authenticate,
  authorize('OFFICIAL', 'ADMIN'),
  validate(matchSchemas.idParam),
  matchController.lock
);

// Admin-only unlock with mandatory reason
router.post(
  '/matches/:id/unlock',
  authenticate,
  authorize('ADMIN'),
  validate(matchSchemas.unlock),
  matchController.unlock
);

export default router;
