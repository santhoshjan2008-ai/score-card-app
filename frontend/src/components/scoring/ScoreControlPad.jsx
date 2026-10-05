// frontend/src/components/scoring/ScoreControlPad.jsx
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { Button } from '../common/Button.jsx';

export function ScoreControlPad({ match, onScoreClick, isScoringDisabled }) {
  const { isViewer } = useAuth();
  const [inFlightParticipantId, setInFlightParticipantId] = useState(null);

  const participants = match?.participants || [];
  const partA = participants.find((p) => p.slot === 'A') || { name: 'Player A', current_score: 0 };
  const partB = participants.find((p) => p.slot === 'B') || { name: 'Player B', current_score: 0 };

  const handleScore = async (participantId, points) => {
    if (isScoringDisabled || isViewer || inFlightParticipantId) return;

    setInFlightParticipantId(participantId);
    try {
      await onScoreClick(participantId, points);
    } finally {
      // Short delay before re-enabling to prevent accidental double taps
      setTimeout(() => {
        setInFlightParticipantId(null);
      }, 250);
    }
  };

  const isLive = match?.status === 'LIVE';

  return (
    <div className="scoreboard-grid">
      {/* Participant A Card */}
      <div className="participant-score-card slot-a">
        <span className="participant-slot-label">Slot A • Seed #{partA.seed_number || '-'}</span>
        <h2 className="participant-name">{partA.name}</h2>
        <div className="score-display-number" aria-live="polite" aria-atomic="true">
          {partA.current_score}
        </div>

        <div className="score-action-buttons">
          {[1, 2, 3].map((pts) => (
            <Button
              key={`slotA_${pts}`}
              variant="primary"
              className="btn-score-increment"
              disabled={!isLive || isScoringDisabled || isViewer || inFlightParticipantId !== null}
              loading={inFlightParticipantId === partA.participant_id}
              onClick={() => handleScore(partA.participant_id, pts)}
              aria-label={`Add ${pts} point${pts > 1 ? 's' : ''} to ${partA.name}`}
            >
              +{pts}
            </Button>
          ))}
        </div>
      </div>

      {/* Participant B Card */}
      <div className="participant-score-card slot-b">
        <span className="participant-slot-label">Slot B • Seed #{partB.seed_number || '-'}</span>
        <h2 className="participant-name">{partB.name}</h2>
        <div className="score-display-number" aria-live="polite" aria-atomic="true">
          {partB.current_score}
        </div>

        <div className="score-action-buttons">
          {[1, 2, 3].map((pts) => (
            <Button
              key={`slotB_${pts}`}
              variant="primary"
              className="btn-score-increment"
              style={{ backgroundColor: '#7c3aed', borderColor: '#7c3aed' }}
              disabled={!isLive || isScoringDisabled || isViewer || inFlightParticipantId !== null}
              loading={inFlightParticipantId === partB.participant_id}
              onClick={() => handleScore(partB.participant_id, pts)}
              aria-label={`Add ${pts} point${pts > 1 ? 's' : ''} to ${partB.name}`}
            >
              +{pts}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
