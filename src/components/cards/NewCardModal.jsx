/**
 * client/src/components/cards/NewCardModal.jsx
 * Supports CTRL+V image paste via Electron IPC or browser clipboard API.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { STATUSES } from '../../services/statusConfig';
import api from '../../services/api';

export default function NewCardModal({ onClose, onCreated }) {
  const [title,       setTitle]       = useState('');
  const [observation, setObservation] = useState('');
  const [status,      setStatus]      = useState('Pending');
  const [schedDate,   setSchedDate]   = useState('');
  const [imageData,   setImageData]   = useState(null);   // base64 or File
  const [imagePreview,setImagePreview]= useState(null);   // display URL
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const pasteAreaRef = useRef(null);

  // ── Handle CTRL+V paste ──────────────────────────────────
  const handlePaste = useCallback(async (e) => {
    // 1. Try Electron IPC clipboard (main process, full clipboard access)
    if (window.electronAPI?.readClipboardImage) {
      const dataUrl = await window.electronAPI.readClipboardImage();
      if (dataUrl) {
        setImagePreview(dataUrl);
        setImageData(dataUrl);   // will send as base64
        return;
      }
    }

    // 2. Fallback: browser Clipboard API (works in web without Electron)
    const items = (e?.clipboardData || navigator.clipboard)?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        const url  = URL.createObjectURL(file);
        setImagePreview(url);
        setImageData(file);
        break;
      }
    }
  }, []);

  // Listen for paste events when modal is open
  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  // Focus paste area on mount
  useEffect(() => { pasteAreaRef.current?.focus(); }, []);

  // ── Submit ───────────────────────────────────────────────
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

      // Attach image
      if (imageData) {
        if (typeof imageData === 'string') {
          // base64 → Blob
          const res  = await fetch(imageData);
          const blob = await res.blob();
          formData.append('image', blob, 'pasted-image.png');
        } else {
          // File object from browser clipboard
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

  // ── Remove image ─────────────────────────────────────────
  const removeImage = () => {
    setImageData(null);
    setImagePreview(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-6 w-[500px] max-h-[90vh] overflow-y-auto shadow-modal animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[#f0f0f0] font-semibold">Novo Card</h2>
          <button onClick={onClose} className="text-[#555] hover:text-[#8a8a8a] transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* Image paste area */}
          <div>
            <label className="block text-xs text-[#8a8a8a] mb-2 uppercase tracking-wider">Imagem</label>
            {imagePreview ? (
              <div className="relative rounded-xl overflow-hidden bg-[#1c1c1c]">
                <img src={imagePreview} alt="preview" className="w-full max-h-48 object-cover" />
                <button
                  onClick={removeImage}
                  className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-lg p-1.5 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                className="flex flex-col items-center justify-center gap-2 h-32 rounded-xl border border-dashed border-[#2a2a2a]
                           bg-[#1c1c1c] text-[#555] text-sm cursor-pointer
                           hover:border-[#3a3a3a] hover:text-[#8a8a8a] focus:border-[#3b82f6] focus:outline-none
                           transition-all duration-150"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="2" width="6" height="4" rx="1"/>
                  <path d="M17 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                  <line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>
                </svg>
                <span>Cole a imagem aqui <kbd className="font-mono bg-[#2a2a2a] px-1.5 py-0.5 rounded text-[10px]">Ctrl+V</kbd></span>
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs text-[#8a8a8a] mb-2 uppercase tracking-wider">Título *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Título do card"
              className="w-full bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-[#f0f0f0] text-sm
                         placeholder-[#555] outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]/30 transition-all"
            />
          </div>

          {/* Observation */}
          <div>
            <label className="block text-xs text-[#8a8a8a] mb-2 uppercase tracking-wider">Observação</label>
            <textarea
              value={observation}
              onChange={e => setObservation(e.target.value)}
              placeholder="Detalhes, notas..."
              rows={3}
              className="w-full bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-[#f0f0f0] text-sm
                         placeholder-[#555] outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]/30 transition-all resize-none"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs text-[#8a8a8a] mb-2 uppercase tracking-wider">Status inicial</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="w-full bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-[#f0f0f0] text-sm
                         outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]/30 transition-all"
            >
              {STATUSES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Scheduled date */}
          {status === 'Scheduled' && (
            <div className="animate-slide-up">
              <label className="block text-xs text-[#8a8a8a] mb-2 uppercase tracking-wider">Data agendada *</label>
              <input
                type="date"
                value={schedDate}
                onChange={e => setSchedDate(e.target.value)}
                className="w-full bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-[#f0f0f0] text-sm
                           outline-none focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7]/30 transition-all"
              />
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 px-4 py-3 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#ef4444] text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-[#2a2a2a] text-[#8a8a8a] text-sm hover:bg-[#1c1c1c] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-50 text-white text-sm transition-colors"
          >
            {loading ? 'Salvando...' : 'Criar Card'}
          </button>
        </div>
      </div>
    </div>
  );
}
