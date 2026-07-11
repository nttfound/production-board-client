import React, { useEffect } from 'react';

export default function DeleteConfirmModal({ title, description, count = 1, loading = false, onCancel, onConfirm }) {
  useEffect(() => {
    const handler = (event) => {
      if (event.key === 'Escape' && !loading) onCancel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [loading, onCancel]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        background: 'rgba(0,0,0,0.68)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={loading ? undefined : onCancel}
    >
      <div
        style={{
          width: 390,
          maxWidth: '100%',
          background: 'var(--bg-surface1)',
          border: '1px solid rgba(239,68,68,0.24)',
          borderRadius: 16,
          boxShadow: 'var(--shadow-modal)',
          padding: 22,
          animation: 'scaleIn 0.18s ease',
        }}
        onClick={event => event.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: 'var(--status-red)',
              background: 'rgba(239,68,68,0.10)',
              border: '1px solid rgba(239,68,68,0.24)',
            }}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6M14 11v6" />
            </svg>
          </div>

          <div style={{ minWidth: 0, flex: 1 }}>
            <h2 style={{ margin: '0 0 5px', color: 'var(--text-primary)', fontSize: 16, fontWeight: 700 }}>
              Excluir {count === 1 ? 'card' : 'cards'}
            </h2>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.55, fontFamily: 'var(--font-text)' }}>
              {description}
            </p>
            {title && (
              <div
                style={{
                  marginTop: 14,
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: 'var(--bg-surface2)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-secondary)',
                  fontSize: 12,
                  lineHeight: 1.45,
                  fontFamily: 'var(--font-text)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={title}
              >
                {title}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 22 }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: 12,
              border: '1px solid var(--border-default)',
              background: 'transparent',
              color: loading ? 'var(--text-faint)' : 'var(--text-secondary)',
              fontSize: 13,
              fontFamily: 'var(--font-text)',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: 12,
              border: '1px solid rgba(239,68,68,0.34)',
              background: loading ? 'rgba(239,68,68,0.14)' : 'var(--status-red)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              fontFamily: 'var(--font-text)',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {loading && (
              <span style={{
                width: 13,
                height: 13,
                borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.35)',
                borderTopColor: '#fff',
                animation: 'spin 0.8s linear infinite',
              }} />
            )}
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}
