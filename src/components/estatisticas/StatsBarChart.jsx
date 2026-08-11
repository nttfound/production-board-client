/**
 * client/src/components/estatisticas/StatsBarChart.jsx
 * Grafico de colunas duplas (sem dependencia externa) usado pelos paineis
 * semanal e mensal da aba Estatisticas: para cada semana/mes, compara
 * "encomendadas" (todos os pedidos) com "prontas" (status Ready), lado a
 * lado, para permitir identificar de imediato o periodo de maior producao
 * e o quanto dele ja foi concluido.
 */

import React, { useState } from 'react';

function formatPecas(n) {
  return new Intl.NumberFormat('pt-BR').format(n || 0);
}

const SERIES = [
  { key: 'encomendadas', label: 'Encomendadas', color: 'var(--accent-blue)', colorDim: 'var(--accent-blue-dim)' },
  { key: 'prontas',      label: 'Prontas',       color: 'var(--status-green)', colorDim: 'var(--status-green)' },
];

export default function StatsBarChart({ data, emptyLabel = 'Sem dados no periodo' }) {
  const [hover, setHover] = useState(null); // { index, seriesKey } | null
  const maxValue = Math.max(1, ...data.map(d => Math.max(d.encomendadas || 0, d.prontas || 0)));
  const hasData = data.some(d => (d.encomendadas || 0) > 0 || (d.prontas || 0) > 0);
  const tight = data.length > 8;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Legenda */}
      <div style={{ display: 'flex', gap: 16 }}>
        {SERIES.map(s => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: s.color, display: 'inline-block' }} />
            <span style={{ fontSize: 11, fontFamily: 'var(--font-text)', color: 'var(--text-secondary)' }}>{s.label}</span>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: tight ? 10 : 18,
          height: 180,
          padding: '8px 4px 0',
          overflowX: tight ? 'auto' : 'visible',
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
          const maxEncomendadas = Math.max(...data.map(x => x.encomendadas || 0));
          const isMax = d.encomendadas > 0 && d.encomendadas === maxEncomendadas;
          return (
            <div
              key={d.key || i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-end',
                height: '100%',
                flex: tight ? '0 0 56px' : '1 1 0',
                minWidth: tight ? 56 : 0,
                gap: 6,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: '100%', width: '100%', justifyContent: 'center' }}>
                {SERIES.map(s => {
                  const value = d[s.key] || 0;
                  const heightPct = Math.max(value > 0 ? 3 : 0, (value / maxValue) * 100);
                  const isHover = hover && hover.index === i && hover.seriesKey === s.key;
                  return (
                    <div key={s.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', width: 22 }}>
                      <span style={{
                        fontSize: 9,
                        fontFamily: 'var(--font-text)',
                        fontWeight: isHover || (isMax && s.key === 'encomendadas') ? 700 : 500,
                        color: s.key === 'encomendadas' ? 'var(--text-muted)' : 'var(--text-secondary)',
                        whiteSpace: 'nowrap',
                        marginBottom: 3,
                      }}>
                        {formatPecas(value)}
                      </span>
                      <div
                        onMouseEnter={() => setHover({ index: i, seriesKey: s.key })}
                        onMouseLeave={() => setHover(null)}
                        title={`${s.label}: ${formatPecas(value)} peças`}
                        style={{
                          width: '100%',
                          height: `${heightPct}%`,
                          borderRadius: '5px 5px 2px 2px',
                          background: isHover ? s.color : `linear-gradient(180deg, ${s.color}, ${s.colorDim})`,
                          opacity: value > 0 ? 1 : 0.25,
                          border: `1px solid ${s.color}`,
                          transition: 'height 0.25s ease, opacity 0.15s',
                          boxShadow: isMax && s.key === 'encomendadas' ? '0 0 0 3px rgba(59,130,246,0.12)' : 'none',
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {hasData && (
        <div style={{
          display: 'flex',
          gap: tight ? 10 : 18,
          padding: '0 4px',
        }}>
          {data.map((d, i) => (
            <div
              key={d.key || i}
              style={{
                flex: tight ? '0 0 56px' : '1 1 0',
                minWidth: tight ? 56 : 0,
                textAlign: 'center',
                fontSize: 10,
                fontFamily: 'var(--font-text)',
                color: 'var(--text-muted)',
                fontWeight: 500,
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
