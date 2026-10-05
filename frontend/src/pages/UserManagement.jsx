// frontend/src/pages/UserManagement.jsx
import React, { useState, useEffect } from 'react';
import { userApi } from '../api/auditApi.js';
import { Button } from '../components/common/Button.jsx';
import { Alert } from '../components/common/StatusIndicator.jsx';

export function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await userApi.list();
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    try {
      setError(null);
      setSuccess(null);
      await userApi.updateRole(userId, newRole);
      setSuccess(`User role successfully changed to ${newRole}.`);
      await fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to update user role.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>User & Role Administration</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Manage tournament staff roles and permissions. Role changes are immediately enforced and audited.
        </p>
      </div>

      <Alert type="error" message={error} onClose={() => setError(null)} />
      <Alert type="success" message={success} onClose={() => setSuccess(null)} />

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            Loading users...
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Username</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Email</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Current Role</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Modify Role Assignment</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>{u.username}</td>
                    <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>{u.email}</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <span className="badge badge-role">{u.role}</span>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <select
                        aria-label={`Role for ${u.username}`}
                        className="form-select"
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        style={{ width: '180px', padding: '0.35rem 0.5rem', fontSize: '0.85rem' }}
                      >
                        <option value="ADMIN">ADMIN</option>
                        <option value="OFFICIAL">OFFICIAL</option>
                        <option value="SCOREKEEPER">SCOREKEEPER</option>
                        <option value="VIEWER">VIEWER</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
