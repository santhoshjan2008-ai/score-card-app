// backend/src/repositories/matchRepository.js
import { query } from '../config/db.js';

export const matchRepository = {
  async listByTournament(tournamentId) {
    const res = await query(`
      SELECT 
        m.*,
        json_agg(
          json_build_object(
            'match_participant_id', mp.id,
            'participant_id', p.id,
            'name', p.name,
            'seed_number', p.seed_number,
            'slot', mp.slot,
            'current_score', mp.current_score
          ) ORDER BY mp.slot
        ) as participants
      FROM matches m
      LEFT JOIN match_participants mp ON m.id = mp.match_id
      LEFT JOIN participants p ON mp.participant_id = p.id
      WHERE m.tournament_id = $1
      GROUP BY m.id
      ORDER BY m.created_at ASC
    `, [tournamentId]);
    return res.rows;
  },

  async findById(matchId) {
    const res = await query(`
      SELECT 
        m.*,
        t.name as tournament_name,
        t.settings as tournament_settings,
        u.username as locked_by_username,
        COALESCE(
          json_agg(
            json_build_object(
              'match_participant_id', mp.id,
              'participant_id', p.id,
              'name', p.name,
              'seed_number', p.seed_number,
              'slot', mp.slot,
              'current_score', mp.current_score
            ) ORDER BY mp.slot
          ) FILTER (WHERE mp.id IS NOT NULL), '[]'
        ) as participants
      FROM matches m
      JOIN tournaments t ON m.tournament_id = t.id
      LEFT JOIN users u ON m.locked_by_user_id = u.id
      LEFT JOIN match_participants mp ON m.id = mp.match_id
      LEFT JOIN participants p ON mp.participant_id = p.id
      WHERE m.id = $1
      GROUP BY m.id, t.name, t.settings, u.username
    `, [matchId]);
    return res.rows[0] || null;
  },

  async createMatchWithParticipants(client, { id, tournamentId, matchNumber, participantAId, participantBId }) {
    const matchRes = await client.query(`
      INSERT INTO matches (id, tournament_id, match_number, status, version)
      VALUES ($1, $2, $3, 'SCHEDULED', 1)
      RETURNING *
    `, [id, tournamentId, matchNumber]);

    const match = matchRes.rows[0];

    // Assign slot A
    await client.query(`
      INSERT INTO match_participants (id, match_id, participant_id, slot, current_score)
      VALUES (gen_random_uuid(), $1, $2, 'A', 0)
    `, [id, participantAId]);

    // Assign slot B
    await client.query(`
      INSERT INTO match_participants (id, match_id, participant_id, slot, current_score)
      VALUES (gen_random_uuid(), $1, $2, 'B', 0)
    `, [id, participantBId]);

    return match;
  },

  async updateStatus(id, newStatus, extraFields = {}) {
    let extraSql = '';
    const params = [newStatus, id];
    let paramIdx = 3;

    if (extraFields.startedAt !== undefined) {
      extraSql += `, started_at = $${paramIdx++}`;
      params.push(extraFields.startedAt);
    }
    if (extraFields.finishedAt !== undefined) {
      extraSql += `, finished_at = $${paramIdx++}`;
      params.push(extraFields.finishedAt);
    }
    if (extraFields.lockedAt !== undefined) {
      extraSql += `, locked_at = $${paramIdx++}`;
      params.push(extraFields.lockedAt);
    }
    if (extraFields.lockedByUserId !== undefined) {
      extraSql += `, locked_by_user_id = $${paramIdx++}`;
      params.push(extraFields.lockedByUserId);
    }

    const res = await query(`
      UPDATE matches 
      SET status = $1, version = version + 1, updated_at = NOW() ${extraSql}
      WHERE id = $2
      RETURNING *
    `, params);

    return res.rows[0] || null;
  }
};
