/**
 * client/src/components/cards/NewCardModal.jsx
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { STATUSES } from '../../services/statusConfig';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

const CORTE_COLOR    = '#06b6d4';
const DOBRA_COLOR    = '#8b5cf6';
const CALANDRA_COLOR = '#ec4899';
const MAO_COLOR      = '#f59e0b';

const TAGS = [
  { key: 'dobra',       label: 'Dobra',       color: DOBRA_COLOR    },
  { key: 'calandra',    label: 'Calandra',    color: CALANDRA_COLOR },
  { key: 'corte',       label: 'Corte',       color: CORTE_COLOR    },
  { key: 'mao_de_obra', label: 'Mão de Obra', color: MAO_COLOR      },
];

function Label({ children }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#4b5563' }}>
      {children}
    </p>
  );
}

export default function NewCardModal({ onClose, onCreated }) {
  const { can } = useAuth();

  const [title,        setTitle]        = useState('');
  const [observation,  setObservation]  = useState('');
  const [status,       setStatus]       = useState('Pending');
  const [schedDate,    setSchedDate]    = useState('');
  const [imageData,    setImageData]    = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [tags,         setTags]         = useState({ corte: false, dobra: false, calandra: false, mao_de_obra: false });
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

  const toggleTag = (key) => setTags(prev => ({ ...prev, [key]: !prev[key] }));

  const handleSubmit = async () => {
    if (!title.trim()) { setError('O título é obrigatório.'); return; }
    if (status === 'Scheduled' && !schedDate) { setError('Informe a data de agendamento.'); return; }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('title',       title.trim());
      formData.append('observation', observation.trim());
      formData.append('status',      status);
      if (status === 'Scheduled') formData.append('scheduled_date', schedDate);

      // Tags
      Object.entries(tags).forEach(([k, v]) => formData.append(k, v));

      // Imagem
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

  const selectedStatus = STATUSES.find(s => s.value === status);

  // Permissões de tag
  const tagPerms = {
    corte:       can('servico_corte'),
    dobra:       can('servico_dobra'),
    calandra:    can('servico_calandra'),
    mao_de_obra: can('servico_mao_de_obra'),
  };
  const canAnyTag = Object.values(tagPerms).some(Boolean);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="flex flex-col w-[480px] max-h-[90vh] overflow-y-auto animate-scale-in"
        style={{
          background:   '#0f0f11',
          border:       '1px solid rgba(255,255,255,0.08)',
          borderRadius: 18,
          boxShadow:    '0 32px 80px rgba(0,0,0,0.9)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.25)' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </div>
            <span className="text-[#e5e7eb] font-semibold text-[15px]">Novo Card</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
            style={{ color: '#4b5563' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#4b5563'; e.currentTarget.style.background = 'transparent'; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-5 p-5">

          {/* Imagem */}
          <div>
            <Label>Imagem</Label>
            {imagePreview ? (
              <div className="relative rounded-xl overflow-hidden" style={{ background: '#0a0a0c' }}>
                <img src={imagePreview} alt="preview" className="w-full max-h-44 object-cover" />
                <button
                  onClick={removeImage}
                  className="absolute top-2 right-2 flex items-center justify-center w-7 h-7 rounded-lg transition-all"
                  style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            ) : (
              <div
                ref={pasteAreaRef}
                tabIndex={0}
                onPaste={handlePaste}
                onClick={() => pasteAreaRef.current?.focus()}
                className="flex flex-col items-center justify-center gap-2 h-28 rounded-xl transition-all outline-none cursor-pointer"
                style={{ background: '#141416', border: '1.5px dashed #2a2a30' }}
                onFocus={e => e.currentTarget.style.borderColor = '#3b82f650'}
                onBlur={e => e.currentTarget.style.borderColor = '#2a2a30'}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="2" width="6" height="4" rx="1"/>
                  <path d="M17 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                  <line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>
                </svg>
                <span className="text-xs" style={{ color: '#4b5563' }}>
                  Cole a imagem aqui{' '}
                  <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded-md" style={{ background: '#1e1e24', border: '1px solid #2a2a30', color: '#6b7280' }}>
                    Ctrl+V
                  </kbd>
                </span>
              </div>
            )}
          </div>

          {/* Título */}
          <div>
            <Label>Título *</Label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="Título do card"
              autoFocus
              className="w-full text-sm outline-none rounded-xl px-4 py-2.5 transition-all"
              style={{
                background:  '#141416',
                border:      '1px solid #2a2a30',
                color:       '#e5e7eb',
              }}
              onFocus={e => e.target.style.borderColor = '#3b82f6'}
              onBlur={e => e.target.style.borderColor = '#2a2a30'}
            />
          </div>

          {/* Observação */}
          <div>
            <Label>Observação</Label>
            <textarea
              value={observation}
              onChange={e => setObservation(e.target.value)}
              placeholder="Detalhes, notas..."
              rows={3}
              className="w-full text-sm outline-none rounded-xl px-4 py-2.5 transition-all resize-none"
              style={{
                background: '#141416',
                border:     '1px solid #2a2a30',
                color:      '#e5e7eb',
              }}
              onFocus={e => e.target.style.borderColor = '#3b82f6'}
              onBlur={e => e.target.style.borderColor = '#2a2a30'}
            />
          </div>

          {/* Serviços */}
          {canAnyTag && (
            <div>
              <Label>Serviços</Label>
              <div className="grid grid-cols-4 gap-2">
                {TAGS.filter(t => tagPerms[t.key]).map(tag => {
                  const ativo = tags[tag.key];
                  return (
                    <button
                      key={tag.key}
                      onClick={() => toggleTag(tag.key)}
                      className="flex flex-col items-center gap-1.5 py-3 rounded-xl text-[11px] font-semibold transition-all"
                      style={ativo
                        ? { background: `${tag.color}18`, color: tag.color, border: `1px solid ${tag.color}50` }
                        : { background: '#141416', color: '#4b5563', border: '1px solid #2a2a30' }
                      }
                    >
                      {/* Checkbox visual */}
                      <div
                        className="w-4 h-4 rounded-[4px] flex items-center justify-center transition-all"
                        style={ativo
                          ? { background: tag.color, border: `1.5px solid ${tag.color}` }
                          : { background: 'transparent', border: '1.5px solid #374151' }
                        }
                      >
                        {ativo && (
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </div>
                      {tag.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Status */}
          <div>
            <Label>Status inicial</Label>
            <div className="grid grid-cols-3 gap-2">
              {STATUSES.map(s => {
                const ativo = status === s.value;
                return (
                  <button
                    key={s.value}
                    onClick={() => setStatus(s.value)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left"
                    style={ativo
                      ? { background: `${s.color}18`, color: s.color, border: `1px solid ${s.color}50` }
                      : { background: '#141416', color: '#4b5563', border: '1px solid #2a2a30' }
                    }
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: ativo ? s.color : '#374151' }}
                    />
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Data agendada */}
          {status === 'Scheduled' && (
            <div>
              <Label>Data agendada *</Label>
              <input
                type="date"
                value={schedDate}
                onChange={e => setSchedDate(e.target.value)}
                className="w-full text-sm outline-none rounded-xl px-4 py-2.5 transition-all"
                style={{
                  background: '#141416',
                  border:     '1px solid #7c3aed50',
                  color:      '#e5e7eb',
                  colorScheme: 'dark',
                }}
                onFocus={e => e.target.style.borderColor = '#7c3aed'}
                onBlur={e => e.target.style.borderColor = '#7c3aed50'}
              />
            </div>
          )}

          {/* Erro */}
          {error && (
            <div
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
              style={{ background: '#ef444412', border: '1px solid #ef444430', color: '#f87171' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex gap-2.5 px-5 py-4 flex-shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ background: 'transparent', border: '1px solid #2a2a30', color: '#6b7280' }}
            onMouseEnter={e => e.currentTarget.style.background = '#141416'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
            style={{
              background: loading ? '#1d4ed8' : '#2563eb',
              color:      'white',
              opacity:    loading ? 0.7 : 1,
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#1d4ed8'; }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#2563eb'; }}
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Criar Card
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
