/**
 * client/src/App.jsx
 */

import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import BoardPage from './pages/BoardPage';
import UpdateBanner from './components/ui/UpdateBanner';

function AppInner() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#2a2a2a] border-t-[#3b82f6] rounded-full animate-spin" />
      </div>
    );
  }

  return user ? <BoardPage /> : <LoginPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
      {/* Floating update notification — only active in packaged Electron builds */}
      <UpdateBanner />
    </AuthProvider>
  );
}
