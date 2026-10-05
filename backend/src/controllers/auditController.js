// backend/src/controllers/auditController.js
import { auditRepository } from '../repositories/auditRepository.js';

export const auditController = {
  async list(req, res, next) {
    try {
      const { targetEntityType, targetEntityId, actorId, action } = req.query;
      const limit = parseInt(req.query.limit || '50', 10);
      const offset = parseInt(req.query.offset || '0', 10);

      const result = await auditRepository.list({
        targetEntityType,
        targetEntityId,
        actorId,
        action,
        limit,
        offset
      });

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
};
