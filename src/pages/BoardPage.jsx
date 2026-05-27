/**
 * client/src/pages/BoardPage.jsx
 * Main production board — card grid with real-time updates + bulk selection + audit panel.
 */

import React, { useState, useEffect, useCallback } from 'react';
import api            from '../services/api';
import socket         from '../services/socket';
import TopBar         from '../components/layout/TopBar';
import FilterBar      from '../components/layout/FilterBar';
import ProductionCard from '../components/cards/ProductionCard';
import NewCardModal   from '../components/cards/NewCardModal';
import BulkActionBar  from '../components/cards/BulkActionBar';
import AuditPanel     from '../components/cards/AuditPanel';
import { cargaAtivaAgora } from '../services/cargaConfig';
import ChatPanel from '../components/chat/ChatPanel';

export default function BoardPage() {
  const [cards,          setCards]          = useState([]);
  const [search,         setSearch]         = useState('');
  const [filterStatus,   setFilterStatus]   = useState('all');
  const [showNewModal,   setShowNewModal]   = useState(false);
  const [connected,      setConnected]      = useState(false);
  const [loading,        setLoading]        = useState(true);

  // ── Seleção múltipla ─────────────────────────────────────
  const [selectionMode,  setSelectionMode]  = useState(false);
  const [selectedIds,    setSelectedIds]    = useState(new Set());

  // ── Painel de auditoria ──────────────────────────────────
  const [showAudit,      setShowAudit]      = useState(false);

  // ── Filtros avançados ────────────────────────────────────
  const [filterCidades,  setFilterCidades]  = useState([]);
  const [filterServicos, setFilterServicos] = useState([]);

  // ── Load all cards on mount ──────────────────────────────
  useEffect(() => {
    api.get('/api/cards')
      .then(res => setCards(res.data))
      .catch(err => console.error('[BOARD] Failed to load cards:', err))
      .finally(() => setLoading(false));
  }, []);

  // ── Socket.IO real-time events ───────────────────────────
  useEffect(() => {
    const onConnect    = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onError      = (err) => { console.log('[WS] Erro de conexão:', err.message); setConnected(false); };
    const onCreated    = (card)     => setCards(prev => [card, ...prev]);
    const onUpdated    = (updated)  => {
      setCards(prev => {
        const prev_card = prev.find(c => c.id === updated.id);
        if (updated.status === 'Ready' && prev_card?.status !== 'Ready') {
          window.electronAPI?.showNotification?.('✅ Pronto', updated.title);
        } else if (updated.status === 'Producing' && prev_card?.status !== 'Producing') {
          window.electronAPI?.showNotification?.('⚡ Produzindo', updated.title);
        }
        return prev.map(c => c.id === updated.id ? updated : c);
      });
      if (window.electronAPI?.notify) window.electronAPI.notify();
    };
    const onDeleted    = ({ id })   => {
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

  // ── Filtering ─────────────────────────────────────────────
  const filtered = cards.filter(c => {
    // Filtro de status principal
    let matchStatus;
    if (filterStatus === 'all') matchStatus = true;
    else if (filterStatus === 'urgente') matchStatus = c.urgente === true;
    else if (filterStatus === 'carga') matchStatus = cargaAtivaAgora(c.carga) && c.carga !== 'Itapira';
    else matchStatus = c.status === filterStatus;

    // Filtro de busca
    const q = search.toLowerCase();
    const matchSearch = !q
      || c.title.toLowerCase().includes(q)
      || c.observation?.toLowerCase().includes(q)
      || c.created_by.toLowerCase().includes(q) || c.carga?.toLowerCase().includes(q);

    // Filtro avançado: cidades (independente do dia/hora)
    let matchCidade = true;
    if (filterCidades.length > 0) {
      const cidadeCard = c.carga === 'Itapira'
        ? 'Itapira'
        : c.carga?.startsWith('CARGA - ')
          ? c.carga.replace('CARGA - ', '')
          : null;
      matchCidade = cidadeCard !== null && filterCidades.includes(cidadeCard);
    }

    // Filtro avançado: serviços (OU — basta ter um)
    let matchServico = true;
    if (filterServicos.length > 0) {
      matchServico = filterServicos.some(s => c[s] === true);
    }

    return matchStatus && matchSearch && matchCidade && matchServico;
  });

  // ── Sorting ───────────────────────────────────────────────
const sorted = [...filtered].sort((a, b) => {
  // Ready sempre vai para o final
  const aReady = a.status === 'Ready' ? 1 : 0;
  const bReady = b.status === 'Ready' ? 1 : 0;
  if (aReady !== bReady) return aReady - bReady;
  // Urgente sobe para o topo
  if (a.urgente !== b.urgente) return b.urgente ? 1 : -1;
  // Padrão: mais novo primeiro
  return new Date(b.created_at) - new Date(a.created_at);
});

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
    let endpoint;
    if (tagKey === 'urgente') {
      endpoint = (id) => api.patch(`/api/cards/${id}/urgente`, { urgente: value });
    } else {
      endpoint = async (id) => {
        const card = cards.find(c => c.id === id);
        if (!card) return;
        const payload = {
          corte:       card.corte       || false,
          dobra:       card.dobra       || false,
          mao_de_obra: card.mao_de_obra || false,
          calandra:    card.calandra    || false,
          [tagKey]:    value,
        };
        return api.patch(`/api/cards/${id}/servicos`, payload);
      };
    }
    await Promise.allSettled(ids.map(id => endpoint(id)));
  }, [selectedIds, cards]);

  const bulkApplyStatus = useCallback(async (status) => {
    const ids = [...selectedIds];
    await Promise.allSettled(ids.map(id => api.patch(`/api/cards/${id}/status`, { status })));
  }, [selectedIds]);

  const bulkApplyCarga = useCallback(async (carga) => {
    const ids = [...selectedIds];
    await Promise.allSettled(ids.map(id => api.patch(`/api/cards/${id}/carga`, { carga })));
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
        filterCidades={filterCidades}
        onFilterCidades={setFilterCidades}
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
