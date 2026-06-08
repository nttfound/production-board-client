import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import AnexoGlobal from '../cards/AnexoGlobal';
import UserManager from './UserManager';
import { NotificationBell } from '../ui/NotificationCenter';

const ROLE_LABELS = { creator: 'Criador', operator: 'Operador', viewer: 'Visualização' };

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-blue)', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}>
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
      color: 'var(--status-green)', fontSize: 10, fontFamily: 'JetBrains Mono, monospace', cursor: 'pointer',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--status-green)', boxShadow: '0 0 6px var(--status-green)', display: 'inline-block' }} />
      instalar v{updateInfo.version}
    </button>
  );
  if (status === 'available') return (
    <button onClick={onDownload} title={`v${updateInfo.version} disponível`} style={{
      display: 'flex', alignItems: 'center', gap: 5,
      background: 'none', border: 'none', padding: '2px 0',
      color: 'var(--accent-blue)', fontSize: 10, fontFamily: 'JetBrains Mono, monospace', cursor: 'pointer',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent-blue)', boxShadow: '0 0 6px var(--accent-blue)', display: 'inline-block' }} />
      v{updateInfo.version}
    </button>
  );
  if (!appVersion) return null;
  return (
    <span onClick={onCheck} title="Verificar atualizações"
      style={{ color: 'var(--text-faint)', fontSize: 10, fontFamily: 'JetBrains Mono, monospace', cursor: 'default' }}>
      v{appVersion}
    </span>
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
        width: 32, height: 32,
        background: hover ? '#222' : '#1a1a1a',
        border: '1px solid #2a2a2a',
        borderRadius: 12,
        color: hover ? '#aaa' : '#666',
        cursor: 'pointer', padding: 0,
      }}
    >
      {isDark ? (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  );
}

function UserAvatar({ name }) {
  const initials = (name || '?').slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: 30, height: 30, borderRadius: '50%',
      background: 'var(--accent-blue)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, fontWeight: 700, color: '#fff',
      fontFamily: 'JetBrains Mono, monospace', flexShrink: 0,
      letterSpacing: '0.05em',
    }}>
      {initials}
    </div>
  );
}

export default function TopBar({ onNewCard, connected }) {
  const { user, logout } = useAuth();
  const [showUsers, setShowUsers] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { updateInfo, progress, appVersion, checkForUpdate, downloadUpdate, installUpdate } = useUpdater();
  const isCreator = user?.role === 'creator';
  const canCreateCard = isCreator || Boolean(user?.permissions?.criar_card);

  return (
    <>
      <header style={{
        height: 52,
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-default)',
        display: 'flex', alignItems: 'center',
        padding: '0 20px', gap: 10, flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginRight: 6, flexShrink: 0 }}>
          {/* Icon mark */}
          <div style={{
            width: 26, height: 26, borderRadius: 12,
            background: 'var(--accent-blue)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
          </div>
          <span style={{
            color: 'var(--text-primary)', fontSize: 13, fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            fontFamily: 'Inter, sans-serif',
          }}>
            ITADOBRAS LASER
          </span>
        </div>

        {/* Connection dot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginRight: 4 }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%', display: 'inline-block',
            backgroundColor: connected ? 'var(--status-green)' : 'var(--status-red)',
            boxShadow: connected ? '0 0 6px var(--status-green)' : '0 0 6px var(--status-red)',
          }} />
        </div>

        <UpdateIndicator
          updateInfo={updateInfo} progress={progress} appVersion={appVersion}
          onCheck={checkForUpdate} onDownload={downloadUpdate} onInstall={installUpdate}
        />

        <div style={{ flex: 1 }} />

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <AnexoGlobal />

          {canCreateCard && (
            <button
              onClick={onNewCard}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: 'var(--accent-blue)',
                border: 'none',
                borderRadius: 12, padding: '7px 16px',
                color: '#fff', fontSize: 12, fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Novo card
            </button>
          )}

          <NotificationBell />

          {/* Divider */}
          <div style={{ width: 1, height: 20, background: 'var(--border-default)', flexShrink: 0, margin: '0 2px' }} />

          {/* User */}
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', position: 'relative' }}
            onClick={() => setUserMenuOpen(v => !v)}
          >
            <UserAvatar name={user?.display_name} />
            <div>
              <p style={{ color: 'var(--text-primary)', fontSize: 11, fontFamily: 'Inter, sans-serif', fontWeight: 600, margin: 0, lineHeight: 1.2 }}>
                {user?.display_name}
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: 9, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.06em', margin: '1px 0 0', lineHeight: 1, textTransform: 'uppercase' }}>
                {ROLE_LABELS[user?.role]}
              </p>
            </div>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>

            {userMenuOpen && (
              <div
                style={{
                  position: 'absolute', top: 'calc(100% + 10px)', right: 0, zIndex: 50,
                  background: 'var(--bg-surface1)', border: '1px solid var(--border-default)',
                  borderRadius: 12, padding: 6, minWidth: 140,
                  boxShadow: 'var(--shadow-modal)',
                }}
                onClick={e => e.stopPropagation()}
              >
                <div style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Tema</span>
                  <ThemeToggle />
                </div>
                {isCreator && (
                  <button
                    onClick={() => { setShowUsers(true); setUserMenuOpen(false); }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 12px', borderRadius: 12, border: 'none',
                      background: 'transparent', color: 'var(--text-secondary)',
                      fontSize: 11, fontFamily: 'Inter, sans-serif', cursor: 'pointer',
                      transition: 'all 0.13s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-surface3)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                    Gerenciar usuários
                  </button>
                )}
                <button
                  onClick={() => { logout(); setUserMenuOpen(false); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px', borderRadius: 12, border: 'none',
                    background: 'transparent', color: 'var(--text-secondary)',
                    fontSize: 11, fontFamily: 'Inter, sans-serif', cursor: 'pointer',
                    transition: 'all 0.13s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-surface3)'; e.currentTarget.style.color = 'var(--status-red)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {showUsers && <UserManager onClose={() => setShowUsers(false)} />}
    </>
  );
}
