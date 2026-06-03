import React, { useState, useEffect, useRef } from 'react';
import api    from '../../services/api';
import socket from '../../services/socket';

function formatHora(ts) {
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function acaoCor(acao) {
  if (acao.includes('status'))   return 'var(--accent-blue)';
  if (acao.includes('Urgente'))  return 'var(--accent-orange)';
  if (acao.includes('carga'))    return 'var(--corte)';
  if (acao.includes('observac')) return 'var(--text-secondary)';
  if (acao.includes('servico'))  return 'var(--dobra)';
  return 'var(--text-muted)';
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
      <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={onClose} />
      <div style={{ position: 'fixed', top: 0, right: 0, height: '100%', zIndex: 50, display: 'flex', flexDirection: 'column', width: 360, background: 'var(--bg-surface)', borderLeft: '1px solid var(--border-default)', boxShadow: '-8px 0 32px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border-default)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 24, height: 24, borderRadius: 8, background: 'var(--bg-surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="2" strokeLinecap="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            </div>
            <div>
              <p style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, margin: 0, lineHeight: 1.2 }}>Registro de Alterações</p>
              <p style={{ color: 'var(--text-muted)', fontSize: 10, margin: '2px 0 0', lineHeight: 1 }}>Hoje — limpa a meia-noite</p>
            </div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 4, transition: 'color 0.13s' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Lista */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 128 }}>
              <div style={{ width: 24, height: 24, border: '2px solid var(--border-default)', borderTopColor: 'var(--accent-blue)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : logs.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 128, gap: 8 }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--border-accent)" strokeWidth="1.5" strokeLinecap="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>Nenhuma alteração hoje</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {logs.map(log => (
                <div key={log.id} style={{ borderRadius: 10, padding: 12, background: 'var(--bg-surface1)', border: '1px solid var(--border-default)', borderLeft: `3px solid ${acaoCor(log.acao)}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: acaoCor(log.acao) }}>{log.username}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 9, fontFamily: 'DM Mono, monospace' }}>{formatHora(log.criado_at)}</span>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 11, lineHeight: 1.5, margin: 0 }}>{log.acao}</p>
                  <p style={{ fontSize: 10, marginTop: 6, fontFamily: 'DM Mono, monospace', color: 'var(--text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '6px 0 0' }} title={log.card_title}>
                    {log.card_title}
                  </p>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border-default)', flexShrink: 0 }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 10, textAlign: 'center', margin: 0 }}>
            {logs.length} {logs.length === 1 ? 'registro' : 'registros'} hoje
          </p>
        </div>
      </div>
    </>
  );
}
