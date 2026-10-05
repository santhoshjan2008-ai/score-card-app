// backend/src/repositories/scoreRepository.js
import { query } from '../config/db.js';

export const scoreRepository = {
  async findEventByIdempotencyKey(key) {
    const res = await query(`
      SELECT se.*, u.username as actor_name, p.name as participant_name
      FROM score_events se
      JOIN users u ON se.actor_id = u.id
      JOIN participants p ON se.participant_id = p.id
      WHERE se.idempotency_key = $1
    `, [key]);
    return res.rows[0] || null;
  },

  async listEventsByMatch(matchId, { limit = 100, offset = 0 } = {}) {
    const res = await query(`
      SELECT 
        se.*, 
        u.username as actor_name, 
        p.name as participant_name,
        mp.slot as participant_slot
      FROM score_events se
      JOIN users u ON se.actor_id = u.id
      JOIN participants p ON se.participant_id = p.id
      LEFT JOIN match_participants mp ON se.match_id = mp.match_id AND se.participant_id = mp.participant_id
      WHERE se.match_id = $1
      ORDER BY se.created_at DESC
      LIMIT $2 OFFSET $3
    `, [matchId, limit, offset]);
    return res.rows;
  },

  async findEventById(eventId) {
    const res = await query(`
      SELECT * FROM score_events WHERE id = $1
    `, [eventId]);
    return res.rows[0] || null;
  },

  async getParticipantScores(client, matchId) {
    const res = await client.query(`
      SELECT mp.*, p.name as participant_name
      FROM match_participants mp
      JOIN participants p ON mp.participant_id = p.id
      WHERE mp.match_id = $1
      ORDER BY mp.slot
    `, [matchId]);
    return res.rows;
  },

  async reconcileScore(matchId) {
    // Calculates the historical sum from all events versus current materialized scores
    const res = await query(`
      SELECT 
        mp.participant_id,
        p.name as participant_name,
        mp.slot,
        mp.current_score as materialized_score,
        COALESCE(SUM(se.points), 0)::integer as calculated_score_from_events,
        (mp.current_score = COALESCE(SUM(se.points), 0)) as is_consistent
      FROM match_participants mp
      JOIN participants p ON mp.participant_id = p.id
      LEFT JOIN score_events se ON mp.match_id = se.match_id AND mp.participant_id = se.participant_id
      WHERE mp.match_id = $1
      GROUP BY mp.participant_id, p.name, mp.slot, mp.current_score
    `, [matchId]);
    return res.rows;
  }
};
