// backend/src/controllers/userController.js
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { userRepository } from '../repositories/userRepository.js';
import { auditRepository } from '../repositories/auditRepository.js';
import { AppError } from '../middleware/errorHandler.js';

export const userController = {
  async list(req, res, next) {
    try {
      const users = await userRepository.listAll();
      return res.status(200).json({
        success: true,
        data: { users }
      });
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      const { username, email, password, role } = req.body;
      const ipAddress = req.ip || req.headers['x-forwarded-for'];

      const existing = await userRepository.findByUsernameOrEmail(username);
      if (existing) {
        throw new AppError('USER_EXISTS', 'Username or email already exists.', 400);
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const id = uuidv4();
      const user = await userRepository.create({
        id,
        username,
        email,
        passwordHash,
        role: role || 'VIEWER'
      });

      await auditRepository.insert(null, {
        id: uuidv4(),
        actorId: req.user.id,
        action: 'USER_CREATED',
        targetEntityType: 'USER',
        targetEntityId: id,
        payloadAfter: { username, email, role },
        ipAddress
      });

      return res.status(201).json({
        success: true,
        data: { user }
      });
    } catch (err) {
      next(err);
    }
  },

  async updateRole(req, res, next) {
    try {
      const { id } = req.params;
      const { role } = req.body;
      const ipAddress = req.ip || req.headers['x-forwarded-for'];

      const validRoles = ['ADMIN', 'OFFICIAL', 'SCOREKEEPER', 'VIEWER'];
      if (!validRoles.includes(role)) {
        throw new AppError('INVALID_ROLE', `Role must be one of: ${validRoles.join(', ')}`, 400);
      }

      const user = await userRepository.findById(id);
      if (!user) {
        throw new AppError('USER_NOT_FOUND', 'User not found.', 404);
      }

      const updated = await userRepository.updateRole(id, role);

      await auditRepository.insert(null, {
        id: uuidv4(),
        actorId: req.user.id,
        action: 'USER_ROLE_CHANGED',
        targetEntityType: 'USER',
        targetEntityId: id,
        payloadBefore: { role: user.role },
        payloadAfter: { role },
        ipAddress
      });

      return res.status(200).json({
        success: true,
        data: { user: updated }
      });
    } catch (err) {
      next(err);
    }
  }
};
