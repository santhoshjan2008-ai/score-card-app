// frontend/src/components/scoring/RecentEventsTimeline.jsx
import React from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { Button } from '../common/Button.jsx';

export function RecentEventsTimeline({ events = [], onInitiateCorrection, matchLocked }) {
  const { isOfficial, isAdmin } = useAuth();
  const canCorrect = (isOfficial || isAdmin) && !matchLocked;

  if (!events || events.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-subtle)', fontStyle: 'italic' }}>
        No score events recorded yet for this match.
      </div>
    );
  }

  return (
    <div className="timeline-list">
      {events.map((evt) => {
        const isCorrection = evt.event_type === 'SCORE_CORRECTION' || evt.event_type === 'SCORE_REVERSAL';
        const formattedTime = new Date(evt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        return (
          <div key={evt.id} className={`timeline-item ${isCorrection ? 'correction' : ''}`}>
            <div>
              <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>{evt.participant_name}</span>
                <span
                  style={{
                    color: evt.points > 0 ? '#10b981' : '#ef4444',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700
                  }}
                >
                  {evt.points > 0 ? `+${evt.points}` : evt.points}
                </span>
                {isCorrection && (
                  <span className="badge badge-locked" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                    CORRECTION
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                By: <strong>{evt.actor_name}</strong> • {formattedTime}
                {evt.reason && <span> • <em>"{evt.reason}"</em></span>}
              </div>
            </div>

            {canCorrect && !isCorrection && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onInitiateCorrection(evt)}
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', minHeight: 'unset' }}
                aria-label={`Correct event for ${evt.participant_name}`}
              >
                Correct
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
