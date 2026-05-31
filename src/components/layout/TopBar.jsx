import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AnexoGlobal from '../cards/AnexoGlobal';
import UserManager from './UserManager';

const ROLE_LABELS = { creator: 'Criador', operator: 'Operador', viewer: 'Visualizacao' };
const isElectron  = typeof window !== 'undefined' && !!window.electronAPI;

// ─── Update hook ─────────────────────────────────────────────────────────────
function useUpdater() {
  const [updateInfo,  setUpdateInfo]  = useState(null);   // { status, version }
  const [progress,    setProgress]    = useState(null);
  const [appVersion,  setAppVersion]  = useState(null);

  useEffect(() => {
    if (!isElectron) return;
    window.electronAPI.getVersion().then(setAppVersion).catch(() => {});
    const unsubStatus   = window.electronAPI.onUpdateStatus(setUpdateInfo);
    const unsubProgress = window.electronAPI.onUpdateProgress(setProgress);
    return () => { unsubStatus(); unsubProgress(); };
  }, []);

  const checkForUpdate = useCallback(() => {
    if (!isElectron) return;
    window.electronAPI.checkForUpdate();
  }, []);

  const downloadUpdate = useCallback(() => {
    if (!isElectron) return;
    window.electronAPI.downloadUpdate();
    setUpdateInfo(prev => ({ ...prev, status: 'downloading' }));
  }, []);

  const installUpdate = useCallback(() => {
    if (!isElectron) return;
    window.electronAPI.installUpdate();
  }, []);

  return { updateInfo, progress, appVersion, checkForUpdate, downloadUpdate, installUpdate };
}

// ─── Update button ────────────────────────────────────────────────────────────
function UpdateButton({ updateInfo, progress, appVersion, onCheck, onDownload, onInstall }) {
  const [hover, setHover] = useState(false);
  const [checking, setChecking] = useState(false);

  const handleCheck = () => {
    setChecking(true);
    onCheck();
    setTimeout(() => setChecking(false), 4000);
  };

  if (!isElectron) return null;

  const status = updateInfo?.status;

  // ── Downloading: progress bar button ──
  if (status === 'downloading') {
    const pct = progress?.percent ?? 0;
    return (
      <div style={{
        position: 'relative', overflow: 'hidden',
        display: 'flex', alignItems: 'center', gap: 7,
        background: '#0c0c0c', border: '1px solid #1e1e1e',
        borderRadius: 8, padding: '6px 12px',
        color: '#3b82f6', fontSize: 11, fontFamily: 'Syne, sans-serif', fontWeight: 600,
        minWidth: 110,
      }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: `${pct}%`, background: 'rgba(37,99,235,0.12)',
          transition: 'width 0.4s ease',
        }} />
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
          style={{ animation: 'spin 1.5s linear infinite', flexShrink: 0 }}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        <span style={{ position: 'relative' }}>{pct}%</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  // ── Downloaded: install now ──
  if (status === 'downloaded') {
    return (
      <button
        onClick={onInstall}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        title={`Versão ${updateInfo.version} baixada — clique para instalar`}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          background: hover ? 'rgba(22,163,74,0.15)' : 'rgba(22,163,74,0.08)',
          border: '1px solid rgba(22,163,74,0.35)',
          borderRadius: 8, padding: '6px 12px',
          color: '#22c55e', fontSize: 11, fontFamily: 'Syne, sans-serif', fontWeight: 700,
          cursor: 'pointer', transition: 'all 0.15s',
          boxShadow: hover ? '0 0 16px rgba(22,163,74,0.2)' : 'none',
          animation: 'softPulse 2.5s ease-in-out infinite',
        }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Instalar v{updateInfo.version}
        <style>{`@keyframes softPulse { 0%,100%{opacity:1} 50%{opacity:0.75} }`}</style>
      </button>
    );
  }

  // ── Available: download ──
  if (status === 'available') {
    return (
      <button
        onClick={onDownload}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        title={`v${updateInfo.version} disponível`}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          background: hover ? 'rgba(37,99,235,0.15)' : 'rgba(37,99,235,0.08)',
          border: '1px solid rgba(37,99,235,0.35)',
          borderRadius: 8, padding: '6px 12px',
          color: '#3b82f6', fontSize: 11, fontFamily: 'Syne, sans-serif', fontWeight: 700,
          cursor: 'pointer', transition: 'all 0.15s',
          boxShadow: hover ? '0 0 16px rgba(37,99,235,0.25)' : 'none',
        }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Baixar v{updateInfo.version}
      </button>
    );
  }

  // ── Default: version chip + manual check ──
  return (
    <button
      onClick={handleCheck}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title="Verificar atualizações"
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: hover ? '#111' : 'transparent',
        border: `1px solid ${hover ? '#222' : '#161616'}`,
        borderRadius: 8, padding: '5px 10px',
        color: hover ? '#666' : '#2a2a2a',
        fontSize: 10, fontFamily: 'DM Mono, monospace',
        cursor: 'pointer', transition: 'all 0.15s',
      }}
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
        style={{ animation: checking ? 'spin 1s linear infinite' : 'none' }}>
        <polyline points="1 4 1 10 7 10"/>
        <path d="M3.51 15a9 9 0 1 0 .49-3.79"/>
      </svg>
      {appVersion ? `v${appVersion}` : 'update'}
    </button>
  );
}

// ─── Generic icon button ──────────────────────────────────────────────────────
function IconBtn({ onClick, title, children, badge }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        display: 'flex', alignItems: 'center', gap: 7,
        background: hover ? '#111' : 'transparent',
        border: `1px solid ${hover ? '#2a2a2a' : '#1e1e1e'}`,
        borderRadius: 8, padding: '6px 12px',
        color: hover ? '#e8e8e8' : '#888',
        fontSize: 12, fontFamily: 'Syne, sans-serif', fontWeight: 500,
        cursor: 'pointer', transition: 'all 0.13s',
      }}
    >
      {children}
      {badge > 0 && (
        <span style={{
          position: 'absolute', top: -5, right: -5,
          minWidth: 16, height: 16, padding: '0 4px',
          borderRadius: 8, background: '#ef4444',
          color: '#fff', fontSize: 9, lineHeight: '16px', textAlign: 'center',
          fontFamily: 'DM Mono, monospace', fontWeight: 600,
        }}>
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  );
}

// ─── TopBar ───────────────────────────────────────────────────────────────────
export default function TopBar({ onNewCard, onOpenChat, chatUnread = 0, connected }) {
  const { user, logout } = useAuth();
  const [showUsers, setShowUsers] = useState(false);
  const { updateInfo, progress, appVersion, checkForUpdate, downloadUpdate, installUpdate } = useUpdater();

  return (
    <>
      <header style={{
        height: 52, background: '#080808',
        borderBottom: '1px solid #161616',
        display: 'flex', alignItems: 'center',
        padding: '0 20px', gap: 10, flexShrink: 0,
        position: 'relative',
      }}>
        {/* Bottom glow line */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.1), transparent)' }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 6 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg, #1a1a1a, #111)', border: '1px solid #222',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 12px rgba(59,130,246,0.1)',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
          </div>
          <div>
            <span style={{ color: '#e8e8e8', fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>ITADOBRAS</span>
            <span style={{ color: '#2a2a2a', fontSize: 10, fontFamily: 'DM Mono, monospace', marginLeft: 6 }}>laser</span>
          </div>
        </div>

        {/* Connection indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%', display: 'inline-block',
            backgroundColor: connected ? '#22c55e' : '#ef4444',
            boxShadow: connected ? '0 0 8px rgba(34,197,94,0.6)' : '0 0 8px rgba(239,68,68,0.6)',
          }} />
          <span style={{ color: '#2a2a2a', fontSize: 10, fontFamily: 'DM Mono, monospace' }}>
            {connected ? 'online' : 'offline'}
          </span>
        </div>

        {/* Update button — right next to connection */}
        <UpdateButton
          updateInfo={updateInfo}
          progress={progress}
          appVersion={appVersion}
          onCheck={checkForUpdate}
          onDownload={downloadUpdate}
          onInstall={installUpdate}
        />

        <div style={{ flex: 1 }} />

        <AnexoGlobal />

        {/* Chat */}
        <IconBtn onClick={onOpenChat} title="Abrir chat" badge={chatUnread}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/>
          </svg>
          Chat
        </IconBtn>

        {/* Gerenciar Usuários — só creator */}
        {user?.role === 'creator' && (
          <IconBtn onClick={() => setShowUsers(true)} title="Gerenciar usuários">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            Usuários
          </IconBtn>
        )}

        {/* Novo Card — só creator */}
        {user?.role === 'creator' && (
          <button
            onClick={onNewCard}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8,
              padding: '6px 14px', color: '#fff', fontSize: 12,
              fontFamily: 'Syne, sans-serif', fontWeight: 600,
              cursor: 'pointer', letterSpacing: '0.02em',
              boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
              transition: 'all 0.13s',
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(37,99,235,0.45)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(37,99,235,0.3)'; }}
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
            <p style={{ color: '#ccc', fontSize: 12, fontWeight: 600, lineHeight: 1.2, margin: 0 }}>{user?.display_name}</p>
            <p style={{ color: '#2a2a2a', fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: '0.08em', textTransform: 'uppercase', lineHeight: 1.2, marginTop: 2 }}>
              {ROLE_LABELS[user?.role]}
            </p>
          </div>
          <button
            onClick={logout}
            title="Sair"
            style={{ color: '#2a2a2a', cursor: 'pointer', transition: 'color 0.13s', background: 'none', border: 'none', padding: 4 }}
            onMouseEnter={e => e.currentTarget.style.color = '#888'}
            onMouseLeave={e => e.currentTarget.style.color = '#2a2a2a'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </header>

      {showUsers && <UserManager onClose={() => setShowUsers(false)} />}
    </>
  );
}
