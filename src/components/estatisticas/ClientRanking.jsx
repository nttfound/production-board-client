/**
 * client/src/components/estatisticas/ClientRanking.jsx
 * Ranking geral/historico de clientes por quantidade de pecas solicitadas.
 */

import React from 'react';

function formatPecas(n) {
  return new Intl.NumberFormat('pt-BR').format(n || 0);
}

const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function ClientRanking({ ranking, loading }) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-default)',
      borderRadius: 14,
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '48px 1fr 140px 120px',
        gap: 8,
        padding: '10px 16px',
        borderBottom: '1px solid var(--border-default)',
        background: 'var(--bg-surface2)',
      }}>
        {['#', 'Cliente', 'Peças solicitadas', 'Pedidos'].map((h, i) => (
          <span key={h} style={{
            fontSize: 10, fontFamily: 'var(--font-text)', fontWeight: 700,
            color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em',
            textAlign: i >= 2 ? 'right' : 'left',
          }}>
            {h}
          </span>
        ))}
      </div>

      <div style={{ maxHeight: 360, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: '28px 16px', display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 22, height: 22, border: '2px solid var(--border-default)', borderTopColor: 'var(--accent-blue)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : ranking.length === 0 ? (
          <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-text)' }}>
            Nenhum pedido com cliente vinculado ainda.
          </div>
        ) : ranking.map(row => (
          <div
            key={row.cliente}
            style={{
              display: 'grid',
              gridTemplateColumns: '48px 1fr 140px 120px',
              gap: 8,
              padding: '10px 16px',
              alignItems: 'center',
              borderBottom: '1px solid var(--border-default)',
            }}
          >
            <span style={{ fontSize: 12, fontFamily: 'var(--font-text)', color: 'var(--text-secondary)', fontWeight: 700 }}>
              {MEDALS[row.posicao] || `${row.posicao}º`}
            </span>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 12, fontFamily: 'var(--font-text)', color: 'var(--text-primary)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {row.cliente}
              </p>
              {row.cidade && (
                <p style={{ margin: '1px 0 0', fontSize: 10, fontFamily: 'var(--font-text)', color: 'var(--text-muted)' }}>
                  {row.cidade}
                </p>
              )}
            </div>
            <span style={{ fontSize: 12, fontFamily: 'var(--font-text)', color: 'var(--text-primary)', fontWeight: 700, textAlign: 'right' }}>
              {formatPecas(row.totalPecas)}
            </span>
            <span style={{ fontSize: 12, fontFamily: 'var(--font-text)', color: 'var(--text-secondary)', textAlign: 'right' }}>
              {formatPecas(row.totalPedidos)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
