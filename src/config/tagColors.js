/**
 * tagColors.js — fonte única de verdade para cores dos serviços.
 *
 * Antes, essas constantes estavam duplicadas em:
 *   ProductionCard.jsx, NewCardModal.jsx, BulkActionBar.jsx, FilterBar.jsx
 *
 * Agora todos importam daqui. Para mudar a cor do Corte, edite em 1 lugar.
 */

export const TAG_COLORS = {
  corte:       '#06b6d4',
  dobra:       '#8b5cf6',
  mao_de_obra: '#f59e0b',
  calandra:    '#ec4899',
};

/**
 * Lista canônica dos serviços com label e cor.
 * Usada em NewCardModal, BulkActionBar e FilterBar.
 */
export const SERVICOS = [
  { key: 'corte',       label: 'Corte',       color: TAG_COLORS.corte       },
  { key: 'dobra',       label: 'Dobra',       color: TAG_COLORS.dobra       },
  { key: 'calandra',    label: 'Calandra',    color: TAG_COLORS.calandra    },
  { key: 'mao_de_obra', label: 'Mão de Obra', color: TAG_COLORS.mao_de_obra },
];
