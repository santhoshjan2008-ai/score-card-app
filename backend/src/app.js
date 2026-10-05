// backend/src/app.js
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { env } from './config/env.js';
import { globalRateLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import routes from './routes/index.js';

export function createApp() {
  const app = express();

  // Trust first proxy for accurate IP determination behind proxies / desk routers
  app.set('trust proxy', 1);

  // Security Headers
  app.use(helmet({
    contentSecurityPolicy: false // Allows dev environments and frontend flexibility
  }));

  // CORS Configuration
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., mobile apps, curl, server-to-server) or matching origin
      if (!origin || origin === env.CORS_ORIGIN || origin.startsWith('http://localhost:')) {
        callback(null, true);
      } else {
        callback(new Error('Blocked by CORS policy'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-Id', 'X-Idempotency-Key']
  }));

  // Body and Cookie Parsers
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  // Logging
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined'));
  }

  // Rate Limiting
  app.use(globalRateLimiter);

  // Mount API
  app.use(env.API_PREFIX, routes);

  // 404 Route Catch-All
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Endpoint ${req.method} ${req.originalUrl} not found.`
      }
    });
  });

  // Centralized Error Handling
  app.use(errorHandler);

  return app;
}
