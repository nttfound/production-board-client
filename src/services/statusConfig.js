export const STATUSES = [
  { value: 'Pending',          label: 'Pendente',             color: '#9ca3af', bg: 'rgba(156,163,175,0.12)' },
  { value: 'Producing',        label: 'Produzindo',           color: '#2563eb', bg: 'rgba(37,99,235,0.12)'   },
  { value: 'Ready',            label: 'Pronto',               color: '#4c956c', bg: 'rgba(22,163,74,0.12)'   },
  { value: 'No Material',      label: 'Sem Material',         color: '#DC9326', bg: 'rgba(220,38,38,0.12)'   },
  { value: 'Waiting Approval', label: 'Aguardando Aprovacao', color: '#d97706', bg: 'rgba(217,119,6,0.12)'   },
  { value: 'Scheduled',        label: 'Agendado',             color: '#7c3aed', bg: 'rgba(124,58,237,0.12)'  },
];

export function getStatus(value) {
  return STATUSES.find(s => s.value === value) || STATUSES[0];
}

export const URGENTE_COLOR = '#99582a';
export const CARGA_COLOR   = '#0096c7';
