// backend/src/repositories/auditRepository.js
import { query } from '../config/db.js';

export const auditRepository = {
  async insert(client, { id, actorId, action, targetEntityType, targetEntityId, payloadBefore, payloadAfter, reason, ipAddress }) {
    const q = client ? client.query.bind(client) : query;
    const res = await q(`
      INSERT INTO audit_logs (id, actor_id, action, target_entity_type, target_entity_id, payload_before, payload_after, reason, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      id,
      actorId || null,
      action,
      targetEntityType,
      targetEntityId,
      payloadBefore ? JSON.stringify(payloadBefore) : null,
      payloadAfter ? JSON.stringify(payloadAfter) : null,
      reason || null,
      ipAddress || null
    ]);
    return res.rows[0];
  },

  async list({ targetEntityType, targetEntityId, actorId, action, limit = 50, offset = 0 } = {}) {
    let whereClauses = [];
    let params = [];
    let idx = 1;

    if (targetEntityType) {
      whereClauses.push(`a.target_entity_type = $${idx++}`);
      params.push(targetEntityType);
    }
    if (targetEntityId) {
      whereClauses.push(`a.target_entity_id = $${idx++}`);
      params.push(targetEntityId);
    }
    if (actorId) {
      whereClauses.push(`a.actor_id = $${idx++}`);
      params.push(actorId);
    }
    if (action) {
      whereClauses.push(`a.action = $${idx++}`);
      params.push(action);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    params.push(limit, offset);

    const res = await query(`
      SELECT a.*, u.username as actor_name, u.role as actor_role
      FROM audit_logs a
      LEFT JOIN users u ON a.actor_id = u.id
      ${whereSql}
      ORDER BY a.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `, params);

    const countRes = await query(`
      SELECT COUNT(*) as total FROM audit_logs a ${whereSql}
    `, params.slice(0, params.length - 2));

    return {
      items: res.rows,
      total: parseInt(countRes.rows[0].total, 10),
      limit,
      offset
    };
  }
};
