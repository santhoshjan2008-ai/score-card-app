// backend/src/routes/tournamentRoutes.js
import { Router } from 'express';
import { tournamentController } from '../controllers/tournamentController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { tournamentSchemas } from '../validations/schemas.js';

const router = Router();

router.get('/tournaments', authenticate, tournamentController.list);
router.get('/tournaments/:id', authenticate, tournamentController.getById);

router.post(
  '/tournaments',
  authenticate,
  authorize('ADMIN', 'OFFICIAL'),
  validate(tournamentSchemas.create),
  tournamentController.create
);

router.patch(
  '/tournaments/:id/status',
  authenticate,
  authorize('ADMIN', 'OFFICIAL'),
  validate(tournamentSchemas.updateStatus),
  tournamentController.updateStatus
);

router.get('/tournaments/:id/participants', authenticate, tournamentController.listParticipants);

router.post(
  '/tournaments/:id/participants',
  authenticate,
  authorize('ADMIN', 'OFFICIAL'),
  validate(tournamentSchemas.addParticipant),
  tournamentController.addParticipant
);

export default router;
