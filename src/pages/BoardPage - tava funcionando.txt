/**
 * client/src/pages/BoardPage.jsx
 * Main production board — card grid with real-time updates.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import api, { getAuthToken } from '../services/api';
import socket         from '../services/socket';
import { useAuth }   from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import TopBar         from '../components/layout/TopBar';
import FilterBar      from '../components/layout/FilterBar';
import ProductionCard from '../components/cards/ProductionCard';
import NewCardModal   from '../components/cards/NewCardModal';
import ChatPanel      from '../components/chat/ChatPanel';

const EMPTY_ADVANCED_FILTERS = {
  status: 'all', city: 'all', services: {}, urgent: false, withCarga: false,
};

function getCardCity(card) {
  if (!card.carga) return null;
  return card.carga.startsWith('CARGA - ') ? card.carga.replace('CARGA - ', '') : card.carga;
}

function getCargaServicePriority(card) {
  if (card.dobra)    return 0;
  if (card.calandra) return 1;
  if (!card.dobra && !card.calandra && !card.corte) return 2;
  if (card.corte)    return 3;
  return 4;
}

function getServicePriority(card) {
  if (card.dobra)    return 0;
  if (card.calandra) return 1;
  if (card.corte)    return 2;
  return 3;
}

function sortCards(cards) {
  return [...cards].sort((a, b) => {
    if (Boolean(a.urgente) !== Boolean(b.urgente)) return Boolean(b.urgente) - Boolean(a.urgente);
    const cargaA = Boolean(a.carga), cargaB = Boolean(b.carga);
    if (cargaA !== cargaB) return Number(cargaB) - Number(cargaA);
    if (cargaA && cargaB) {
      const diff = getCargaServicePriority(a) - getCargaServicePriority(b);
      if (diff !== 0) return diff;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    const svcDiff = getServicePriority(a) - getServicePriority(b);
    if (svcDiff !== 0) return svcDiff;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

export default function BoardPage() {
  const { user }                        = useAuth();
  const { notifyChat, notifyProducing,
          notifyUrgent, notifyReady }           = useNotifications();

  const [cards,           setCards]           = useState([]);
  const [search,          setSearch]          = useState('');
  const [filterStatus,    setFilterStatus]    = useState('fila');
  const [advancedFilters, setAdvancedFilters] = useState(EMPTY_ADVANCED_FILTERS);
  const [showNewModal,    setShowNewModal]    = useState(false);
  const [showChat,        setShowChat]        = useState(false);
  const [chatUnread,      setChatUnread]      = useState(0);
  const [connected,       setConnected]       = useState(false);
  const [loading,         setLoading]         = useState(true);

  // Keep a ref of latest cards for comparing old vs new state in socket handler
  const cardsRef  = useRef([]);
  const showChatRef = useRef(showChat);
  useEffect(() => { cardsRef.current  = cards;    }, [cards]);
  useEffect(() => { showChatRef.current = showChat; }, [showChat]);

  // ── Load all cards on mount ──────────────────────────────
  useEffect(() => {
    api.get('/api/cards')
      .then(res => setCards(sortCards(res.data)))
      .catch(err => console.error('[BOARD] Failed to load cards:', err))
      .finally(() => setLoading(false));
  }, []);

  // ── Socket.IO real-time events ───────────────────────────
  useEffect(() => {
    const token = getAuthToken();
    socket.auth = token ? { token } : {};
    if (!socket.connected) socket.connect();

    setConnected(socket.connected);
    socket.on('connect',       () => setConnected(true));
    socket.on('disconnect',    () => setConnected(false));
    socket.on('connect_error', (err) => {
      console.log('[WS] Erro de conexão:', err.message);
      setConnected(false);
    });

    socket.on('card:created', (card) => {
      setCards(prev => sortCards([card, ...prev]));
    });

    socket.on('card:updated', (updated) => {
      // Compare with previous state to detect meaningful changes
      const prev = cardsRef.current.find(c => c.id === updated.id);

      if (prev) {
        const myCard = updated.created_by !== user?.display_name;

        // Status changed → Produzindo
        if (prev.status !== updated.status && updated.status === 'Producing') {
          notifyProducing(updated.title);
        }
        // Status changed → Pronto
        if (prev.status !== updated.status && updated.status === 'Ready') {
          notifyReady(updated.title);
        }
        // Urgente marcado (falso → verdadeiro)
        if (!prev.urgente && updated.urgente) {
          notifyUrgent(updated.title);
        }
      }

      setCards(prev => sortCards(prev.map(c => c.id === updated.id ? updated : c)));
    });

    socket.on('card:deleted', ({ id }) => {
      setCards(prev => prev.filter(c => c.id !== id));
    });

    socket.on('chat:message', (msg) => {
      if (!showChatRef.current) {
        setChatUnread(prev => prev + 1);
        const sender  = msg?.user || msg?.display_name || 'Alguém';
        const preview = msg?.text || msg?.message || '';
        notifyChat(sender, preview.slice(0, 80));
      }
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('card:created');
      socket.off('card:updated');
      socket.off('card:deleted');
      socket.off('chat:message');
    };
  }, []);

  // ── Handlers ─────────────────────────────────────────────
  const handleStatusChange = useCallback(async (id, status, scheduled_date) => {
    try {
      await api.patch(`/api/cards/${id}/status`, { status, scheduled_date });
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
    const matchQuick = filterStatus === 'Ready' ? c.status === 'Ready' : c.status !== 'Ready';
    const matchStatus = advancedFilters.status === 'all' || c.status === advancedFilters.status;
    const matchUrgent = !advancedFilters.urgent || c.urgente === true;
    const matchCarga  = !advancedFilters.withCarga || Boolean(c.carga);
    const matchCity   = advancedFilters.city === 'all' || getCardCity(c) === advancedFilters.city;
    const activeServices = Object.entries(advancedFilters.services || {}).filter(([, a]) => a).map(([k]) => k);
    const matchService   = activeServices.length === 0 || activeServices.some(k => Boolean(c[k]));
    const q = search.toLowerCase();
    const matchSearch = !q || c.title.toLowerCase().includes(q)
      || c.observation?.toLowerCase().includes(q)
      || c.created_by.toLowerCase().includes(q);
    return matchQuick && matchStatus && matchUrgent && matchCarga && matchCity && matchService && matchSearch;
  });

  const cargaOrderById = filtered.reduce((acc, card) => {
    if (card.carga) acc[card.id] = String(Object.keys(acc).length + 1).padStart(2, '0');
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0a0a0a', overflow: 'hidden' }}>
      <TopBar
        onNewCard={() => setShowNewModal(true)}
        onOpenChat={() => { setShowChat(true); setChatUnread(0); }}
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
      <main className="flex-1 overflow-y-auto grid-bg" style={{ padding: '16px' }}>
        {loading ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 28, height: 28, border: '2px solid #1a1a1a', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ color: '#555', fontSize: 11, fontFamily: 'DM Mono, monospace' }}>carregando...</span>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <svg style={{ margin: '0 auto 12px', display: 'block', color: '#1e1e1e' }} width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/>
              </svg>
              <p style={{ color: '#555', fontSize: 12, fontFamily: 'DM Mono, monospace' }}>nenhum card encontrado</p>
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
        <NewCardModal onClose={() => setShowNewModal(false)} onCreated={() => setShowNewModal(false)} />
      )}

      {showChat && <ChatPanel onClose={() => setShowChat(false)} />}
    </div>
  );
}
