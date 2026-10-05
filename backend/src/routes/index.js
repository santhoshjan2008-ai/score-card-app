// backend/src/routes/index.js
import { Router } from 'express';
import authRoutes from './authRoutes.js';
import tournamentRoutes from './tournamentRoutes.js';
import matchRoutes from './matchRoutes.js';
import scoreRoutes from './scoreRoutes.js';
import auditRoutes from './auditRoutes.js';
import userRoutes from './userRoutes.js';
import { query, isDbEmbedded } from '../config/db.js';

const router = Router();

// Health Check Endpoint (safe for deployment monitors)
router.get('/health', async (req, res) => {
  let dbStatus = 'unhealthy';
  try {
    const start = Date.now();
    await query('SELECT 1');
    const latencyMs = Date.now() - start;
    dbStatus = 'healthy';

    return res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatus,
        latencyMs,
        engine: isDbEmbedded() ? 'embedded-postgresql' : 'external-postgresql'
      }
    });
  } catch (err) {
    return res.status(503).json({
      status: 'degraded',
      timestamp: new Date().toISOString(),
      database: {
        status: 'unhealthy'
      }
    });
  }
});

// Mounted API sub-routers
router.use('/auth', authRoutes);
router.use('/', tournamentRoutes);
router.use('/', matchRoutes);
router.use('/', scoreRoutes);
router.use('/', auditRoutes);
router.use('/', userRoutes);

export default router;
