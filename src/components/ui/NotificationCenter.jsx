import React, { useState, useRef } from 'react';
import { useNotifications } from '../../contexts/NotificationContext';

// ─── Config por tipo ──────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  chat: {
    color:  '#3b82f6',
    bg:     'rgba(37,99,235,0.10)',
    border: 'rgba(37,99,235,0.25)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/>
      </svg>
    ),
  },
  producing: {
    color:  '#2563eb',
    bg:     'rgba(37,99,235,0.10)',
    border: 'rgba(37,99,235,0.25)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
      </svg>
    ),
  },
  urgent: {
    color:  '#F75003',
    bg:     'rgba(247,80,3,0.10)',
    border: 'rgba(247,80,3,0.30)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
  },
  ready: {
    color:  '#22c55e',
    bg:     'rgba(22,197,94,0.10)',
    border: 'rgba(22,197,94,0.25)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    ),
  },
  info: {
    color:  '#9ca3af',
    bg:     'rgba(156,163,175,0.08)',
    border: 'rgba(156,163,175,0.18)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
  },
};

// ─── Single toast ─────────────────────────────────────────────────────────────
function Toast({ n, onDismiss }) {
  const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '12px 14px',
        background: hovered ? `rgba(14,14,14,0.99)` : 'rgba(10,10,10,0.97)',
        backdropFilter: 'blur(20px)',
        border: `1px solid ${n.exiting ? 'transparent' : cfg.border}`,
        borderLeft: `3px solid ${cfg.color}`,
        borderRadius: 10,
        boxShadow: `0 4px 24px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.03)`,
        cursor: 'default',
        animation: n.exiting
          ? 'toastOut 0.28s cubic-bezier(0.4,0,1,1) forwards'
          : 'toastIn 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        transformOrigin: 'right center',
        minWidth: 0,
        maxWidth: 320,
        width: 320,
      }}
    >
      {/* Icon */}
      <div style={{
        width: 28, height: 28, borderRadius: 7, flexShrink: 0,
        background: cfg.bg, border: `1px solid ${cfg.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: cfg.color,
      }}>
        {cfg.icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          margin: 0, color: '#e0e0e0', fontSize: 12, fontWeight: 700,
          fontFamily: 'Syne, sans-serif', lineHeight: 1.3,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {n.title}
        </p>
        {n.body && (
          <p style={{
            margin: '3px 0 0', color: '#666', fontSize: 11,
            fontFamily: 'DM Mono, monospace', lineHeight: 1.5,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {n.body}
          </p>
        )}
      </div>

      {/* Dismiss */}
      <button
        onClick={() => onDismiss(n.id)}
        style={{
          background: 'none', border: 'none', padding: 2, cursor: 'pointer',
          color: hovered ? '#555' : '#282828', flexShrink: 0,
          transition: 'color 0.15s',
        }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  );
}

// ─── Bell button + history panel ──────────────────────────────────────────────
function HistoryPanel({ history, onClear, onClose }) {
  return (
    <div style={{
      position: 'absolute', top: 'calc(100% + 10px)', right: 0,
      width: 340, maxHeight: 420, overflowY: 'auto',
      background: 'rgba(10,10,10,0.98)', backdropFilter: 'blur(20px)',
      border: '1px solid #1e1e1e', borderRadius: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)',
      zIndex: 9998,
      animation: 'toastIn 0.2s ease',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 14px', borderBottom: '1px solid #141414',
        position: 'sticky', top: 0, background: 'rgba(10,10,10,0.98)', zIndex: 1,
      }}>
        <span style={{ color: '#888', fontSize: 11, fontFamily: 'Syne, sans-serif', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Notificações
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {history.length > 0 && (
            <button onClick={onClear} style={{
              background: 'none', border: 'none', color: '#333', fontSize: 10,
              fontFamily: 'DM Mono, monospace', cursor: 'pointer', transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#888'}
            onMouseLeave={e => e.currentTarget.style.color = '#333'}>
              limpar
            </button>
          )}
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', padding: 2 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Items */}
      {history.length === 0 ? (
        <div style={{ padding: '32px 16px', textAlign: 'center' }}>
          <svg style={{ margin: '0 auto 10px', display: 'block', color: '#1e1e1e' }} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <p style={{ color: '#2a2a2a', fontSize: 11, fontFamily: 'DM Mono, monospace', margin: 0 }}>sem notificações</p>
        </div>
      ) : (
        <div style={{ padding: '6px 0' }}>
          {[...history].reverse().map((item, i) => {
            const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.info;
            return (
              <div key={i} style={{
                display: 'flex', gap: 10, alignItems: 'flex-start',
                padding: '10px 14px',
                borderBottom: i < history.length - 1 ? '1px solid #0f0f0f' : 'none',
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                  background: cfg.bg, border: `1px solid ${cfg.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: cfg.color,
                }}>
                  <div style={{ transform: 'scale(0.85)' }}>{cfg.icon}</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, color: '#bbb', fontSize: 11, fontWeight: 600, fontFamily: 'Syne, sans-serif' }}>{item.title}</p>
                  {item.body && <p style={{ margin: '2px 0 0', color: '#444', fontSize: 10, fontFamily: 'DM Mono, monospace', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.body}</p>}
                  <p style={{ margin: '4px 0 0', color: '#252525', fontSize: 9, fontFamily: 'DM Mono, monospace' }}>{item.time}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main export: notification stack + bell ───────────────────────────────────
export default function NotificationCenter() {
  const { notifications, dismiss } = useNotifications();
  const [history, setHistory]     = useState([]);
  const [showPanel, setShowPanel] = useState(false);
  const [unread, setUnread]       = useState(0);
  const prevIds                   = useRef(new Set());

  // Track new notifications into history
  React.useEffect(() => {
    notifications.forEach(n => {
      if (!prevIds.current.has(n.id)) {
        prevIds.current.add(n.id);
        const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        setHistory(prev => [...prev.slice(-49), { ...n, time }]);
        if (!showPanel) setUnread(u => u + 1);
      }
    });
  }, [notifications, showPanel]);

  const handleOpenPanel = () => {
    setShowPanel(true);
    setUnread(0);
  };

  return (
    <>
      {/* ── Toast stack ─────────────────────────────────────────────────── */}
      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 8,
        pointerEvents: 'none',
      }}>
        <style>{`
          @keyframes toastIn  { from { opacity:0; transform:translateX(20px) scale(0.95) } to { opacity:1; transform:translateX(0) scale(1) } }
          @keyframes toastOut { from { opacity:1; transform:translateX(0) scale(1) } to { opacity:0; transform:translateX(20px) scale(0.95) } }
        `}</style>
        {notifications.map(n => (
          <div key={n.id} style={{ pointerEvents: 'auto' }}>
            <Toast n={n} onDismiss={dismiss} />
          </div>
        ))}
      </div>

      {/* ── Bell button (rendered into TopBar via portal-like export) ────── */}
      {/* This component is exported separately as <NotificationBell /> */}
    </>
  );
}

// ─── Bell — used inside TopBar ────────────────────────────────────────────────
export function NotificationBell() {
  const { notifications, dismiss } = useNotifications();
  const [history, setHistory]     = useState([]);
  const [showPanel, setShowPanel] = useState(false);
  const [unread, setUnread]       = useState(0);
  const prevIds                   = useRef(new Set());
  const [hovered, setHovered]     = useState(false);

  React.useEffect(() => {
    notifications.forEach(n => {
      if (!prevIds.current.has(n.id)) {
        prevIds.current.add(n.id);
        const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        setHistory(prev => [...prev.slice(-49), { ...n, time }]);
        if (!showPanel) setUnread(u => u + 1);
      }
    });
  }, [notifications, showPanel]);

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => { setShowPanel(v => !v); setUnread(0); }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title="Notificações"
        style={{
          position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 34, height: 34, borderRadius: 8,
          background: hovered ? '#111' : 'transparent',
          border: `1px solid ${hovered || showPanel ? '#2a2a2a' : '#1e1e1e'}`,
          color: showPanel ? '#e8e8e8' : hovered ? '#aaa' : '#555',
          cursor: 'pointer', transition: 'all 0.13s',
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          style={{ animation: unread > 0 ? 'bellShake 0.5s ease' : 'none' }}>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>

        {/* Unread badge */}
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            minWidth: 16, height: 16, padding: '0 4px',
            borderRadius: 8, background: '#ef4444',
            color: '#fff', fontSize: 9, lineHeight: '16px', textAlign: 'center',
            fontFamily: 'DM Mono, monospace', fontWeight: 700,
            animation: 'popIn 0.25s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <style>{`
        @keyframes bellShake {
          0%,100%{transform:rotate(0)} 20%{transform:rotate(-15deg)} 40%{transform:rotate(15deg)}
          60%{transform:rotate(-10deg)} 80%{transform:rotate(10deg)}
        }
        @keyframes popIn {
          from{transform:scale(0)} to{transform:scale(1)}
        }
        @keyframes toastIn  { from{opacity:0;transform:translateX(20px) scale(0.95)} to{opacity:1;transform:translateX(0) scale(1)} }
      `}</style>

      {showPanel && (
        <>
          {/* Backdrop */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 9997 }}
            onClick={() => setShowPanel(false)}
          />
          <HistoryPanel
            history={history}
            onClear={() => setHistory([])}
            onClose={() => setShowPanel(false)}
          />
        </>
      )}
    </div>
  );
}
