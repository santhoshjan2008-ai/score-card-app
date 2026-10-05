// frontend/src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/authApi.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const data = await authApi.me();
        setUser(data.user);
      } catch (err) {
        console.warn('Session verification failed, logging out:', err.message);
        localStorage.removeItem('token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  const login = async (usernameOrEmail, password) => {
    const data = await authApi.login(usernameOrEmail, password);
    localStorage.setItem('token', data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('token');
      setUser(null);
    }
  };

  const hasRole = (...roles) => {
    return user && roles.includes(user.role);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    hasRole,
    isAdmin: user?.role === 'ADMIN',
    isOfficial: user?.role === 'OFFICIAL',
    isScorekeeper: user?.role === 'SCOREKEEPER',
    isViewer: user?.role === 'VIEWER'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
