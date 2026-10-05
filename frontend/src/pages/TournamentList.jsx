// frontend/src/pages/TournamentList.jsx
import React, { useState, useEffect } from 'react';
import { tournamentApi } from '../api/tournamentApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Button } from '../components/common/Button.jsx';
import { Alert } from '../components/common/StatusIndicator.jsx';
import { Dialog } from '../components/common/Dialog.jsx';

export function TournamentList({ onSelectTournament }) {
  const { isAdmin, isOfficial } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // New Tournament Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      const data = await tournamentApi.list();
      setTournaments(data.tournaments || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch tournaments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setCreating(true);
      await tournamentApi.create({ name: name.trim(), description: description.trim() });
      setName('');
      setDescription('');
      setIsModalOpen(false);
      await fetchTournaments();
    } catch (err) {
      setError(err.message || 'Failed to create tournament.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Tournaments</h1>
          <p style={{ color: 'var(--text-muted)' }}>Managed tournament brackets and official match groups</p>
        </div>
        {(isAdmin || isOfficial) && (
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>
            + Create Tournament
          </Button>
        )}
      </div>

      <Alert type="error" message={error} onClose={() => setError(null)} />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Loading tournaments...
        </div>
      ) : tournaments.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-subtle)' }}>
          No tournaments created yet.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.25rem' }}>
          {tournaments.map((t) => (
            <div key={t.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{t.name}</h3>
                  <span className={`badge badge-${t.status.toLowerCase()}`}>{t.status}</span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem', lineHeight: '1.4' }}>
                  {t.description || 'No description provided.'}
                </p>
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>
                  {t.match_count || 0} Matches • {t.participant_count || 0} Participants
                </span>
                <Button variant="secondary" size="sm" onClick={() => onSelectTournament(t.id)}>
                  View Tournament →
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Tournament Dialog */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Tournament"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreate} loading={creating}>
              Create Tournament
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label className="form-label" htmlFor="tournament-name">Tournament Name *</label>
            <input
              id="tournament-name"
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. City Open Table Tennis 2026"
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="tournament-desc">Description</label>
            <textarea
              id="tournament-desc"
              rows="3"
              className="form-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional tournament details, venue, or regulations..."
            />
          </div>
        </form>
      </Dialog>
    </div>
  );
}
