import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AnexoGlobal from '../cards/AnexoGlobal';
import UserManager from '../layout/UserManager';

const ROLE_LABELS = { creator: 'Criador', operator: 'Operador', viewer: 'Visualizacao' };

export default function TopBar({ onNewCard, connected }) {
  const { user, logout, can } = useAuth();
  const isElectron = !!window.electronAPI;

  const [updateStatus, setUpdateStatus] = useState('idle');
  const [showUsers,    setShowUsers]    = useState(false);

  useEffect(() => {
    if (!isElectron) return;
    window.electronAPI.onUpdateAvailable?.(() => setUpdateStatus('available'));
    window.electronAPI.onUpdateReady?.(() => setUpdateStatus('ready'));
    window.electronAPI.onUpdateNotAvailable?.(() => {
      setUpdateStatus('up-to-date');
      setTimeout(() => setUpdateStatus('idle'), 3000);
    });
  }, [isElectron]);

  const handleCheckUpdate = async () => {
    if (!isElectron || updateStatus === 'checking') return;
    setUpdateStatus('checking');
    await window.electronAPI.checkForUpdates?.();
    setTimeout(() => setUpdateStatus(s => s === 'checking' ? 'idle' : s), 10000);
  };

  const updateLabel = {
    idle:         'Atualizar',
    checking:     'Verificando...',
    available:    'Baixando...',
    ready:        'Instalando...',
    'up-to-date': 'Atualizado!',
  }[updateStatus];

  const updateColor = {
    idle:         { color: '#555',    border: '1px solid #2a2a2a',   background: 'transparent' },
    checking:     { color: '#8a8a8a', border: '1px solid #2a2a2a',   background: 'transparent' },
    available:    { color: '#f59e0b', border: '1px solid #f59e0b40', background: '#f59e0b10'   },
    ready:        { color: '#f59e0b', border: '1px solid #f59e0b40', background: '#f59e0b10'   },
    'up-to-date': { color: '#22c55e', border: '1px solid #22c55e40', background: '#22c55e10'   },
  }[updateStatus];

  return (
    <>
      <header className="h-14 bg-[#0d0d0d] border-b border-[#1c1c1c] flex items-center px-6 gap-4 flex-shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mr-4">
          <div className="w-7 h-7 rounded-lg bg-[#1c1c1c] border border-[#2a2a2a] flex items-center justify-center">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2"/>
              <path d="M8 21h8M12 17v4"/>
            </svg>
          </div>
          <span className="text-[#f0f0f0] text-sm font-semibold tracking-tight">LASER - ITADOBRAS</span>
        </div>

        {/* Status conexão */}
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-[#22c55e]' : 'bg-[#ef4444]'}`} />
          <span className="text-[#555] text-xs">{connected ? 'Online' : 'Offline'}</span>
        </div>

        <div className="flex-1" />

        {/* Atualizar */}
        {isElectron && (
          <button
            onClick={handleCheckUpdate}
            disabled={updateStatus !== 'idle' && updateStatus !== 'up-to-date'}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all"
            style={updateColor}
            title="Verificar atualizações"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className={updateStatus === 'checking' || updateStatus === 'available' ? 'animate-spin' : ''}>
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            {updateLabel}
          </button>
        )}

        {/* Gerenciar Usuários — só itadobras */}
        {user?.username === 'itadobras' && (
          <button
            onClick={() => setShowUsers(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all"
            style={{ color: '#8a8a8a', border: '1px solid #2a2a2a', background: 'transparent' }}
            title="Gerenciar usuários"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            Usuários
          </button>
        )}

        {/* Anexo Global */}
        <AnexoGlobal />

        {/* Novo Card */}
        {can('criar_card') && (
          <button
            onClick={onNewCard}
            className="flex items-center gap-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-medium px-4 py-2 rounded-xl transition-all duration-150 active:scale-[0.97]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Novo Card
          </button>
        )}

        {/* User info + logout */}
        <div className="flex items-center gap-3 pl-4 border-l border-[#1c1c1c]">
          <div className="text-right">
            <p className="text-[#f0f0f0] text-xs font-medium leading-tight">{user?.display_name}</p>
            <p className="text-[#555] text-[10px] leading-tight">{ROLE_LABELS[user?.role]}</p>
          </div>
          <button onClick={logout} title="Sair" className="text-[#555] hover:text-[#8a8a8a] transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
