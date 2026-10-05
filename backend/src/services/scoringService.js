// backend/src/services/scoringService.js
import { v4 as uuidv4 } from 'uuid';
import { withTransaction } from '../config/db.js';
import { scoreRepository } from '../repositories/scoreRepository.js';
import { auditRepository } from '../repositories/auditRepository.js';
import { matchRepository } from '../repositories/matchRepository.js';
import { AppError } from '../middleware/errorHandler.js';

export const scoringService = {
  /**
   * Authoritative, idempotent, concurrency-safe score command execution.
   */
  async recordScoreCommand({ matchId, participantId, points, idempotencyKey, expectedVersion, actorId, ipAddress }) {
    if (!idempotencyKey) {
      throw new AppError('MISSING_IDEMPOTENCY_KEY', 'An idempotency key is required for scoring operations.', 400);
    }

    // 1. First check if this exact idempotency key has already been processed
    const existingEvent = await scoreRepository.findEventByIdempotencyKey(idempotencyKey);
    if (existingEvent) {
      const match = await matchRepository.findById(matchId);
      return {
        isDuplicate: true,
        event: existingEvent,
        match
      };
    }

    // 2. Execute scoring command inside an atomic transaction
    return await withTransaction(async (client) => {
      // 2a. Re-check idempotency key inside the transaction to guard against race conditions
      const duplicateCheck = await client.query(
        `SELECT id, points, participant_id FROM score_events WHERE idempotency_key = $1`,
        [idempotencyKey]
      );
      if (duplicateCheck.rows.length > 0) {
        const matchRes = await client.query(`SELECT * FROM matches WHERE id = $1`, [matchId]);
        const scores = await scoreRepository.getParticipantScores(client, matchId);
        return {
          isDuplicate: true,
          event: duplicateCheck.rows[0],
          match: { ...matchRes.rows[0], participants: scores }
        };
      }

      // 2b. Row-level lock on the match row to serialize concurrent writes
      const lockRes = await client.query(
        `SELECT m.*, t.settings as tournament_settings
         FROM matches m
         JOIN tournaments t ON m.tournament_id = t.id
         WHERE m.id = $1
         FOR UPDATE`,
        [matchId]
      );

      if (lockRes.rows.length === 0) {
        throw new AppError('MATCH_NOT_FOUND', 'The requested match does not exist.', 404);
      }

      const match = lockRes.rows[0];

      // 2c. Verify match status permits scoring
      if (match.status === 'LOCKED') {
        throw new AppError('MATCH_LOCKED', 'This match is locked and cannot be scored.', 403);
      }
      if (match.status === 'FINISHED') {
        throw new AppError('MATCH_FINISHED', 'This match is marked finished. Reopen or unlock to score.', 400);
      }
      if (match.status !== 'LIVE') {
        throw new AppError('MATCH_NOT_LIVE', `Match cannot be scored in '${match.status}' state. Match must be LIVE.`, 400);
      }

      // 2d. Optimistic concurrency / Stale tab check
      if (expectedVersion !== undefined && expectedVersion !== null) {
        if (Number(expectedVersion) !== Number(match.version)) {
          throw new AppError(
            'STALE_VERSION',
            `State conflict: match version is ${match.version}, but client expected ${expectedVersion}. Refreshing state.`,
            409,
            { currentVersion: match.version }
          );
        }
      }

      // 2e. Verify participant is part of this match
      const partRes = await client.query(
        `SELECT mp.*, p.name as participant_name
         FROM match_participants mp
         JOIN participants p ON mp.participant_id = p.id
         WHERE mp.match_id = $1 AND mp.participant_id = $2
         FOR UPDATE`,
        [matchId, participantId]
      );

      if (partRes.rows.length === 0) {
        throw new AppError('INVALID_PARTICIPANT', 'Participant does not belong to this match.', 400);
      }

      const participant = partRes.rows[0];

      // 2f. Validate points value against tournament rules
      const settings = typeof match.tournament_settings === 'string' 
        ? JSON.parse(match.tournament_settings) 
        : (match.tournament_settings || {});
      const allowedIncrements = settings.allowedIncrements || [1, 2, 3];

      if (!allowedIncrements.includes(points)) {
        throw new AppError('INVALID_SCORE_INCREMENT', `Score increment ${points} is not allowed. Allowed: ${allowedIncrements.join(', ')}`, 400);
      }

      const scoreBefore = participant.current_score;
      const scoreAfter = scoreBefore + points;

      // 2g. Insert score event (Audit-grade immutable event)
      const eventId = uuidv4();
      const insertEventRes = await client.query(
        `INSERT INTO score_events 
          (id, match_id, participant_id, actor_id, event_type, points, idempotency_key, match_version_at_time)
         VALUES ($1, $2, $3, $4, 'SCORE_INCREMENT', $5, $6, $7)
         RETURNING *`,
        [eventId, matchId, participantId, actorId, points, idempotencyKey, match.version]
      );
      const scoreEvent = insertEventRes.rows[0];

      // 2h. Update materialized score for participant
      await client.query(
        `UPDATE match_participants
         SET current_score = current_score + $1
         WHERE match_id = $2 AND participant_id = $3`,
        [points, matchId, participantId]
      );

      // 2i. Increment match version and update timestamp
      const newVersion = match.version + 1;
      await client.query(
        `UPDATE matches
         SET version = $1, updated_at = NOW()
         WHERE id = $2`,
        [newVersion, matchId]
      );

      // 2j. Record audit log inside the same transaction
      await auditRepository.insert(client, {
        id: uuidv4(),
        actorId,
        action: 'SCORE_CREATED',
        targetEntityType: 'MATCH',
        targetEntityId: matchId,
        payloadBefore: { participantId, score: scoreBefore, version: match.version },
        payloadAfter: { participantId, points, score: scoreAfter, version: newVersion, eventId },
        reason: `Score added (+${points}) to ${participant.participant_name}`,
        ipAddress
      });

      // 2k. Fetch complete updated match representation
      const updatedScores = await scoreRepository.getParticipantScores(client, matchId);

      return {
        isDuplicate: false,
        event: {
          ...scoreEvent,
          participant_name: participant.participant_name,
          slot: participant.slot
        },
        match: {
          ...match,
          version: newVersion,
          participants: updatedScores
        }
      };
    });
  },

  /**
   * Official score correction workflow. Creates an auditable reversal event without deleting history.
   */
  async recordCorrection({ matchId, originalEventId, reason, idempotencyKey, actorId, ipAddress }) {
    if (!reason || reason.trim().length < 4) {
      throw new AppError('REASON_REQUIRED', 'A detailed reason (at least 4 characters) is required to correct a score.', 400);
    }
    if (!idempotencyKey) {
      throw new AppError('MISSING_IDEMPOTENCY_KEY', 'An idempotency key is required for corrections.', 400);
    }

    // Check duplicate correction request
    const existingCorrection = await scoreRepository.findEventByIdempotencyKey(idempotencyKey);
    if (existingCorrection) {
      const match = await matchRepository.findById(matchId);
      return {
        isDuplicate: true,
        event: existingCorrection,
        match
      };
    }

    return await withTransaction(async (client) => {
      // Row lock on match
      const lockRes = await client.query(
        `SELECT * FROM matches WHERE id = $1 FOR UPDATE`,
        [matchId]
      );
      if (lockRes.rows.length === 0) {
        throw new AppError('MATCH_NOT_FOUND', 'Match not found.', 404);
      }
      const match = lockRes.rows[0];

      // Fetch original event
      const origEventRes = await client.query(
        `SELECT se.*, p.name as participant_name
         FROM score_events se
         JOIN participants p ON se.participant_id = p.id
         WHERE se.id = $1 AND se.match_id = $2
         FOR UPDATE`,
        [originalEventId, matchId]
      );

      if (origEventRes.rows.length === 0) {
        throw new AppError('EVENT_NOT_FOUND', 'Original score event to correct was not found in this match.', 404);
      }

      const origEvent = origEventRes.rows[0];

      // Check if this event was already reversed
      const alreadyReversed = await client.query(
        `SELECT 1 FROM score_events WHERE references_event_id = $1`,
        [originalEventId]
      );
      if (alreadyReversed.rows.length > 0) {
        throw new AppError('ALREADY_CORRECTED', 'This score event has already been corrected or reversed.', 400);
      }

      // Calculate reversal points: opposite of the original points
      const reversalPoints = -origEvent.points;

      // Participant check
      const partRes = await client.query(
        `SELECT * FROM match_participants WHERE match_id = $1 AND participant_id = $2 FOR UPDATE`,
        [matchId, origEvent.participant_id]
      );
      const participant = partRes.rows[0];

      if (participant.current_score + reversalPoints < 0) {
        throw new AppError('NEGATIVE_SCORE_ERROR', 'Correction would result in an invalid negative score.', 400);
      }

      // Create linked reversal event (Never delete the original!)
      const correctionId = uuidv4();
      const insertRes = await client.query(
        `INSERT INTO score_events
          (id, match_id, participant_id, actor_id, event_type, points, idempotency_key, references_event_id, reason, match_version_at_time)
         VALUES ($1, $2, $3, $4, 'SCORE_CORRECTION', $5, $6, $7, $8, $9)
         RETURNING *`,
        [correctionId, matchId, origEvent.participant_id, actorId, reversalPoints, idempotencyKey, originalEventId, reason, match.version]
      );
      const correctionEvent = insertRes.rows[0];

      // Update participant score
      await client.query(
        `UPDATE match_participants
         SET current_score = current_score + $1
         WHERE match_id = $2 AND participant_id = $3`,
        [reversalPoints, matchId, origEvent.participant_id]
      );

      // Increment version
      const newVersion = match.version + 1;
      await client.query(
        `UPDATE matches SET version = $1, updated_at = NOW() WHERE id = $2`,
        [newVersion, matchId]
      );

      // Create audit log
      await auditRepository.insert(client, {
        id: uuidv4(),
        actorId,
        action: 'SCORE_CORRECTED',
        targetEntityType: 'MATCH',
        targetEntityId: matchId,
        payloadBefore: { eventId: originalEventId, points: origEvent.points, score: participant.current_score },
        payloadAfter: { correctionId, reversalPoints, score: participant.current_score + reversalPoints, newVersion },
        reason: `Score correction: ${reason}`,
        ipAddress
      });

      const updatedScores = await scoreRepository.getParticipantScores(client, matchId);

      return {
        isDuplicate: false,
        event: {
          ...correctionEvent,
          participant_name: origEvent.participant_name
        },
        match: {
          ...match,
          version: newVersion,
          participants: updatedScores
        }
      };
    });
  }
};
