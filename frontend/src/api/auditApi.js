// frontend/src/api/auditApi.js
import { apiRequest } from './client.js';

export const auditApi = {
  list: ({ targetEntityType, targetEntityId, actorId, action, limit = 50, offset = 0 } = {}) => {
    const params = new URLSearchParams();
    if (targetEntityType) params.append('targetEntityType', targetEntityType);
    if (targetEntityId) params.append('targetEntityId', targetEntityId);
    if (actorId) params.append('actorId', actorId);
    if (action) params.append('action', action);
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());

    return apiRequest(`/audit?${params.toString()}`);
  }
};

export const userApi = {
  list: () => apiRequest('/users'),
  create: (data) => apiRequest('/users', { method: 'POST', body: data }),
  updateRole: (id, role) => apiRequest(`/users/${id}/role`, { method: 'PATCH', body: { role } })
};
