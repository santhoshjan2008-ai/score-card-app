// backend/tests/integration/finalAcceptance.test.js
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { createApp } from '../../src/app.js';
import { initDb, closeDb, query } from '../../src/config/db.js';
import { runMigrations } from '../../src/database/migrate.js';
import { seedDevData } from '../../src/database/seed.js';

describe('Final Acceptance End-to-End Workflow (Section 51)', () => {
  let app;
  let adminToken;
  let scorekeeper1Token;
  let scorekeeper2Token;
  let viewerToken;

  let createdTournamentId;
  let participant1Id;
  let participant2Id;
  let createdMatchId;

  before(async () => {
    // 1. Clean & Migrate & Seed Database
    await initDb();
    await runMigrations();
    await seedDevData();
    app = createApp();

    // 2. Log in as admin
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ usernameOrEmail: 'admin', password: 'password123!' });
    assert.equal(adminLogin.status, 200);
    adminToken = adminLogin.body.data.token;

    // Log in as scorekeepers
    const sk1Login = await request(app)
      .post('/api/v1/auth/login')
      .send({ usernameOrEmail: 'scorekeeper1', password: 'password123!' });
    scorekeeper1Token = sk1Login.body.data.token;

    const sk2Login = await request(app)
      .post('/api/v1/auth/login')
      .send({ usernameOrEmail: 'scorekeeper2', password: 'password123!' });
    scorekeeper2Token = sk2Login.body.data.token;

    // Log in as viewer
    const viewerLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ usernameOrEmail: 'viewer', password: 'password123!' });
    viewerToken = viewerLogin.body.data.token;
  });

  after(async () => {
    await closeDb();
  });

  it('Step 1: Admin creates tournament', async () => {
    const res = await request(app)
      .post('/api/v1/tournaments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Autonomous Acceptance Championship 2026',
        description: 'End-to-end acceptance run',
        settings: { allowedIncrements: [1, 2, 3] }
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    createdTournamentId = res.body.data.tournament.id;
    assert.ok(createdTournamentId);
  });

  it('Step 2: Admin creates participants', async () => {
    const p1Res = await request(app)
      .post(`/api/v1/tournaments/${createdTournamentId}/participants`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Alpha Competitor', seedNumber: 1 });
    assert.equal(p1Res.status, 201);
    participant1Id = p1Res.body.data.participant.id;

    const p2Res = await request(app)
      .post(`/api/v1/tournaments/${createdTournamentId}/participants`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Beta Competitor', seedNumber: 2 });
    assert.equal(p2Res.status, 201);
    participant2Id = p2Res.body.data.participant.id;
  });

  it('Step 3: Admin creates match with assigned participants', async () => {
    const matchRes = await request(app)
      .post(`/api/v1/tournaments/${createdTournamentId}/matches`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        matchNumber: 'M-FINAL-01',
        participantAId: participant1Id,
        participantBId: participant2Id
      });

    assert.equal(matchRes.status, 201);
    createdMatchId = matchRes.body.data.match.id;
    assert.equal(matchRes.body.data.match.status, 'SCHEDULED');
  });

  it('Step 4: Attempting to score a SCHEDULED match is rejected', async () => {
    const res = await request(app)
      .post(`/api/v1/matches/${createdMatchId}/score`)
      .set('Authorization', `Bearer ${scorekeeper1Token}`)
      .send({
        participantId: participant1Id,
        points: 1,
        idempotencyKey: uuidv4()
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'MATCH_NOT_LIVE');
  });

  it('Step 5: Move match to LIVE', async () => {
    const res = await request(app)
      .post(`/api/v1/matches/${createdMatchId}/start`)
      .set('Authorization', `Bearer ${scorekeeper1Token}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.match.status, 'LIVE');
  });

  let firstEventId;
  const duplicateTestKey = 'test-idempotency-' + Date.now();

  it('Step 6: Scorekeeper submits valid score (+1)', async () => {
    const res = await request(app)
      .post(`/api/v1/matches/${createdMatchId}/score`)
      .set('Authorization', `Bearer ${scorekeeper1Token}`)
      .send({
        participantId: participant1Id,
        points: 1,
        idempotencyKey: duplicateTestKey
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.isDuplicate, false);
    assert.equal(res.body.data.event.points, 1);
    firstEventId = res.body.data.event.id;

    // Verify participant score is now 1
    const p1 = res.body.data.match.participants.find(p => p.participant_id === participant1Id);
    assert.equal(p1.current_score, 1);

    // Verify audit log exists
    const auditRes = await query(
      `SELECT * FROM audit_logs WHERE action = 'SCORE_CREATED' AND target_entity_id = $1`,
      [createdMatchId]
    );
    assert.ok(auditRes.rows.length > 0);
  });

  it('Step 7: Submit same idempotency key again -> score is NOT doubled', async () => {
    const res = await request(app)
      .post(`/api/v1/matches/${createdMatchId}/score`)
      .set('Authorization', `Bearer ${scorekeeper1Token}`)
      .send({
        participantId: participant1Id,
        points: 1,
        idempotencyKey: duplicateTestKey
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.isDuplicate, true);
    const p1 = res.body.data.match.participants.find(p => p.participant_id === participant1Id);
    assert.equal(p1.current_score, 1); // Remains 1, not 2!
  });

  it('Step 8: Second scorekeeper submits concurrent score for Participant B (+2)', async () => {
    const res = await request(app)
      .post(`/api/v1/matches/${createdMatchId}/score`)
      .set('Authorization', `Bearer ${scorekeeper2Token}`)
      .send({
        participantId: participant2Id,
        points: 2,
        idempotencyKey: uuidv4()
      });

    assert.equal(res.status, 201);
    const p2 = res.body.data.match.participants.find(p => p.participant_id === participant2Id);
    assert.equal(p2.current_score, 2);
  });

  it('Step 9: Invalid score increment (+50) is rejected', async () => {
    const res = await request(app)
      .post(`/api/v1/matches/${createdMatchId}/score`)
      .set('Authorization', `Bearer ${scorekeeper1Token}`)
      .send({
        participantId: participant1Id,
        points: 50,
        idempotencyKey: uuidv4()
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'INVALID_SCORE_INCREMENT');
  });

  it('Step 10: Viewer attempting to score is rejected with 403 Forbidden', async () => {
    const res = await request(app)
      .post(`/api/v1/matches/${createdMatchId}/score`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        participantId: participant1Id,
        points: 1,
        idempotencyKey: uuidv4()
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  it('Step 11: Finish match and then Lock match', async () => {
    const finishRes = await request(app)
      .post(`/api/v1/matches/${createdMatchId}/finish`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(finishRes.status, 200);
    assert.equal(finishRes.body.data.match.status, 'FINISHED');

    const lockRes = await request(app)
      .post(`/api/v1/matches/${createdMatchId}/lock`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(lockRes.status, 200);
    assert.equal(lockRes.body.data.match.status, 'LOCKED');
  });

  it('Step 12: Attempting score on LOCKED match is rejected with 403 MATCH_LOCKED', async () => {
    const res = await request(app)
      .post(`/api/v1/matches/${createdMatchId}/score`)
      .set('Authorization', `Bearer ${scorekeeper1Token}`)
      .send({
        participantId: participant1Id,
        points: 1,
        idempotencyKey: uuidv4()
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'MATCH_LOCKED');
  });

  it('Step 13: Authorized correction with mandatory reason reverses points and preserves history', async () => {
    const res = await request(app)
      .post(`/api/v1/matches/${createdMatchId}/corrections`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        originalEventId: firstEventId,
        reason: 'Authorized correction: point awarded on incorrect call',
        idempotencyKey: uuidv4()
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.event.event_type, 'SCORE_CORRECTION');
    assert.equal(res.body.data.event.points, -1);
    assert.equal(res.body.data.event.references_event_id, firstEventId);

    // Verify original event is still present in database
    const origCheck = await query('SELECT * FROM score_events WHERE id = $1', [firstEventId]);
    assert.equal(origCheck.rows.length, 1);

    // Participant 1 score should now be 0 (1 - 1 = 0)
    const p1 = res.body.data.match.participants.find(p => p.participant_id === participant1Id);
    assert.equal(p1.current_score, 0);
  });

  it('Step 14: Score reconciliation reconstructs authoritative total from event history', async () => {
    const res = await request(app)
      .get(`/api/v1/matches/${createdMatchId}/reconcile`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.isConsistent, true);

    const p1Recon = res.body.data.participants.find(p => p.participant_id === participant1Id);
    assert.equal(p1Recon.materialized_score, 0);
    assert.equal(p1Recon.calculated_score_from_events, 0);

    const p2Recon = res.body.data.participants.find(p => p.participant_id === participant2Id);
    assert.equal(p2Recon.materialized_score, 2);
    assert.equal(p2Recon.calculated_score_from_events, 2);
  });
});
