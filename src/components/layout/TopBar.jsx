import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AnexoGlobal from '../cards/AnexoGlobal';

const ROLE_LABELS = { creator: 'Criador', operator: 'Operador', viewer: 'Visualizacao' };

export default function TopBar({ onNewCard, onOpenChat, chatUnread = 0, connected }) {
  const { user, logout } = useAuth();

  return (
    <header style={{
      height: 52,
      background: '#080808',
      borderBottom: '1px solid #161616',
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      gap: 16,
      flexShrink: 0,
      position: 'relative',
    }}>
      {/* Subtle bottom glow line */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.15), transparent)',
      }} />

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: 'linear-gradient(135deg, #1a1a1a, #111)',
          border: '1px solid #222',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 12px rgba(59,130,246,0.15)',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
        </div>
        <div>
          <span style={{ color: '#e8e8e8', fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            ITADOBRAS
          </span>
          <span style={{ color: '#333', fontSize: 10, fontFamily: 'DM Mono, monospace', marginLeft: 6 }}>laser</span>
        </div>
      </div>

      {/* Connection status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          backgroundColor: connected ? '#22c55e' : '#ef4444',
          boxShadow: connected ? '0 0 8px rgba(34,197,94,0.6)' : '0 0 8px rgba(239,68,68,0.6)',
          display: 'inline-block',
        }} />
        <span style={{ color: '#333', fontSize: 10, fontFamily: 'DM Mono, monospace' }}>
          {connected ? 'online' : 'offline'}
        </span>
      </div>

      <div style={{ flex: 1 }} />

      {/* Anexo Global */}
      <AnexoGlobal />

      {/* Chat button */}
      <button
        onClick={onOpenChat}
        style={{
          position: 'relative',
          display: 'flex', alignItems: 'center', gap: 7,
          background: 'transparent',
          border: '1px solid #1e1e1e',
          borderRadius: 8,
          padding: '6px 12px',
          color: '#888',
          fontSize: 12,
          fontFamily: 'Syne, sans-serif',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = '#e8e8e8'; e.currentTarget.style.background = '#111'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e1e1e'; e.currentTarget.style.color = '#888'; e.currentTarget.style.background = 'transparent'; }}
        title="Abrir chat"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/>
        </svg>
        Chat
        {chatUnread > 0 && (
          <span style={{
            position: 'absolute', top: -5, right: -5,
            minWidth: 16, height: 16, padding: '0 4px',
            borderRadius: 8, background: '#ef4444',
            color: '#fff', fontSize: 9, lineHeight: '16px', textAlign: 'center',
            fontFamily: 'DM Mono, monospace', fontWeight: 600,
          }}>
            {chatUnread > 9 ? '9+' : chatUnread}
          </span>
        )}
      </button>

      {/* New Card button */}
      {user?.role === 'creator' && (
        <button
          onClick={onNewCard}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            border: '1px solid rgba(59,130,246,0.3)',
            borderRadius: 8,
            padding: '6px 14px',
            color: '#fff',
            fontSize: 12,
            fontFamily: 'Syne, sans-serif',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            letterSpacing: '0.02em',
            boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f6, #2563eb)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(37,99,235,0.4)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, #2563eb, #1d4ed8)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(37,99,235,0.3)'; }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Novo Card
        </button>
      )}

      {/* User info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 14, borderLeft: '1px solid #161616' }}>
        <div style={{ textAlign: 'right' }}>
          <p style={{ color: '#ccc', fontSize: 12, fontWeight: 600, lineHeight: 1.2 }}>{user?.display_name}</p>
          <p style={{ color: '#333', fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: '0.08em', textTransform: 'uppercase', lineHeight: 1.2, marginTop: 2 }}>
            {ROLE_LABELS[user?.role]}
          </p>
        </div>
        <button
          onClick={logout}
          title="Sair"
          style={{ color: '#333', cursor: 'pointer', transition: 'color 0.15s', background: 'none', border: 'none', padding: 4 }}
          onMouseEnter={e => e.currentTarget.style.color = '#888'}
          onMouseLeave={e => e.currentTarget.style.color = '#333'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>
    </header>
  );
}
