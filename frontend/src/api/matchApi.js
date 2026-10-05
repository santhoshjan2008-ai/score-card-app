// frontend/src/api/matchApi.js
import { apiRequest } from './client.js';

export const matchApi = {
  listByTournament: (tournamentId) => apiRequest(`/tournaments/${tournamentId}/matches`),
  getById: (id) => apiRequest(`/matches/${id}`),
  create: (tournamentId, data) => apiRequest(`/tournaments/${tournamentId}/matches`, { method: 'POST', body: data }),
  start: (id) => apiRequest(`/matches/${id}/start`, { method: 'POST' }),
  finish: (id) => apiRequest(`/matches/${id}/finish`, { method: 'POST' }),
  lock: (id) => apiRequest(`/matches/${id}/lock`, { method: 'POST' }),
  unlock: (id, reason) => apiRequest(`/matches/${id}/unlock`, { method: 'POST', body: { reason } })
};
