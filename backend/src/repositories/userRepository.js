// backend/src/repositories/userRepository.js
import { query } from '../config/db.js';

export const userRepository = {
  async findByUsernameOrEmail(identifier) {
    const res = await query(
      `SELECT * FROM users WHERE username = $1 OR email = $1 LIMIT 1`,
      [identifier]
    );
    return res.rows[0] || null;
  },

  async findById(id) {
    const res = await query(
      `SELECT id, username, email, role, is_active, created_at, updated_at FROM users WHERE id = $1`,
      [id]
    );
    return res.rows[0] || null;
  },

  async listAll() {
    const res = await query(
      `SELECT id, username, email, role, is_active, created_at, updated_at FROM users ORDER BY created_at ASC`
    );
    return res.rows;
  },

  async create({ id, username, email, passwordHash, role }) {
    const res = await query(
      `INSERT INTO users (id, username, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING id, username, email, role, is_active, created_at`,
      [id, username, email, passwordHash, role]
    );
    return res.rows[0];
  },

  async updateRole(id, role) {
    const res = await query(
      `UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, username, email, role, updated_at`,
      [role, id]
    );
    return res.rows[0] || null;
  },

  async toggleActive(id, isActive) {
    const res = await query(
      `UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING id, username, email, is_active, updated_at`,
      [isActive, id]
    );
    return res.rows[0] || null;
  }
};
