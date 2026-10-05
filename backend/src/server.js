// backend/src/server.js
import http from 'http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { initDb, closeDb } from './config/db.js';
import { runMigrations } from './database/migrate.js';
import { logger } from './config/logger.js';

async function startServer() {
  try {
    logger.info('Starting Auditable Tournament Scoring System Backend...');

    // 1. Initialize Database Engine & Run Migrations
    await initDb();
    await runMigrations();

    // 2. Create Express App
    const app = createApp();
    const server = http.createServer(app);

    server.listen(env.PORT, () => {
      logger.info(`Server successfully listening on port ${env.PORT} in [${env.NODE_ENV}] mode.`);
      logger.info(`API Base URL: http://localhost:${env.PORT}${env.API_PREFIX}`);
      logger.info(`Health Endpoint: http://localhost:${env.PORT}${env.API_PREFIX}/health`);
    });

    // Graceful Shutdown
    const handleShutdown = async (signal) => {
      logger.info(`Received ${signal}. Gracefully stopping server and closing connections...`);
      server.close(async () => {
        logger.info('HTTP server closed.');
        await closeDb();
        logger.info('Graceful shutdown complete.');
        process.exit(0);
      });

      // Force exit after 10 seconds if hanging
      setTimeout(() => {
        logger.error('Shutdown timed out. Forcing process exit.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));

  } catch (err) {
    logger.error('Critical failure during server startup:', { error: err.message, stack: err.stack });
    process.exit(1);
  }
}

startServer();
