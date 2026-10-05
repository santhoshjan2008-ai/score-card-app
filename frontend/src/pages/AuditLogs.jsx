// frontend/src/pages/AuditLogs.jsx
import React, { useState, useEffect } from 'react';
import { auditApi } from '../api/auditApi.js';
import { Button } from '../components/common/Button.jsx';
import { Alert } from '../components/common/StatusIndicator.jsx';

export function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(0);
  const limit = 25;

  useEffect(() => {
    async function loadAuditLogs() {
      try {
        setLoading(true);
        const data = await auditApi.list({
          action: actionFilter || undefined,
          limit,
          offset: page * limit
        });
        setLogs(data.items || []);
        setTotal(data.total || 0);
      } catch (err) {
        setError(err.message || 'Failed to load audit logs.');
      } finally {
        setLoading(false);
      }
    }
    loadAuditLogs();
  }, [actionFilter, page]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>System Audit Trail</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Tamper-evident record of all logins, scores, corrections, and administrative modifications
          </p>
        </div>

        {/* Action Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label htmlFor="audit-filter" style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Action:</label>
          <select
            id="audit-filter"
            className="form-select"
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(0);
            }}
            style={{ width: '220px' }}
          >
            <option value="">All Audit Actions</option>
            <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
            <option value="LOGIN_FAILURE">LOGIN_FAILURE</option>
            <option value="SCORE_CREATED">SCORE_CREATED</option>
            <option value="SCORE_CORRECTED">SCORE_CORRECTED</option>
            <option value="MATCH_STARTED">MATCH_STARTED</option>
            <option value="MATCH_FINISHED">MATCH_FINISHED</option>
            <option value="MATCH_LOCKED">MATCH_LOCKED</option>
            <option value="MATCH_UNLOCKED">MATCH_UNLOCKED</option>
            <option value="TOURNAMENT_CREATED">TOURNAMENT_CREATED</option>
            <option value="USER_ROLE_CHANGED">USER_ROLE_CHANGED</option>
          </select>
        </div>
      </div>

      <Alert type="error" message={error} onClose={() => setError(null)} />

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            Loading audit records...
          </div>
        ) : logs.length === 0 ? (
          <p style={{ color: 'var(--text-subtle)', fontStyle: 'italic', padding: '2rem', textAlign: 'center' }}>
            No audit logs matching query.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Timestamp</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Actor</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Action</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Target</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Details / Reason</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const isScoreCorrection = log.action === 'SCORE_CORRECTED' || log.action === 'MATCH_LOCKED' || log.action === 'MATCH_UNLOCKED';

                  return (
                    <tr
                      key={log.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        backgroundColor: isScoreCorrection ? 'rgba(245, 158, 11, 0.05)' : 'transparent'
                      }}
                    >
                      <td style={{ padding: '0.65rem 0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td style={{ padding: '0.65rem 0.5rem' }}>
                        <strong>{log.actor_name || 'System / Unauth'}</strong>
                        {log.actor_role && <span className="badge badge-role" style={{ marginLeft: '0.4rem', fontSize: '0.65rem' }}>{log.actor_role}</span>}
                      </td>
                      <td style={{ padding: '0.65rem 0.5rem' }}>
                        <span className="badge badge-role" style={{ fontWeight: 700 }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem 0.5rem', color: 'var(--text-muted)' }}>
                        {log.target_entity_type}: {log.target_entity_id?.substring(0, 14)}...
                      </td>
                      <td style={{ padding: '0.65rem 0.5rem', color: 'var(--text-main)' }}>
                        {log.reason ? (
                          <em>"{log.reason}"</em>
                        ) : log.payload_after ? (
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {JSON.stringify(log.payload_after).slice(0, 60)}...
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Showing {logs.length} of {total} records
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button
              variant="secondary"
              size="sm"
              disabled={page === 0 || loading}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={(page + 1) * limit >= total || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
