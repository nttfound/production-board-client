/**
 * client/src/components/chat/ChatPanel.jsx
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import data   from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { useAuth } from '../../contexts/AuthContext';
import socket from '../../services/socket';
import api    from '../../services/api';

const FALLBACK_COLOR = '#8a8a8a';

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
          style={{ color: isMe ? '#fbbf24' : '#60a5fa', background: isMe ? '#fbbf2415' : 'transparent' }}>
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
      <a href={url} download={name} target="_blank" rel="noreferrer" className="block mt-1">
        <img
          src={url}
          alt={name}
          className="rounded-xl max-w-full"
          style={{ maxHeight: 200, objectFit: 'cover', border: '1px solid #2a2a2a' }}
        />
        <span className="text-[10px] text-[#555] mt-0.5 block">{name} · {formatSize(size)}</span>
      </a>
    );
  }

  return (
    <a
      href={url}
      download={name}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 mt-1 px-3 py-2 rounded-xl transition-all"
      style={{ background: '#ffffff0d', border: '1px solid #2a2a2a', textDecoration: 'none' }}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#2563eb20' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[#e5e5e5] truncate font-medium">{name}</p>
        <p className="text-[10px] text-[#555]">{formatSize(size)}</p>
      </div>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
    </a>
  );
}

export default function ChatPanel() {
  const { user } = useAuth();

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

  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const fileRef    = useRef(null);
  const openRef    = useRef(open);
  openRef.current  = open;
  const userRef    = useRef(user);
  userRef.current  = user;

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/chat/history');
      // Filtra soft-deleted
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
          window.electronAPI?.showNotification?.(
            'chat',
            msg.display_name || msg.username,
            msg.text || 'Arquivo'
          );
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
      if (!e.target.closest('.emoji-picker-wrap') && !e.target.closest('.emoji-btn')) {
        setShowEmoji(false);
      }
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
    if (!text || !user) return;
    if (!socket.connected) return;
    socket.emit('chat:send', { text, card: null });
    setInput('');
    setShowEmoji(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') setShowEmoji(false);
  };

  const handleDelete = useCallback((id) => {
    socket.emit('chat:delete', { id });
  }, []);

  const canDelete = useCallback((msg) => {
    if (!user) return false;
    if (user.username === 'itadobras') return true;
    if (msg.username !== user.username) return false;
    return (Date.now() - new Date(msg.created_at).getTime()) < 60 * 1000;
  }, [user]);

  const handleFileSelect = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Arquivo muito grande. Máximo 5MB.');
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = () => {
        socket.emit('chat:file', {
          file_name: file.name,
          file_size: file.size,
          file_data: reader.result,
        });
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
    const next  = input.slice(0, start) + native + input.slice(end);
    setInput(next);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + native.length, start + native.length);
    }, 0);
  };

  const W = expanded ? 480 : 340;
  const H = expanded ? 640 : 440;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">

      {open && (
        <div
          className="flex flex-col rounded-2xl overflow-visible animate-scale-in"
          style={{
            width:      W,
            height:     H,
            background: '#111214',
            border:     '1px solid #1e1f22',
            boxShadow:  '0 24px 80px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.03)',
            transition: 'width 0.2s ease, height 0.2s ease',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{
              background:   '#16181c',
              borderBottom: '1px solid #1e1f22',
              borderRadius: '1rem 1rem 0 0',
            }}
          >
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4f545c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <div
                  className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#16181c]"
                  style={{ background: socketConnected ? '#23a55a' : '#f23f43' }}
                />
              </div>
              <span className="text-[#e3e5e8] text-sm font-semibold tracking-wide">Chat</span>
              {!socketConnected && (
                <span className="text-[10px] text-[#f23f43] font-medium">reconectando...</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setExpanded(e => !e)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-[#4f545c] hover:text-[#b5bac1] hover:bg-[#ffffff08] transition-all"
                title={expanded ? 'Recolher' : 'Expandir'}
              >
                {expanded ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/>
                    <line x1="10" y1="14" x2="3" y2="21"/><line x1="21" y1="3" x2="14" y2="10"/>
                  </svg>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                    <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                  </svg>
                )}
              </button>
              <button
                onClick={handleClose}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-[#4f545c] hover:text-[#f23f43] hover:bg-[#f23f4315] transition-all"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Mensagens */}
          <div
            className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5"
            style={{ background: '#111214' }}
          >
            {loading ? (
              <div className="flex justify-center pt-8">
                <div className="w-5 h-5 border-2 border-[#2a2a2a] border-t-[#5865f2] rounded-full animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-[#4f545c]">
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: '#1e1f22' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                <p className="text-xs text-[#6d6f78]">Nenhuma mensagem ainda</p>
              </div>
            ) : (
              messages.map((msg, i) => {
                const isMe    = msg.username === user?.username;
                const color   = msg.color || FALLBACK_COLOR;
                const prevMsg = messages[i - 1];
                const grouped = prevMsg
                  && prevMsg.username === msg.username
                  && (new Date(msg.created_at) - new Date(prevMsg.created_at)) < 5 * 60000;
                const showDelete = hoveredId === msg.id && canDelete(msg);
                const hasFile = msg.file_url && msg.file_name;
                const hasText = msg.text && msg.text.trim().length > 0;

                return (
                  <div
                    key={msg.id}
                    className="group flex items-start gap-2 px-2 py-0.5 rounded-lg relative"
                    style={{
                      marginTop: grouped ? 0 : 12,
                      background: hoveredId === msg.id ? '#ffffff05' : 'transparent',
                    }}
                    onMouseEnter={() => setHoveredId(msg.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    {/* Avatar / espacador */}
                    <div className="w-8 flex-shrink-0 flex justify-center pt-0.5">
                      {!grouped ? (
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white select-none"
                          style={{ background: color + '33', border: `1.5px solid ${color}44` }}
                        >
                          <span style={{ color }}>{(msg.display_name || msg.username)[0]?.toUpperCase()}</span>
                        </div>
                      ) : (
                        <span className="text-[9px] text-[#4f545c] opacity-0 group-hover:opacity-100 transition-opacity leading-none mt-1">
                          {formatTime(msg.created_at)}
                        </span>
                      )}
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0">
                      {!grouped && (
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className="text-sm font-semibold" style={{ color }}>{msg.display_name}</span>
                          <span className="text-[10px] text-[#4f545c]">{formatTime(msg.created_at)}</span>
                        </div>
                      )}
                      {hasText && (
                        <p className="text-sm text-[#dcddde] leading-relaxed break-words">
                          {renderText(msg.text, user?.username)}
                        </p>
                      )}
                      {hasFile && (
                        <FileAttachment url={msg.file_url} name={msg.file_name} size={msg.file_size} />
                      )}
                    </div>

                    {/* Botão deletar */}
                    {showDelete && (
                      <button
                        onClick={() => handleDelete(msg.id)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-md transition-all"
                        style={{ background: '#f23f4320', border: '1px solid #f23f4340' }}
                        title="Excluir mensagem"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#f23f43" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                          <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div
            className="px-3 pb-3 pt-2 flex-shrink-0 relative"
            style={{ background: '#111214', borderTop: '1px solid #1e1f22', borderRadius: '0 0 1rem 1rem' }}
          >
            {/* Emoji Picker */}
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

            {/* Caixa de input estilo Discord */}
            <div
              className="flex items-end gap-2 rounded-xl px-2 py-2"
              style={{ background: '#1e1f22', border: '1px solid #2b2d31' }}
            >
              {/* Botão anexo */}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading || !socketConnected}
                className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg transition-all"
                style={{ color: uploading ? '#555' : '#4f545c' }}
                title="Anexar arquivo (máx. 5MB)"
              >
                {uploading ? (
                  <div className="w-4 h-4 border-2 border-[#4f545c] border-t-[#5865f2] rounded-full animate-spin" />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                className="flex-1 bg-transparent text-[#dcddde] text-sm placeholder-[#4f545c] outline-none resize-none"
                style={{ maxHeight: 120, lineHeight: '1.4' }}
                onInput={e => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                }}
              />

              {/* Botão emoji */}
              <button
                onClick={() => setShowEmoji(e => !e)}
                className="emoji-btn w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg transition-all text-base"
                style={{ color: showEmoji ? '#fbbf24' : '#4f545c' }}
                title="Emojis"
              >
                😊
              </button>

              {/* Botão enviar */}
              {input.trim() && (
                <button
                  onClick={handleSend}
                  disabled={!socketConnected}
                  className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg transition-all"
                  style={{ background: '#5865f2', color: 'white' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              )}
            </div>

            {/* Contador */}
            {input.length > 400 && (
              <div className="text-right pr-1 mt-1">
                <span className="text-[10px] font-mono" style={{ color: input.length >= 480 ? '#f23f43' : '#4f545c' }}>
                  {input.length}/500
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Botão flutuante */}
      <button
        onClick={open ? handleClose : handleOpen}
        className="relative flex items-center justify-center rounded-2xl shadow-2xl transition-all duration-200 active:scale-95 hover:scale-105"
        style={{
          width:      52,
          height:     52,
          background: open ? '#5865f2' : '#16181c',
          border:     `1.5px solid ${open ? '#5865f2' : '#2b2d31'}`,
          boxShadow:  open
            ? '0 8px 32px rgba(88,101,242,0.4)'
            : '0 8px 32px rgba(0,0,0,0.6)',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke={open ? 'white' : '#b5bac1'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        {!open && unread > 0 && (
          <div
            className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 rounded-full flex items-center justify-center px-1 text-[10px] font-bold text-white animate-scale-in"
            style={{ background: '#f23f43', border: '2px solid #0d0d0d' }}
          >
            {unread > 99 ? '99+' : unread}
          </div>
        )}
      </button>
    </div>
  );
}
