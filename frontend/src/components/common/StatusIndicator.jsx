// frontend/src/components/common/StatusIndicator.jsx
import React from 'react';
import { useConnectivity } from '../../context/ConnectivityContext.jsx';

export function StatusIndicator({ saveStatus, matchStatus }) {
  const { isFullyConnected, isBrowserOnline } = useConnectivity();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
      {/* Network Connectivity Indicator */}
      {!isBrowserOnline ? (
        <span className="badge badge-locked" style={{ backgroundColor: 'var(--status-rejected-bg)', color: '#ef4444' }}>
          ● BROWSER OFFLINE
        </span>
      ) : !isFullyConnected ? (
        <span className="badge badge-scheduled" style={{ backgroundColor: 'var(--status-pending-bg)', color: '#f59e0b' }}>
          ▲ SERVER DISCONNECTED
        </span>
      ) : (
        <span className="badge badge-live">
          ● ONLINE
        </span>
      )}

      {/* Save / Sync feedback */}
      {saveStatus === 'SAVING' && (
        <span className="badge badge-scheduled">
          SYNCING...
        </span>
      )}
      {saveStatus === 'CONFIRMED' && (
        <span className="badge badge-live">
          ✓ CONFIRMED
        </span>
      )}
      {saveStatus === 'REJECTED' && (
        <span className="badge" style={{ backgroundColor: 'var(--status-rejected-bg)', color: '#ef4444' }}>
          ✕ REJECTED
        </span>
      )}

      {/* Match Status Badge */}
      {matchStatus && (
        <span className={`badge badge-${matchStatus.toLowerCase()}`}>
          {matchStatus}
        </span>
      )}
    </div>
  );
}

export function Alert({ type = 'info', message, onClose }) {
  if (!message) return null;
  const isErr = type === 'error';
  const isWarn = type === 'warning';
  const isSuccess = type === 'success';

  const borderColor = isErr ? '#ef4444' : isWarn ? '#f59e0b' : isSuccess ? '#10b981' : '#3b82f6';
  const bgColor = isErr
    ? 'rgba(239, 68, 68, 0.12)'
    : isWarn
    ? 'rgba(245, 158, 11, 0.12)'
    : isSuccess
    ? 'rgba(16, 185, 129, 0.12)'
    : 'rgba(59, 130, 246, 0.12)';

  return (
    <div
      role="alert"
      style={{
        padding: '0.85rem 1.15rem',
        borderRadius: 'var(--radius-sm)',
        borderLeft: `4px solid ${borderColor}`,
        backgroundColor: bgColor,
        color: '#ffffff',
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem'
      }}
    >
      <div style={{ fontSize: '0.9rem', lineHeight: 1.4 }}>{message}</div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '1rem',
            padding: '0.2rem'
          }}
          aria-label="Dismiss alert"
        >
          ✕
        </button>
      )}
    </div>
  );
}
