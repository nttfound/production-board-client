/**
 * client/src/components/cards/NewCardModal.jsx
 * Supports CTRL+V image paste via Electron IPC or browser clipboard API.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { STATUSES } from '../../services/statusConfig';
import api from '../../services/api';

const inputStyle = {
  width: '100%',
  background: 'var(--bg-input)',
  border: '1px solid var(--border-default)',
  borderRadius: 12, padding: '10px 16px',
  color: 'var(--text-primary)', fontSize: 14,
  fontFamily: 'Syne, sans-serif', outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
};

export default function NewCardModal({ onClose, onCreated }) {
  const [title,        setTitle]        = useState('');
  const [observation,  setObservation]  = useState('');
  const [status,       setStatus]       = useState('Pending');
  const [schedDate,    setSchedDate]    = useState('');
  const [imageData,    setImageData]    = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const pasteAreaRef = useRef(null);

  const handlePaste = useCallback(async (e) => {
    if (window.electronAPI?.readClipboardImage) {
      const dataUrl = await window.electronAPI.readClipboardImage();
      if (dataUrl) { setImagePreview(dataUrl); setImageData(dataUrl); return; }
    }
    const items = (e?.clipboardData || navigator.clipboard)?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        setImagePreview(URL.createObjectURL(file));
        setImageData(file);
        break;
      }
    }
  }, []);

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  useEffect(() => { pasteAreaRef.current?.focus(); }, []);

  const handleSubmit = async () => {
    if (!title.trim()) { setError('O título é obrigatório.'); return; }
    if (status === 'Scheduled' && !schedDate) { setError('Informe a data de agendamento.'); return; }
    setLoading(true); setError('');
    try {
      const formData = new FormData();
      formData.append('title',       title.trim());
      formData.append('observation', observation.trim());
      formData.append('status',      status);
      if (status === 'Scheduled') formData.append('scheduled_date', schedDate);
      if (imageData) {
        if (typeof imageData === 'string') {
          const res  = await fetch(imageData);
          const blob = await res.blob();
          formData.append('image', blob, 'pasted-image.png');
        } else {
          formData.append('image', imageData);
        }
      }
      const response = await api.post('/api/cards', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onCreated(response.data);
      onClose();
    } catch (err) {
      console.error(err);
      setError('Erro ao criar o card. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const removeImage = () => { setImageData(null); setImagePreview(null); };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-overlay)' }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-surface1)', border: '1px solid var(--border-default)',
          borderRadius: 16, padding: 24, width: 500, maxHeight: '90vh',
          overflowY: 'auto', boxShadow: 'var(--shadow-modal)',
          animation: 'scaleIn 0.18s ease',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ color: 'var(--text-primary)', fontWeight: 600, margin: 0, fontSize: 16 }}>Novo Card</h2>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', transition: 'color 0.13s' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Image */}
          <div>
            <label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'DM Mono, monospace' }}>Imagem</label>
            {imagePreview ? (
              <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: 'var(--bg-surface2)' }}>
                <img src={imagePreview} alt="preview" style={{ width: '100%', maxHeight: 192, objectFit: 'cover', display: 'block' }} />
                <button onClick={removeImage} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: 8, padding: 6, color: '#fff', cursor: 'pointer', display: 'flex' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.85)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.6)'}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            ) : (
              <div
                ref={pasteAreaRef} tabIndex={0}
                onPaste={handlePaste}
                onClick={() => pasteAreaRef.current?.focus()}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 8, height: 128, borderRadius: 12,
                  border: '1px dashed var(--border-light)',
                  background: 'var(--bg-surface2)',
                  color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer',
                  transition: 'all 0.15s', outline: 'none',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-accent)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--border-light)'}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <rect x="9" y="2" width="6" height="4" rx="1"/>
                  <path d="M17 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                  <line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>
                </svg>
                <span>Cole a imagem aqui <kbd style={{ fontFamily: 'DM Mono, monospace', background: 'var(--bg-surface3)', border: '1px solid var(--border-default)', padding: '1px 6px', borderRadius: 4, fontSize: 10 }}>Ctrl+V</kbd></span>
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'DM Mono, monospace' }}>Título *</label>
            <input
              type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Título do card"
              style={{ ...inputStyle, '::placeholder': { color: 'var(--text-muted)' } }}
              onFocus={e => { e.target.style.borderColor = 'var(--accent-blue)'; e.target.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--accent-blue) 15%, transparent)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--border-default)'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          {/* Observation */}
          <div>
            <label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'DM Mono, monospace' }}>Observação</label>
            <textarea
              value={observation} onChange={e => setObservation(e.target.value)}
              placeholder="Detalhes, notas..." rows={3}
              style={{ ...inputStyle, resize: 'none' }}
              onFocus={e => { e.target.style.borderColor = 'var(--accent-blue)'; e.target.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--accent-blue) 15%, transparent)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--border-default)'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          {/* Status */}
          <div>
            <label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'DM Mono, monospace' }}>Status inicial</label>
            <select value={status} onChange={e => setStatus(e.target.value)} style={inputStyle}
              onFocus={e => { e.target.style.borderColor = 'var(--accent-blue)'; e.target.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--accent-blue) 15%, transparent)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--border-default)'; e.target.style.boxShadow = 'none'; }}>
              {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {/* Scheduled date */}
          {status === 'Scheduled' && (
            <div style={{ animation: 'scaleIn 0.15s ease' }}>
              <label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'DM Mono, monospace' }}>Data agendada *</label>
              <input type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)} style={inputStyle}
                onFocus={e => { e.target.style.borderColor = '#a855f7'; e.target.style.boxShadow = '0 0 0 3px rgba(168,85,247,0.15)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--border-default)'; e.target.style.boxShadow = 'none'; }} />
            </div>
          )}
        </div>

        {error && (
          <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--status-red)', fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--border-default)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', transition: 'all 0.13s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-surface2)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}>
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={loading}
            style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: 'var(--accent-blue)', color: '#fff', fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, transition: 'all 0.13s' }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'var(--accent-blue-dim)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent-blue)'; }}>
            {loading ? 'Salvando...' : 'Criar Card'}
          </button>
        </div>
      </div>
    </div>
  );
}
