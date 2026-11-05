import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../../services/api';

export default function useBoardActions({ cards, user, push }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleteRequest, setDeleteRequest] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const canSelect = user?.role === 'creator' || Boolean(user?.permissions?.selecionar);
  const cardIdSet = useMemo(() => new Set(cards.map(card => card.id)), [cards]);
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedFilteredIds = useMemo(
    () => selectedIds.filter(id => cardIdSet.has(id)),
    [selectedIds, cardIdSet]
  );

  useEffect(() => {
    setSelectedIds(previous => {
      const next = previous.filter(id => cardIdSet.has(id));
      return next.length === previous.length ? previous : next;
    });
  }, [cardIdSet]);

  const handleStatusChange = useCallback(async (id, status, scheduled_date) => {
    try {
      await api.patch('/api/cards/' + id + '/status', { status, scheduled_date });
      return true;
    } catch (error) {
      console.error('[BOARD] Status update failed:', error);
      push('info', 'Nao foi possivel alterar o status', error.response?.data?.error || 'Tente novamente em alguns instantes.');
      return false;
    }
  }, [push]);

  const handleDelete = useCallback(card => {
    setDeleteRequest({ type: 'single', id: card.id, title: card.title, count: 1 });
  }, []);

  const toggleCardSelection = useCallback(id => {
    if (!canSelect) return;
    setSelectedIds(previous => previous.includes(id)
      ? previous.filter(selectedId => selectedId !== id)
      : [...previous, id]
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
    } catch (error) {
      console.error('[BOARD] Bulk tag update failed:', error);
      push('info', 'Nao foi possivel alterar', error.response?.data?.error || 'Tente novamente em alguns instantes.');
    }
  }, [selectedFilteredIds, push]);

  const handleBulkStatus = useCallback(async status => {
    if (!selectedFilteredIds.length) return;
    try {
      await api.patch('/api/cards/bulk/status', { ids: selectedFilteredIds, status });
    } catch (error) {
      console.error('[BOARD] Bulk status update failed:', error);
      push('info', 'Nao foi possivel atualizar os cards', error.response?.data?.error || 'Tente novamente em alguns instantes.');
    }
  }, [selectedFilteredIds, push]);

  const handleBulkCarga = useCallback(async carga => {
    if (!selectedFilteredIds.length) return;
    try {
      await api.patch('/api/cards/bulk/carga', { ids: selectedFilteredIds, carga });
    } catch (error) {
      console.error('[BOARD] Bulk carga update failed:', error);
      push('info', 'Nao foi possivel atualizar a carga', error.response?.data?.error || 'Tente novamente em alguns instantes.');
    }
  }, [selectedFilteredIds, push]);

  const handleBulkDelete = useCallback(() => {
    if (!selectedFilteredIds.length) return;
    setDeleteRequest({ type: 'bulk', ids: selectedFilteredIds, count: selectedFilteredIds.length });
  }, [selectedFilteredIds]);

  const closeDeleteModal = useCallback(() => {
    if (!deleteLoading) setDeleteRequest(null);
  }, [deleteLoading]);

  const confirmDelete = useCallback(async () => {
    if (!deleteRequest) return;
    setDeleteLoading(true);
    try {
      if (deleteRequest.type === 'single') {
        await api.delete('/api/cards/' + deleteRequest.id);
      } else {
        await api.delete('/api/cards/bulk', { data: { ids: deleteRequest.ids } });
        clearSelection();
      }
      setDeleteRequest(null);
    } catch (error) {
      console.error('[BOARD] Delete failed:', error);
      push('info', 'Nao foi possivel excluir', error.response?.data?.error || 'Tente novamente em alguns instantes.');
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteRequest, clearSelection, push]);

  return {
    canSelect,
    selectedIdSet,
    selectedFilteredIds,
    handleStatusChange,
    handleDelete,
    toggleCardSelection,
    clearSelection,
    handleBulkTag,
    handleBulkStatus,
    handleBulkCarga,
    handleBulkDelete,
    deleteRequest,
    deleteLoading,
    closeDeleteModal,
    confirmDelete,
  };
}
