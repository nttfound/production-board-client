/**
 * client/src/components/estatisticas/ClientRanking.jsx
 * Top 10 clientes que mais solicitaram pecas (ranking geral/historico).
 * Ordenacao: 1) maior total de pecas, 2) em empate, maior numero de pedidos
 * (resolvido no backend — ver server/routes/estatisticas.js).
 */

import React from 'react';

function formatPecas(n) {
  return new Intl.NumberFormat('pt-BR').format(n || 0);
}

const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };
const COLUMNS = '40px 1fr 140px 150px 110px';

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
        gridTemplateColumns: COLUMNS,
        gap: 8,
        padding: '10px 16px',
        borderBottom: '1px solid var(--border-default)',
        background: 'var(--bg-surface2)',
      }}>
        {['#', 'Cliente', 'Cidade', 'Peças solicitadas', 'Pedidos'].map((h, i) => (
          <span key={h} style={{
            fontSize: 10, fontFamily: 'var(--font-text)', fontWeight: 700,
            color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em',
            textAlign: i >= 3 ? 'right' : 'left',
          }}>
            {h}
          </span>
        ))}
      </div>

      <div>
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
              gridTemplateColumns: COLUMNS,
              gap: 8,
              padding: '10px 16px',
              alignItems: 'center',
              borderBottom: '1px solid var(--border-default)',
            }}
          >
            <span style={{ fontSize: 12, fontFamily: 'var(--font-text)', color: 'var(--text-secondary)', fontWeight: 700 }}>
              {MEDALS[row.posicao] || `${row.posicao}º`}
            </span>
            <p style={{ margin: 0, fontSize: 12, fontFamily: 'var(--font-text)', color: 'var(--text-primary)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {row.cliente}
            </p>
            <p style={{ margin: 0, fontSize: 12, fontFamily: 'var(--font-text)', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {row.cidade || '—'}
            </p>
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
