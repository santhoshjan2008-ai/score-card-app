// backend/src/services/authService.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { userRepository } from '../repositories/userRepository.js';
import { auditRepository } from '../repositories/auditRepository.js';
import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';

export const authService = {
  async login({ usernameOrEmail, password, ipAddress }) {
    const user = await userRepository.findByUsernameOrEmail(usernameOrEmail);

    // Generic error to prevent account enumeration
    if (!user) {
      // Audit failure attempt
      await auditRepository.insert(null, {
        id: uuidv4(),
        actorId: null,
        action: 'LOGIN_FAILURE',
        targetEntityType: 'USER',
        targetEntityId: usernameOrEmail,
        reason: 'User not found',
        ipAddress
      });
      throw new AppError('INVALID_CREDENTIALS', 'Invalid username/email or password.', 401);
    }

    if (!user.is_active) {
      throw new AppError('ACCOUNT_DISABLED', 'This account has been disabled. Contact an administrator.', 403);
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      await auditRepository.insert(null, {
        id: uuidv4(),
        actorId: user.id,
        action: 'LOGIN_FAILURE',
        targetEntityType: 'USER',
        targetEntityId: user.id,
        reason: 'Invalid password',
        ipAddress
      });
      throw new AppError('INVALID_CREDENTIALS', 'Invalid username/email or password.', 401);
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    // Audit success
    await auditRepository.insert(null, {
      id: uuidv4(),
      actorId: user.id,
      action: 'LOGIN_SUCCESS',
      targetEntityType: 'USER',
      targetEntityId: user.id,
      ipAddress
    });

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    };
  },

  async logout({ userId, ipAddress }) {
    if (userId) {
      await auditRepository.insert(null, {
        id: uuidv4(),
        actorId: userId,
        action: 'LOGOUT',
        targetEntityType: 'USER',
        targetEntityId: userId,
        ipAddress
      });
    }
  }
};
