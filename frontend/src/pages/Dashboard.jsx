// frontend/src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { tournamentApi } from '../api/tournamentApi.js';
import { matchApi } from '../api/matchApi.js';
import { Button } from '../components/common/Button.jsx';
import { Alert } from '../components/common/StatusIndicator.jsx';

export function Dashboard({ onNavigateToScoring, onNavigateToMatchHistory }) {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const tourneyRes = await tournamentApi.list();
        setTournaments(tourneyRes.tournaments || []);

        if (tourneyRes.tournaments && tourneyRes.tournaments.length > 0) {
          const firstTourney = tourneyRes.tournaments[0];
          const matchRes = await matchApi.listByTournament(firstTourney.id);
          setMatches(matchRes.matches || []);
        }
      } catch (err) {
        setError(err.message || 'Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const liveMatches = matches.filter((m) => m.status === 'LIVE');
  const scheduledMatches = matches.filter((m) => m.status === 'SCHEDULED');
  const finishedMatches = matches.filter((m) => m.status === 'FINISHED' || m.status === 'LOCKED');

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
        Loading tournament scoring desk...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Welcome Banner */}
      <div className="card" style={{ background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.15), rgba(124, 58, 237, 0.15))' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Desk Scoring Control Center</h1>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Logged in as <strong>{user?.username}</strong> • Role: <span className="badge badge-role">{user?.role}</span>
            </p>
          </div>
          <div>
            <span className="badge badge-live" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
              ACID Transactional Engine Active
            </span>
          </div>
        </div>
      </div>

      <Alert type="error" message={error} onClose={() => setError(null)} />

      {/* Live Matches Section */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#10b981' }}>●</span> Live Matches Ready for Scoring
          </h2>
          <span className="badge badge-live">{liveMatches.length} Live</span>
        </div>

        {liveMatches.length === 0 ? (
          <p style={{ color: 'var(--text-subtle)', fontStyle: 'italic', padding: '1rem 0' }}>
            No live matches currently in progress. Start a scheduled match below.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1rem' }}>
            {liveMatches.map((m) => {
              const partA = m.participants?.find((p) => p.slot === 'A') || {};
              const partB = m.participants?.find((p) => p.slot === 'B') || {};

              return (
                <div key={m.id} className="card" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-bright)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <strong style={{ fontSize: '1.1rem' }}>Match {m.match_number}</strong>
                    <span className="badge badge-live">LIVE</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1rem 0' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{partA.name || 'Slot A'}</div>
                      <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#3b82f6' }}>
                        {partA.current_score || 0}
                      </div>
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-subtle)', padding: '0 1rem' }}>
                      VS
                    </div>
                    <div style={{ flex: 1, textAlign: 'right' }}>
                      <div style={{ fontWeight: 600 }}>{partB.name || 'Slot B'}</div>
                      <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#8b5cf6' }}>
                        {partB.current_score || 0}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                    <Button
                      variant="primary"
                      style={{ flex: 1 }}
                      onClick={() => onNavigateToScoring(m.id)}
                    >
                      Open Live Scoring Pad
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => onNavigateToMatchHistory(m.id)}
                    >
                      History
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Scheduled & Finalized Matches */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
        {/* Scheduled Matches */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Scheduled Matches</h3>
            <span className="badge badge-scheduled">{scheduledMatches.length}</span>
          </div>
          {scheduledMatches.map((m) => (
            <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <strong>Match {m.match_number}</strong>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {m.participants?.[0]?.name} vs {m.participants?.[1]?.name}
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onNavigateToScoring(m.id)}
              >
                Inspect
              </Button>
            </div>
          ))}
        </div>

        {/* Locked / Finished Matches */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Finalized & Locked Results</h3>
            <span className="badge badge-locked">{finishedMatches.length}</span>
          </div>
          {finishedMatches.map((m) => (
            <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <strong>Match {m.match_number}</strong>
                  <span className={`badge badge-${m.status.toLowerCase()}`}>{m.status}</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {m.participants?.[0]?.name} ({m.participants?.[0]?.current_score}) - {m.participants?.[1]?.name} ({m.participants?.[1]?.current_score})
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onNavigateToMatchHistory(m.id)}
              >
                Audit
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
