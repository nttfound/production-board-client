import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ThemeProvider } from './contexts/ThemeContext';
import LoginPage from './pages/LoginPage';
import BoardPage from './pages/BoardPage';
import UpdateBanner from './components/ui/UpdateBanner';
import NotificationCenter from './components/ui/NotificationCenter';

function AppInner() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-app)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 28, height: 28, border: '2px solid var(--border-default)', borderTopColor: 'var(--accent-blue)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return user ? <BoardPage /> : <LoginPage />;
}

export default function App() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <AuthProvider>
          <AppInner />
          <NotificationCenter />
          <UpdateBanner />
        </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}
