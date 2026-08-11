/**
 * client/src/components/estatisticas/EstatisticasPage.jsx
 * Aba "Estatisticas" — painel de producao com dados reais dos cards
 * (quantidade_pecas, cliente_nome, cliente_cidade, created_at), agregados
 * no backend (server/routes/estatisticas.js). Nunca infere cliente pelo
 * titulo do card e nunca conta cards no lugar de pecas.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import socket from '../../services/socket';
import { useNotifications } from '../../contexts/NotificationContext';
import StatsBarChart from './StatsBarChart';
import ClientRanking from './ClientRanking';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// As datas chegam do backend como DATE (serializadas em ISO, ex: "2026-08-10T00:00:00.000Z").
// Formata sempre a partir da string, nunca via `new Date(...).toLocaleDateString()`,
// para não sofrer deslocamento de fuso horário no navegador do usuário.
function parseYmd(isoLike) {
  const [y, m, d] = String(isoLike).slice(0, 10).split('-').map(Number);
  return { y, m, d };
}
function formatDiaMes({ y, m, d }) {
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
}
function formatMesAno({ y, m }) {
  return `${MESES[m - 1]}/${y}`;
}
function formatPecas(n) {
  return new Intl.NumberFormat('pt-BR').format(Math.round(n || 0));
}

const inputStyle = {
  background: 'var(--bg-input)',
  border: '1px solid var(--border-default)',
  borderRadius: 9,
  padding: '7px 10px',
  color: 'var(--text-primary)',
  fontSize: 12,
  fontFamily: 'var(--font-text)',
  outline: 'none',
};

const EMPTY_STATS = {
  resumo: { totalEncomendadas: 0, totalProntas: 0, totalPendentes: 0, totalPedidos: 0, mediaPecasPorPedido: 0, clienteTop: null },
  semanal: [],
  mensal: [],
  ranking: [],
  opcoes: { clientes: [], cidades: [] },
};

function SummaryCard({ label, value, sub, accent }) {
  return (
    <div style={{
      flex: '1 1 200px',
      minWidth: 180,
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-default)',
      borderRadius: 14,
      padding: '14px 16px',
    }}>
      <p style={{ margin: 0, fontSize: 10, fontFamily: 'var(--font-text)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </p>
      <p style={{ margin: '6px 0 0', fontSize: 22, fontFamily: 'var(--font-display)', fontWeight: 700, color: accent || 'var(--text-primary)', lineHeight: 1.1 }}>
        {value}
      </p>
      {sub && (
        <p style={{ margin: '4px 0 0', fontSize: 11, fontFamily: 'var(--font-text)', color: 'var(--text-secondary)' }}>
          {sub}
        </p>
      )}
    </div>
  );
}

export default function EstatisticasPage() {
  const { push } = useNotifications();
  const [filtros, setFiltros] = useState({ inicio: '', fim: '', cliente: '', cidade: '' });
  const [stats, setStats] = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(true);

  const abortRef = useRef(null);
  const debounceRef = useRef(null);

  const carregar = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const params = {};
      if (filtros.inicio && filtros.fim) {
        params.inicio = filtros.inicio;
        params.fim = filtros.fim;
      }
      if (filtros.cliente) params.cliente = filtros.cliente;
      if (filtros.cidade) params.cidade = filtros.cidade;

      const res = await api.get('/api/estatisticas', { params, signal: controller.signal });
      setStats(res.data);
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return;
      console.error('[ESTATISTICAS] Falha ao carregar:', err);
      push('info', 'Não foi possível carregar as estatísticas', err.response?.data?.error || 'Tente novamente em alguns instantes.');
    } finally {
      setLoading(false);
    }
  }, [filtros, push]);

  useEffect(() => { carregar(); }, [carregar]);

  // Atualiza os paineis quando cards mudam em tempo real (com debounce, para
  // não recalcular a cada evento isolado — ex.: varias mudancas de status em sequencia).
  useEffect(() => {
    function agendarRecarga() {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(carregar, 2500);
    }
    socket.on('card:created', agendarRecarga);
    socket.on('card:updated', agendarRecarga);
    socket.on('card:deleted', agendarRecarga);
    return () => {
      socket.off('card:created', agendarRecarga);
      socket.off('card:updated', agendarRecarga);
      socket.off('card:deleted', agendarRecarga);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [carregar]);

  const semanalData = stats.semanal.map((s, i) => ({
    key: s.inicioSemana,
    label: `Semana ${i + 1}`,
    encomendadas: s.totalEncomendadas,
    prontas: s.totalProntas,
  }));

  const mensalData = stats.mensal.map(m => ({
    key: m.inicioMes,
    label: formatMesAno(parseYmd(m.inicioMes)),
    encomendadas: m.totalEncomendadas,
    prontas: m.totalProntas,
  }));

  const temFiltrosAtivos = Boolean(filtros.inicio || filtros.fim || filtros.cliente || filtros.cidade);

  function limparFiltros() {
    setFiltros({ inicio: '', fim: '', cliente: '', cidade: '' });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1100, margin: '0 auto' }}>
      {/* Filtros */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 10,
        background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
        borderRadius: 14, padding: '12px 16px',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-text)' }}>De</label>
          <input type="date" value={filtros.inicio} max={filtros.fim || undefined}
            onChange={e => setFiltros(f => ({ ...f, inicio: e.target.value }))} style={inputStyle} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-text)' }}>Até</label>
          <input type="date" value={filtros.fim} min={filtros.inicio || undefined}
            onChange={e => setFiltros(f => ({ ...f, fim: e.target.value }))} style={inputStyle} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-text)' }}>Cliente</label>
          <select value={filtros.cliente} onChange={e => setFiltros(f => ({ ...f, cliente: e.target.value }))} style={{ ...inputStyle, minWidth: 160 }}>
            <option value="">Todos</option>
            {stats.opcoes.clientes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-text)' }}>Cidade</label>
          <select value={filtros.cidade} onChange={e => setFiltros(f => ({ ...f, cidade: e.target.value }))} style={{ ...inputStyle, minWidth: 140 }}>
            <option value="">Todas</option>
            {stats.opcoes.cidades.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {temFiltrosAtivos && (
          <button onClick={limparFiltros} style={{
            background: 'transparent', border: '1px solid var(--border-default)',
            borderRadius: 9, padding: '7px 12px', color: 'var(--text-secondary)',
            fontSize: 12, fontFamily: 'var(--font-text)', cursor: 'pointer',
          }}>
            Limpar filtros
          </button>
        )}
        {loading && (
          <div style={{ width: 16, height: 16, border: '2px solid var(--border-default)', borderTopColor: 'var(--accent-blue)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginLeft: 'auto' }} />
        )}
      </div>

      {/* Cards de resumo */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <SummaryCard label="Total de peças encomendadas" value={formatPecas(stats.resumo.totalEncomendadas)} />
        <SummaryCard label="Peças prontas" value={formatPecas(stats.resumo.totalProntas)} accent="var(--status-green)" />
        <SummaryCard label="Peças pendentes" value={formatPecas(stats.resumo.totalPendentes)} />
        <SummaryCard label="Total de pedidos" value={formatPecas(stats.resumo.totalPedidos)} />
        <SummaryCard label="Média de peças por pedido" value={formatPecas(stats.resumo.mediaPecasPorPedido)} />
        <SummaryCard
          label="Cliente com maior quantidade"
          value={stats.resumo.clienteTop ? stats.resumo.clienteTop.cliente : '—'}
          sub={stats.resumo.clienteTop ? `${formatPecas(stats.resumo.clienteTop.totalPecas)} peças` : null}
          accent="var(--accent-blue)"
        />
      </div>

      {/* Gráfico semanal */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 14, padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
          <p style={{ margin: 0, fontSize: 13, fontFamily: 'var(--font-text)', fontWeight: 700, color: 'var(--text-primary)' }}>
            Produção semanal
          </p>
          {stats.semanal.length > 0 && (
            <p style={{ margin: 0, fontSize: 10, fontFamily: 'var(--font-text)', color: 'var(--text-muted)' }}>
              {formatDiaMes(parseYmd(stats.semanal[0].inicioSemana))} — {formatDiaMes(parseYmd(stats.semanal[stats.semanal.length - 1].fimSemana))}
            </p>
          )}
        </div>
        <StatsBarChart data={semanalData} />
      </div>

      {/* Gráfico mensal */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 14, padding: '16px 18px' }}>
        <p style={{ margin: '0 0 4px', fontSize: 13, fontFamily: 'var(--font-text)', fontWeight: 700, color: 'var(--text-primary)' }}>
          Produção mensal
        </p>
        <StatsBarChart data={mensalData} />
      </div>

      {/* Ranking de clientes */}
      <div>
        <p style={{ margin: '0 0 10px', fontSize: 13, fontFamily: 'var(--font-text)', fontWeight: 700, color: 'var(--text-primary)' }}>
          Top 10 clientes
        </p>
        <ClientRanking ranking={stats.ranking} loading={loading && stats.ranking.length === 0} />
      </div>
    </div>
  );
}
