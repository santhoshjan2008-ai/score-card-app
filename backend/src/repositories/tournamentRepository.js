// backend/src/repositories/tournamentRepository.js
import { query } from '../config/db.js';

export const tournamentRepository = {
  async listAll() {
    const res = await query(`
      SELECT t.*, u.username as organizer_name,
        (SELECT COUNT(*) FROM matches m WHERE m.tournament_id = t.id) as match_count,
        (SELECT COUNT(*) FROM participants p WHERE p.tournament_id = t.id) as participant_count
      FROM tournaments t
      LEFT JOIN users u ON t.organizer_id = u.id
      ORDER BY t.created_at DESC
    `);
    return res.rows;
  },

  async findById(id) {
    const res = await query(`
      SELECT t.*, u.username as organizer_name
      FROM tournaments t
      LEFT JOIN users u ON t.organizer_id = u.id
      WHERE t.id = $1
    `, [id]);
    return res.rows[0] || null;
  },

  async create({ id, name, description, organizerId, settings, status = 'DRAFT' }) {
    const res = await query(`
      INSERT INTO tournaments (id, name, description, organizer_id, settings, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [id, name, description, organizerId, JSON.stringify(settings || {}), status]);
    return res.rows[0];
  },

  async updateStatus(id, status) {
    const res = await query(`
      UPDATE tournaments SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *
    `, [status, id]);
    return res.rows[0] || null;
  },

  async updateSettings(id, settings) {
    const res = await query(`
      UPDATE tournaments SET settings = $1, updated_at = NOW() WHERE id = $2 RETURNING *
    `, [JSON.stringify(settings), id]);
    return res.rows[0] || null;
  },

  // Participant queries
  async listParticipants(tournamentId) {
    const res = await query(`
      SELECT * FROM participants WHERE tournament_id = $1 ORDER BY seed_number ASC, name ASC
    `, [tournamentId]);
    return res.rows;
  },

  async createParticipant({ id, tournamentId, name, seedNumber }) {
    const res = await query(`
      INSERT INTO participants (id, tournament_id, name, seed_number)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [id, tournamentId, name, seedNumber || null]);
    return res.rows[0];
  }
};
