// frontend/src/context/ConnectivityContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/authApi.js';

const ConnectivityContext = createContext(null);

export function ConnectivityProvider({ children }) {
  const [isBrowserOnline, setIsBrowserOnline] = useState(navigator.onLine);
  const [isServerReachable, setIsServerReachable] = useState(true);
  const [lastSyncedAt, setLastSyncedAt] = useState(new Date());

  useEffect(() => {
    const handleOnline = () => {
      setIsBrowserOnline(true);
      checkHealth();
    };
    const handleOffline = () => setIsBrowserOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic heartbeat to verify server availability
    const checkHealth = async () => {
      try {
        await authApi.checkHealth();
        setIsServerReachable(true);
        setLastSyncedAt(new Date());
      } catch (err) {
        setIsServerReachable(false);
      }
    };

    const interval = setInterval(checkHealth, 20000);
    checkHealth();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const markSyncSuccess = () => {
    setLastSyncedAt(new Date());
    setIsServerReachable(true);
  };

  const isFullyConnected = isBrowserOnline && isServerReachable;

  return (
    <ConnectivityContext.Provider
      value={{
        isBrowserOnline,
        isServerReachable,
        isFullyConnected,
        lastSyncedAt,
        markSyncSuccess
      }}
    >
      {children}
    </ConnectivityContext.Provider>
  );
}

export function useConnectivity() {
  const context = useContext(ConnectivityContext);
  if (!context) {
    throw new Error('useConnectivity must be used within a ConnectivityProvider');
  }
  return context;
}
