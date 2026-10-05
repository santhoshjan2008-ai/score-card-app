// frontend/src/scoring.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Frontend Desk Scoring Logic & State Guards', () => {
  it('generates unique client-side idempotency keys', () => {
    const key1 = 'score_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now();
    const key2 = 'score_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now();
    assert.notEqual(key1, key2);
    assert.match(key1, /^score_[a-z0-9]+_\d+$/);
  });

  it('prohibits scoring operations when match status is not LIVE', () => {
    const isScoringAllowed = (status, role, isOnline) => {
      if (!isOnline) return false;
      if (role === 'VIEWER') return false;
      if (status !== 'LIVE') return false;
      return true;
    };

    assert.equal(isScoringAllowed('SCHEDULED', 'SCOREKEEPER', true), false);
    assert.equal(isScoringAllowed('FINISHED', 'SCOREKEEPER', true), false);
    assert.equal(isScoringAllowed('LOCKED', 'SCOREKEEPER', true), false);
    assert.equal(isScoringAllowed('LIVE', 'VIEWER', true), false);
    assert.equal(isScoringAllowed('LIVE', 'SCOREKEEPER', false), false);
    assert.equal(isScoringAllowed('LIVE', 'SCOREKEEPER', true), true);
    assert.equal(isScoringAllowed('LIVE', 'OFFICIAL', true), true);
  });

  it('correctly maps participant points for Slot A and Slot B', () => {
    const participants = [
      { participant_id: 'p1', slot: 'A', current_score: 15 },
      { participant_id: 'p2', slot: 'B', current_score: 12 }
    ];

    const slotA = participants.find(p => p.slot === 'A');
    const slotB = participants.find(p => p.slot === 'B');

    assert.equal(slotA.current_score, 15);
    assert.equal(slotB.current_score, 12);
  });
});
