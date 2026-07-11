import React, { useState } from 'react';
import api from '../../services/api';

export default function ObservacaoEdit({ card, onSave, onClose }) {
  const [text,    setText]    = useState(card.observation || '');
  const [loading, setLoading] = useState(false);
  const [erro,    setErro]    = useState('');

  const handleSave = async () => {
    setLoading(true); setErro('');
    try {
      await api.patch(`/api/cards/${card.id}/observacao`, { observation: text });
      onSave(text); onClose();
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-overlay)' }} onClick={onClose}>
      <div style={{ background: 'var(--bg-surface1)', border: '1px solid var(--border-default)', borderRadius: 16, padding: 24, width: 384, boxShadow: 'var(--shadow-modal)', animation: 'scaleIn 0.18s ease' }} onClick={e => e.stopPropagation()}>
        <h2 style={{ color: 'var(--text-primary)', fontWeight: 600, margin: '0 0 4px', fontSize: 16 }}>Editar Observação</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-text)', margin: '0 0 16px' }}>{card.title}</p>

        <textarea
          value={text} onChange={e => setText(e.target.value)} rows={5}
          placeholder="Observação..." autoFocus
          style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: 12, padding: '12px 14px', color: 'var(--text-primary)', fontSize: 13, outline: 'none', resize: 'none', fontFamily: 'var(--font-text)', transition: 'border-color 0.13s', boxSizing: 'border-box' }}
          onFocus={e => e.target.style.borderColor = 'var(--accent-blue)'}
          onBlur={e => e.target.style.borderColor = 'var(--border-default)'}
        />

        {erro && <p style={{ color: 'var(--status-red)', fontSize: 11, marginTop: 6 }}>{erro}</p>}

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: '10px', borderRadius: 12, border: '1px solid var(--border-default)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', transition: 'all 0.13s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-surface2)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={loading}
            style={{ flex: 1, padding: '10px', borderRadius: 12, border: 'none', background: 'var(--accent-blue)', color: '#fff', fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, transition: 'background 0.13s' }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'var(--accent-blue-dim)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent-blue)'; }}>
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
