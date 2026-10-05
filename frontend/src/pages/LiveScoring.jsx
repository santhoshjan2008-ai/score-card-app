// frontend/src/pages/LiveScoring.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { matchApi } from '../api/matchApi.js';
import { scoreApi } from '../api/scoreApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useConnectivity } from '../context/ConnectivityContext.jsx';
import { ScoreControlPad } from '../components/scoring/ScoreControlPad.jsx';
import { RecentEventsTimeline } from '../components/scoring/RecentEventsTimeline.jsx';
import { CorrectionModal } from '../components/scoring/CorrectionModal.jsx';
import { StatusIndicator, Alert } from '../components/common/StatusIndicator.jsx';
import { Button } from '../components/common/Button.jsx';
import { Dialog } from '../components/common/Dialog.jsx';

export function LiveScoring({ matchId, onBack, onNavigateToHistory }) {
  const { isOfficial, isAdmin, isViewer } = useAuth();
  const { isFullyConnected, markSyncSuccess } = useConnectivity();

  const [match, setMatch] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saveStatus, setSaveStatus] = useState('CONFIRMED'); // 'SAVING' | 'CONFIRMED' | 'REJECTED'

  // Modals state
  const [correctionTargetEvent, setCorrectionTargetEvent] = useState(null);
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [reconciliationStatus, setReconciliationStatus] = useState(null);

  const fetchMatchDetails = useCallback(async () => {
    try {
      const matchData = await matchApi.getById(matchId);
      setMatch(matchData.match);

      const eventsData = await scoreApi.listEvents(matchId, { limit: 25 });
      setEvents(eventsData.events || []);

      markSyncSuccess();
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to synchronize match data.');
    } finally {
      setLoading(false);
    }
  }, [matchId, markSyncSuccess]);

  useEffect(() => {
    fetchMatchDetails();
    const interval = setInterval(fetchMatchDetails, 8000); // Polling for desk updates
    return () => clearInterval(interval);
  }, [fetchMatchDetails]);

  // Scoring Handler with Client-Side Debouncing & Idempotency Key
  const handleScore = async (participantId, points) => {
    if (!match || match.status !== 'LIVE') return;

    // Generate unique client-side idempotency key (UUID)
    const idempotencyKey = 'score_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now();
    const expectedVersion = match.version;

    setSaveStatus('SAVING');
    setError(null);

    try {
      const result = await scoreApi.submitScore(matchId, {
        participantId,
        points,
        idempotencyKey,
        expectedVersion
      });

      // Update authoritative match state from server response
      setMatch(result.match);
      setEvents((prev) => [result.event, ...prev]);
      setSaveStatus('CONFIRMED');
      markSyncSuccess();
    } catch (err) {
      setSaveStatus('REJECTED');

      if (err.code === 'STALE_VERSION') {
        setError('Match version conflict detected! Refreshing latest authoritative state...');
        await fetchMatchDetails();
      } else {
        setError(err.message || 'Scoring command rejected by server.');
      }
    }
  };

  // Official Correction Handler
  const handleConfirmCorrection = async ({ originalEventId, reason }) => {
    const idempotencyKey = 'corr_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now();
    setSaveStatus('SAVING');

    try {
      const result = await scoreApi.correctScore(matchId, {
        originalEventId,
        reason,
        idempotencyKey
      });

      setMatch(result.match);
      setEvents((prev) => [result.event, ...prev]);
      setSaveStatus('CONFIRMED');
      markSyncSuccess();
    } catch (err) {
      setSaveStatus('REJECTED');
      throw err;
    }
  };

  // Status transitions
  const handleStartMatch = async () => {
    try {
      setActionLoading(true);
      const res = await matchApi.start(matchId);
      setMatch(res.match);
    } catch (err) {
      setError(err.message || 'Failed to start match.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinishMatch = async () => {
    try {
      setActionLoading(true);
      const res = await matchApi.finish(matchId);
      setMatch(res.match);
    } catch (err) {
      setError(err.message || 'Failed to finish match.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLockMatch = async () => {
    if (!window.confirm('Lock this match? Normal scorekeepers will no longer be able to modify scores.')) {
      return;
    }
    try {
      setActionLoading(true);
      const res = await matchApi.lock(matchId);
      setMatch(res.match);
    } catch (err) {
      setError(err.message || 'Failed to lock match.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnlockMatch = async () => {
    if (!unlockReason || unlockReason.trim().length < 5) {
      setError('An explanatory reason is mandatory to unlock an official match.');
      return;
    }
    try {
      setActionLoading(true);
      const res = await matchApi.unlock(matchId, unlockReason.trim());
      setMatch(res.match);
      setUnlockModalOpen(false);
      setUnlockReason('');
    } catch (err) {
      setError(err.message || 'Failed to unlock match.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRunReconciliation = async () => {
    try {
      const res = await scoreApi.reconcile(matchId);
      setReconciliationStatus(res);
    } catch (err) {
      setError('Reconciliation check failed: ' + err.message);
    }
  };

  if (loading && !match) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
        Synchronizing official match scoring desk...
      </div>
    );
  }

  const isLocked = match?.status === 'LOCKED';
  const isFinished = match?.status === 'FINISHED';
  const isScheduled = match?.status === 'SCHEDULED';
  const isLive = match?.status === 'LIVE';

  return (
    <div className="scoring-screen">
      {/* Top Navigation & Status Bar */}
      <div className="match-status-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Button variant="secondary" size="sm" onClick={onBack}>
            ← Back
          </Button>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', textTransform: 'uppercase' }}>
              {match.tournament_name || 'Tournament'}
            </span>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
              Match #{match.match_number}
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <StatusIndicator saveStatus={saveStatus} matchStatus={match.status} />

          {/* Lifecycle Action Buttons */}
          {isScheduled && (isOfficial || isAdmin) && (
            <Button variant="success" size="sm" onClick={handleStartMatch} loading={actionLoading}>
              Start Match (Set LIVE)
            </Button>
          )}

          {isLive && (isOfficial || isAdmin) && (
            <Button variant="warning" size="sm" onClick={handleFinishMatch} loading={actionLoading}>
              Finish Match
            </Button>
          )}

          {isFinished && (isOfficial || isAdmin) && (
            <Button variant="danger" size="sm" onClick={handleLockMatch} loading={actionLoading}>
              Lock Official Result
            </Button>
          )}

          {isLocked && isAdmin && (
            <Button variant="secondary" size="sm" onClick={() => setUnlockModalOpen(true)}>
              Unlock (Admin)
            </Button>
          )}
        </div>
      </div>

      <Alert type="error" message={error} onClose={() => setError(null)} />

      {/* Locked Match Banner */}
      {isLocked && (
        <div
          style={{
            background: 'var(--status-locked-bg)',
            border: '1px solid var(--status-locked)',
            color: '#d8b4fe',
            padding: '0.85rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <strong>🔒 Match Locked & Finalized:</strong> Normal scorekeeping is disabled. All scoring commands will be rejected by backend invariants.
          </div>
          {match.locked_by_username && (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Locked by: {match.locked_by_username}
            </span>
          )}
        </div>
      )}

      {/* Main Score Control Pad */}
      <ScoreControlPad
        match={match}
        onScoreClick={handleScore}
        isScoringDisabled={!isLive || !isFullyConnected || isLocked}
      />

      {/* Bottom Grid: Recent Events and Reconciliation Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.25rem' }}>
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Recent Authoritative Score Events</h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button variant="secondary" size="sm" onClick={() => onNavigateToHistory(matchId)}>
                View Full Audit History
              </Button>
            </div>
          </div>

          <RecentEventsTimeline
            events={events}
            onInitiateCorrection={(evt) => setCorrectionTargetEvent(evt)}
            matchLocked={isLocked}
          />
        </div>

        {/* Dispute & State Integrity Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ fontSize: '1rem' }}>Dispute & Audit Verification</h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: '1.4' }}>
            Authoritative scores are derived from verifiable events. Officials can verify that materialized totals strictly match event history.
          </p>

          <Button
            variant="secondary"
            style={{ width: '100%', marginBottom: '1rem' }}
            onClick={handleRunReconciliation}
          >
            Run Reconciliation Check
          </Button>

          {reconciliationStatus && (
            <div style={{ background: 'var(--bg-elevated)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
              <div style={{ fontWeight: 700, color: reconciliationStatus.isConsistent ? '#10b981' : '#ef4444', marginBottom: '0.5rem' }}>
                {reconciliationStatus.isConsistent ? '✓ Integrity Verified: 100% Consistent' : '⚠ Inconsistency Detected!'}
              </div>
              {reconciliationStatus.participants?.map((p) => (
                <div key={p.participant_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0' }}>
                  <span>{p.participant_name}:</span>
                  <strong>{p.materialized_score} pts (Sum: {p.calculated_score_from_events})</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Official Correction Dialog */}
      <CorrectionModal
        isOpen={Boolean(correctionTargetEvent)}
        originalEvent={correctionTargetEvent}
        onClose={() => setCorrectionTargetEvent(null)}
        onConfirmCorrection={handleConfirmCorrection}
      />

      {/* Admin Unlock Dialog */}
      <Dialog
        isOpen={unlockModalOpen}
        onClose={() => setUnlockModalOpen(false)}
        title="Admin Match Unlock Authorization"
        footer={
          <>
            <Button variant="secondary" onClick={() => setUnlockModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleUnlockMatch} loading={actionLoading}>
              Confirm Unlock & Audit
            </Button>
          </>
        }
      >
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Unlocking a locked match reopens it for official review. An explicit reason is required and will be permanently recorded in the audit log.
        </p>
        <div className="form-group">
          <label className="form-label" htmlFor="unlock-reason">
            Mandatory Reason for Unlock <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <textarea
            id="unlock-reason"
            rows="3"
            className="form-textarea"
            placeholder="e.g. Committee resolution regarding protest on final set"
            value={unlockReason}
            onChange={(e) => setUnlockReason(e.target.value)}
            required
            autoFocus
          />
        </div>
      </Dialog>
    </div>
  );
}
