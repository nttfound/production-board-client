/**
 * client/src/components/estatisticas/StatsBarChart.jsx
 * Grafico de colunas simples (sem dependencia externa) usado pelos paineis
 * semanal e mensal da aba Estatisticas. Destaca a maior coluna para permitir
 * identificar de imediato o periodo de maior producao.
 */

import React, { useState } from 'react';

function formatPecas(n) {
  return new Intl.NumberFormat('pt-BR').format(n || 0);
}

export default function StatsBarChart({ data, emptyLabel = 'Sem dados no periodo' }) {
  const [hoverIndex, setHoverIndex] = useState(null);
  const maxValue = Math.max(1, ...data.map(d => d.value));
  const hasData = data.some(d => d.value > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: data.length > 12 ? 6 : 14,
          height: 180,
          padding: '8px 4px 0',
          overflowX: data.length > 12 ? 'auto' : 'visible',
        }}
      >
        {!hasData ? (
          <div style={{
            width: '100%', height: '100%', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-text)',
          }}>
            {emptyLabel}
          </div>
        ) : data.map((d, i) => {
          const isMax = d.value === maxValue && d.value > 0;
          const heightPct = Math.max(3, (d.value / maxValue) * 100);
          const hovering = hoverIndex === i;
          return (
            <div
              key={d.key || i}
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-end',
                height: '100%',
                flex: data.length > 12 ? '0 0 34px' : '1 1 0',
                minWidth: data.length > 12 ? 34 : 0,
                gap: 6,
                cursor: 'default',
              }}
            >
              <span style={{
                fontSize: 10,
                fontFamily: 'var(--font-text)',
                fontWeight: isMax ? 700 : 500,
                color: isMax ? 'var(--accent-blue)' : 'var(--text-muted)',
                opacity: hovering || isMax ? 1 : 0.8,
                whiteSpace: 'nowrap',
              }}>
                {formatPecas(d.value)}
              </span>
              <div
                title={`${d.label}: ${formatPecas(d.value)} peças`}
                style={{
                  width: '100%',
                  maxWidth: 40,
                  height: `${heightPct}%`,
                  borderRadius: '6px 6px 3px 3px',
                  background: isMax
                    ? 'linear-gradient(180deg, var(--accent-blue), var(--accent-blue-dim))'
                    : hovering ? 'var(--border-accent)' : 'var(--bg-surface3)',
                  border: `1px solid ${isMax ? 'var(--accent-blue)' : 'var(--border-light)'}`,
                  transition: 'height 0.25s ease, background 0.15s',
                  boxShadow: isMax ? '0 0 0 3px rgba(59,130,246,0.12)' : 'none',
                }}
              />
            </div>
          );
        })}
      </div>

      {hasData && (
        <div style={{
          display: 'flex',
          gap: data.length > 12 ? 6 : 14,
          padding: '0 4px',
          overflowX: data.length > 12 ? 'auto' : 'visible',
        }}>
          {data.map((d, i) => (
            <div
              key={d.key || i}
              style={{
                flex: data.length > 12 ? '0 0 34px' : '1 1 0',
                minWidth: data.length > 12 ? 34 : 0,
                textAlign: 'center',
                fontSize: 10,
                fontFamily: 'var(--font-text)',
                color: d.value === maxValue && d.value > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: d.value === maxValue && d.value > 0 ? 700 : 500,
                whiteSpace: 'nowrap',
              }}
            >
              {d.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
