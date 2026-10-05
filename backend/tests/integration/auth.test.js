// backend/tests/integration/auth.test.js
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { initDb, closeDb } from '../../src/config/db.js';
import { runMigrations } from '../../src/database/migrate.js';
import { seedDevData } from '../../src/database/seed.js';

describe('Authentication & Authorization Integration Tests', () => {
  let app;

  before(async () => {
    await initDb();
    await runMigrations();
    await seedDevData();
    app = createApp();
  });

  after(async () => {
    await closeDb();
  });

  it('POST /api/v1/auth/login succeeds with valid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ usernameOrEmail: 'scorekeeper1', password: 'password123!' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.username, 'scorekeeper1');
    assert.equal(res.body.data.user.role, 'SCOREKEEPER');
    assert.ok(res.body.data.token);
    assert.equal(res.body.data.user.password_hash, undefined); // Never return password hash
  });

  it('POST /api/v1/auth/login rejects invalid password with generic error', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ usernameOrEmail: 'scorekeeper1', password: 'wrongpassword' });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'INVALID_CREDENTIALS');
    assert.equal(res.body.error.message, 'Invalid username/email or password.');
  });

  it('POST /api/v1/auth/login rejects non-existent user with identical generic error', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ usernameOrEmail: 'unknown_user_123', password: 'wrongpassword' });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'INVALID_CREDENTIALS');
  });

  it('GET /api/v1/auth/me rejects unauthenticated requests', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me');

    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'UNAUTHORIZED');
  });

  it('GET /api/v1/users enforces ADMIN role and rejects SCOREKEEPER', async () => {
    // 1. Login as scorekeeper
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ usernameOrEmail: 'scorekeeper1', password: 'password123!' });
    const token = loginRes.body.data.token;

    // 2. Try to access user list
    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });
});
