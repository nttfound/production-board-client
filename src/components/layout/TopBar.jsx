import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import UserManager from './UserManager';
import { NotificationBell } from '../ui/NotificationCenter';
import { CARGA_POR_DIA, CIDADE_SEMPRE, getLabelDia, getDiasOrdenados } from '../../services/cargaConfig';

const ROLE_LABELS = { creator: 'Criador', operator: 'Operador', viewer: 'Visualização' };

const DIA_LABEL = { Segunda: 'Segunda', Terca: 'Terca', Quarta: 'Quarta', Quinta: 'Quinta', Sexta: 'Sexta' };

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-blue)', fontSize: 10, fontFamily: 'var(--font-text)' }}>
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
      color: 'var(--status-green)', fontSize: 10, fontFamily: 'var(--font-text)', cursor: 'pointer',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--status-green)', boxShadow: '0 0 6px var(--status-green)', display: 'inline-block' }} />
      instalar v{updateInfo.version}
    </button>
  );
  if (status === 'available') return (
    <button onClick={onDownload} title={`v${updateInfo.version} disponível`} style={{
      display: 'flex', alignItems: 'center', gap: 5,
      background: 'none', border: 'none', padding: '2px 0',
      color: 'var(--accent-blue)', fontSize: 10, fontFamily: 'var(--font-text)', cursor: 'pointer',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent-blue)', boxShadow: '0 0 6px var(--accent-blue)', display: 'inline-block' }} />
      v{updateInfo.version}
    </button>
  );
  if (!appVersion) return null;
  return (
    <span onClick={onCheck} title="Verificar atualizações"
      style={{ color: 'var(--text-faint)', fontSize: 10, fontFamily: 'var(--font-text)', cursor: 'default' }}>
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
      fontFamily: 'var(--font-text)', flexShrink: 0,
      letterSpacing: '0.05em',
    }}>
      {initials}
    </div>
  );
}

function QuickNav({ filterStatus, onFilterStatus, cargaDay, onCargaDay, cards }) {
  const [cargaOpen, setCargaOpen] = useState(false);
  const cargaRef = useRef(null);
  const diasOrdenados = useMemo(() => getDiasOrdenados(), []);
  const diaAtivo = useMemo(() => getLabelDia(), []);
  const cardsComCarga = useMemo(() =>
    (cards || []).filter(c => c.carga && c.carga !== CIDADE_SEMPRE && c.status !== 'Ready'),
    [cards]
  );

  useEffect(() => {
    if (!cargaOpen) return;
    function handleOutsideClick(e) {
      if (cargaRef.current && !cargaRef.current.contains(e.target)) setCargaOpen(false);
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [cargaOpen]);

  const countByDay = useMemo(() => {
    const counts = {};
    diasOrdenados.forEach(dia => { counts[dia] = 0; });
    cardsComCarga.forEach(card => {
      const cidade = card.carga.startsWith('CARGA - ') ? card.carga.replace('CARGA - ', '') : card.carga;
      diasOrdenados.forEach(dia => {
        if ((CARGA_POR_DIA[dia] || []).includes(cidade)) counts[dia] += 1;
      });
    });
    return counts;
  }, [cardsComCarga, diasOrdenados]);

  const navItems = [
    { key: 'fila', label: 'Fila' },
    { key: 'Ready', label: 'Pronto' },
    { key: 'carga', label: 'Carga' },
    { key: 'producing', label: 'Produzindo' },
  ];

  function handleNavClick(key) {
    if (key === 'carga') {
      if (filterStatus !== 'carga') {
        onFilterStatus('carga');
        onCargaDay(null);
        setCargaOpen(false);
      } else {
        setCargaOpen(open => !open);
      }
      return;
    }

    setCargaOpen(false);
    onFilterStatus(key);
    onCargaDay(null);
  }

  return (
    <nav style={{
      position: 'absolute',
      left: '50%',
      top: 0,
      height: '100%',
      transform: 'translateX(-50%)',
      display: 'flex',
      alignItems: 'stretch',
      gap: 20,
      zIndex: 2,
    }}>
      {navItems.map(item => {
        const active = filterStatus === item.key;
        const isCarga = item.key === 'carga';
        return (
          <div key={item.key} ref={isCarga ? cargaRef : null} style={{ position: 'relative', display: 'flex' }}>
            <button
              onClick={() => handleNavClick(item.key)}
              style={{
                position: 'relative',
                minWidth: 52,
                padding: '0 4px',
                border: 'none',
                background: 'transparent',
                color: active ? 'var(--accent-blue)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 500,
                fontFamily: 'var(--font-text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              {item.label}
              {isCarga && cargaDay && (
                <span style={{ marginLeft: 5, fontSize: 9, color: 'var(--text-muted)' }}>
                  {DIA_LABEL[cargaDay]}
                </span>
              )}
              <span style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                height: 3,
                borderRadius: '3px 3px 0 0',
                background: active ? 'var(--accent-blue)' : 'transparent',
                transition: 'background 0.15s',
              }} />
            </button>

            {isCarga && cargaOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 210,
                padding: '6px 0',
                borderRadius: 10,
                background: 'var(--bg-surface1)',
                border: '1px solid var(--border-default)',
                boxShadow: 'var(--shadow-modal)',
                zIndex: 60,
              }}>
                <button
                  onClick={() => { onCargaDay(null); setCargaOpen(false); }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: 'none',
                    background: cargaDay === null ? 'var(--bg-surface3)' : 'transparent',
                    color: cargaDay === null ? 'var(--text-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: 11,
                    fontFamily: 'var(--font-text)',
                  }}
                >
                  Todos os dias
                </button>
                {diasOrdenados.map(dia => {
                  const activeDay = cargaDay === dia;
                  return (
                    <button
                      key={dia}
                      onClick={() => { onCargaDay(activeDay ? null : dia); setCargaOpen(false); }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: 'none',
                        background: activeDay ? 'var(--bg-surface3)' : 'transparent',
                        color: activeDay ? 'var(--accent-blue)' : dia === diaAtivo ? 'var(--text-primary)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: 11,
                        fontFamily: 'var(--font-text)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>{DIA_LABEL[dia]}</span>
                      {countByDay[dia] > 0 && (
                        <span style={{ color: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-text)' }}>
                          {countByDay[dia]}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

export default function TopBar({ onNewCard, connected, filterStatus, onFilterStatus, cargaDay, onCargaDay, cards }) {
  const { user, logout } = useAuth();
  const [showUsers, setShowUsers] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { updateInfo, progress, appVersion, checkForUpdate, downloadUpdate, installUpdate } = useUpdater();
  const isCreator = user?.role === 'creator';
  const canCreateCard = isCreator || Boolean(user?.permissions?.criar_card);

  return (
    <>
      <header style={{
        position: 'relative',
        height: 52,
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-default)',
        display: 'flex', alignItems: 'center',
        padding: '0 20px', gap: 10, flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', marginRight: 6, flexShrink: 0 }}>
          <img
            src={`${process.env.PUBLIC_URL}/brand-mark.svg`}
            alt="ITADOBRAS LASER"
            style={{
              display: 'block',
              width: 176,
              maxWidth: '24vw',
              height: 'auto',
            }}
          />
        </div>

        <QuickNav
          filterStatus={filterStatus}
          onFilterStatus={onFilterStatus}
          cargaDay={cargaDay}
          onCargaDay={onCargaDay}
          cards={cards}
        />

        <div style={{ flex: 1 }} />

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {canCreateCard && (
            <button
              onClick={onNewCard}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: 'var(--accent-blue)',
                border: 'none',
                borderRadius: 7, padding: '7px 16px',
                color: '#fff', fontSize: 12, fontFamily: 'var(--font-text)',
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
              <p style={{ color: 'var(--text-primary)', fontSize: 11, fontFamily: 'var(--font-text)', fontWeight: 600, margin: 0, lineHeight: 1.2 }}>
                {user?.display_name}
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: 9, fontFamily: 'var(--font-text)', letterSpacing: '0.06em', margin: '1px 0 0', lineHeight: 1, textTransform: 'uppercase' }}>
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
                  <span style={{ fontSize: 10, fontFamily: 'var(--font-text)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Tema</span>
                  <ThemeToggle />
                </div>
                <div style={{
                  margin: '4px 0',
                  padding: '7px 8px',
                  borderTop: '1px solid var(--border-default)',
                  borderBottom: '1px solid var(--border-default)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}>
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    color: 'var(--text-muted)',
                    fontSize: 10,
                    fontFamily: 'var(--font-text)',
                    whiteSpace: 'nowrap',
                  }}>
                    <span style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      display: 'inline-block',
                      backgroundColor: connected ? 'var(--status-green)' : 'var(--status-red)',
                    }} />
                    {connected ? 'online' : 'offline'}
                  </span>
                  <UpdateIndicator
                    updateInfo={updateInfo}
                    progress={progress}
                    appVersion={appVersion}
                    onCheck={checkForUpdate}
                    onDownload={downloadUpdate}
                    onInstall={installUpdate}
                  />
                </div>
                {isCreator && (
                  <button
                    onClick={() => { setShowUsers(true); setUserMenuOpen(false); }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 12px', borderRadius: 12, border: 'none',
                      background: 'transparent', color: 'var(--text-secondary)',
                      fontSize: 11, fontFamily: 'var(--font-text)', cursor: 'pointer',
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
                    fontSize: 11, fontFamily: 'var(--font-text)', cursor: 'pointer',
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
