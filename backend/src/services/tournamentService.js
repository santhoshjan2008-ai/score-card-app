// backend/src/services/tournamentService.js
import { v4 as uuidv4 } from 'uuid';
import { tournamentRepository } from '../repositories/tournamentRepository.js';
import { auditRepository } from '../repositories/auditRepository.js';
import { AppError } from '../middleware/errorHandler.js';

export const tournamentService = {
  async listTournaments() {
    return await tournamentRepository.listAll();
  },

  async getTournament(id) {
    const tournament = await tournamentRepository.findById(id);
    if (!tournament) {
      throw new AppError('TOURNAMENT_NOT_FOUND', 'Tournament not found.', 404);
    }
    return tournament;
  },

  async createTournament({ name, description, settings, organizerId, ipAddress }) {
    if (!name || name.trim().length === 0) {
      throw new AppError('NAME_REQUIRED', 'Tournament name is required.', 400);
    }

    const id = uuidv4();
    const tournament = await tournamentRepository.create({
      id,
      name,
      description,
      organizerId,
      settings: settings || { allowedIncrements: [1, 2, 3] },
      status: 'SCHEDULED'
    });

    await auditRepository.insert(null, {
      id: uuidv4(),
      actorId: organizerId,
      action: 'TOURNAMENT_CREATED',
      targetEntityType: 'TOURNAMENT',
      targetEntityId: id,
      payloadAfter: { name, settings },
      ipAddress
    });

    return tournament;
  },

  async updateTournamentStatus({ id, status, actorId, ipAddress }) {
    const valid = ['DRAFT', 'SCHEDULED', 'LIVE', 'COMPLETED', 'ARCHIVED'];
    if (!valid.includes(status)) {
      throw new AppError('INVALID_STATUS', `Tournament status must be one of: ${valid.join(', ')}`, 400);
    }

    const current = await tournamentRepository.findById(id);
    if (!current) {
      throw new AppError('TOURNAMENT_NOT_FOUND', 'Tournament not found.', 404);
    }

    const updated = await tournamentRepository.updateStatus(id, status);

    await auditRepository.insert(null, {
      id: uuidv4(),
      actorId,
      action: 'TOURNAMENT_UPDATED',
      targetEntityType: 'TOURNAMENT',
      targetEntityId: id,
      payloadBefore: { status: current.status },
      payloadAfter: { status },
      ipAddress
    });

    return updated;
  },

  async addParticipant({ tournamentId, name, seedNumber, actorId, ipAddress }) {
    const tournament = await tournamentRepository.findById(tournamentId);
    if (!tournament) {
      throw new AppError('TOURNAMENT_NOT_FOUND', 'Tournament not found.', 404);
    }

    const id = uuidv4();
    const participant = await tournamentRepository.createParticipant({
      id,
      tournamentId,
      name,
      seedNumber
    });

    await auditRepository.insert(null, {
      id: uuidv4(),
      actorId,
      action: 'PARTICIPANT_REGISTERED',
      targetEntityType: 'PARTICIPANT',
      targetEntityId: id,
      payloadAfter: { tournamentId, name, seedNumber },
      ipAddress
    });

    return participant;
  }
};
