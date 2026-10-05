// backend/src/config/db.js
import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';
import { env } from './env.js';
import { logger } from './logger.js';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;

let pool = null;
let pgliteInstance = null;
let isEmbedded = false;

export async function initDb() {
  if (pool || pgliteInstance) {
    return;
  }

  // Attempt standard PostgreSQL pool if DATABASE_URL is configured
  if (env.DATABASE_URL && env.DATABASE_URL.trim() !== '') {
    try {
      logger.info('Attempting PostgreSQL connection via DATABASE_URL...');
      const testPool = new Pool({
        connectionString: env.DATABASE_URL,
        connectionTimeoutMillis: 3000,
        idleTimeoutMillis: 30000,
        max: 20
      });
      await testPool.query('SELECT 1');
      pool = testPool;
      isEmbedded = false;
      logger.info('Connected to PostgreSQL server via pool successfully.');
      return;
    } catch (err) {
      logger.warn(`Could not connect to external PostgreSQL (${err.message}). Falling back to disk-backed PostgreSQL engine.`);
    }
  }

  // Fallback to disk-backed embedded PostgreSQL engine (.pgdata)
  logger.info(`Initializing embedded PostgreSQL engine with data directory: ${env.PGDATA_DIR}`);
  if (!fs.existsSync(env.PGDATA_DIR)) {
    fs.mkdirSync(env.PGDATA_DIR, { recursive: true });
  }

  pgliteInstance = new PGlite(env.PGDATA_DIR);
  await pgliteInstance.waitReady;
  isEmbedded = true;
  logger.info('Embedded PostgreSQL engine initialized successfully.');
}

export async function query(text, params = []) {
  if (!pool && !pgliteInstance) {
    await initDb();
  }

  if (pool) {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 500) {
      logger.warn(`Slow database query (${duration}ms): ${text.slice(0, 80)}...`);
    }
    return res;
  } else {
    // PGlite returns { rows, fields } matching standard pg interface
    const res = await pgliteInstance.query(text, params);
    return {
      rows: res.rows || [],
      rowCount: res.rows ? res.rows.length : (res.affectedRows || 0)
    };
  }
}

export async function exec(sql) {
  if (!pool && !pgliteInstance) {
    await initDb();
  }

  if (pool) {
    const client = await pool.connect();
    try {
      await client.query(sql);
    } finally {
      client.release();
    }
  } else {
    await pgliteInstance.exec(sql);
  }
}

/**
 * Execute a unit of work inside an explicit ACID transaction.
 * Automatically performs BEGIN, passes transactional client, then COMMIT or ROLLBACK.
 */
export async function withTransaction(callback) {
  if (!pool && !pgliteInstance) {
    await initDb();
  }

  if (pool) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } else {
    // PGlite transaction support
    return await pgliteInstance.transaction(async (tx) => {
      const txClient = {
        query: async (text, params = []) => {
          const res = await tx.query(text, params);
          return {
            rows: res.rows || [],
            rowCount: res.rows ? res.rows.length : (res.affectedRows || 0)
          };
        },
        exec: async (sql) => {
          return await tx.exec(sql);
        }
      };
      return await callback(txClient);
    });
  }
}

export async function closeDb() {
  if (pool) {
    await pool.end();
    pool = null;
  }
  if (pgliteInstance) {
    await pgliteInstance.close();
    pgliteInstance = null;
  }
  logger.info('Database connection closed.');
}

export function isDbEmbedded() {
  return isEmbedded;
}
