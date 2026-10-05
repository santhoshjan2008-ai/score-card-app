// frontend/src/components/layout/Navbar.jsx
import React from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useConnectivity } from '../../context/ConnectivityContext.jsx';

export function Navbar({ activeTab, onSelectTab }) {
  const { user, logout, isAdmin, isOfficial } = useAuth();
  const { isFullyConnected } = useConnectivity();

  return (
    <header className="navbar">
      <div className="nav-brand" onClick={() => onSelectTab('dashboard')}>
        <span>ScoreDesk</span>
        <span className="brand-badge">Audit Live</span>
      </div>

      <nav className="nav-links" aria-label="Main Navigation">
        <button
          type="button"
          className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => onSelectTab('dashboard')}
        >
          Dashboard
        </button>
        <button
          type="button"
          className={`nav-item ${activeTab === 'tournaments' ? 'active' : ''}`}
          onClick={() => onSelectTab('tournaments')}
        >
          Tournaments
        </button>
        {(isAdmin || isOfficial) && (
          <button
            type="button"
            className={`nav-item ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => onSelectTab('audit')}
          >
            Audit Log
          </button>
        )}
        {isAdmin && (
          <button
            type="button"
            className={`nav-item ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => onSelectTab('users')}
          >
            Users & Roles
          </button>
        )}
      </nav>

      <div className="nav-user-panel">
        <span
          title={isFullyConnected ? 'System Online' : 'Network Issues'}
          style={{
            display: 'inline-block',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: isFullyConnected ? '#10b981' : '#ef4444'
          }}
        />
        {user ? (
          <>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <strong>{user.username}</strong>
            </span>
            <span className="badge badge-role">{user.role}</span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={logout}
              style={{ padding: '0.3rem 0.65rem', minHeight: 'unset' }}
            >
              Logout
            </button>
          </>
        ) : (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => onSelectTab('login')}
            style={{ minHeight: 'unset' }}
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  );
}
