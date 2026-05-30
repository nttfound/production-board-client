/**
 * ConfirmDialog.jsx
 * Modal de confirmação dark-mode para substituir window.confirm.
 *
 * window.confirm em Electron:
 *   - Bloqueia o processo renderer
 *   - Usa o estilo nativo do SO (quebra o visual dark-mode)
 *   - Não pode ser customizado
 *
 * Este componente é renderizado via useConfirm — não use diretamente.
 */

import React, { useEffect, useRef } from 'react';

export default function ConfirmDialog({ message, detail, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', danger = false, onConfirm, onCancel }) {
  const confirmRef = useRef(null);

  // Foca o botão de confirmação ao abrir (acessibilidade + UX)
  useEffect(() => {
    confirmRef.current?.focus();
  }, []);

  // Fecha com Escape
  useEffect(() => {
    const handle = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [onCancel]);

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position:   'fixed',
          inset:      0,
          zIndex:     9000,
          background: 'rgba(0,0,0,0.65)',
        }}
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={detail ? 'confirm-detail' : undefined}
        style={{
          position:      'fixed',
          inset:         0,
          zIndex:        9001,
          display:       'flex',
          alignItems:    'center',
          justifyContent:'center',
          padding:       '1rem',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          style={{
            width:        '100%',
            maxWidth:     '360px',
            background:   '#111',
            border:       '1px solid #222',
            borderRadius: '12px',
            boxShadow:    '0 24px 64px rgba(0,0,0,.8)',
            padding:      '1.5rem',
            display:      'flex',
            flexDirection:'column',
            gap:          '1rem',
          }}
        >
          {/* Ícone de aviso */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width:          '36px',
              height:         '36px',
              borderRadius:   '50%',
              background:     danger ? 'rgba(239,68,68,.12)' : 'rgba(245,158,11,.12)',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              flexShrink:     0,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke={danger ? '#ef4444' : '#f59e0b'}
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                aria-hidden="true">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>

            <p id="confirm-title" style={{ fontSize: '14px', fontWeight: 500, color: '#f0f0f0', margin: 0 }}>
              {message}
            </p>
          </div>

          {detail && (
            <p id="confirm-detail" style={{ fontSize: '13px', color: '#888', margin: 0, lineHeight: 1.5 }}>
              {detail}
            </p>
          )}

          {/* Botões */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              onClick={onCancel}
              style={{
                padding:      '7px 16px',
                fontSize:     '13px',
                background:   'transparent',
                color:        '#aaa',
                border:       '1px solid #2a2a2a',
                borderRadius: '7px',
                cursor:       'pointer',
              }}
            >
              {cancelLabel}
            </button>

            <button
              ref={confirmRef}
              onClick={onConfirm}
              style={{
                padding:      '7px 16px',
                fontSize:     '13px',
                fontWeight:   500,
                background:   danger ? '#7f1d1d' : '#1d4ed8',
                color:        danger ? '#fca5a5' : '#bfdbfe',
                border:       `1px solid ${danger ? '#991b1b' : '#1e40af'}`,
                borderRadius: '7px',
                cursor:       'pointer',
              }}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
