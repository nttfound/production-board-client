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

function renderText(text, myUsername) {
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

export default function ChatPanel() {
  const { user } = useAuth();

  const [open,      setOpen]      = useState(false);
  const [expanded,  setExpanded]  = useState(false);
  const [messages,  setMessages]  = useState([]);
  const [input,     setInput]     = useState('');
  const [unread,    setUnread]    = useState(0);
  const [loading,         setLoading]         = useState(false);
  const [showEmoji,       setShowEmoji]       = useState(false);
  const [socketConnected, setSocketConnected] = useState(socket.connected);

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const openRef   = useRef(open);
  openRef.current = open;
  const userRef   = useRef(user);
  userRef.current = user;

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/chat/history');
      setMessages(res.data);
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
    const onMessage    = (msg) => {
      setMessages(prev => [...prev, msg]);
      if (!openRef.current) {
        setUnread(n => n + 1);
        // Notificação nativa só para mensagens de outros usuários
        if (msg.username !== userRef.current?.username) {
          window.electronAPI?.showNotification?.(
            'chat',
            msg.display_name || msg.username,
            msg.text || 'Arquivo'
          );
        }
      }
    };
    const onCleared    = () => setMessages([]);
    const onConnect    = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);

    setSocketConnected(socket.connected);
    socket.on('chat:message', onMessage);
    socket.on('chat:cleared',  onCleared);
    socket.on('connect',       onConnect);
    socket.on('disconnect',    onDisconnect);
    return () => {
      socket.off('chat:message', onMessage);
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
    if (!socket.connected) {
      console.warn('[CHAT] Socket desconectado — mensagem não enviada');
      return;
    }
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

  const W = expanded ? 480 : 320;
  const H = expanded ? 620 : 420;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">

      {open && (
        <div
          className="flex flex-col rounded-2xl border overflow-visible shadow-2xl animate-scale-in"
          style={{
            width:       W,
            height:      H,
            background:  '#111',
            borderColor: '#2a2a2a',
            boxShadow:   '0 16px 60px rgba(0,0,0,0.8)',
            transition:  'width 0.2s ease, height 0.2s ease',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
            style={{ borderColor: '#1f1f1f', background: '#141414', borderRadius: '1rem 1rem 0 0' }}>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-[#f0f0f0] text-sm font-semibold">Chat</span>
              <span className="text-[#555] text-xs">
                {socketConnected ? '· todos os usuários' : '· reconectando...'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setExpanded(e => !e)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-[#555] hover:text-[#8a8a8a] hover:bg-[#1c1c1c] transition-all"
                title={expanded ? 'Recolher' : 'Expandir'}>
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
              <button onClick={handleClose}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-[#555] hover:text-[#ef4444] hover:bg-[#1c1c1c] transition-all">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ background: '#0d0d0d' }}>
            {loading ? (
              <div className="flex justify-center pt-8">
                <div className="w-5 h-5 border-2 border-[#2a2a2a] border-t-[#3b82f6] rounded-full animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-[#333]">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <p className="text-xs">Nenhuma mensagem ainda</p>
              </div>
            ) : (
              messages.map((msg, i) => {
                const isMe    = msg.username === user?.username;
                const color   = msg.color || FALLBACK_COLOR;
                const prevMsg = messages[i - 1];
                const grouped = prevMsg && prevMsg.username === msg.username
                  && (new Date(msg.created_at) - new Date(prevMsg.created_at)) < 60000;

                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    {!grouped && (
                      <div className={`flex items-center gap-1.5 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                        <span className="text-xs font-semibold" style={{ color }}>{msg.display_name}</span>
                        <span className="text-[10px] text-[#444]">{formatTime(msg.created_at)}</span>
                      </div>
                    )}
                    <div
                      className="max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed break-words"
                      style={isMe
                        ? { background: '#1d4ed8', color: '#f0f0f0', borderBottomRightRadius: grouped ? '1rem' : '0.25rem' }
                        : { background: '#1c1c1c', color: '#e5e5e5', borderBottomLeftRadius:  grouped ? '1rem' : '0.25rem' }
                      }
                    >
                      {renderText(msg.text, user?.username)}
                    </div>
                    {grouped && (
                      <span className="text-[9px] text-[#333] mt-0.5 px-1">{formatTime(msg.created_at)}</span>
                    )}
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t flex-shrink-0 relative" style={{ borderColor: '#1f1f1f', background: '#141414', borderRadius: '0 0 1rem 1rem' }}>

            {/* Emoji Picker */}
            {showEmoji && (
              <div
                className="emoji-picker-wrap absolute right-3 z-50"
                style={{ bottom: 'calc(100% + 8px)' }}
              >
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

            <div className="flex flex-col gap-1">
              <div className="flex items-end gap-2">
                {/* Botão emoji */}
                <button
                  onClick={() => setShowEmoji(e => !e)}
                  className="emoji-btn w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl transition-all text-lg"
                  style={showEmoji
                    ? { background: '#2563eb20', border: '1px solid #2563eb50' }
                    : { background: '#1c1c1c',   border: '1px solid #2a2a2a', color: '#555' }
                  }
                  title="Emojis"
                >
                  😊
                </button>

                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Mensagem..."
                  rows={1}
                  maxLength={100}
                  className="flex-1 bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl px-3 py-2 text-[#f0f0f0] text-xs placeholder-[#444] outline-none resize-none focus:border-[#2563eb] transition-all"
                  style={{ maxHeight: 100, lineHeight: '1.4' }}
                  onInput={e => {
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
                  }}
                />

                {/* Botão enviar */}
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || !socketConnected}
                  title={!socketConnected ? 'Sem conexão' : ''}
                  className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl transition-all"
                  style={input.trim() && socketConnected
                    ? { background: '#2563eb', color: 'white' }
                    : { background: '#1c1c1c', color: '#333', cursor: 'not-allowed' }
                  }
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              </div>

              {/* Contador de caracteres */}
              {input.length > 0 && (
                <div className="text-right pr-1">
                  <span
                    className="text-[10px] font-mono"
                    style={{ color: input.length >= 90 ? '#ef4444' : '#444' }}
                  >
                    {input.length}/100
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Botão flutuante */}
      <button
        onClick={open ? handleClose : handleOpen}
        className="relative flex items-center justify-center rounded-2xl shadow-2xl transition-all duration-200 active:scale-95"
        style={{
          width:      52,
          height:     52,
          background: open ? '#1d4ed8' : '#141414',
          border:     `1.5px solid ${open ? '#2563eb' : '#2a2a2a'}`,
          boxShadow:  '0 8px 32px rgba(0,0,0,0.6)',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke={open ? 'white' : '#8a8a8a'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        {!open && unread > 0 && (
          <div
            className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 rounded-full flex items-center justify-center px-1 text-[10px] font-bold text-white animate-scale-in"
            style={{ background: '#ef4444', border: '2px solid #0d0d0d' }}
          >
            {unread > 99 ? '99+' : unread}
          </div>
        )}
      </button>
    </div>
  );
}
