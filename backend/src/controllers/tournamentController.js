// backend/src/controllers/tournamentController.js
import { tournamentService } from '../services/tournamentService.js';
import { tournamentRepository } from '../repositories/tournamentRepository.js';

export const tournamentController = {
  async list(req, res, next) {
    try {
      const tournaments = await tournamentService.listTournaments();
      return res.status(200).json({
        success: true,
        data: { tournaments }
      });
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const tournament = await tournamentService.getTournament(id);
      return res.status(200).json({
        success: true,
        data: { tournament }
      });
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      const { name, description, settings } = req.body;
      const ipAddress = req.ip || req.headers['x-forwarded-for'];
      const tournament = await tournamentService.createTournament({
        name,
        description,
        settings,
        organizerId: req.user.id,
        ipAddress
      });
      return res.status(201).json({
        success: true,
        data: { tournament }
      });
    } catch (err) {
      next(err);
    }
  },

  async updateStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const ipAddress = req.ip || req.headers['x-forwarded-for'];
      const tournament = await tournamentService.updateTournamentStatus({
        id,
        status,
        actorId: req.user.id,
        ipAddress
      });
      return res.status(200).json({
        success: true,
        data: { tournament }
      });
    } catch (err) {
      next(err);
    }
  },

  async listParticipants(req, res, next) {
    try {
      const { id } = req.params;
      const participants = await tournamentRepository.listParticipants(id);
      return res.status(200).json({
        success: true,
        data: { participants }
      });
    } catch (err) {
      next(err);
    }
  },

  async addParticipant(req, res, next) {
    try {
      const { id } = req.params;
      const { name, seedNumber } = req.body;
      const ipAddress = req.ip || req.headers['x-forwarded-for'];
      const participant = await tournamentService.addParticipant({
        tournamentId: id,
        name,
        seedNumber: seedNumber ? Number(seedNumber) : null,
        actorId: req.user.id,
        ipAddress
      });
      return res.status(201).json({
        success: true,
        data: { participant }
      });
    } catch (err) {
      next(err);
    }
  }
};
