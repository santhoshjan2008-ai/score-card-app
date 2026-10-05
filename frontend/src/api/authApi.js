// frontend/src/api/authApi.js
import { apiRequest } from './client.js';

export const authApi = {
  login: (usernameOrEmail, password) => 
    apiRequest('/auth/login', { method: 'POST', body: { usernameOrEmail, password } }),
  
  logout: () => 
    apiRequest('/auth/logout', { method: 'POST' }),
  
  me: () => 
    apiRequest('/auth/me'),

  checkHealth: () =>
    apiRequest('/health')
};
