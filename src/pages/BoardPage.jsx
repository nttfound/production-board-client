/**
 * client/src/pages/BoardPage.jsx
 * Main production board — card grid with real-time updates.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import api, { getAuthToken } from '../services/api';
import socket from '../services/socket';
import { cargaAtivaAgora } from '../services/cargaConfig';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import TopBar from '../components/layout/TopBar';
import FilterBar from '../components/layout/FilterBar';
import ProductionCard from '../components/cards/ProductionCard';
import NewCardModal from '../components/cards/NewCardModal';
import ChatPanel from '../components/chat/ChatPanel';

const EMPTY_ADVANCED_FILTERS = {
  status: 'all', city: 'all', services: {}, urgent: false, withCarga: false,
};

function getCardCity(card) {
  if (!card.carga) return null;
  return card.carga.startsWith('CARGA - ') ? card.carga.replace('CARGA - ', '') : card.carga;
}

// Prioridade de serviço: dobra > calandra > corte
function getServiceOrder(card) {
  if (card.dobra) return 0;
  if (card.calandra) return 1;
  if (card.corte) return 2;
  return 3;
}

// Função para verificar se é carga ativa (excluindo Itapira)
function isCargaAtiva(carga) {
  if (!carga) return false;
  if (carga === 'Itapira') return false; // Itapira NÃO é carga ativa
  return cargaAtivaAgora(carga);
}

function sortCards(cards) {
  return [...cards].sort((a, b) => {
    // 1º PRIORIDADE: URGENTE (sempre no topo)
    if (a.urgente && !b.urgente) return -1;
    if (!a.urgente && b.urgente) return 1;

    // 2º PRIORIDADE: CARGA ATIVA (excluindo Itapira)
    const aCargaAtiva = isCargaAtiva(a.carga);
    const bCargaAtiva = isCargaAtiva(b.carga);
    if (aCargaAtiva && !bCargaAtiva) return -1;
    if (!aCargaAtiva && bCargaAtiva) return 1;

    // 3º PRIORIDADE: ITAPIRA (apenas se ambos não têm carga ativa)
    if (!aCargaAtiva && !bCargaAtiva) {
      const aItapira = a.carga === 'Itapira';
      const bItapira = b.carga === 'Itapira';
      if (aItapira && !bItapira) return -1;
      if (!aItapira && bItapira) return 1;
    }

    // 4º PRIORIDADE: SERVIÇO (dobra > calandra > corte)
    const svcA = getServiceOrder(a);
    const svcB = getServiceOrder(b);
    if (svcA !== svcB) return svcA - svcB;

    // 5º PRIORIDADE: Mais antigo primeiro
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

export default function BoardPage() {
  const { user } = useAuth();
  const { notifyChat, notifyProducing, notifyUrgent, notifyReady } = useNotifications();

  const [cards, setCards] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('fila');
  const [advancedFilters, setAdvancedFilters] = useState(EMPTY_ADVANCED_FILTERS);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatUnread, setChatUnread] = useState(0);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  const cardsRef = useRef([]);
  const showChatRef = useRef(showChat);
  
  useEffect(() => { cardsRef.current = cards; }, [cards]);
  useEffect(() => { showChatRef.current = showChat; }, [showChat]);

  // Carregar cards iniciais
  useEffect(() => {
    api.get('/api/cards')
      .then(res => setCards(sortCards(res.data)))
      .catch(err => console.error('[BOARD] Failed to load cards:', err))
      .finally(() => setLoading(false));
  }, []);

  // Socket com autenticação e reconexão
  useEffect(() => {
    const token = getAuthToken();

    if (token) {
      socket.auth = { token };
      if (!socket.connected) {
        socket.connect();
      }
    }

    setConnected(socket.connected);

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);
    const handleConnectError = (err) => {
      console.log('[WS] Erro de conexão:', err.message);
      setConnected(false);
    };
    // Ao reconectar (ex: servidor reiniciou), garante que o token está atualizado
    const handleReconnect = () => {
      const t = getAuthToken();
      if (t) socket.auth = { token: t };
    };

    const handleCardCreated = (card) => {
      setCards(prev => sortCards([card, ...prev]));
    };

    const handleCardUpdated = (updated) => {
      const prev = cardsRef.current.find(c => c.id === updated.id);
      if (prev) {
        if (prev.status !== updated.status && updated.status === 'Producing') notifyProducing(updated.title);
        if (prev.status !== updated.status && updated.status === 'Ready') notifyReady(updated.title);
        if (!prev.urgente && updated.urgente) notifyUrgent(updated.title);
      }
      setCards(prev => sortCards(prev.map(c => c.id === updated.id ? updated : c)));
    };

    const handleCardDeleted = ({ id }) => {
      setCards(prev => prev.filter(c => c.id !== id));
    };

    const handleChatMessage = (msg) => {
      if (!showChatRef.current) {
        setChatUnread(prev => prev + 1);
        const sender = msg?.username || msg?.display_name || 'Alguém';
        const preview = msg?.text || '';
        if (preview) notifyChat(sender, preview.slice(0, 80));
      }
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('reconnect', handleReconnect);
    socket.on('card:created', handleCardCreated);
    socket.on('card:updated', handleCardUpdated);
    socket.on('card:deleted', handleCardDeleted);
    socket.on('chat:message', handleChatMessage);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('reconnect', handleReconnect);
      socket.off('card:created', handleCardCreated);
      socket.off('card:updated', handleCardUpdated);
      socket.off('card:deleted', handleCardDeleted);
      socket.off('chat:message', handleChatMessage);
    };
  }, [user, notifyChat, notifyProducing, notifyUrgent, notifyReady]);

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

  const filtered = cards.filter(c => {
    const matchQuick = filterStatus === 'Ready' ? c.status === 'Ready' : c.status !== 'Ready';
    const matchStatus = advancedFilters.status === 'all' || c.status === advancedFilters.status;
    
    // FILTRO COMBINADO: URGENTE OU CARGA (mostra os dois quando ambos selecionados)
    let matchUrgenteOuCarga = true;
    if (advancedFilters.urgent || advancedFilters.withCarga) {
      matchUrgenteOuCarga = false;
      if (advancedFilters.urgent && c.urgente) matchUrgenteOuCarga = true;
      if (advancedFilters.withCarga && Boolean(c.carga)) matchUrgenteOuCarga = true;
    }
    
    const matchCity = advancedFilters.city === 'all' || getCardCity(c) === advancedFilters.city;
    const activeServices = Object.entries(advancedFilters.services || {}).filter(([, a]) => a).map(([k]) => k);
    const matchService = activeServices.length === 0 || activeServices.some(k => Boolean(c[k]));
    const q = search.toLowerCase();
    const matchSearch = !q || c.title.toLowerCase().includes(q)
      || c.observation?.toLowerCase().includes(q)
      || c.created_by.toLowerCase().includes(q);
      
    return matchQuick && matchStatus && matchUrgenteOuCarga && matchCity && matchService && matchSearch;
  });

  const cargaOrderById = filtered.reduce((acc, card) => {
    if (card.carga) acc[card.id] = String(Object.keys(acc).length + 1).padStart(2, '0');
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-app)', overflow: 'hidden' }}>
      <TopBar
        onNewCard={() => setShowNewModal(true)}
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

      <main style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {loading ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 28, height: 28, border: '2px solid var(--border-default)', borderTopColor: 'var(--accent-blue)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: 'DM Mono, monospace' }}>carregando...</span>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <svg style={{ margin: '0 auto 12px', display: 'block', color: 'var(--border-default)' }} width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="9" y1="9" x2="15" y2="15" /><line x1="15" y1="9" x2="9" y2="15" />
              </svg>
              <p style={{ color: 'var(--text-muted)', fontSize: 12, fontFamily: 'DM Mono, monospace' }}>nenhum card encontrado</p>
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

      {/* Chat FAB */}
      <button
        onClick={() => { setShowChat(true); setChatUnread(0); }}
        title="Chat"
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 40,
          width: 48, height: 48, borderRadius: 14,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-card-hover)',
          color: 'var(--text-secondary)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-surface3)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-accent)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-surface)'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-light)'; }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
        </svg>
        {chatUnread > 0 && (
          <span style={{
            position: 'absolute', top: -5, right: -5,
            minWidth: 18, height: 18, padding: '0 4px',
            borderRadius: 9, background: 'var(--status-red)',
            color: '#fff', fontSize: 9, lineHeight: '18px',
            textAlign: 'center', fontFamily: 'DM Mono, monospace', fontWeight: 700,
          }}>
            {chatUnread > 9 ? '9+' : chatUnread}
          </span>
        )}
      </button>

      {showNewModal && (
        <NewCardModal onClose={() => setShowNewModal(false)} onCreated={() => setShowNewModal(false)} />
      )}

      {showChat && <ChatPanel onClose={() => setShowChat(false)} />}
    </div>
  );
}