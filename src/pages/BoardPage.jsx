/**
 * client/src/pages/BoardPage.jsx
 * Main production board — card grid with real-time updates + bulk selection + audit panel.
 *
 * Estratégia de carregamento:
 *  - Primeira carga: GET /api/cards?page=1&limit=50
 *  - Infinite scroll: ao chegar perto do fim da lista, carrega próxima página
 *  - Socket.IO: novos cards são adicionados no topo sem resetar a paginação
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import api            from '../services/api';
import socket         from '../services/socket';
import TopBar         from '../components/layout/TopBar';
import FilterBar      from '../components/layout/FilterBar';
import ProductionCard from '../components/cards/ProductionCard';
import NewCardModal   from '../components/cards/NewCardModal';
import BulkActionBar  from '../components/cards/BulkActionBar';
import AuditPanel     from '../components/cards/AuditPanel';
import { cargaAtivaAgora, CARGA_POR_DIA } from '../services/cargaConfig';
import ChatPanel from '../components/chat/ChatPanel';

const PAGE_LIMIT = 50;

export default function BoardPage() {
  const [cards,          setCards]          = useState([]);
  const [search,         setSearch]         = useState('');
  const [filterStatus,   setFilterStatus]   = useState('all');
  const [showNewModal,   setShowNewModal]   = useState(false);
  const [connected,      setConnected]      = useState(false);
  const [loading,        setLoading]        = useState(true);

  // ── Paginação ─────────────────────────────────────────────
  const [page,           setPage]           = useState(1);
  const [hasMore,        setHasMore]        = useState(false);
  const [loadingMore,    setLoadingMore]    = useState(false);
  const loaderRef = useRef(null);   // sentinel element para IntersectionObserver

  // ── Seleção múltipla ─────────────────────────────────────
  const [selectionMode,  setSelectionMode]  = useState(false);
  const [selectedIds,    setSelectedIds]    = useState(new Set());

  // ── Painel de auditoria ──────────────────────────────────
  const [showAudit,      setShowAudit]      = useState(false);

  // ── Filtros avançados ────────────────────────────────────
  const [filterDias,     setFilterDias]     = useState([]);
  const [filterServicos, setFilterServicos] = useState([]);

  // ── Carga inicial (página 1) ─────────────────────────────
  useEffect(() => {
    api.get('/api/cards', { params: { page: 1, limit: PAGE_LIMIT } })
      .then(res => {
        setCards(res.data.data);
        setHasMore(res.data.hasMore);
        setPage(1);
      })
      .catch(err => console.error('[BOARD] Failed to load cards:', err))
      .finally(() => setLoading(false));
  }, []);

  // ── Carrega próxima página ────────────────────────────────
  const loadNextPage = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await api.get('/api/cards', { params: { page: nextPage, limit: PAGE_LIMIT } });
      setCards(prev => {
        // Evita duplicatas que podem chegar via socket entre páginas
        const existingIds = new Set(prev.map(c => c.id));
        const newCards = res.data.data.filter(c => !existingIds.has(c.id));
        return [...prev, ...newCards];
      });
      setHasMore(res.data.hasMore);
      setPage(nextPage);
    } catch (err) {
      console.error('[BOARD] Failed to load next page:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [page, hasMore, loadingMore]);

  // ── IntersectionObserver — dispara loadNextPage ──────────
  useEffect(() => {
    const sentinel = loaderRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadNextPage(); },
      { rootMargin: '200px' },  // começa a carregar 200px antes do fim
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadNextPage]);

  // ── Socket.IO real-time events ───────────────────────────
  useEffect(() => {
    const onConnect    = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onError      = (err) => { console.log('[WS] Erro de conexão:', err.message); setConnected(false); };

    const onCreated = (card) => {
      // Novo card sempre vai para o topo; não altera paginação
      setCards(prev => {
        if (prev.some(c => c.id === card.id)) return prev; // idempotente
        return [card, ...prev];
      });
    };

    const onUpdated = (updated) => {
      setCards(prev => {
        const prev_card = prev.find(c => c.id === updated.id);
        if (updated.status === 'Ready' && prev_card?.status !== 'Ready') {
          window.electronAPI?.showNotification?.('card', updated.title, 'Card marcado como Pronto');
        } else if (updated.status === 'Producing' && prev_card?.status !== 'Producing') {
          window.electronAPI?.showNotification?.('card', updated.title, 'Entrou em produção');
        } else if (updated.urgente && !prev_card?.urgente) {
          window.electronAPI?.showNotification?.('urgent', updated.title, 'Card marcado como Urgente');
        }
        // Se o card ainda não foi carregado (está em página futura), ignora
        if (!prev_card) return prev;
        return prev.map(c => c.id === updated.id ? updated : c);
      });
      if (window.electronAPI?.notify) window.electronAPI.notify();
    };

    const onDeleted = ({ id }) => {
      setCards(prev => prev.filter(c => c.id !== id));
      setSelectedIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    };

    setConnected(socket.connected);
    socket.on('connect',       onConnect);
    socket.on('disconnect',    onDisconnect);
    socket.on('connect_error', onError);
    socket.on('card:created',  onCreated);
    socket.on('card:updated',  onUpdated);
    socket.on('card:deleted',  onDeleted);

    return () => {
      socket.off('connect',       onConnect);
      socket.off('disconnect',    onDisconnect);
      socket.off('connect_error', onError);
      socket.off('card:created',  onCreated);
      socket.off('card:updated',  onUpdated);
      socket.off('card:deleted',  onDeleted);
    };
  }, []);

  // ── Handlers individuais ─────────────────────────────────
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

  // ── Filtering + Sorting com useMemo ──────────────────────
  const sorted = useMemo(() => {
    const filtered = cards.filter(c => {
      let matchStatus;
      if (filterStatus === 'all') matchStatus = true;
      else if (filterStatus === 'urgente') matchStatus = c.urgente === true;
      else if (filterStatus === 'carga') matchStatus = cargaAtivaAgora(c.carga) && c.carga !== 'Itapira';
      else matchStatus = c.status === filterStatus;

      const q = search.toLowerCase();
      const matchSearch = !q
        || c.title.toLowerCase().includes(q)
        || c.observation?.toLowerCase().includes(q)
        || c.created_by.toLowerCase().includes(q)
        || c.carga?.toLowerCase().includes(q);

      let matchCidade = true;
      if (filterDias.length > 0) {
        // Extrai cidade do card
        const cidadeCard = c.carga === 'Itapira'
          ? 'Itapira'
          : c.carga?.startsWith('CARGA - ')
            ? c.carga.replace('CARGA - ', '')
            : null;
        if (!cidadeCard) {
          matchCidade = false;
        } else if (cidadeCard === 'Itapira') {
          matchCidade = filterDias.includes('Itapira');
        } else {
          // Verifica se algum dia selecionado contém essa cidade
          matchCidade = filterDias.some(dia => {
            const cidades = CARGA_POR_DIA[dia] || [];
            return cidades.includes(cidadeCard);
          });
        }
      }

      let matchServico = true;
      if (filterServicos.length > 0) {
        matchServico = filterServicos.some(s => c[s] === true);
      }

      return matchStatus && matchSearch && matchCidade && matchServico;
    });

    return [...filtered].sort((a, b) => {
      const aReady = a.status === 'Ready' ? 1 : 0;
      const bReady = b.status === 'Ready' ? 1 : 0;
      if (aReady !== bReady) return aReady - bReady;
      if (a.urgente !== b.urgente) return b.urgente ? 1 : -1;
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }, [cards, search, filterStatus, filterDias, filterServicos]);

  // ── Handlers de seleção ───────────────────────────────────
  const toggleSelectionMode = () => {
    setSelectionMode(prev => !prev);
    setSelectedIds(new Set());
  };

  const toggleSelect = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const selectAll    = () => setSelectedIds(new Set(sorted.map(c => c.id)));
  const deselectAll  = () => setSelectedIds(new Set());
  const exitSelection = () => { setSelectionMode(false); setSelectedIds(new Set()); };

  // ── Ações em massa ────────────────────────────────────────
  const bulkApplyTag = useCallback(async (tagKey, value) => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    try {
      if (tagKey === 'urgente') {
        await api.patch('/api/cards/bulk/urgente', { ids, urgente: value });
      } else {
        await api.patch('/api/cards/bulk/servicos', { ids, tagKey, value });
      }
    } catch (err) {
      console.error('[BOARD] Bulk tag failed:', err);
    }
  }, [selectedIds]);

  const bulkApplyStatus = useCallback(async (status) => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    try {
      await api.patch('/api/cards/bulk/status', { ids, status });
    } catch (err) {
      console.error('[BOARD] Bulk status failed:', err);
    }
  }, [selectedIds]);

  const bulkApplyCarga = useCallback(async (carga) => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    try {
      await api.patch('/api/cards/bulk/carga', { ids, carga });
    } catch (err) {
      console.error('[BOARD] Bulk carga failed:', err);
    }
  }, [selectedIds]);

  return (
    <div className="flex flex-col h-screen bg-[#0d0d0d] overflow-hidden">
      <TopBar onNewCard={() => setShowNewModal(true)} connected={connected} />

      <FilterBar
        search={search}
        onSearch={setSearch}
        filterStatus={filterStatus}
        onFilterStatus={setFilterStatus}
        total={cards.length}
        selectionMode={selectionMode}
        onToggleSelectionMode={toggleSelectionMode}
        selectedCount={selectedIds.size}
        onSelectAll={selectAll}
        onDeselectAll={deselectAll}
        filteredCount={sorted.length}
        showAudit={showAudit}
        onToggleAudit={() => setShowAudit(prev => !prev)}
        filterDias={filterDias}
        onFilterDias={setFilterDias}
        filterServicos={filterServicos}
        onFilterServicos={setFilterServicos}
      />

      {/* Card grid */}
      <main className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3 text-[#555]">
              <div className="w-8 h-8 border-2 border-[#2a2a2a] border-t-[#3b82f6] rounded-full animate-spin" />
              <span className="text-sm">Carregando...</span>
            </div>
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <svg className="mx-auto mb-4 text-[#2a2a2a]" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/>
              </svg>
              <p className="text-[#555] text-sm">Nenhum card encontrado</p>
            </div>
          </div>
        ) : (
          <>
            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                paddingBottom: selectionMode ? '5rem' : '0',
              }}
            >
              {sorted.map(card => (
                <ProductionCard
                  key={card.id}
                  card={card}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                  selectionMode={selectionMode}
                  selected={selectedIds.has(card.id)}
                  onToggleSelect={toggleSelect}
                />
              ))}
            </div>

            {/* Sentinel + indicador de carregamento */}
            <div ref={loaderRef} className="flex justify-center py-6">
              {loadingMore && (
                <div className="flex items-center gap-2 text-[#555] text-sm">
                  <div className="w-4 h-4 border-2 border-[#2a2a2a] border-t-[#3b82f6] rounded-full animate-spin" />
                  Carregando mais...
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {showNewModal && (
        <NewCardModal onClose={() => setShowNewModal(false)} onCreated={() => setShowNewModal(false)} />
      )}

      {selectionMode && selectedIds.size > 0 && (
        <BulkActionBar
          count={selectedIds.size}
          onApplyTag={bulkApplyTag}
          onApplyStatus={bulkApplyStatus}
          onApplyCarga={bulkApplyCarga}
          onCancel={exitSelection}
        />
      )}

      {showAudit && <AuditPanel onClose={() => setShowAudit(false)} />}
      <ChatPanel />
    </div>
  );
}
