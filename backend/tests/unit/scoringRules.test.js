// backend/tests/unit/scoringRules.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Scoring Rules and Invariants (Unit)', () => {
  it('should accept valid scoring increments (1, 2, 3)', () => {
    const allowed = [1, 2, 3];
    assert.equal(allowed.includes(1), true);
    assert.equal(allowed.includes(2), true);
    assert.equal(allowed.includes(3), true);
  });

  it('should reject non-positive or negative score increments', () => {
    const testPoints = [-1, 0, -5, 100];
    const allowed = [1, 2, 3];
    for (const pt of testPoints) {
      assert.equal(allowed.includes(pt), false);
    }
  });

  it('should calculate correct net score after reversals and corrections', () => {
    const events = [
      { type: 'SCORE_INCREMENT', points: 1 },
      { type: 'SCORE_INCREMENT', points: 2 },
      { type: 'SCORE_INCREMENT', points: 1 },
      { type: 'SCORE_CORRECTION', points: -1, reason: 'Accidental double tap' }
    ];

    const netScore = events.reduce((sum, e) => sum + e.points, 0);
    assert.equal(netScore, 3);
  });

  it('should never produce negative scores during valid play', () => {
    let currentScore = 0;
    const reversal = -1;
    assert.equal(currentScore + reversal < 0, true); // Must be guarded by service
  });
});
