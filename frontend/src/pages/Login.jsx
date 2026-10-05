// frontend/src/pages/Login.jsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { Button } from '../components/common/Button.jsx';
import { Alert } from '../components/common/StatusIndicator.jsx';

export function Login({ onSuccess }) {
  const { login } = useAuth();
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!usernameOrEmail || !password) {
      setError('Please enter both username/email and password.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await login(usernameOrEmail, password);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (user, pass) => {
    setUsernameOrEmail(user);
    setPassword(pass);
    try {
      setLoading(true);
      setError(null);
      await login(user, pass);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || 'Quick login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '440px', margin: '3rem auto' }}>
      <div className="card" style={{ padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Desk Operator Login</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Auditable Tournament Scoring System
          </p>
        </div>

        <Alert type="error" message={error} onClose={() => setError(null)} />

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="login-username">Username or Email</label>
            <input
              id="login-username"
              type="text"
              className="form-input"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              placeholder="e.g. scorekeeper1"
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            style={{ width: '100%', marginTop: '0.5rem' }}
            loading={loading}
          >
            Sign In to Desk
          </Button>
        </form>

        <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', textAlign: 'center', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Quick Development Logins
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => quickLogin('scorekeeper1', 'password123!')}
              disabled={loading}
            >
              Scorekeeper 1
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => quickLogin('official', 'password123!')}
              disabled={loading}
            >
              Official
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => quickLogin('admin', 'password123!')}
              disabled={loading}
            >
              Administrator
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => quickLogin('viewer', 'password123!')}
              disabled={loading}
            >
              Viewer (Read-Only)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
