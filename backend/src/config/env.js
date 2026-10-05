// backend/src/config/env.js
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config(); // fallback to local .env if present

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4000', 10),
  API_PREFIX: process.env.API_PREFIX || '/api/v1',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-tournament-scoring-system-change-in-prod-1234',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',
  DATABASE_URL: process.env.DATABASE_URL || '',
  PGDATA_DIR: process.env.PGDATA_DIR || path.resolve(__dirname, '../../../.pgdata'),
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  LOGIN_RATE_LIMIT_MAX: parseInt(process.env.LOGIN_RATE_LIMIT_MAX || '10', 10)
};
