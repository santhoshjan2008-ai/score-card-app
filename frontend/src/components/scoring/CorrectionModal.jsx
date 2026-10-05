// frontend/src/components/scoring/CorrectionModal.jsx
import React, { useState } from 'react';
import { Dialog } from '../common/Dialog.jsx';
import { Button } from '../common/Button.jsx';
import { Alert } from '../common/StatusIndicator.jsx';

export function CorrectionModal({ isOpen, onClose, originalEvent, onConfirmCorrection }) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!originalEvent) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason || reason.trim().length < 4) {
      setError('Please provide a descriptive reason for this official score correction (min 4 characters).');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onConfirmCorrection({
        originalEventId: originalEvent.id,
        reason: reason.trim()
      });
      setReason('');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to submit score correction.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Official Score Correction"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleSubmit} loading={submitting}>
            Apply Auditable Correction
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <Alert type="error" message={error} onClose={() => setError(null)} />

        <div style={{ background: 'var(--bg-elevated)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Target Score Event:</div>
          <div style={{ fontWeight: '600', marginTop: '0.2rem' }}>
            {originalEvent.participant_name} ({originalEvent.points > 0 ? `+${originalEvent.points}` : originalEvent.points} pts)
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: '0.2rem' }}>
            Recorded by: {originalEvent.actor_name} at {new Date(originalEvent.created_at).toLocaleTimeString()}
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            <strong>Integrity Notice:</strong> The original event will <em>not</em> be deleted from the database. A linked reversal event will be created and permanently audited.
          </p>
        </div>

        <div className="form-group">
          <label htmlFor="correction-reason" className="form-label">
            Official Reason for Correction <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <textarea
            id="correction-reason"
            rows="3"
            className="form-textarea"
            placeholder="e.g. Line judge confirmed shot was out; scorekeeper accidental misclick"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            autoFocus
          />
        </div>
      </form>
    </Dialog>
  );
}
