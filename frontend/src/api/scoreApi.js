// frontend/src/api/scoreApi.js
import { apiRequest } from './client.js';

export const scoreApi = {
  submitScore: (matchId, { participantId, points, idempotencyKey, expectedVersion }) =>
    apiRequest(`/matches/${matchId}/score`, {
      method: 'POST',
      body: { participantId, points, idempotencyKey, expectedVersion }
    }),

  correctScore: (matchId, { originalEventId, reason, idempotencyKey }) =>
    apiRequest(`/matches/${matchId}/corrections`, {
      method: 'POST',
      body: { originalEventId, reason, idempotencyKey }
    }),

  listEvents: (matchId, { limit = 50, offset = 0 } = {}) =>
    apiRequest(`/matches/${matchId}/events?limit=${limit}&offset=${offset}`),

  reconcile: (matchId) =>
    apiRequest(`/matches/${matchId}/reconcile`)
};
