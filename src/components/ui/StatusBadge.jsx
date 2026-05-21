import React from 'react';
import { getStatus } from '../../services/statusConfig';

export default function StatusBadge({ status, size = 'sm' }) {
  const s = getStatus(status);
  const padding = size === 'lg' ? 'px-3 py-1.5 text-sm' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${padding}`}
      style={{ color: s.color, backgroundColor: s.bg, border: `1px solid ${s.color}30` }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
      {s.label}
    </span>
  );
}
