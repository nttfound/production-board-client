/**
 * client/src/pages/BoardPage.jsx
 * Main production board — card grid with real-time updates.
 */

import React, { lazy, Suspense, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import api from '../services/api';
import socket from '../services/socket';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useCidades } from '../contexts/CidadesContext';
import TopBar from '../components/layout/TopBar';
import FilterBar from '../components/layout/FilterBar';
import ProductionCard from '../components/cards/ProductionCard';
import BulkActionBar from '../components/cards/BulkActionBar';
import NewCardModal from '../components/cards/NewCardModal';
import ChatPanel from '../components/chat/ChatPanel';
import DeleteConfirmModal from '../components/ui/DeleteConfirmModal';
import { CARDS_PER_PAGE, filterCards, getPageNumbers, normalizeCard, sortCards } from '../features/board/model/boardModel';
import useBoardData from '../features/board/model/useBoardData';
import useBoardActions from '../features/board/model/useBoardActions';

const ConeCalculator = lazy(() => import('../components/caldeiraria/ConeCalculator'));
const EstatisticasPage = lazy(() => import('../components/estatisticas/EstatisticasPage'));

export default function BoardPage() {
  const { user } = useAuth();
  const { config: cidadesConfig } = useCidades();
  const { push } = useNotifications();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('fila');
  const [cargaDay, setCargaDay] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatUnread, setChatUnread] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const showChatRef = useRef(showChat);
  const mainRef = useRef(null);
  const { cards, setCards, connected, loading, loadError, retry } = useBoardData({ showChatRef, setChatUnread });
  const boardActions = useBoardActions({ cards, user, push });
  const { canSelect, selectedIdSet, selectedFilteredIds, handleStatusChange, handleDelete, toggleCardSelection, clearSelection, handleBulkTag, handleBulkStatus, handleBulkCarga, handleBulkDelete, deleteRequest, deleteLoading, closeDeleteModal, confirmDelete } = boardActions;
  const canViewCaldeiraria = user?.role === 'creator' || Boolean(user?.permissions?.ver_caldeiraria);
  const canViewEstatisticas = user?.role === 'creator' || Boolean(user?.permissions?.ver_estatisticas);

  useEffect(() => { showChatRef.current = showChat; }, [showChat]);
  useEffect(() => {
    if (filterStatus === 'caldeiraria' && !canViewCaldeiraria) setFilterStatus('fila');
  }, [filterStatus, canViewCaldeiraria]);
  useEffect(() => {
    if (filterStatus === 'estatisticas' && !canViewEstatisticas) setFilterStatus('fila');
  }, [filterStatus, canViewEstatisticas]);

  const totalOpenCards = useMemo(() => cards.filter(c => c.status !== 'Ready').length, [cards]);
  const urgentCount = useMemo(() => cards.filter(c => c.urgente).length, [cards]);
  const viewTitles = {
    fila: 'Fila de produção',
    Ready: 'Prontos para envio',
    carga: 'Programação de carga',
    producing: 'Em produção',
    estatisticas: 'Estatísticas',
    caldeiraria: 'Caldeiraria',
  };
  const viewTitle = viewTitles[filterStatus] || 'Fila de produção';

  const filtered = useMemo(() => filterCards(cards, { search, status: filterStatus, cargaDay }), [cards, search, filterStatus, cargaDay, cidadesConfig]);

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

  const pageNumbers = useMemo(() => getPageNumbers(currentPage, totalPages), [currentPage, totalPages]);

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

      <main
        ref={mainRef}
        className="board-main"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '20px',
        }}
      >
        {filterStatus === 'caldeiraria' && canViewCaldeiraria ? (
          <Suspense fallback={<div className="page-loading">Carregando calculadora...</div>}><ConeCalculator /></Suspense>
        ) : filterStatus === 'estatisticas' && canViewEstatisticas ? (
          <Suspense fallback={<div className="page-loading">Carregando estatisticas...</div>}><EstatisticasPage /></Suspense>
        ) : loading ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 28, height: 28, border: '2px solid var(--border-default)', borderTopColor: 'var(--accent-blue)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-text)' }}>carregando...</span>
            </div>
          </div>
        ) : loadError && cards.length === 0 ? (
          <section className="board-feedback board-feedback-error" role="alert">
            <span className="board-feedback-mark" aria-hidden="true">!</span>
            <h2>Nao foi possivel carregar o quadro</h2>
            <p>Verifique sua conexao e tente novamente.</p>
            <button type="button" onClick={retry}>Tentar novamente</button>
          </section>
        ) : filtered.length === 0 ? (
          <section className="board-empty" aria-live="polite">
            <div className="board-empty-mark" aria-hidden="true">
              <svg style={{ margin: '0 auto 12px', display: 'block', color: 'var(--border-default)' }} width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="9" y1="9" x2="15" y2="15" /><line x1="15" y1="9" x2="9" y2="15" />
              </svg>
            </div>
            <h2>{search || cargaDay ? 'Nenhum pedido encontrado' : 'Nenhum pedido nesta fila'}</h2>
            <p>{search || cargaDay ? 'Tente mudar a busca ou remover os filtros.' : 'Os pedidos aparecerão aqui quando forem cadastrados.'}</p>
            {(search || cargaDay || filterStatus !== 'fila') && (
              <button type="button" onClick={() => { setSearch(''); setCargaDay(null); setFilterStatus('fila'); }}>Limpar filtros</button>
            )}
          </section>
        ) : (
          <div className="board-content">
            <section className="board-heading" aria-label="Resumo da visualização">
              <div>
                <p className="board-eyebrow">ITADOBRAS · PRODUÇÃO</p>
                <h1>{viewTitle}</h1>
                <p className="board-description">Acompanhe os pedidos e atualize o andamento da equipe.</p>
              </div>
              <div className="board-summary">
                <div className="board-summary-item">
                  <span className="board-summary-value">{filtered.length}</span>
                  <span className="board-summary-label">{filtered.length === 1 ? 'pedido nesta visão' : 'pedidos nesta visão'}</span>
                </div>
                <span className="board-summary-divider" aria-hidden="true" />
                <div className="board-summary-item board-summary-item--urgent">
                  <span className="board-summary-value">{urgentCount}</span>
                  <span className="board-summary-label">urgentes</span>
                </div>
              </div>
            </section>

            <div className="board-card-grid">
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
        <NewCardModal
          onClose={() => setShowNewModal(false)}
          onCreated={(card) => {
            const normalized = normalizeCard(card);
            setCards(prev => sortCards([normalized, ...prev.filter(existing => existing.id !== normalized.id)]));
          }}
        />
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
