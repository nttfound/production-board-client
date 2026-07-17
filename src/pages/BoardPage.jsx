/**
 * client/src/pages/BoardPage.jsx
 * Main production board — card grid with real-time updates.
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import api, { getAuthToken } from '../services/api';
import socket from '../services/socket';
import { cargaAtivaAgora, CARGA_POR_DIA } from '../services/cargaConfig';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import TopBar from '../components/layout/TopBar';
import FilterBar from '../components/layout/FilterBar';
import ProductionCard from '../components/cards/ProductionCard';
import BulkActionBar from '../components/cards/BulkActionBar';
import NewCardModal from '../components/cards/NewCardModal';
import ChatPanel from '../components/chat/ChatPanel';
import DeleteConfirmModal from '../components/ui/DeleteConfirmModal';
import ConeCalculator from '../components/caldeiraria/ConeCalculator';

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
  if (carga === 'Itapira') return false;
  return cargaAtivaAgora(carga);
}

function normalizeCard(card) {
  return {
    ...card,
    _createdAtMs: card._createdAtMs || new Date(card.created_at).getTime(),
  };
}

function sortCards(cards) {
  return [...cards].sort((a, b) => {
    if (a.urgente && !b.urgente) return -1;
    if (!a.urgente && b.urgente) return 1;

    const aCargaAtiva = isCargaAtiva(a.carga);
    const bCargaAtiva = isCargaAtiva(b.carga);
    if (aCargaAtiva && !bCargaAtiva) return -1;
    if (!aCargaAtiva && bCargaAtiva) return 1;

    if (!aCargaAtiva && !bCargaAtiva) {
      const aItapira = a.carga === 'Itapira';
      const bItapira = b.carga === 'Itapira';
      if (aItapira && !bItapira) return -1;
      if (!aItapira && bItapira) return 1;
    }

    const svcA = getServiceOrder(a);
    const svcB = getServiceOrder(b);
    if (svcA !== svcB) return svcA - svcB;

    return (a._createdAtMs || new Date(a.created_at).getTime()) - (b._createdAtMs || new Date(b.created_at).getTime());
  });
}

const CARDS_PER_PAGE = 18;

export default function BoardPage() {
  const { user } = useAuth();
  const { notifyChat, notifyProducing, notifyUrgent, notifyReady, notifyAttachment, push } = useNotifications();

  const [cards, setCards] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('fila');
  const [cargaDay, setCargaDay] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatUnread, setChatUnread] = useState(0);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteRequest, setDeleteRequest] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const cardsRef = useRef([]);
  const showChatRef = useRef(showChat);
  const mainRef = useRef(null);
  const canViewCaldeiraria = user?.role === 'creator' || Boolean(user?.permissions?.ver_caldeiraria);

  useEffect(() => { cardsRef.current = cards; }, [cards]);
  useEffect(() => { showChatRef.current = showChat; }, [showChat]);
  useEffect(() => {
    if (filterStatus === 'caldeiraria' && !canViewCaldeiraria) setFilterStatus('fila');
  }, [filterStatus, canViewCaldeiraria]);

  // Carregar cards iniciais
  useEffect(() => {
    api.get('/api/cards')
      .then(res => setCards(sortCards(res.data.map(normalizeCard))))
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

    const handleConnect    = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);
    const handleConnectError = (err) => {
      console.log('[WS] Erro de conexão:', err.message);
      setConnected(false);
    };
    const handleReconnect = () => {
      const t = getAuthToken();
      if (t) socket.auth = { token: t };
    };
    const handleCardCreated = (card) => {
      setCards(prev => sortCards([normalizeCard(card), ...prev]));
    };
    const handleCardUpdated = (updated) => {
      const normalized = normalizeCard(updated);
      const prev = cardsRef.current.find(c => c.id === normalized.id);
      if (prev) {
        if (prev.status !== normalized.status && normalized.status === 'Producing') notifyProducing(normalized.title);
        if (prev.status !== normalized.status && normalized.status === 'Ready') notifyReady(normalized.title);
        if (!prev.urgente && normalized.urgente) notifyUrgent(normalized.title, normalized.updated_by || normalized.created_by);
        if (prev.anexo_path !== normalized.anexo_path && normalized.anexo_path) notifyAttachment(normalized.anexo_nome);
      }
      setCards(prev => sortCards(prev.map(c => c.id === normalized.id ? normalized : c)));
    };
    const handleCardDeleted = ({ id }) => {
      setCards(prev => prev.filter(c => c.id !== id));
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
    };
    const handleChatMessage = (msg) => {
      if (!showChatRef.current) {
        setChatUnread(prev => prev + 1);
        const sender = msg?.username || msg?.display_name || 'Alguém';
        const preview = msg?.text || '';
        if (preview) notifyChat(sender, preview.slice(0, 80));
      }
    };
    const handleAnexoAtualizado = (anexo) => {
      if (anexo?.url) notifyAttachment(anexo.nome);
    };

    socket.on('connect',       handleConnect);
    socket.on('disconnect',    handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('reconnect',     handleReconnect);
    socket.on('card:created',  handleCardCreated);
    socket.on('card:updated',  handleCardUpdated);
    socket.on('card:deleted',  handleCardDeleted);
    socket.on('chat:message',  handleChatMessage);
    socket.on('anexo:atualizado', handleAnexoAtualizado);

    return () => {
      socket.off('connect',       handleConnect);
      socket.off('disconnect',    handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('reconnect',     handleReconnect);
      socket.off('card:created',  handleCardCreated);
      socket.off('card:updated',  handleCardUpdated);
      socket.off('card:deleted',  handleCardDeleted);
      socket.off('chat:message',  handleChatMessage);
      socket.off('anexo:atualizado', handleAnexoAtualizado);
    };
  }, [user, notifyChat, notifyProducing, notifyUrgent, notifyReady, notifyAttachment]);

  const handleStatusChange = useCallback(async (id, status, scheduled_date) => {
    try {
      await api.patch(`/api/cards/${id}/status`, { status, scheduled_date });
    } catch (err) {
      console.error('[BOARD] Status update failed:', err);
    }
  }, []);

  const handleDelete = useCallback((card) => {
    setDeleteRequest({
      type: 'single',
      id: card.id,
      title: card.title,
      count: 1,
    });
  }, []);

  const canSelect = user?.role === 'creator' || Boolean(user?.permissions?.selecionar);
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const cardIdSet = useMemo(() => new Set(cards.map(card => card.id)), [cards]);
  const selectedFilteredIds = useMemo(
    () => selectedIds.filter(id => cardIdSet.has(id)),
    [selectedIds, cardIdSet]
  );

  const toggleCardSelection = useCallback((id) => {
    if (!canSelect) return;
    setSelectedIds(prev => prev.includes(id)
      ? prev.filter(selectedId => selectedId !== id)
      : [...prev, id]
    );
  }, [canSelect]);

  const clearSelection = useCallback(() => setSelectedIds([]), []);

  const handleBulkTag = useCallback(async (tagKey, value) => {
    if (!selectedFilteredIds.length) return;
    try {
      if (tagKey === 'urgente') {
        await api.patch('/api/cards/bulk/urgente', { ids: selectedFilteredIds, urgente: value });
      } else {
        await api.patch('/api/cards/bulk/servicos', { ids: selectedFilteredIds, tagKey, value });
      }
    } catch (err) {
      console.error('[BOARD] Bulk tag update failed:', err);
      push('info', 'Nao foi possivel alterar', err.response?.data?.error || 'Tente novamente em alguns instantes.');
    }
  }, [selectedFilteredIds, push]);

  const handleBulkStatus = useCallback(async (status) => {
    if (!selectedFilteredIds.length) return;
    try {
      await api.patch('/api/cards/bulk/status', { ids: selectedFilteredIds, status });
    } catch (err) {
      console.error('[BOARD] Bulk status update failed:', err);
    }
  }, [selectedFilteredIds]);

  const handleBulkCarga = useCallback(async (carga) => {
    if (!selectedFilteredIds.length) return;
    try {
      await api.patch('/api/cards/bulk/carga', { ids: selectedFilteredIds, carga });
    } catch (err) {
      console.error('[BOARD] Bulk carga update failed:', err);
    }
  }, [selectedFilteredIds]);

  const handleBulkDelete = useCallback(() => {
    if (!selectedFilteredIds.length) return;
    setDeleteRequest({
      type: 'bulk',
      ids: selectedFilteredIds,
      count: selectedFilteredIds.length,
    });
  }, [selectedFilteredIds]);

  const closeDeleteModal = useCallback(() => {
    if (!deleteLoading) setDeleteRequest(null);
  }, [deleteLoading]);

  const confirmDelete = useCallback(async () => {
    if (!deleteRequest) return;
    setDeleteLoading(true);
    try {
      if (deleteRequest.type === 'single') {
        await api.delete(`/api/cards/${deleteRequest.id}`);
      } else {
        await api.delete('/api/cards/bulk', { data: { ids: deleteRequest.ids } });
        clearSelection();
      }
      setDeleteRequest(null);
    } catch (err) {
      console.error('[BOARD] Delete failed:', err);
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteRequest, clearSelection]);

  const totalOpenCards = useMemo(() => cards.filter(c => c.status !== 'Ready').length, [cards]);
  const urgentCount = useMemo(() => cards.filter(c => c.urgente).length, [cards]);

  const filtered = useMemo(() => {
    if (filterStatus === 'caldeiraria') return [];

    const q = search.trim().toLowerCase();
    const todasCidades = filterStatus === 'carga'
      ? new Set(Object.values(CARGA_POR_DIA).flat())
      : null;

    return cards.filter(c => {
    // Filtro rápido: Produzindo
    if (filterStatus === 'producing') {
      return c.status === 'Producing';
    }

    // Filtro rápido: Carga (por dia)
    if (filterStatus === 'carga') {
      if (c.status === 'Ready') return false;
      if (!c.carga) return false;
      const cidade = c.carga.startsWith('CARGA - ') ? c.carga.replace('CARGA - ', '') : c.carga;
      if (cargaDay) {
        const cidadesDoDia = CARGA_POR_DIA[cargaDay] || [];
        return cidadesDoDia.includes(cidade);
      }
      return todasCidades.has(cidade);
    }

    const matchQuick = filterStatus === 'Ready' ? c.status === 'Ready' : c.status !== 'Ready';

    const matchSearch = !q || c.title.toLowerCase().includes(q)
      || c.observation?.toLowerCase().includes(q)
      || c.created_by.toLowerCase().includes(q);

    return matchQuick && matchSearch;
    });
  }, [cards, search, filterStatus, cargaDay]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / CARDS_PER_PAGE));

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterStatus, cargaDay]);

  useEffect(() => {
    setCurrentPage(page => Math.min(page, totalPages));
  }, [totalPages]);

  const paginatedCards = useMemo(() => {
    const start = (currentPage - 1) * CARDS_PER_PAGE;
    return filtered.slice(start, start + CARDS_PER_PAGE);
  }, [filtered, currentPage]);

  const pageNumbers = useMemo(() => {
    const maxButtons = 7;
    if (totalPages <= maxButtons) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const half = Math.floor(maxButtons / 2);
    let start = Math.max(1, currentPage - half);
    let end = Math.min(totalPages, start + maxButtons - 1);

    if (end - start + 1 < maxButtons) {
      start = Math.max(1, end - maxButtons + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [currentPage, totalPages]);

  const goToPage = useCallback((page) => {
    setCurrentPage(Math.min(Math.max(1, page), totalPages));
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [totalPages]);

  const cargaOrderById = useMemo(() => {
    let order = 0;
    return filtered.reduce((acc, card) => {
      if (card.carga) {
        order += 1;
        acc[card.id] = String(order).padStart(2, '0');
      }
      return acc;
    }, {});
  }, [filtered]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-app)', overflow: 'hidden' }}>
      <TopBar
        onNewCard={() => setShowNewModal(true)}
        connected={connected}
        filterStatus={filterStatus}
        onFilterStatus={setFilterStatus}
        cargaDay={cargaDay}
        onCargaDay={setCargaDay}
        cards={cards}
      />

      <FilterBar
        search={search}
        onSearch={setSearch}
        filterStatus={filterStatus}
        onFilterStatus={setFilterStatus}
        cargaDay={cargaDay}
        onCargaDay={setCargaDay}
        total={totalOpenCards}
        cards={cards}
      />

      <main ref={mainRef} style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {filterStatus === 'caldeiraria' && canViewCaldeiraria ? (
          <ConeCalculator />
        ) : loading ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 28, height: 28, border: '2px solid var(--border-default)', borderTopColor: 'var(--accent-blue)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-text)' }}>carregando...</span>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <svg style={{ margin: '0 auto 12px', display: 'block', color: 'var(--border-default)' }} width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="9" y1="9" x2="15" y2="15" /><line x1="15" y1="9" x2="9" y2="15" />
              </svg>
              <p style={{ color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-text)' }}>nenhum card encontrado</p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {paginatedCards.map(card => (
                <ProductionCard
                  key={card.id}
                  card={card}
                  cargaOrder={cargaOrderById[card.id]}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                  isSelected={selectedIdSet.has(card.id)}
                  selectionEnabled={canSelect}
                  onToggleSelected={toggleCardSelection}
                  urgentCount={urgentCount}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '6px 0 2px',
                flexWrap: 'wrap',
              }}>
                <button
                  type="button"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  style={{
                    height: 30,
                    minWidth: 30,
                    borderRadius: 7,
                    border: '1px solid var(--border-default)',
                    background: 'var(--bg-surface)',
                    color: currentPage === 1 ? 'var(--text-faint)' : 'var(--text-secondary)',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    fontSize: 12,
                    fontFamily: 'var(--font-text)',
                  }}
                >
                  &lt;
                </button>

                {pageNumbers[0] > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => goToPage(1)}
                      style={{
                        height: 30,
                        minWidth: 30,
                        borderRadius: 7,
                        border: '1px solid var(--border-default)',
                        background: 'var(--bg-surface)',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontFamily: 'var(--font-text)',
                      }}
                    >
                      1
                    </button>
                    <span style={{ color: 'var(--text-muted)', fontSize: 12, padding: '0 2px' }}>...</span>
                  </>
                )}

                {pageNumbers.map(page => {
                  const active = page === currentPage;
                  return (
                    <button
                      key={page}
                      type="button"
                      onClick={() => goToPage(page)}
                      style={{
                        height: 30,
                        minWidth: 30,
                        borderRadius: 7,
                        border: `1px solid ${active ? 'var(--accent-blue)' : 'var(--border-default)'}`,
                        background: active ? 'var(--accent-blue)' : 'var(--bg-surface)',
                        color: active ? '#fff' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: active ? 700 : 500,
                        fontFamily: 'var(--font-text)',
                      }}
                    >
                      {page}
                    </button>
                  );
                })}

                {pageNumbers[pageNumbers.length - 1] < totalPages && (
                  <>
                    <span style={{ color: 'var(--text-muted)', fontSize: 12, padding: '0 2px' }}>...</span>
                    <button
                      type="button"
                      onClick={() => goToPage(totalPages)}
                      style={{
                        height: 30,
                        minWidth: 30,
                        borderRadius: 7,
                        border: '1px solid var(--border-default)',
                        background: 'var(--bg-surface)',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontFamily: 'var(--font-text)',
                      }}
                    >
                      {totalPages}
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  style={{
                    height: 30,
                    minWidth: 30,
                    borderRadius: 7,
                    border: '1px solid var(--border-default)',
                    background: 'var(--bg-surface)',
                    color: currentPage === totalPages ? 'var(--text-faint)' : 'var(--text-secondary)',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    fontSize: 12,
                    fontFamily: 'var(--font-text)',
                  }}
                >
                  &gt;
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {selectedFilteredIds.length > 0 && (
        <BulkActionBar
          count={selectedFilteredIds.length}
          onApplyTag={handleBulkTag}
          onApplyStatus={handleBulkStatus}
          onApplyCarga={handleBulkCarga}
          onDelete={handleBulkDelete}
          onCancel={clearSelection}
          urgentCount={urgentCount}
        />
      )}

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
            textAlign: 'center', fontFamily: 'var(--font-text)', fontWeight: 700,
          }}>
            {chatUnread > 9 ? '9+' : chatUnread}
          </span>
        )}
      </button>

      {showNewModal && (
        <NewCardModal onClose={() => setShowNewModal(false)} onCreated={() => setShowNewModal(false)} />
      )}

      {showChat && <ChatPanel onClose={() => setShowChat(false)} />}

      {deleteRequest && (
        <DeleteConfirmModal
          title={deleteRequest.title}
          count={deleteRequest.count}
          description={
            deleteRequest.type === 'single'
              ? 'Esta acao remove o card do quadro e tambem apaga anexos vinculados, quando existirem.'
              : `Esta acao remove ${deleteRequest.count} ${deleteRequest.count === 1 ? 'card selecionado' : 'cards selecionados'} do quadro.`
          }
          loading={deleteLoading}
          onCancel={closeDeleteModal}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}
