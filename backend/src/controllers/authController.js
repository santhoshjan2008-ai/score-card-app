// backend/src/controllers/authController.js
import { authService } from '../services/authService.js';

export const authController = {
  async login(req, res, next) {
    try {
      const { usernameOrEmail, password } = req.body;
      const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

      const result = await authService.login({ usernameOrEmail, password, ipAddress });

      // Set secure HTTP-only cookie
      res.cookie('auth_token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 8 * 60 * 60 * 1000 // 8 hours
      });

      return res.status(200).json({
        success: true,
        data: {
          token: result.token,
          user: result.user
        }
      });
    } catch (err) {
      next(err);
    }
  },

  async logout(req, res, next) {
    try {
      const ipAddress = req.ip || req.headers['x-forwarded-for'];
      await authService.logout({ userId: req.user?.id, ipAddress });
      res.clearCookie('auth_token');
      return res.status(200).json({
        success: true,
        data: { message: 'Logged out successfully.' }
      });
    } catch (err) {
      next(err);
    }
  },

  async me(req, res, next) {
    try {
      return res.status(200).json({
        success: true,
        data: {
          user: req.user
        }
      });
    } catch (err) {
      next(err);
    }
  }
};
