// frontend/src/App.jsx
import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ConnectivityProvider } from './context/ConnectivityContext.jsx';
import { Navbar } from './components/layout/Navbar.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { Login } from './pages/Login.jsx';
import { TournamentList } from './pages/TournamentList.jsx';
import { LiveScoring } from './pages/LiveScoring.jsx';
import { MatchHistory } from './pages/MatchHistory.jsx';
import { AuditLogs } from './pages/AuditLogs.jsx';
import { UserManagement } from './pages/UserManagement.jsx';

function AppContent() {
  const { user, loading, isAdmin, isOfficial } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedMatchId, setSelectedMatchId] = useState(null);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)' }}>
        Initializing Secure Tournament Desk...
      </div>
    );
  }

  // If not logged in, show Login view
  if (!user) {
    return (
      <div className="app-container">
        <Navbar activeTab="login" onSelectTab={() => setActiveTab('login')} />
        <main className="main-content">
          <Login onSuccess={() => setActiveTab('dashboard')} />
        </main>
      </div>
    );
  }

  const navigateToScoring = (matchId) => {
    setSelectedMatchId(matchId);
    setActiveTab('scoring');
  };

  const navigateToMatchHistory = (matchId) => {
    setSelectedMatchId(matchId);
    setActiveTab('history');
  };

  return (
    <div className="app-container">
      <Navbar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
        }}
      />

      <main className="main-content">
        {activeTab === 'dashboard' && (
          <Dashboard
            onNavigateToScoring={navigateToScoring}
            onNavigateToMatchHistory={navigateToMatchHistory}
          />
        )}

        {activeTab === 'tournaments' && (
          <TournamentList
            onSelectTournament={(tourneyId) => {
              // Navigates to dashboard / match view
              setActiveTab('dashboard');
            }}
          />
        )}

        {activeTab === 'scoring' && selectedMatchId && (
          <LiveScoring
            matchId={selectedMatchId}
            onBack={() => setActiveTab('dashboard')}
            onNavigateToHistory={navigateToMatchHistory}
          />
        )}

        {activeTab === 'history' && selectedMatchId && (
          <MatchHistory
            matchId={selectedMatchId}
            onBack={() => setActiveTab(selectedMatchId ? 'scoring' : 'dashboard')}
          />
        )}

        {activeTab === 'audit' && (isAdmin || isOfficial) && (
          <AuditLogs />
        )}

        {activeTab === 'users' && isAdmin && (
          <UserManagement />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ConnectivityProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ConnectivityProvider>
  );
}
