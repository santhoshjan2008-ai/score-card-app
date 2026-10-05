// backend/src/services/matchService.js
import { v4 as uuidv4 } from 'uuid';
import { withTransaction } from '../config/db.js';
import { matchRepository } from '../repositories/matchRepository.js';
import { auditRepository } from '../repositories/auditRepository.js';
import { AppError } from '../middleware/errorHandler.js';

export const matchService = {
  async createMatch({ tournamentId, matchNumber, participantAId, participantBId, actorId, ipAddress }) {
    if (participantAId === participantBId) {
      throw new AppError('DUPLICATE_PARTICIPANTS', 'A match must have two distinct participants.', 400);
    }

    return await withTransaction(async (client) => {
      // Validate both participants belong to tournament
      const partCheck = await client.query(
        `SELECT id FROM participants WHERE tournament_id = $1 AND id IN ($2, $3)`,
        [tournamentId, participantAId, participantBId]
      );

      if (partCheck.rows.length !== 2) {
        throw new AppError('INVALID_PARTICIPANTS', 'Both participants must belong to the specified tournament.', 400);
      }

      const matchId = uuidv4();
      const match = await matchRepository.createMatchWithParticipants(client, {
        id: matchId,
        tournamentId,
        matchNumber,
        participantAId,
        participantBId
      });

      await auditRepository.insert(client, {
        id: uuidv4(),
        actorId,
        action: 'MATCH_CREATED',
        targetEntityType: 'MATCH',
        targetEntityId: matchId,
        payloadAfter: { tournamentId, matchNumber, participantAId, participantBId },
        ipAddress
      });

      return match;
    });
  },

  async startMatch({ matchId, actorId, ipAddress }) {
    const match = await matchRepository.findById(matchId);
    if (!match) {
      throw new AppError('MATCH_NOT_FOUND', 'Match not found.', 404);
    }
    if (match.status === 'LIVE') {
      return match; // Idempotent start
    }
    if (match.status === 'LOCKED') {
      throw new AppError('MATCH_LOCKED', 'Locked matches cannot be started.', 403);
    }

    const updated = await matchRepository.updateStatus(matchId, 'LIVE', { startedAt: new Date().toISOString() });

    await auditRepository.insert(null, {
      id: uuidv4(),
      actorId,
      action: 'MATCH_STARTED',
      targetEntityType: 'MATCH',
      targetEntityId: matchId,
      payloadBefore: { status: match.status },
      payloadAfter: { status: 'LIVE' },
      ipAddress
    });

    return updated;
  },

  async finishMatch({ matchId, actorId, ipAddress }) {
    const match = await matchRepository.findById(matchId);
    if (!match) {
      throw new AppError('MATCH_NOT_FOUND', 'Match not found.', 404);
    }
    if (match.status === 'LOCKED') {
      throw new AppError('MATCH_LOCKED', 'Match is already locked.', 403);
    }
    if (match.status === 'FINISHED') {
      return match;
    }

    const updated = await matchRepository.updateStatus(matchId, 'FINISHED', { finishedAt: new Date().toISOString() });

    await auditRepository.insert(null, {
      id: uuidv4(),
      actorId,
      action: 'MATCH_FINISHED',
      targetEntityType: 'MATCH',
      targetEntityId: matchId,
      payloadBefore: { status: match.status },
      payloadAfter: { status: 'FINISHED' },
      ipAddress
    });

    return updated;
  },

  async lockMatch({ matchId, actorId, ipAddress }) {
    const match = await matchRepository.findById(matchId);
    if (!match) {
      throw new AppError('MATCH_NOT_FOUND', 'Match not found.', 404);
    }
    if (match.status === 'LOCKED') {
      return match; // Idempotent lock
    }

    const now = new Date().toISOString();
    const updated = await matchRepository.updateStatus(matchId, 'LOCKED', {
      lockedAt: now,
      lockedByUserId: actorId
    });

    await auditRepository.insert(null, {
      id: uuidv4(),
      actorId,
      action: 'MATCH_LOCKED',
      targetEntityType: 'MATCH',
      targetEntityId: matchId,
      payloadBefore: { status: match.status },
      payloadAfter: { status: 'LOCKED', lockedAt: now, lockedBy: actorId },
      reason: 'Official match finalized and locked against standard scorekeeping changes.',
      ipAddress
    });

    return updated;
  },

  async unlockMatch({ matchId, reason, actorId, ipAddress }) {
    if (!reason || reason.trim().length < 5) {
      throw new AppError('REASON_REQUIRED', 'A mandatory explanatory reason is required to unlock an official match.', 400);
    }

    const match = await matchRepository.findById(matchId);
    if (!match) {
      throw new AppError('MATCH_NOT_FOUND', 'Match not found.', 404);
    }
    if (match.status !== 'LOCKED') {
      throw new AppError('MATCH_NOT_LOCKED', 'Match is not currently locked.', 400);
    }

    const updated = await matchRepository.updateStatus(matchId, 'FINISHED', {
      lockedAt: null,
      lockedByUserId: null
    });

    await auditRepository.insert(null, {
      id: uuidv4(),
      actorId,
      action: 'MATCH_UNLOCKED',
      targetEntityType: 'MATCH',
      targetEntityId: matchId,
      payloadBefore: { status: 'LOCKED' },
      payloadAfter: { status: 'FINISHED' },
      reason: `Authorized administrative unlock: ${reason}`,
      ipAddress
    });

    return updated;
  }
};
