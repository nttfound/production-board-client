import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import AnexoGlobal from '../cards/AnexoGlobal';
import UserManager from './UserManager';
import { NotificationBell } from '../ui/NotificationCenter';

const ROLE_LABELS = { creator: 'criador', operator: 'operador', viewer: 'visualizacao' };

const getHasUpdater = () =>
  typeof window !== 'undefined'
  && !!window.electronAPI
  && typeof window.electronAPI.onUpdateStatus   === 'function'
  && typeof window.electronAPI.onUpdateProgress === 'function';

const getHasVersion = () =>
  typeof window !== 'undefined'
  && !!window.electronAPI
  && typeof window.electronAPI.getVersion === 'function';

function useUpdater() {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [progress,   setProgress]   = useState(null);
  const [appVersion, setAppVersion] = useState(null);

  useEffect(() => {
    if (getHasVersion()) window.electronAPI.getVersion().then(setAppVersion).catch(() => {});
    if (!getHasUpdater()) return;
    const unsubStatus   = window.electronAPI.onUpdateStatus(setUpdateInfo);
    const unsubProgress = window.electronAPI.onUpdateProgress(setProgress);
    return () => { unsubStatus(); unsubProgress(); };
  }, []);

  const checkForUpdate = useCallback(() => {
    if (typeof window.electronAPI?.checkForUpdate === 'function') window.electronAPI.checkForUpdate();
  }, []);
  const downloadUpdate = useCallback(() => {
    if (typeof window.electronAPI?.downloadUpdate === 'function') window.electronAPI.downloadUpdate();
    setUpdateInfo(prev => ({ ...prev, status: 'downloading' }));
  }, []);
  const installUpdate = useCallback(() => {
    if (typeof window.electronAPI?.installUpdate === 'function') window.electronAPI.installUpdate();
  }, []);

  return { updateInfo, progress, appVersion, checkForUpdate, downloadUpdate, installUpdate };
}

function UpdateIndicator({ updateInfo, progress, appVersion, onCheck, onDownload, onInstall }) {
  if (!getHasVersion() && !getHasUpdater()) return null;
  const status = updateInfo?.status;

  if (status === 'downloading') {
    const pct = progress?.percent ?? 0;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-blue)', fontSize: 10, fontFamily: 'DM Mono, monospace' }}>
        <div style={{ width: 60, height: 2, background: 'var(--border-default)', borderRadius: 1 }}>
          <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent-blue)', borderRadius: 1, transition: 'width 0.4s ease' }} />
        </div>
        <span>{pct}%</span>
      </div>
    );
  }
  if (status === 'downloaded') return (
    <button onClick={onInstall} title={`v${updateInfo.version} pronta`} style={{
      display: 'flex', alignItems: 'center', gap: 5,
      background: 'none', border: 'none', padding: '2px 0',
      color: 'var(--status-green)', fontSize: 10, fontFamily: 'DM Mono, monospace', cursor: 'pointer',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--status-green)', boxShadow: '0 0 6px var(--status-green)', display: 'inline-block' }} />
      instalar v{updateInfo.version}
    </button>
  );
  if (status === 'available') return (
    <button onClick={onDownload} title={`v${updateInfo.version} disponível`} style={{
      display: 'flex', alignItems: 'center', gap: 5,
      background: 'none', border: 'none', padding: '2px 0',
      color: 'var(--accent-blue)', fontSize: 10, fontFamily: 'DM Mono, monospace', cursor: 'pointer',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent-blue)', boxShadow: '0 0 6px var(--accent-blue)', display: 'inline-block' }} />
      v{updateInfo.version}
    </button>
  );
  if (!appVersion) return null;
  return (
    <span onClick={onCheck} title="Verificar atualizações"
      style={{ color: 'var(--text-faint)', fontSize: 10, fontFamily: 'DM Mono, monospace', cursor: 'default' }}>
      v{appVersion}
    </span>
  );
}

function IconBtn({ onClick, title, children, badge }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button onClick={onClick} title={title}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 30, height: 30,
        background: hover ? 'var(--bg-surface3)' : 'transparent',
        border: `1px solid ${hover ? 'var(--border-light)' : 'transparent'}`,
        borderRadius: 7,
        color: hover ? 'var(--text-secondary)' : 'var(--text-muted)',
        cursor: 'pointer', transition: 'all 0.13s', padding: 0,
      }}>
      {children}
      {badge > 0 && (
        <span style={{
          position: 'absolute', top: -3, right: -3,
          minWidth: 14, height: 14, padding: '0 3px',
          borderRadius: 7, background: 'var(--status-red)',
          color: '#fff', fontSize: 8, lineHeight: '14px', textAlign: 'center',
          fontFamily: 'DM Mono, monospace', fontWeight: 700,
        }}>{badge > 9 ? '9+' : badge}</span>
      )}
    </button>
  );
}

function ThemeToggle() {
  const { isDark, toggle } = useTheme();
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={toggle}
      title={isDark ? 'Tema claro' : 'Tema escuro'}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 30, height: 30,
        background: hover ? 'var(--bg-surface3)' : 'transparent',
        border: `1px solid ${hover ? 'var(--border-light)' : 'transparent'}`,
        borderRadius: 7,
        color: hover ? 'var(--text-secondary)' : 'var(--text-muted)',
        cursor: 'pointer', padding: 0,
      }}
    >
      {isDark ? (
        /* Sol — tema claro */
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/>
          <line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      ) : (
        /* Lua — tema escuro */
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  );
}

export default function TopBar({ onNewCard, connected }) {
  const { user, logout } = useAuth();
  const [showUsers, setShowUsers] = useState(false);
  const { updateInfo, progress, appVersion, checkForUpdate, downloadUpdate, installUpdate } = useUpdater();
  const isCreator = user?.role === 'creator';
  const canCreateCard = isCreator || Boolean(user?.permissions?.criar_card);

  return (
    <>
      <header style={{
        height: 46, background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-default)',
        display: 'flex', alignItems: 'center',
        padding: '0 16px', gap: 8, flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 4 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="1.5" strokeLinecap="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
          <span style={{ color: 'var(--text-primary)', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            ITADOBRAS
          </span>
        </div>

        <div style={{ width: 1, height: 14, background: 'var(--border-default)', flexShrink: 0 }} />

        {/* Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{
            width: 5, height: 5, borderRadius: '50%', display: 'inline-block',
            backgroundColor: connected ? 'var(--status-green)' : 'var(--status-red)',
            boxShadow: connected ? '0 0 6px var(--status-green)' : '0 0 6px var(--status-red)',
          }} />
          <span style={{ color: 'var(--text-muted)', fontSize: 10, fontFamily: 'DM Mono, monospace' }}>
            {connected ? 'online' : 'offline'}
          </span>
        </div>

        <UpdateIndicator
          updateInfo={updateInfo} progress={progress} appVersion={appVersion}
          onCheck={checkForUpdate} onDownload={downloadUpdate} onInstall={installUpdate}
        />

        <div style={{ flex: 1 }} />

        <AnexoGlobal />
        <NotificationBell />
        <ThemeToggle />

        {isCreator && (
          <IconBtn onClick={() => setShowUsers(true)} title="Gerenciar usuários">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </IconBtn>
        )}

        <div style={{ width: 1, height: 14, background: 'var(--border-default)', flexShrink: 0 }} />

        {canCreateCard && (
          <button onClick={onNewCard}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--bg-surface3)', border: '1px solid var(--border-light)',
              borderRadius: 7, padding: '5px 12px',
              color: 'var(--text-secondary)', fontSize: 11, fontFamily: 'DM Mono, monospace',
              cursor: 'pointer',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-surface2)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-accent)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-surface3)'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-light)'; }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            novo card
          </button>
        )}

        {/* User */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 10, fontFamily: 'DM Mono, monospace', margin: 0, lineHeight: 1 }}>
              {user?.display_name}
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: '0.06em', margin: '2px 0 0', lineHeight: 1 }}>
              {ROLE_LABELS[user?.role]}
            </p>
          </div>
          <button onClick={logout} title="Sair"
            style={{ color: 'var(--text-muted)', cursor: 'pointer', transition: 'color 0.13s', background: 'none', border: 'none', padding: 4, display: 'flex' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
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
