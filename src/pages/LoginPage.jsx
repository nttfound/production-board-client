import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    <div style={{
      minHeight: '100vh', background: 'var(--bg-app)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative',
    }}>
      {/* Grid background - CORRIGIDO: remover className */}
      <div style={{ 
        position: 'absolute', inset: 0, opacity: 0.6,
        backgroundImage: 'radial-gradient(var(--border-default) 0.5px, transparent 0.5px)',
        backgroundSize: '24px 24px',
        pointerEvents: 'none',
      }} />

      {/* Radial glow */}
      <div style={{
        position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(37,99,235,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ 
        position: 'relative', zIndex: 10, width: '100%', maxWidth: 340, padding: '0 20px',
        // Opcional: remover a animação se não tiver definida
        // animation: 'scaleIn 0.2s ease',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 52, height: 52, borderRadius: 14,
            background: 'var(--bg-surface1)',
            border: '1px solid var(--border-default)',
            marginBottom: 16,
            boxShadow: '0 0 30px rgba(59,130,246,0.1)',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="1.5" strokeLinecap="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
          </div>
          <h1 style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
            ITADOBRAS
          </h1>
          <p style={{ color: 'var(--text-disabled)', fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 6 }}>
            controle de producao
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 14,
            padding: 24,
            boxShadow: 'var(--shadow-modal)',
          }}
        >
          <div style={{ display: 'grid', gap: 14 }}>
            <div>
              <label style={{
                display: 'block', fontSize: 9, fontWeight: 600,
                color: 'var(--text-faint)', fontFamily: 'DM Mono, monospace',
                letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 7,
              }}>
                Usuário
              </label>
              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="nome de usuário"
                required
                style={{
                  width: '100%', background: 'var(--bg-input)',
                  border: '1px solid var(--border-default)', borderRadius: 9,
                  padding: '10px 14px', color: 'var(--text-primary)', fontSize: 13,
                  fontFamily: 'Syne, sans-serif', outline: 'none',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--accent-blue)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-default)'}
              />
            </div>

            <div>
              <label style={{
                display: 'block', fontSize: 9, fontWeight: 600,
                color: 'var(--text-faint)', fontFamily: 'DM Mono, monospace',
                letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 7,
              }}>
                Senha
              </label>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%', background: 'var(--bg-input)',
                  border: '1px solid var(--border-default)', borderRadius: 9,
                  padding: '10px 14px', color: 'var(--text-primary)', fontSize: 13,
                  fontFamily: 'Syne, sans-serif', outline: 'none',
                  transition: 'border-color 0.15s',
                  letterSpacing: '0.15em',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--accent-blue)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-default)'}
              />
            </div>
          </div>

          {error && (
            <div style={{
              marginTop: 14, padding: '9px 12px', borderRadius: 8,
              background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)',
              color: 'var(--status-red)', fontSize: 11, fontFamily: 'DM Mono, monospace',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 18, width: '100%',
              background: loading ? 'var(--bg-surface2)' : 'linear-gradient(135deg, var(--accent-blue), var(--accent-blue-dim))',
              border: loading ? '1px solid var(--border-default)' : '1px solid rgba(59,130,246,0.3)',
              borderRadius: 9, padding: '11px',
              color: loading ? 'var(--text-muted)' : '#fff',
              fontSize: 13, fontWeight: 700, fontFamily: 'Syne, sans-serif',
              cursor: loading ? 'not-allowed' : 'pointer',
              letterSpacing: '0.04em',
              transition: 'all 0.15s',
              boxShadow: loading ? 'none' : '0 4px 16px rgba(37,99,235,0.25)',
            }}
          >
            {loading ? 'entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}