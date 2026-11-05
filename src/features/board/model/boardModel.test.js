import { filterCards, getPageNumbers, normalizeCard, sortCards } from './boardModel';

const cards = [
  { id: 1, title: 'Corte Norte', status: 'Pending', created_by: 'Ana', created_at: '2026-11-01T12:00:00Z' },
  { id: 2, title: 'Dobra urgente', status: 'Producing', created_by: 'Bia', urgente: true, created_at: '2026-11-02T12:00:00Z' },
  { id: 3, title: 'Pronto', status: 'Ready', created_by: 'Caio', created_at: '2026-11-03T12:00:00Z' },
];

describe('boardModel', () => {
  test('normalizes invalid or missing dates to a stable value', () => {
    expect(normalizeCard({ id: 1 })._createdAtMs).toBe(0);
  });

  test('searches title, observation and creator without throwing on missing fields', () => {
    expect(filterCards(cards, { search: 'ANA', status: 'fila' }).map(card => card.id)).toEqual([1]);
    expect(filterCards([{ id: 4, title: 'Sem autor', status: 'Pending' }], { search: 'autor', status: 'fila' })).toHaveLength(1);
  });

  test('keeps the ready filter and producing shortcut distinct', () => {
    expect(filterCards(cards, { search: '', status: 'Ready' }).map(card => card.id)).toEqual([3]);
    expect(filterCards(cards, { search: '', status: 'producing' }).map(card => card.id)).toEqual([2]);
  });

  test('places urgent work first and then applies service priority', () => {
    const ordered = sortCards([
      { id: 1, corte: true, _createdAtMs: 1 },
      { id: 2, dobra: true, _createdAtMs: 2 },
      { id: 3, urgente: true, _createdAtMs: 3 },
    ], () => false);
    expect(ordered.map(card => card.id)).toEqual([3, 2, 1]);
  });

  test('keeps pagination controls bounded around the current page', () => {
    expect(getPageNumbers(1, 4)).toEqual([1, 2, 3, 4]);
    expect(getPageNumbers(12, 20)).toEqual([9, 10, 11, 12, 13, 14, 15]);
    expect(getPageNumbers(20, 20).at(-1)).toBe(20);
  });
});
