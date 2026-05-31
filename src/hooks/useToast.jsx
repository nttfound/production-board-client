/**
 * useToast.jsx
 * Sistema de toast leve para feedback de erro/sucesso ao usuário.
 *
 * Uso:
 *   const { showToast, ToastContainer } = useToast();
 *
 *   // Exibir no JSX:
 *   <ToastContainer />
 *
 *   // Disparar toast:
 *   showToast('error',   'Falha ao atualizar status. Tente novamente.');
 *   showToast('success', 'Card atualizado com sucesso!');
 *   showToast('warn',    'Ação parcialmente concluída.');
 */

import React, { useState, useCallback, useRef } from 'react';

const ICONS = {
  error:   '✕',
  success: '✓',
  warn:    '!',
};

const COLORS = {
  error:   { bg: '#2a1010', border: '#5a1a1a', icon: '#ef4444', text: '#fca5a5' },
  success: { bg: '#0d2010', border: '#1a4a1a', icon: '#22c55e', text: '#86efac' },
  warn:    { bg: '#1e1800', border: '#4a3a00', icon: '#f59e0b', text: '#fcd34d' },
};

// Duração em ms antes do auto-dismiss
const DURATION = 4000;

let _nextId = 0;

// Componente externo — definido fora do hook para que o React nunca o desmonte
// e remonte ao re-renderizar. Antes era criado via useCallback dentro do hook,
// o que fazia o React tratar cada nova referência como um componente diferente,
// perdendo animações e estado de foco a cada toast.
function ToastContainer({ toasts, onDismiss }) {
  if (!toasts.length) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      style={{
        position:      'fixed',
        bottom:        '1.5rem',
        right:         '1.5rem',
        zIndex:        9999,
        display:       'flex',
        flexDirection: 'column',
        gap:           '8px',
        maxWidth:      '360px',
        pointerEvents: 'none',
      }}
    >
      {toasts.map(({ id, type, message }) => {
        const c = COLORS[type] || COLORS.error;
        return (
          <div
            key={id}
            role="alert"
            style={{
              display:       'flex',
              alignItems:    'flex-start',
              gap:           '10px',
              padding:       '12px 14px',
              background:    c.bg,
              border:        `1px solid ${c.border}`,
              borderRadius:  '8px',
              boxShadow:     '0 4px 24px rgba(0,0,0,.5)',
              pointerEvents: 'all',
              animation:     'toast-in .18s ease',
            }}
          >
            {/* Ícone */}
            <span style={{
              flexShrink:  0,
              width:       '20px',
              height:      '20px',
              display:     'flex',
              alignItems:  'center',
              justifyContent: 'center',
              borderRadius: '50%',
              background:  c.border,
              color:       c.icon,
              fontSize:    '11px',
              fontWeight:  700,
            }}>
              {ICONS[type]}
            </span>

            {/* Mensagem */}
            <p style={{
              flex:       1,
              fontSize:   '13px',
              lineHeight: 1.5,
              color:      c.text,
              margin:     0,
            }}>
              {message}
            </p>

            {/* Fechar */}
            <button
              onClick={() => onDismiss(id)}
              aria-label="Fechar notificação"
              style={{
                flexShrink:  0,
                background:  'none',
                border:      'none',
                cursor:      'pointer',
                color:       '#555',
                fontSize:    '14px',
                lineHeight:  1,
                padding:     '2px',
              }}
            >
              ×
            </button>
          </div>
        );
      })}

      {/* Animação CSS injetada uma vez */}
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export function useToast() {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((type, message) => {
    const id = ++_nextId;
    setToasts(prev => [...prev, { id, type, message }]);

    // Auto-dismiss
    timers.current[id] = setTimeout(() => dismiss(id), DURATION);
  }, [dismiss]);

  return {
    showToast,
    ToastContainer: <ToastContainer toasts={toasts} onDismiss={dismiss} />,
  };
}
