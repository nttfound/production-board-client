/**
 * client/src/pages/BoardPage.jsx
 * Main production board — card grid with real-time updates.
 */

import React, { useState, useEffect, useCallback } from 'react';
import api            from '../services/api';
import socket         from '../services/socket';
import TopBar         from '../components/layout/TopBar';
import FilterBar      from '../components/layout/FilterBar';
import ProductionCard from '../components/cards/ProductionCard';
import NewCardModal   from '../components/cards/NewCardModal';
import ChatPanel      from '../components/chat/ChatPanel';

const EMPTY_ADVANCED_FILTERS = {
  status: 'all',
  city: 'all',
  services: {},
  urgent: false,
  withCarga: false,
};

function getCardCity(card) {
  if (!card.carga) return null;
  return card.carga.startsWith('CARGA - ') ? card.carga.replace('CARGA - ', '') : card.carga;
}

function getServicePriority(card) {
  if (card.dobra) return 0;
  if (card.calandra) return 1;
  if (card.corte) return 2;
  return 3;
}

function sortCards(cards) {
  return [...cards].sort((a, b) => {
    if (Boolean(a.urgente) !== Boolean(b.urgente)) return Boolean(b.urgente) - Boolean(a.urgente);

    const cargaA = Boolean(a.carga);
    const cargaB = Boolean(b.carga);
    if (cargaA !== cargaB) return Number(cargaB) - Number(cargaA);

    if (cargaA && cargaB) {
      const serviceDiff = getServicePriority(a) - getServicePriority(b);
      if (serviceDiff !== 0) return serviceDiff;
    }

    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

export default function BoardPage() {
  const [cards,         setCards]         = useState([]);
  const [search,        setSearch]        = useState('');
  const [filterStatus,  setFilterStatus]  = useState('fila');
  const [advancedFilters, setAdvancedFilters] = useState(EMPTY_ADVANCED_FILTERS);
  const [showNewModal,  setShowNewModal]  = useState(false);
  const [showChat,      setShowChat]      = useState(false);
  const [chatUnread,    setChatUnread]    = useState(0);
  const [connected,     setConnected]     = useState(false);
  const [loading,       setLoading]       = useState(true);

  // ── Load all cards on mount ──────────────────────────────
  useEffect(() => {
    api.get('/api/cards')
      .then(res => setCards(sortCards(res.data)))
      .catch(err => console.error('[BOARD] Failed to load cards:', err))
      .finally(() => setLoading(false));
  }, []);

  // ── Socket.IO real-time events ───────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    socket.auth = { token };
    if (!socket.connected) socket.connect();

    setConnected(socket.connected);
    socket.on('connect',    () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', (err) => {
      console.log('[WS] Erro de conexão:', err.message);
      setConnected(false);
    });

    // Server emits these after mutations
    socket.on('card:created', (card) => {
      setCards(prev => sortCards([card, ...prev]));
    });
    socket.on('card:updated', (updated) => {
      setCards(prev => sortCards(prev.map(c => c.id === updated.id ? updated : c)));
      if (window.electronAPI?.notify) {
        window.electronAPI.notify();
      }
    });
    socket.on('card:deleted', ({ id }) => {
      setCards(prev => prev.filter(c => c.id !== id));
    });

    const handleChatMessage = () => {
      setChatUnread(prev => showChat ? 0 : prev + 1);
      if (!showChat && window.electronAPI?.notify) {
        window.electronAPI.notify();
      }
    };
    socket.on('chat:message', handleChatMessage);

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('card:created');
      socket.off('card:updated');
      socket.off('card:deleted');
      socket.off('chat:message', handleChatMessage);
    };
  }, [showChat]);

  // ── Handlers ─────────────────────────────────────────────
  const handleStatusChange = useCallback(async (id, status, scheduled_date) => {
    try {
      await api.patch(`/api/cards/${id}/status`, { status, scheduled_date });
      // UI update comes through socket event
    } catch (err) {
      console.error('[BOARD] Status update failed:', err);
    }
  }, []);

  const handleDelete = useCallback(async (id) => {
    if (!window.confirm('Excluir este card?')) return;
    try {
      await api.delete(`/api/cards/${id}`);
    } catch (err) {
      console.error('[BOARD] Delete failed:', err);
    }
  }, []);

  // ── Filtering ─────────────────────────────────────────────
  const filtered = cards.filter(c => {
    const matchQuick = filterStatus === 'Ready'
      ? c.status === 'Ready'
      : c.status !== 'Ready';

    const matchStatus = advancedFilters.status === 'all'
      || c.status === advancedFilters.status;

    const matchUrgent = !advancedFilters.urgent || c.urgente === true;
    const matchCarga = !advancedFilters.withCarga || Boolean(c.carga);
    const matchCity = advancedFilters.city === 'all' || getCardCity(c) === advancedFilters.city;

    const activeServices = Object.entries(advancedFilters.services || {})
      .filter(([, active]) => active)
      .map(([key]) => key);
    const matchService = activeServices.length === 0 || activeServices.some(key => Boolean(c[key]));

    const q = search.toLowerCase();
    const matchSearch = !q
      || c.title.toLowerCase().includes(q)
      || c.observation?.toLowerCase().includes(q)
      || c.created_by.toLowerCase().includes(q);

    return matchQuick && matchStatus && matchUrgent && matchCarga && matchCity && matchService && matchSearch;
  });

  const cargaOrderById = filtered.reduce((acc, card) => {
    if (card.carga) acc[card.id] = String(Object.keys(acc).length + 1).padStart(2, '0');
    return acc;
  }, {});

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#080808", overflow: "hidden" }}>
      <TopBar
        onNewCard={() => setShowNewModal(true)}
        onOpenChat={() => {
          setShowChat(true);
          setChatUnread(0);
        }}
        chatUnread={chatUnread}
        connected={connected}
      />

      <FilterBar
        search={search}
        onSearch={setSearch}
        filterStatus={filterStatus}
        onFilterStatus={setFilterStatus}
        advancedFilters={advancedFilters}
        onAdvancedFilters={setAdvancedFilters}
        total={cards.filter(c => c.status !== 'Ready').length}
      />

      {/* Card grid */}
      <main
        className="flex-1 overflow-y-auto grid-bg"
        style={{ padding: '20px' }}
      >
        {loading ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 28, height: 28,
                border: '2px solid #1a1a1a', borderTopColor: '#2563eb',
                borderRadius: '50%', animation: 'spin 0.8s linear infinite',
              }} />
              <span style={{ color: '#333', fontSize: 11, fontFamily: 'DM Mono, monospace' }}>carregando...</span>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <svg style={{ margin: '0 auto 12px', display: 'block', color: '#1e1e1e' }} width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/>
              </svg>
              <p style={{ color: '#333', fontSize: 12, fontFamily: 'DM Mono, monospace' }}>nenhum card encontrado</p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(272px, 1fr))' }}>
            {filtered.map(card => (
              <ProductionCard
                key={card.id}
                card={card}
                cargaOrder={cargaOrderById[card.id]}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>

      {showNewModal && (
        <NewCardModal
          onClose={() => setShowNewModal(false)}
          onCreated={() => setShowNewModal(false)}
        />
      )}

      {showChat && (
        <ChatPanel onClose={() => setShowChat(false)} />
      )}
    </div>
  );
}
