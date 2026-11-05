import { CARGA_POR_DIA, cargaAtivaAgora } from '../../../services/cargaConfig';

export const CARDS_PER_PAGE = 18;

function getServiceOrder(card) {
  if (card.dobra) return 0;
  if (card.calandra) return 1;
  if (card.corte) return 2;
  return 3;
}

export function normalizeCard(card) {
  const createdAt = card._createdAtMs || Date.parse(card.created_at);
  return { ...card, _createdAtMs: Number.isFinite(createdAt) ? createdAt : 0 };
}

export function sortCards(cards, isCargaActive = carga => Boolean(carga && carga !== 'Itapira' && cargaAtivaAgora(carga))) {
  return [...cards].sort((a, b) => {
    if (Boolean(a.urgente) !== Boolean(b.urgente)) return a.urgente ? -1 : 1;
    const activeA = isCargaActive(a.carga);
    const activeB = isCargaActive(b.carga);
    if (activeA !== activeB) return activeA ? -1 : 1;
    if (!activeA && !activeB && (a.carga === 'Itapira') !== (b.carga === 'Itapira')) {
      return a.carga === 'Itapira' ? -1 : 1;
    }
    const serviceOrder = getServiceOrder(a) - getServiceOrder(b);
    if (serviceOrder) return serviceOrder;
    return (a._createdAtMs || 0) - (b._createdAtMs || 0);
  });
}

function normalized(value) {
  return String(value || '').toLocaleLowerCase('pt-BR');
}

export function filterCards(cards, { search, status, cargaDay }) {
  if (status === 'caldeiraria' || status === 'estatisticas') return [];
  const query = normalized(search.trim());
  const allCargoCities = status === 'carga' ? new Set(Object.values(CARGA_POR_DIA).flat()) : null;

  return cards.filter(card => {
    if (status === 'producing') return card.status === 'Producing';
    if (status === 'carga') {
      if (card.status === 'Ready' || !card.carga) return false;
      const city = card.carga.replace(/^CARGA - /, '');
      return cargaDay
        ? (CARGA_POR_DIA[cargaDay] || []).includes(city)
        : allCargoCities.has(city);
    }
    const statusMatches = status === 'Ready' ? card.status === 'Ready' : card.status !== 'Ready';
    if (!statusMatches) return false;
    const searchable = [card.title, card.observation, card.created_by].map(normalized);
    return !query || searchable.some(value => value.includes(query));
  });
}

export function getPageNumbers(currentPage, totalPages, maxButtons = 7) {
  if (totalPages <= maxButtons) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const half = Math.floor(maxButtons / 2);
  let start = Math.max(1, currentPage - half);
  let end = Math.min(totalPages, start + maxButtons - 1);
  if (end - start + 1 < maxButtons) start = Math.max(1, end - maxButtons + 1);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}
