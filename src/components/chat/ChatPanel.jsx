import React, { useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import socket from '../../services/socket';
import { useAuth } from '../../contexts/AuthContext';

function formatTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}kb`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}mb`;
}

function DeleteBtn({ onDelete, mine }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <button
      onClick={onDelete}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'absolute', top: -8, right: mine ? 'auto' : -8, left: mine ? -8 : 'auto',
        width: 20, height: 20, borderRadius: 5,
        background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
        color: hovered ? '#ef4444' : '#333', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: hovered ? 1 : 0,
        transition: 'color 0.13s, opacity 0.13s',
      }}
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>
      </svg>
    </button>
  );
}

function Avatar({ name, color }) {
  const initials = (name || '?').slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: 26, height: 26, borderRadius: 8, flexShrink: 0,
      background: `${color || '#3b82f6'}20`,
      border: `1px solid ${color || '#3b82f6'}30`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: color || '#3b82f6', fontSize: 9, fontWeight: 700,
      fontFamily: 'DM Mono, monospace',
    }}>
      {initials}
    </div>
  );
}

export default function ChatPanel({ onClose }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [sendingFile, setSendingFile] = useState(false);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    api.get('/api/chat/history')
      .then(res => { if (mounted) setMessages(res.data); })
      .catch(() => { if (mounted) setError('Nao foi possivel carregar o chat.'); });

    const handleMessage = msg => setMessages(prev => [...prev, msg]);
    const handleDeleted = ({ id }) => setMessages(prev => prev.filter(msg => msg.id !== Number(id)));
    const handleCleared = () => setMessages([]);
    const handleError = payload => setError(payload?.message || 'Erro no chat.');

    socket.on('chat:message', handleMessage);
    socket.on('chat:deleted', handleDeleted);
    socket.on('chat:cleared', handleCleared);
    socket.on('chat:error', handleError);

    return () => {
      mounted = false;
      socket.off('chat:message', handleMessage);
      socket.off('chat:deleted', handleDeleted);
      socket.off('chat:cleared', handleCleared);
      socket.off('chat:error', handleError);
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const sendText = (event) => {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    socket.emit('chat:send', { text: trimmed });
    setText('');
    setError('');
    inputRef.current?.focus();
  };

  const sendFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const allowed = ['png', 'jpg', 'jpeg', 'dxf', 'dwg', 'pdf'];
    const ext = file.name.toLowerCase().split('.').pop();
    if (!allowed.includes(ext)) { setError('Use PNG, JPG, DXF, DWG ou PDF.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Arquivo maximo: 5 MB.'); return; }
    setSendingFile(true);
    setError('');
    const reader = new FileReader();
    reader.onload = () => { socket.emit('chat:file', { file_name: file.name, file_data: reader.result }); setSendingFile(false); };
    reader.onerror = () => { setError('Nao foi possivel ler o arquivo.'); setSendingFile(false); };
    reader.readAsDataURL(file);
  };

  const deleteMessage = (id) => {
    socket.emit('chat:delete', { id });
  };

  // Group messages by sender for visual grouping
  const groupedMessages = messages.map((msg, i) => ({
    ...msg,
    showAvatar: i === 0 || messages[i - 1].username !== msg.username,
  }));

  return (
    <aside style={{
      position: 'fixed', right: 0, top: 0, zIndex: 50,
      height: '100vh', width: 360, maxWidth: '92vw',
      background: 'var(--bg-surface)',
      borderLeft: '1px solid var(--border-default)',
      boxShadow: '-20px 0 60px rgba(0,0,0,0.6)',
      display: 'flex', flexDirection: 'column',
      animation: 'fadeIn 0.18s ease',
    }}>
      {/* Header */}
      <div style={{
        height: 52,
        padding: '0 16px',
        borderBottom: '1px solid var(--border-default)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            boxShadow: '0 0 8px rgba(34,197,94,0.5)',
          }} />
          <div>
            <h2 style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 700, lineHeight: 1, margin: 0 }}>Chat</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 9, fontFamily: 'DM Mono, monospace', margin: 0, marginTop: 2 }}>
              {messages.length} msgs
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 28, height: 28, borderRadius: 7,
            background: 'transparent', border: '1px solid var(--border-default)',
            color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.13s',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-surface2)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          margin: '8px 12px 0', padding: '8px 12px', borderRadius: 8,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)',
          color: '#ef4444', fontSize: 11, fontFamily: 'DM Mono, monospace',
        }}>
          {error}
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 4px' }}>
        {messages.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--border-accent)" strokeWidth="1.5" strokeLinecap="round">
              <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/>
            </svg>
            <span style={{ color: 'var(--text-muted)', fontSize: 12, fontFamily: 'DM Mono, monospace' }}>nenhuma mensagem</span>
          </div>
        ) : groupedMessages.map(msg => {
          const mine = msg.username === user?.username || msg.user_id === user?.id;
          const canDelete = mine || user?.role === 'creator';

          return (
            <div
              key={msg.id}
              className="group"
              style={{
                display: 'flex',
                flexDirection: mine ? 'row-reverse' : 'row',
                gap: 8,
                marginBottom: msg.showAvatar ? 10 : 3,
                alignItems: 'flex-end',
              }}
            >
              {/* Avatar */}
              {!mine && (
                <div style={{ opacity: msg.showAvatar ? 1 : 0, flexShrink: 0 }}>
                  <Avatar name={msg.display_name || msg.username} color={msg.color} />
                </div>
              )}

              <div style={{ maxWidth: '78%', display: 'flex', flexDirection: 'column', gap: 2, alignItems: mine ? 'flex-end' : 'flex-start' }}>
                {msg.showAvatar && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexDirection: mine ? 'row-reverse' : 'row' }}>
                    <span style={{ color: msg.color || '#3b82f6', fontSize: 10, fontWeight: 700, fontFamily: 'Syne, sans-serif' }}>
                      {msg.display_name || msg.username}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 9, fontFamily: 'DM Mono, monospace' }}>
                      {formatTime(msg.created_at)}
                    </span>
                  </div>
                )}

                <div
                  style={{
                    padding: '8px 11px',
                    borderRadius: mine ? '10px 10px 4px 10px' : '10px 10px 10px 4px',
                    background: mine ? 'rgba(37,99,235,0.15)' : 'var(--bg-surface1)',
                    border: mine ? '1px solid rgba(59,130,246,0.2)' : '1px solid var(--border-default)',
                    position: 'relative',
                  }}
                >
                  {msg.text && (
                    <p style={{
                      color: 'var(--text-primary)', fontSize: 12, lineHeight: 1.55,
                      whiteSpace: 'pre-wrap', wordBreak: 'break-words',
                      margin: 0, fontFamily: 'Syne, sans-serif',
                    }}>
                      {msg.text}
                    </p>
                  )}

                  {msg.file_url && (
                    <a
                      href={msg.file_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        marginTop: msg.text ? 6 : 0,
                        padding: '7px 10px', borderRadius: 7,
                        border: '1px solid var(--border-default)', background: 'var(--bg-surface)',
                        color: 'var(--text-secondary)', fontSize: 11, textDecoration: 'none',
                        fontFamily: 'DM Mono, monospace',
                        transition: 'border-color 0.13s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-accent)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <path d="M14 2v6h6"/>
                      </svg>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {msg.file_name || 'arquivo'}
                      </span>
                      <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{formatSize(msg.file_size)}</span>
                    </a>
                  )}

                  {canDelete && (
                    <DeleteBtn onDelete={() => deleteMessage(msg.id)} mine={mine} />
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '10px 12px 12px',
        borderTop: '1px solid var(--border-default)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <input ref={fileRef} type="file" style={{ display: 'none' }} accept=".png,.jpg,.jpeg,.dxf,.dwg,.pdf" onChange={sendFile} />

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={sendingFile}
          style={{
            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
            border: '1px solid var(--border-default)', background: 'transparent',
            color: sendingFile ? 'var(--text-faint)' : 'var(--text-muted)',
            cursor: sendingFile ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.13s',
          }}
          onMouseEnter={e => { if (!sendingFile) { e.currentTarget.style.background = 'var(--bg-surface1)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21.44 11.05 12.25 20.24a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
          </svg>
        </button>

        <form onSubmit={sendText} style={{ flex: 1, display: 'flex', gap: 8 }}>
          <input
            ref={inputRef}
            value={text}
            onChange={e => setText(e.target.value)}
            maxLength={500}
            placeholder="mensagem..."
            style={{
              flex: 1, height: 36,
              background: 'var(--bg-input)', border: '1px solid var(--border-default)',
              borderRadius: 8, padding: '0 12px',
              color: 'var(--text-primary)', fontSize: 12, fontFamily: 'Syne, sans-serif',
              outline: 'none', transition: 'border-color 0.13s',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--border-accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border-default)'}
          />
          <button
            type="submit"
            style={{
              width: 36, height: 36, borderRadius: 8, flexShrink: 0,
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              border: '1px solid rgba(59,130,246,0.25)',
              color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.13s',
              boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f6, #2563eb)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, #2563eb, #1d4ed8)'; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m22 2-7 20-4-9-9-4Z"/>
              <path d="M22 2 11 13"/>
            </svg>
          </button>
        </form>
      </div>
    </aside>
  );
}
