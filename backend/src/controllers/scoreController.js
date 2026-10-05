// backend/src/controllers/scoreController.js
import { scoringService } from '../services/scoringService.js';
import { scoreRepository } from '../repositories/scoreRepository.js';

export const scoreController = {
  async submitScore(req, res, next) {
    try {
      const { matchId } = req.params;
      const { participantId, points, idempotencyKey, expectedVersion } = req.body;
      const ipAddress = req.ip || req.headers['x-forwarded-for'];
      const actorId = req.user.id;

      const result = await scoringService.recordScoreCommand({
        matchId,
        participantId,
        points: Number(points),
        idempotencyKey,
        expectedVersion: expectedVersion !== undefined ? Number(expectedVersion) : undefined,
        actorId,
        ipAddress
      });

      // 200 OK for recognized idempotency duplicates, 201 Created for new events
      const statusCode = result.isDuplicate ? 200 : 201;

      return res.status(statusCode).json({
        success: true,
        data: {
          isDuplicate: result.isDuplicate,
          event: result.event,
          match: result.match
        }
      });
    } catch (err) {
      next(err);
    }
  },

  async correctScore(req, res, next) {
    try {
      const { matchId } = req.params;
      const { originalEventId, reason, idempotencyKey } = req.body;
      const ipAddress = req.ip || req.headers['x-forwarded-for'];
      const actorId = req.user.id;

      const result = await scoringService.recordCorrection({
        matchId,
        originalEventId,
        reason,
        idempotencyKey,
        actorId,
        ipAddress
      });

      const statusCode = result.isDuplicate ? 200 : 201;

      return res.status(statusCode).json({
        success: true,
        data: {
          isDuplicate: result.isDuplicate,
          event: result.event,
          match: result.match
        }
      });
    } catch (err) {
      next(err);
    }
  },

  async listEvents(req, res, next) {
    try {
      const { matchId } = req.params;
      const limit = parseInt(req.query.limit || '100', 10);
      const offset = parseInt(req.query.offset || '0', 10);

      const events = await scoreRepository.listEventsByMatch(matchId, { limit, offset });

      return res.status(200).json({
        success: true,
        data: {
          events,
          limit,
          offset
        }
      });
    } catch (err) {
      next(err);
    }
  },

  async reconcile(req, res, next) {
    try {
      const { matchId } = req.params;
      const reconciliation = await scoreRepository.reconcileScore(matchId);

      const isAllConsistent = reconciliation.every(r => r.is_consistent);

      return res.status(200).json({
        success: true,
        data: {
          matchId,
          isConsistent: isAllConsistent,
          participants: reconciliation
        }
      });
    } catch (err) {
      next(err);
    }
  }
};
