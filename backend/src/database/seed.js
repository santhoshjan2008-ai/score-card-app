// backend/src/database/seed.js
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { initDb, query, withTransaction, closeDb } from '../config/db.js';
import { logger } from '../config/logger.js';
import { runMigrations } from './migrate.js';

export async function seedDevData() {
  logger.info('Ensuring database migrations are up to date before seeding...');
  await runMigrations();

  logger.info('Seeding development demonstration data...');

  const passwordHash = await bcrypt.hash('password123!', 10);

  await withTransaction(async (client) => {
    // 1. Seed Users
    const users = [
      { id: '11111111-1111-1111-1111-111111111111', username: 'admin', email: 'admin@tournament.local', role: 'ADMIN' },
      { id: '22222222-2222-2222-2222-222222222222', username: 'official', email: 'official@tournament.local', role: 'OFFICIAL' },
      { id: '33333333-3333-3333-3333-333333333333', username: 'scorekeeper1', email: 'scorekeeper1@tournament.local', role: 'SCOREKEEPER' },
      { id: '44444444-4444-4444-4444-444444444444', username: 'scorekeeper2', email: 'scorekeeper2@tournament.local', role: 'SCOREKEEPER' },
      { id: '55555555-5555-5555-5555-555555555555', username: 'viewer', email: 'viewer@tournament.local', role: 'VIEWER' }
    ];

    for (const u of users) {
      await client.query(`
        INSERT INTO users (id, username, email, password_hash, role, is_active)
        VALUES ($1, $2, $3, $4, $5, true)
        ON CONFLICT (username) DO UPDATE
        SET role = EXCLUDED.role, password_hash = EXCLUDED.password_hash;
      `, [u.id, u.username, u.email, passwordHash, u.role]);
    }

    // 2. Seed Tournament
    const tournamentId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    await client.query(`
      INSERT INTO tournaments (id, name, description, status, organizer_id, settings)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status;
    `, [
      tournamentId,
      'Metro Championship 2026',
      'Official desk scoring pilot tournament with real-time auditability',
      'LIVE',
      users[0].id,
      JSON.stringify({ maxPoints: 21, winByTwo: true, allowedIncrements: [1, 2, 3] })
    ]);

    // 3. Seed Participants
    const p1Id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01';
    const p2Id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02';
    const p3Id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb03';
    const p4Id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb04';

    const participants = [
      { id: p1Id, name: 'Alex Rivera (Seed #1)', seed: 1 },
      { id: p2Id, name: 'Sam Chen (Seed #2)', seed: 2 },
      { id: p3Id, name: 'Jordan Taylor (Seed #3)', seed: 3 },
      { id: p4Id, name: 'Morgan Bailey (Seed #4)', seed: 4 }
    ];

    for (const p of participants) {
      await client.query(`
        INSERT INTO participants (id, tournament_id, name, seed_number)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (tournament_id, name) DO UPDATE SET seed_number = EXCLUDED.seed_number;
      `, [p.id, tournamentId, p.name, p.seed]);
    }

    // 4. Seed Live Match (M-101)
    const match1Id = 'cccccccc-cccc-cccc-cccc-cccccccc0101';
    await client.query(`
      INSERT INTO matches (id, tournament_id, match_number, status, version, started_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (tournament_id, match_number) DO UPDATE SET status = EXCLUDED.status;
    `, [match1Id, tournamentId, 'M-101', 'LIVE', 1]);

    await client.query(`
      INSERT INTO match_participants (id, match_id, participant_id, slot, current_score)
      VALUES 
        ($1, $2, $3, 'A', 0),
        ($4, $5, $6, 'B', 0)
      ON CONFLICT (match_id, participant_id) DO NOTHING;
    `, [uuidv4(), match1Id, p1Id, uuidv4(), match1Id, p2Id]);

    // 5. Seed Scheduled Match (M-102)
    const match2Id = 'cccccccc-cccc-cccc-cccc-cccccccc0102';
    await client.query(`
      INSERT INTO matches (id, tournament_id, match_number, status, version)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (tournament_id, match_number) DO UPDATE SET status = EXCLUDED.status;
    `, [match2Id, tournamentId, 'M-102', 'SCHEDULED', 1]);

    await client.query(`
      INSERT INTO match_participants (id, match_id, participant_id, slot, current_score)
      VALUES 
        ($1, $2, $3, 'A', 0),
        ($4, $5, $6, 'B', 0)
      ON CONFLICT (match_id, participant_id) DO NOTHING;
    `, [uuidv4(), match2Id, p3Id, uuidv4(), match2Id, p4Id]);

    // 6. Seed Locked Match (M-100) with history
    const match3Id = 'cccccccc-cccc-cccc-cccc-cccccccc0100';
    await client.query(`
      INSERT INTO matches (id, tournament_id, match_number, status, version, started_at, finished_at, locked_at, locked_by_user_id)
      VALUES ($1, $2, $3, 'LOCKED', 5, NOW() - interval '2 hours', NOW() - interval '1 hour', NOW() - interval '50 minutes', $4)
      ON CONFLICT (tournament_id, match_number) DO UPDATE SET status = 'LOCKED';
    `, [match3Id, tournamentId, 'M-100', users[1].id]);

    await client.query(`
      INSERT INTO match_participants (id, match_id, participant_id, slot, current_score)
      VALUES 
        ($1, $2, $3, 'A', 21),
        ($4, $5, $6, 'B', 18)
      ON CONFLICT (match_id, participant_id) DO NOTHING;
    `, [uuidv4(), match3Id, p1Id, uuidv4(), match3Id, p3Id]);

    // Audit seed
    await client.query(`
      INSERT INTO audit_logs (id, actor_id, action, target_entity_type, target_entity_id, payload_after, reason)
      VALUES ($1, $2, 'TOURNAMENT_CREATED', 'TOURNAMENT', $3, $4, 'System initialization seed')
      ON CONFLICT DO NOTHING;
    `, [uuidv4(), users[0].id, tournamentId, JSON.stringify({ name: 'Metro Championship 2026' })]);
  });

  logger.info('Demo seed data created successfully.');
  logger.info('Credentials for testing:');
  logger.info('  Admin:       username: admin         | password: password123!');
  logger.info('  Official:    username: official      | password: password123!');
  logger.info('  Scorekeeper: username: scorekeeper1  | password: password123!');
  logger.info('  Viewer:      username: viewer        | password: password123!');
}

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedDevData()
    .then(async () => {
      await closeDb();
      process.exit(0);
    })
    .catch(async (err) => {
      logger.error('Seed script failed:', { error: err.message, stack: err.stack });
      await closeDb();
      process.exit(1);
    });
}
