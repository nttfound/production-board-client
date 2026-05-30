/**
 * client/src/components/chat/ChatPanel.jsx
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import data   from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { useAuth } from '../../contexts/AuthContext';
import socket from '../../services/socket';
import api    from '../../services/api';

const FALLBACK_COLOR = '#6b7280';

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(name) {
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(name);
}

function renderText(text, myUsername) {
  if (!text) return null;
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      const isMe = part.slice(1).toLowerCase() === myUsername?.toLowerCase();
      return (
        <span key={i} className="font-semibold rounded px-0.5"
          style={{ color: isMe ? '#f59e0b' : '#60a5fa', background: isMe ? '#f59e0b12' : 'transparent' }}>
          {part}
        </span>
      );
    }
    return part;
  });
}

function FileAttachment({ url, name, size }) {
  const img = isImage(name);

  if (img) {
    return (
      <a href={url} download={name} target="_blank" rel="noreferrer" className="block mt-2">
        <img
          src={url}
          alt={name}
          className="rounded-xl max-w-full"
          style={{ maxHeight: 200, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.06)' }}
        />
        <span className="text-[10px] mt-1 block" style={{ color: '#4b5563' }}>{name} · {formatSize(size)}</span>
      </a>
    );
  }

  return (
    <a
      href={url}
      download={name}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2.5 mt-2 px-3 py-2.5 rounded-xl transition-all"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', textDecoration: 'none' }}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#1d4ed820' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs truncate font-medium" style={{ color: '#d1d5db' }}>{name}</p>
        <p className="text-[10px]" style={{ color: '#4b5563' }}>{formatSize(size)}</p>
      </div>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
    </a>
  );
}

// Ícone de chat SVG compacto
function IconChat({ size = 18, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

export default function ChatPanel() {
  const { user, isCreator } = useAuth();

  const [open,            setOpen]            = useState(false);
  const [expanded,        setExpanded]        = useState(false);
  const [messages,        setMessages]        = useState([]);
  const [input,           setInput]           = useState('');
  const [unread,          setUnread]          = useState(0);
  const [loading,         setLoading]         = useState(false);
  const [showEmoji,       setShowEmoji]       = useState(false);
  const [socketConnected, setSocketConnected] = useState(socket.connected);
  const [hoveredId,       setHoveredId]       = useState(null);
  const [uploading,       setUploading]       = useState(false);

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const fileRef   = useRef(null);
  const openRef   = useRef(open);
  openRef.current = open;
  const userRef   = useRef(user);
  userRef.current = user;

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/chat/history');
      setMessages(res.data.filter(m => !m.deleted_at));
    } catch (err) {
      console.error('[CHAT] Falha ao carregar histórico:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && messages.length === 0) loadHistory();
  }, [open, messages.length, loadHistory]);

  useEffect(() => {
    const onMessage = (msg) => {
      if (msg.deleted_at) return;
      setMessages(prev => [...prev, msg]);
      if (!openRef.current) {
        setUnread(n => n + 1);
        if (msg.username !== userRef.current?.username) {
          window.electronAPI?.showNotification?.('chat', msg.display_name || msg.username, msg.text || 'Arquivo');
        }
      }
    };
    const onDeleted    = ({ id }) => setMessages(prev => prev.filter(m => m.id !== id));
    const onCleared    = () => setMessages([]);
    const onConnect    = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);

    setSocketConnected(socket.connected);
    socket.on('chat:message',  onMessage);
    socket.on('chat:deleted',  onDeleted);
    socket.on('chat:cleared',  onCleared);
    socket.on('connect',       onConnect);
    socket.on('disconnect',    onDisconnect);
    return () => {
      socket.off('chat:message',  onMessage);
      socket.off('chat:deleted',  onDeleted);
      socket.off('chat:cleared',  onCleared);
      socket.off('connect',       onConnect);
      socket.off('disconnect',    onDisconnect);
    };
  }, []);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  useEffect(() => {
    if (!showEmoji) return;
    const handler = (e) => {
      if (!e.target.closest('.emoji-picker-wrap') && !e.target.closest('.emoji-btn')) setShowEmoji(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showEmoji]);

  const handleOpen = () => {
    setOpen(true);
    setUnread(0);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleClose = () => {
    setOpen(false);
    setExpanded(false);
    setShowEmoji(false);
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text || !user || !socket.connected) return;
    socket.emit('chat:send', { text, card: null });
    setInput('');
    setShowEmoji(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    if (e.key === 'Escape') setShowEmoji(false);
  };

  const handleDelete = useCallback((id) => {
    socket.emit('chat:delete', { id });
  }, []);

  const canDelete = useCallback((msg) => {
    if (!user) return false;
    if (isCreator()) return true;
    if (msg.username !== user.username) return false;
    return (Date.now() - new Date(msg.created_at).getTime()) < 60 * 1000;
  }, [user, isCreator]);

  const handleFileSelect = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Arquivo muito grande. Máximo 5MB.'); return; }
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = () => {
        socket.emit('chat:file', { file_name: file.name, file_size: file.size, file_data: reader.result });
      };
      reader.readAsDataURL(file);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }, []);

  const onEmojiSelect = (emoji) => {
    const native = emoji.native;
    const el = inputRef.current;
    if (!el) { setInput(prev => prev + native); return; }
    const start = el.selectionStart;
    const end   = el.selectionEnd;
    setInput(input.slice(0, start) + native + input.slice(end));
    setTimeout(() => { el.focus(); el.setSelectionRange(start + native.length, start + native.length); }, 0);
  };

  const W = expanded ? 460 : 340;
  const H = expanded ? 620 : 460;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">

      {/* Painel principal */}
      {open && (
        <div
          className="flex flex-col rounded-2xl overflow-hidden"
          style={{
            width:      W,
            height:     H,
            background: '#0c0c0e',
            border:     '1px solid rgba(255,255,255,0.07)',
            boxShadow:  '0 32px 96px rgba(0,0,0,0.95), 0 0 0 1px rgba(255,255,255,0.03)',
            transition: 'width 0.22s cubic-bezier(.4,0,.2,1), height 0.22s cubic-bezier(.4,0,.2,1)',
          }}
        >
          {/* ── Header ── */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{
              background:   'linear-gradient(180deg, #141416 0%, #0f0f11 100%)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div className="flex items-center gap-2.5">
              {/* Status dot */}
              <div className="relative flex items-center justify-center">
                <IconChat size={15} color="#374151" />
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full"
                  style={{
                    background: socketConnected ? '#22c55e' : '#ef4444',
                    boxShadow:  socketConnected ? '0 0 6px #22c55e80' : '0 0 6px #ef444480',
                    border: '1.5px solid #0f0f11',
                  }}
                />
              </div>
              <span className="text-[13px] font-semibold tracking-tight" style={{ color: '#e5e7eb' }}>
                Chat
              </span>
              {!socketConnected && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md" style={{ color: '#ef4444', background: '#ef444412', border: '1px solid #ef444420' }}>
                  offline
                </span>
              )}
            </div>

            <div className="flex items-center gap-0.5">
              {/* Expandir */}
              <button
                onClick={() => setExpanded(e => !e)}
                className="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
                style={{ color: '#374151' }}
                onMouseEnter={e => e.currentTarget.style.color = '#9ca3af'}
                onMouseLeave={e => e.currentTarget.style.color = '#374151'}
                title={expanded ? 'Recolher' : 'Expandir'}
              >
                {expanded ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/>
                    <line x1="10" y1="14" x2="3" y2="21"/><line x1="21" y1="3" x2="14" y2="10"/>
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                    <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                  </svg>
                )}
              </button>

              {/* Fechar */}
              <button
                onClick={handleClose}
                className="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
                style={{ color: '#374151' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = '#ef444412'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#374151'; e.currentTarget.style.background = 'transparent'; }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>

          {/* ── Mensagens ── */}
          <div
            className="flex-1 overflow-y-auto py-3 px-2"
            style={{
              background: '#0c0c0e',
              scrollbarWidth: 'thin',
              scrollbarColor: '#1f2937 transparent',
            }}
          >
            {loading ? (
              <div className="flex justify-center items-center h-full">
                <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: '#1f2937', borderTopColor: '#3b82f6' }} />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <IconChat size={24} color="#374151" />
                </div>
                <p className="text-xs" style={{ color: '#374151' }}>Nenhuma mensagem ainda</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {messages.map((msg, i) => {
                  const color   = msg.color || FALLBACK_COLOR;
                  const prevMsg = messages[i - 1];
                  const grouped = prevMsg
                    && prevMsg.username === msg.username
                    && (new Date(msg.created_at) - new Date(prevMsg.created_at)) < 5 * 60000;
                  const showDelete = hoveredId === msg.id && canDelete(msg);
                  const hasFile = msg.file_url && msg.file_name;
                  const hasText = msg.text?.trim().length > 0;

                  return (
                    <div
                      key={msg.id}
                      className="group flex items-start gap-2.5 px-2 py-[3px] rounded-xl relative transition-colors"
                      style={{
                        marginTop:  grouped ? 1 : 14,
                        background: hoveredId === msg.id ? 'rgba(255,255,255,0.03)' : 'transparent',
                      }}
                      onMouseEnter={() => setHoveredId(msg.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      {/* Avatar / hora */}
                      <div className="w-8 flex-shrink-0 flex justify-center" style={{ paddingTop: 2 }}>
                        {!grouped ? (
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-bold select-none"
                            style={{
                              background: color + '18',
                              border:     `1px solid ${color}30`,
                              color,
                            }}
                          >
                            {(msg.display_name || msg.username)[0]?.toUpperCase()}
                          </div>
                        ) : (
                          <span
                            className="text-[9px] opacity-0 group-hover:opacity-100 transition-opacity tabular-nums"
                            style={{ color: '#374151', paddingTop: 3 }}
                          >
                            {formatTime(msg.created_at)}
                          </span>
                        )}
                      </div>

                      {/* Conteúdo */}
                      <div className="flex-1 min-w-0">
                        {!grouped && (
                          <div className="flex items-baseline gap-2 mb-0.5">
                            <span className="text-[13px] font-semibold leading-none" style={{ color }}>
                              {msg.display_name}
                            </span>
                            <span className="text-[10px] tabular-nums" style={{ color: '#374151' }}>
                              {formatTime(msg.created_at)}
                            </span>
                          </div>
                        )}
                        {hasText && (
                          <p className="text-[13px] leading-relaxed break-words" style={{ color: '#d1d5db' }}>
                            {renderText(msg.text, user?.username)}
                          </p>
                        )}
                        {hasFile && (
                          <FileAttachment url={msg.file_url} name={msg.file_name} size={msg.file_size} />
                        )}
                      </div>

                      {/* Deletar */}
                      {showDelete && (
                        <button
                          onClick={() => handleDelete(msg.id)}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-lg transition-all"
                          style={{ background: '#ef444415', border: '1px solid #ef444430' }}
                          title="Excluir"
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                            <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          {/* ── Input ── */}
          <div
            className="px-3 pb-3 pt-2 flex-shrink-0 relative"
            style={{ background: '#0c0c0e', borderTop: '1px solid rgba(255,255,255,0.05)' }}
          >
            {/* Emoji picker */}
            {showEmoji && (
              <div className="emoji-picker-wrap absolute right-3 z-50" style={{ bottom: 'calc(100% + 8px)' }}>
                <Picker
                  data={data}
                  onEmojiSelect={onEmojiSelect}
                  theme="dark"
                  locale="pt"
                  previewPosition="none"
                  skinTonePosition="none"
                  navPosition="bottom"
                  perLine={expanded ? 10 : 7}
                  emojiSize={20}
                  emojiButtonSize={28}
                  maxFrequentRows={2}
                />
              </div>
            )}

            {/* Caixa */}
            <div
              className="flex items-end gap-1.5 rounded-xl px-2 py-1.5"
              style={{
                background: '#141416',
                border:     '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {/* Anexo */}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading || !socketConnected}
                className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg transition-all mb-0.5"
                style={{ color: uploading ? '#1f2937' : '#374151' }}
                onMouseEnter={e => { if (!uploading) e.currentTarget.style.color = '#6b7280'; }}
                onMouseLeave={e => { e.currentTarget.style.color = uploading ? '#1f2937' : '#374151'; }}
                title="Anexar arquivo (máx. 5MB)"
              >
                {uploading ? (
                  <div className="w-3.5 h-3.5 border-2 rounded-full animate-spin" style={{ borderColor: '#374151', borderTopColor: '#3b82f6' }} />
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                  </svg>
                )}
              </button>
              <input ref={fileRef} type="file" className="hidden" onChange={handleFileSelect} />

              {/* Textarea */}
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Mensagem..."
                rows={1}
                maxLength={500}
                className="flex-1 bg-transparent text-sm outline-none resize-none"
                style={{
                  color:       '#e5e7eb',
                  maxHeight:   120,
                  lineHeight:  '1.5',
                  paddingTop:  6,
                  paddingBottom: 6,
                  caretColor:  '#3b82f6',
                }}
                onInput={e => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                }}
              />

              {/* Emoji */}
              <button
                onClick={() => setShowEmoji(e => !e)}
                className="emoji-btn w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg transition-all text-sm mb-0.5"
                style={{ opacity: showEmoji ? 1 : 0.5 }}
                title="Emojis"
              >
                😊
              </button>

              {/* Enviar */}
              <button
                onClick={handleSend}
                disabled={!input.trim() || !socketConnected}
                className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg transition-all mb-0.5"
                style={{
                  background: input.trim() && socketConnected ? '#2563eb' : 'transparent',
                  color:      input.trim() && socketConnected ? 'white' : '#1f2937',
                  border:     input.trim() && socketConnected ? 'none' : '1px solid #1f2937',
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>

            {/* Contador */}
            {input.length > 400 && (
              <div className="text-right pr-1 mt-1">
                <span className="text-[10px] tabular-nums" style={{ color: input.length >= 480 ? '#ef4444' : '#374151' }}>
                  {input.length}/500
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Botão flutuante ── */}
      <button
        onClick={open ? handleClose : handleOpen}
        className="relative flex items-center justify-center transition-all duration-200 active:scale-95"
        style={{
          width:      48,
          height:     48,
          borderRadius: 14,
          background: open
            ? 'linear-gradient(135deg, #2563eb, #1d4ed8)'
            : 'linear-gradient(180deg, #1a1a1e 0%, #111113 100%)',
          border:     `1px solid ${open ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.08)'}`,
          boxShadow:  open
            ? '0 8px 24px rgba(37,99,235,0.45)'
            : '0 4px 20px rgba(0,0,0,0.7)',
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.border = '1px solid rgba(255,255,255,0.14)'; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)'; }}
      >
        {open ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <IconChat size={17} color="#9ca3af" />
        )}

        {/* Badge de não lidas */}
        {!open && unread > 0 && (
          <div
            className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 text-[9px] font-bold text-white"
            style={{ background: '#ef4444', border: '2px solid #0c0c0e', boxShadow: '0 2px 8px rgba(239,68,68,0.5)' }}
          >
            {unread > 99 ? '99+' : unread}
          </div>
        )}
      </button>
    </div>
  );
}
