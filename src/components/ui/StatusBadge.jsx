import React from 'react';
import { getStatus } from '../../services/statusConfig';

export default function StatusBadge({ status, size = 'sm' }) {
  const s = getStatus(status);
  const isLg = size === 'lg';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono font-medium tracking-wide uppercase rounded-tag tag-pill ${
        isLg ? 'px-3 py-1.5 text-[11px]' : 'px-2 py-[5px] text-[10px]'
      }`}
      style={{
        color: s.color,
        backgroundColor: `${s.color}1e`,
        border: `1px solid ${s.color}44`,
        letterSpacing: '0.06em',
      }}
    >
      <span
        className="rounded-full flex-shrink-0"
        style={{
          width: isLg ? 6 : 5,
          height: isLg ? 6 : 5,
          backgroundColor: s.color,
          boxShadow: `0 0 6px ${s.color}`,
        }}
      />
      {s.label}
    </span>
  );
}
