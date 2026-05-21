/**
 * client/src/pages/LoginPage.jsx
 */

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch {
      setError('Usuário ou senha inválidos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
      {/* Background grid lines */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative z-10 w-full max-w-sm animate-scale-in">
        {/* Logo / header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#1c1c1c] border border-[#2a2a2a] mb-5 shadow-card">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2"/>
              <path d="M8 21h8M12 17v4"/>
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-[#f0f0f0] tracking-tight">ITADOBRAS</h1>
          <p className="text-sm text-[#555] mt-1 font-mono tracking-widest uppercase">Controle de Produção</p>
        </div>

        {/* Form card */}
        <form
          onSubmit={handleSubmit}
          className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-8 shadow-modal"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#8a8a8a] mb-2 uppercase tracking-wider">
                Usuário
              </label>
              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl px-4 py-3 text-[#f0f0f0] text-sm
                           placeholder-[#555] outline-none
                           focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]/30
                           transition-all duration-150"
                placeholder="nome de usuário"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#8a8a8a] mb-2 uppercase tracking-wider">
                Senha
              </label>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl px-4 py-3 text-[#f0f0f0] text-sm
                           placeholder-[#555] outline-none
                           focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]/30
                           transition-all duration-150"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 px-4 py-3 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#ef4444] text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-50
                       text-white font-medium text-sm rounded-xl px-4 py-3
                       transition-all duration-150 active:scale-[0.98]"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
