import React, { useState, useEffect, useRef } from 'react';
import api    from '../../services/api';
import socket from '../../services/socket';

function formatData(ts) {
  return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatHora(ts) {
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function acaoCor(acao) {
  if (acao.includes('status'))   return '#3b82f6';
  if (acao.includes('Urgente'))  return '#F75003';
  if (acao.includes('carga'))    return '#0891b2';
  if (acao.includes('observac')) return '#a3a3a3';
  if (acao.includes('servico'))  return '#8b5cf6';
  return '#6b7280';
}

function acaoIcone(acao) {
  if (acao.includes('status')) return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
    </svg>
  );
  if (acao.includes('Urgente')) return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  );
  if (acao.includes('carga')) return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
      <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
    </svg>
  );
  if (acao.includes('observac')) return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
    </svg>
  );
}

function agruparLogs(logs) {
  const grupos = [];
  for (const log of logs) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.username === log.username && ultimo.card_title === log.card_title) {
      ultimo.acoes.push({ acao: log.acao, hora: log.criado_at, id: log.id });
    } else {
      grupos.push({
        key:        log.id,
        username:   log.username,
        card_title: log.card_title,
        data:       log.criado_at,
        acoes:      [{ acao: log.acao, hora: log.criado_at, id: log.id }],
      });
    }
  }
  return grupos;
}

function GrupoLog({ grupo }) {
  const [expandido, setExpandido] = useState(false);
  const cor = acaoCor(grupo.acoes[0].acao);

  return (
    <div style={{ borderBottom: '1px solid #1a1a1a' }}>
      <button
        onClick={() => setExpandido(p => !p)}
        className="w-full flex items-start gap-2.5 px-4 py-3 hover:bg-[#141414] transition-colors text-left"
      >
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: `${cor}18`, color: cor }}
        >
          {acaoIcone(grupo.acoes[0].acao)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-[#f0f0f0] text-xs font-semibold">{grupo.username}</span>
            <span className="text-[#555] text-[10px]">em</span>
            <span className="text-[#8a8a8a] text-[11px] font-mono truncate max-w-[140px]" title={grupo.card_title}>
              {grupo.card_title}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[#444] text-[10px]">{formatData(grupo.data)}</span>
            <span className="text-[#333] text-[10px]">·</span>
            <span className="text-[#444] text-[10px] font-mono">{formatHora(grupo.data)}</span>
            {grupo.acoes.length > 1 && (
              <>
                <span className="text-[#333] text-[10px]">·</span>
                <span className="text-[10px]" style={{ color: cor }}>{grupo.acoes.length} alterações</span>
              </>
            )}
          </div>
        </div>

        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: expandido ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s', flexShrink: 0, marginTop: 4 }}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {expandido && (
        <div className="pb-2 px-4 pl-[52px]">
          {grupo.acoes.map((item, i) => (
            <div key={item.id} className="flex items-start gap-2 py-1">
              <span className="text-[#666] text-[10px] font-mono w-4 flex-shrink-0 mt-0.5 text-right">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="text-[#555] text-[10px] flex-shrink-0 mt-0.5">—</span>
              <div className="flex-1 min-w-0">
                <span className="text-[#6b7280] text-[11px] leading-relaxed">{item.acao}</span>
                {grupo.acoes.length > 1 && (
                  <span className="text-[#2a2a2a] text-[10px] font-mono ml-2">{formatHora(item.hora)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AuditPanel({ onClose }) {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    api.get('/api/audit')
      .then(res => setLogs(res.data))
      .catch(err => console.error('[AUDIT] Load error:', err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handler = (entry) => setLogs(prev => [entry, ...prev]);
    socket.on('audit:new', handler);
    return () => socket.off('audit:new', handler);
  }, []);

  const grupos = agruparLogs(logs);

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col"
        style={{ width: '380px', background: '#0f0f0f', borderLeft: '1px solid #1c1c1c', boxShadow: '-8px 0 32px rgba(0,0,0,0.5)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1c1c1c] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-[#1c1c1c] flex items-center justify-center">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            </div>
            <div>
              <p className="text-[#f0f0f0] text-sm font-semibold leading-tight">Registro de Alteracoes</p>
              <p className="text-[#555] text-[10px] leading-tight">Hoje · limpa à meia-noite</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#555] hover:text-[#8a8a8a] transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-[#2a2a2a] border-t-[#3b82f6] rounded-full animate-spin" />
            </div>
          ) : grupos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2a2a2a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <p className="text-[#444] text-xs">Nenhuma alteracao hoje</p>
            </div>
          ) : (
            grupos.map(grupo => <GrupoLog key={grupo.key} grupo={grupo} />)
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#1c1c1c] flex-shrink-0">
          <p className="text-[#444] text-[10px] text-center">
            {logs.length} {logs.length === 1 ? 'registro' : 'registros'} hoje
          </p>
        </div>
      </div>
    </>
  );
}
