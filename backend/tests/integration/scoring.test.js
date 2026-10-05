// backend/tests/integration/scoring.test.js
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { createApp } from '../../src/app.js';
import { initDb, closeDb, query } from '../../src/config/db.js';
import { runMigrations } from '../../src/database/migrate.js';
import { seedDevData } from '../../src/database/seed.js';

describe('Authoritative Scoring, Idempotency & Locking Integration Tests', () => {
  let app;
  let scorekeeperToken;
  let officialToken;
  let viewerToken;
  let adminToken;

  const liveMatchId = 'cccccccc-cccc-cccc-cccc-cccccccc0101';
  const participantAId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01';
  const participantBId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02';
  const lockedMatchId = 'cccccccc-cccc-cccc-cccc-cccccccc0100';

  before(async () => {
    await initDb();
    await runMigrations();
    await seedDevData();
    app = createApp();

    // Authenticate all test roles
    const skRes = await request(app).post('/api/v1/auth/login').send({ usernameOrEmail: 'scorekeeper1', password: 'password123!' });
    scorekeeperToken = skRes.body.data.token;

    const offRes = await request(app).post('/api/v1/auth/login').send({ usernameOrEmail: 'official', password: 'password123!' });
    officialToken = offRes.body.data.token;

    const vRes = await request(app).post('/api/v1/auth/login').send({ usernameOrEmail: 'viewer', password: 'password123!' });
    viewerToken = vRes.body.data.token;

    const admRes = await request(app).post('/api/v1/auth/login').send({ usernameOrEmail: 'admin', password: 'password123!' });
    adminToken = admRes.body.data.token;
  });

  after(async () => {
    await closeDb();
  });

  it('1. Viewer cannot submit scores (403 Forbidden)', async () => {
    const res = await request(app)
      .post(`/api/v1/matches/${liveMatchId}/score`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        participantId: participantAId,
        points: 1,
        idempotencyKey: uuidv4()
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  it('2. Scorekeeper submits valid score command: increments score and records event + audit', async () => {
    const key = uuidv4();
    const res = await request(app)
      .post(`/api/v1/matches/${liveMatchId}/score`)
      .set('Authorization', `Bearer ${scorekeeperToken}`)
      .send({
        participantId: participantAId,
        points: 1,
        idempotencyKey: key
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.isDuplicate, false);
    assert.equal(res.body.data.event.points, 1);
    assert.equal(res.body.data.event.idempotency_key, key);

    // Verify audit log exists
    const auditRes = await query(
      `SELECT * FROM audit_logs WHERE action = 'SCORE_CREATED' AND target_entity_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [liveMatchId]
    );
    assert.ok(auditRes.rows.length > 0);
  });

  it('3. Idempotency protection: exact same request key returns existing event without re-applying score', async () => {
    const fixedKey = 'fixed-idempotency-key-' + Date.now();

    // First call
    const firstRes = await request(app)
      .post(`/api/v1/matches/${liveMatchId}/score`)
      .set('Authorization', `Bearer ${scorekeeperToken}`)
      .send({
        participantId: participantAId,
        points: 1,
        idempotencyKey: fixedKey
      });
    assert.equal(firstRes.status, 201);
    const scoreAfterFirst = firstRes.body.data.match.participants.find(p => p.participant_id === participantAId).current_score;

    // Second call with same idempotency key (simulated network retry or double-click)
    const secondRes = await request(app)
      .post(`/api/v1/matches/${liveMatchId}/score`)
      .set('Authorization', `Bearer ${scorekeeperToken}`)
      .send({
        participantId: participantAId,
        points: 1,
        idempotencyKey: fixedKey
      });

    assert.equal(secondRes.status, 200);
    assert.equal(secondRes.body.data.isDuplicate, true);
    const scoreAfterSecond = secondRes.body.data.match.participants.find(p => p.participant_id === participantAId).current_score;

    // Score must NOT have doubled!
    assert.equal(scoreAfterSecond, scoreAfterFirst);
  });

  it('4. Rejects scoring on a LOCKED match (403 MATCH_LOCKED)', async () => {
    const res = await request(app)
      .post(`/api/v1/matches/${lockedMatchId}/score`)
      .set('Authorization', `Bearer ${scorekeeperToken}`)
      .send({
        participantId: participantAId,
        points: 1,
        idempotencyKey: uuidv4()
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'MATCH_LOCKED');
  });

  it('5. Rejects invalid participant (400 INVALID_PARTICIPANT)', async () => {
    const randomParticipantId = uuidv4();
    const res = await request(app)
      .post(`/api/v1/matches/${liveMatchId}/score`)
      .set('Authorization', `Bearer ${scorekeeperToken}`)
      .send({
        participantId: randomParticipantId,
        points: 1,
        idempotencyKey: uuidv4()
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'INVALID_PARTICIPANT');
  });

  it('6. Stale version detection (409 STALE_VERSION)', async () => {
    const res = await request(app)
      .post(`/api/v1/matches/${liveMatchId}/score`)
      .set('Authorization', `Bearer ${scorekeeperToken}`)
      .send({
        participantId: participantAId,
        points: 1,
        idempotencyKey: uuidv4(),
        expectedVersion: 999999 // Intentionally stale version
      });

    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'STALE_VERSION');
  });

  it('7. Official correction workflow creates reversal event with reason and preserves original', async () => {
    // 1. Create a score event
    const originalKey = uuidv4();
    const scoreRes = await request(app)
      .post(`/api/v1/matches/${liveMatchId}/score`)
      .set('Authorization', `Bearer ${scorekeeperToken}`)
      .send({
        participantId: participantBId,
        points: 2,
        idempotencyKey: originalKey
      });
    const originalEventId = scoreRes.body.data.event.id;
    const scoreBeforeCorrection = scoreRes.body.data.match.participants.find(p => p.participant_id === participantBId).current_score;

    // 2. Scorekeeper cannot perform correction (Forbidden)
    const skCorrection = await request(app)
      .post(`/api/v1/matches/${liveMatchId}/corrections`)
      .set('Authorization', `Bearer ${scorekeeperToken}`)
      .send({
        originalEventId,
        reason: 'Misclick by operator',
        idempotencyKey: uuidv4()
      });
    assert.equal(skCorrection.status, 403);

    // 3. Official performs authorized correction with required reason
    const offCorrection = await request(app)
      .post(`/api/v1/matches/${liveMatchId}/corrections`)
      .set('Authorization', `Bearer ${officialToken}`)
      .send({
        originalEventId,
        reason: 'Authorized correction: line judge overruled point',
        idempotencyKey: uuidv4()
      });

    assert.equal(offCorrection.status, 201);
    assert.equal(offCorrection.body.success, true);
    assert.equal(offCorrection.body.data.event.event_type, 'SCORE_CORRECTION');
    assert.equal(offCorrection.body.data.event.points, -2);
    assert.equal(offCorrection.body.data.event.references_event_id, originalEventId);

    // 4. Verify original event was NOT deleted
    const origCheck = await query('SELECT * FROM score_events WHERE id = $1', [originalEventId]);
    assert.equal(origCheck.rows.length, 1);

    // 5. Verify score was correctly reduced
    const scoreAfterCorrection = offCorrection.body.data.match.participants.find(p => p.participant_id === participantBId).current_score;
    assert.equal(scoreAfterCorrection, scoreBeforeCorrection - 2);
  });

  it('8. Score Reconciliation: Reconstructs state from event history', async () => {
    const res = await request(app)
      .get(`/api/v1/matches/${liveMatchId}/reconcile`)
      .set('Authorization', `Bearer ${officialToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.isConsistent, true);
  });
});
