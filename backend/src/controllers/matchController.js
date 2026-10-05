// backend/src/controllers/matchController.js
import { matchRepository } from '../repositories/matchRepository.js';
import { matchService } from '../services/matchService.js';
import { AppError } from '../middleware/errorHandler.js';

export const matchController = {
  async listByTournament(req, res, next) {
    try {
      const { tournamentId } = req.params;
      const matches = await matchRepository.listByTournament(tournamentId);
      return res.status(200).json({
        success: true,
        data: { matches }
      });
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const match = await matchRepository.findById(id);
      if (!match) {
        throw new AppError('MATCH_NOT_FOUND', 'Match not found.', 404);
      }
      return res.status(200).json({
        success: true,
        data: { match }
      });
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      const { tournamentId } = req.params;
      const { matchNumber, participantAId, participantBId } = req.body;
      const ipAddress = req.ip || req.headers['x-forwarded-for'];
      const actorId = req.user.id;

      const match = await matchService.createMatch({
        tournamentId,
        matchNumber,
        participantAId,
        participantBId,
        actorId,
        ipAddress
      });

      return res.status(201).json({
        success: true,
        data: { match }
      });
    } catch (err) {
      next(err);
    }
  },

  async start(req, res, next) {
    try {
      const { id } = req.params;
      const ipAddress = req.ip || req.headers['x-forwarded-for'];
      const match = await matchService.startMatch({
        matchId: id,
        actorId: req.user.id,
        ipAddress
      });
      return res.status(200).json({
        success: true,
        data: { match }
      });
    } catch (err) {
      next(err);
    }
  },

  async finish(req, res, next) {
    try {
      const { id } = req.params;
      const ipAddress = req.ip || req.headers['x-forwarded-for'];
      const match = await matchService.finishMatch({
        matchId: id,
        actorId: req.user.id,
        ipAddress
      });
      return res.status(200).json({
        success: true,
        data: { match }
      });
    } catch (err) {
      next(err);
    }
  },

  async lock(req, res, next) {
    try {
      const { id } = req.params;
      const ipAddress = req.ip || req.headers['x-forwarded-for'];
      const match = await matchService.lockMatch({
        matchId: id,
        actorId: req.user.id,
        ipAddress
      });
      return res.status(200).json({
        success: true,
        data: { match }
      });
    } catch (err) {
      next(err);
    }
  },

  async unlock(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const ipAddress = req.ip || req.headers['x-forwarded-for'];
      const match = await matchService.unlockMatch({
        matchId: id,
        reason,
        actorId: req.user.id,
        ipAddress
      });
      return res.status(200).json({
        success: true,
        data: { match }
      });
    } catch (err) {
      next(err);
    }
  }
};
