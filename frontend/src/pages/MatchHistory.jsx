// frontend/src/pages/MatchHistory.jsx
import React, { useState, useEffect } from 'react';
import { matchApi } from '../api/matchApi.js';
import { scoreApi } from '../api/scoreApi.js';
import { Button } from '../components/common/Button.jsx';
import { Alert } from '../components/common/StatusIndicator.jsx';

export function MatchHistory({ matchId, onBack }) {
  const [match, setMatch] = useState(null);
  const [events, setEvents] = useState([]);
  const [reconciliation, setReconciliation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadHistory() {
      try {
        setLoading(true);
        const [matchRes, eventsRes, reconRes] = await Promise.all([
          matchApi.getById(matchId),
          scoreApi.listEvents(matchId, { limit: 100 }),
          scoreApi.reconcile(matchId)
        ]);

        setMatch(matchRes.match);
        setEvents(eventsRes.events || []);
        setReconciliation(reconRes);
      } catch (err) {
        setError(err.message || 'Failed to load match history.');
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, [matchId]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
        Loading complete audit history...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Button variant="secondary" size="sm" onClick={onBack}>
            ← Back
          </Button>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
            Audit & Dispute History — Match #{match?.match_number}
          </h1>
        </div>
        <span className={`badge badge-${match?.status?.toLowerCase()}`}>
          {match?.status}
        </span>
      </div>

      <Alert type="error" message={error} onClose={() => setError(null)} />

      {/* Reconciliation Integrity Banner */}
      {reconciliation && (
        <div className="card" style={{ borderLeft: `4px solid ${reconciliation.isConsistent ? '#10b981' : '#ef4444'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <strong style={{ fontSize: '1.1rem', color: reconciliation.isConsistent ? '#10b981' : '#ef4444' }}>
                {reconciliation.isConsistent ? '✓ Full Cryptographic Event Sum Integrity Verified' : '⚠ Historical Inconsistency Detected!'}
              </strong>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Materialized match scores strictly match the deterministic cumulative sum of historical score events.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              {reconciliation.participants?.map((p) => (
                <div key={p.participant_id} style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>{p.participant_name}</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                    {p.materialized_score} pts
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Full Event Timeline */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Chronological Event Trail ({events.length} Events)</h2>
        </div>

        {events.length === 0 ? (
          <p style={{ color: 'var(--text-subtle)', fontStyle: 'italic', padding: '1rem 0' }}>
            No score events have been registered.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Timestamp</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Type</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Participant</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Points</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Scorekeeper / Actor</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Match Version</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Audit Reason / Notes</th>
                </tr>
              </thead>
              <tbody>
                {events.map((evt) => {
                  const isReversal = evt.event_type === 'SCORE_CORRECTION' || evt.event_type === 'SCORE_REVERSAL';

                  return (
                    <tr
                      key={evt.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        backgroundColor: isReversal ? 'rgba(239, 68, 68, 0.06)' : 'transparent'
                      }}
                    >
                      <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                        {new Date(evt.created_at).toLocaleString()}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <span className={`badge ${isReversal ? 'badge-locked' : 'badge-live'}`} style={{ fontSize: '0.7rem' }}>
                          {evt.event_type}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>{evt.participant_name}</td>
                      <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: evt.points > 0 ? '#10b981' : '#ef4444' }}>
                        {evt.points > 0 ? `+${evt.points}` : evt.points}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>{evt.actor_name}</td>
                      <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        v{evt.match_version_at_time}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', color: isReversal ? '#fca5a5' : 'var(--text-subtle)' }}>
                        {evt.reason || 'Standard score entry'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
