import React, { useState, useEffect, useRef } from 'react';
import api    from '../../services/api';
import socket from '../../services/socket';

function formatHora(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function acaoCor(acao) {
  if (acao.includes('status'))    return '#3b82f6';
  if (acao.includes('Urgente'))   return '#F75003';
  if (acao.includes('carga'))     return '#0891b2';
  if (acao.includes('observac'))  return '#a3a3a3';
  if (acao.includes('servico'))   return '#8b5cf6';
  return '#6b7280';
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

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col"
        style={{ width: '360px', background: '#0f0f0f', borderLeft: '1px solid #1c1c1c', boxShadow: '-8px 0 32px rgba(0,0,0,0.5)' }}
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
              <p className="text-[#555] text-[10px] leading-tight">Hoje — limpa a meia-noite</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#555] hover:text-[#8a8a8a] transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-[#2a2a2a] border-t-[#3b82f6] rounded-full animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2a2a2a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <p className="text-[#444] text-xs">Nenhuma alteracao hoje</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {logs.map(log => (
                <div
                  key={log.id}
                  className="rounded-xl p-3"
                  style={{ background: '#141414', border: '1px solid #1c1c1c', borderLeft: `3px solid ${acaoCor(log.acao)}` }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold" style={{ color: acaoCor(log.acao) }}>
                      {log.username}
                    </span>
                    <span className="text-[#444] text-[10px] font-mono">{formatHora(log.criado_at)}</span>
                  </div>
                  <p className="text-[#8a8a8a] text-xs leading-relaxed">{log.acao}</p>
                  <p className="text-[11px] mt-1.5 font-mono truncate" style={{ color: '#3a3a3a' }} title={log.card_title}>
                    {log.card_title}
                  </p>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
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
