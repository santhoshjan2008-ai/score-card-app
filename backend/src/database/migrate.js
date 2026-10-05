// backend/src/database/migrate.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb, query, withTransaction, closeDb } from '../config/db.js';
import { logger } from '../config/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function runMigrations() {
  logger.info('Starting database migrations...');
  await initDb();

  // Create migrations tracking table if not exists
  await query(`
    CREATE TABLE IF NOT EXISTS _schema_migrations (
      name VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    const check = await query('SELECT 1 FROM _schema_migrations WHERE name = $1', [file]);
    if (check.rows.length === 0) {
      logger.info(`Applying migration: ${file}`);
      const sqlContent = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

      await withTransaction(async (client) => {
        // Execute migration statements using exec
        if (client.exec) {
          await client.exec(sqlContent);
        } else {
          await client.query(sqlContent);
        }
        await client.query('INSERT INTO _schema_migrations (name) VALUES ($1)', [file]);
      });

      logger.info(`Migration applied successfully: ${file}`);
    } else {
      logger.info(`Migration already applied: ${file}`);
    }
  }

  logger.info('All migrations completed successfully.');
}

// Allow standalone CLI execution
if (process.argv[1] && process.argv[1].endsWith('migrate.js')) {
  runMigrations()
    .then(async () => {
      await closeDb();
      process.exit(0);
    })
    .catch(async (err) => {
      logger.error('Migration failed:', { error: err.message, stack: err.stack });
      await closeDb();
      process.exit(1);
    });
}
