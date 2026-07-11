import React from 'react';
import AnexoGlobal from '../cards/AnexoGlobal';

export default function FilterBar({ search, onSearch }) {
  return (
    <div style={{
      padding: '10px 20px',
      borderBottom: '1px solid var(--border-default)',
      flexShrink: 0,
      background: 'var(--bg-app)',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      justifyContent: 'space-between',
    }}>
      <div style={{ position: 'relative', width: 300, flexShrink: 0 }}>
        <svg
          style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder="buscar..."
          style={{
            width: '100%',
            background: 'var(--bg-surface2)',
            border: '1px solid var(--border-default)',
            borderRadius: 7,
            padding: '7px 12px 7px 32px',
            color: 'var(--text-primary)',
            fontSize: 12,
            fontFamily: 'var(--font-text)',
            outline: 'none',
            transition: 'border-color 0.13s',
          }}
          onFocus={e => { e.target.style.borderColor = 'var(--border-accent)'; }}
          onBlur={e => { e.target.style.borderColor = 'var(--border-default)'; }}
        />
      </div>
      <AnexoGlobal />
    </div>
  );
}
