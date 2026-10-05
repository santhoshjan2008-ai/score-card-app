// frontend/src/api/tournamentApi.js
import { apiRequest } from './client.js';

export const tournamentApi = {
  list: () => apiRequest('/tournaments'),
  getById: (id) => apiRequest(`/tournaments/${id}`),
  create: (data) => apiRequest('/tournaments', { method: 'POST', body: data }),
  updateStatus: (id, status) => apiRequest(`/tournaments/${id}/status`, { method: 'PATCH', body: { status } }),
  listParticipants: (id) => apiRequest(`/tournaments/${id}/participants`),
  addParticipant: (id, data) => apiRequest(`/tournaments/${id}/participants`, { method: 'POST', body: data })
};
