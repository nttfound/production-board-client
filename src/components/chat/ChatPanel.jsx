/**
 * client/src/components/chat/ChatPanel.jsx
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import data   from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { useAuth } from '../../contexts/AuthContext';
import socket from '../../services/socket';
import api    from '../../services/api';

// Cor padrão caso o servidor ainda não tenha o campo color
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

// Labels de status traduzidos
const STATUS_LABELS = {
  Pending:          'Pendente',
  Producing:        'Produzindo',
  Ready:            'Pronto',
  'No Material':    'Sem Material',
  'Waiting Approval': 'Aguard. Aprovação',
  Scheduled:        'Agendado',
};

const STATUS_COLORS = {
  Pending:          '#f59e0b',
  Producing:        '#3b82f6',
  Ready:            '#10b981',
  'No Material':    '#ef4444',
  'Waiting Approval': '#8b5cf6',
  Scheduled:        '#06b6d4',
};

// Mini card linkado inline na mensagem
function LinkedCard({ card }) {
  const statusColor = STATUS_COLORS[card.status] || '#555';
  return (
    <div
      className="mt-1.5 rounded-xl px-3 py-2 flex items-start gap-2.5"
      style={{ background: '#0a0a0a', border: `1px solid ${statusColor}30` }}
    >
      <div
        className="w-1 rounded-full flex-shrink-0 mt-0.5"
        style={{ background: statusColor, minHeight: 32 }}
      />
      <div className="min-w-0">
        <p className="text-[#f0f0f0] text-xs font-semibold leading-tight truncate">{card.title}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
            style={{ background: statusColor + '20', color: statusColor }}>
            {STATUS_LABELS[card.status] || card.status}
          </span>
          {card.urgente && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
              style={{ background: '#f9731620', color: '#f97316' }}>
              Urgente
            </span>
          )}
        </div>
        {card.observation && (
          <p className="text-[#555] text-[10px] mt-0.5 truncate">{card.observation}</p>
        )}
      </div>
    </div>
  );
}

// Modal de busca de card para linkar
function CardSearchModal({ onSelect, onClose }) {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get(`/api/cards?search=${encodeURIComponent(query.trim())}&limit=8`);
        setResults(res.data?.cards || res.data || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <>
      <div className="fixed inset-0 z-[60]" onClick={onClose} />
      <div
        className="absolute right-0 z-[61] rounded-2xl overflow-hidden shadow-2xl"
        style={{
          bottom:      'calc(100% + 8px)',
          width:       320,
          background:  '#111',
          border:      '1px solid #2a2a2a',
          boxShadow:   '0 16px 48px rgba(0,0,0,0.85)',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#1f1f1f]">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 21V9"/>
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar card pelo título..."
            className="flex-1 bg-transparent text-[#f0f0f0] text-xs placeholder-[#444] outline-none"
          />
          {loading && (
            <div className="w-3 h-3 border border-[#2a2a2a] border-t-[#3b82f6] rounded-full animate-spin flex-shrink-0" />
          )}
        </div>

        {/* Results */}
        <div className="overflow-y-auto" style={{ maxHeight: 280 }}>
          {!query.trim() ? (
            <p className="text-[#333] text-[10px] text-center py-6">Digite para buscar</p>
          ) : results.length === 0 && !loading ? (
            <p className="text-[#333] text-[10px] text-center py-6">Nenhum card encontrado</p>
          ) : results.map(card => {
            const statusColor = STATUS_COLORS[card.status] || '#555';
            return (
              <button
                key={card.id}
                onClick={() => onSelect(card)}
                className="w-full text-left px-3 py-2.5 transition-colors hover:bg-[#1c1c1c] flex items-center gap-2.5"
                style={{ borderBottom: '1px solid #1a1a1a' }}
              >
                <div
                  className="w-1 rounded-full flex-shrink-0 self-stretch"
                  style={{ background: statusColor, minHeight: 28 }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[#f0f0f0] text-xs font-medium truncate">{card.title}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[10px]" style={{ color: statusColor }}>
                      {STATUS_LABELS[card.status] || card.status}
                    </span>
                    {card.urgente && <span className="text-[10px] text-[#f97316]">· Urgente</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

export default function ChatPanel() {
  const { user } = useAuth();

  const [open,          setOpen]          = useState(false);
  const [expanded,      setExpanded]      = useState(false);
  const [messages,      setMessages]      = useState([]);
  const [input,         setInput]         = useState('');
  const [unread,        setUnread]        = useState(0);
  const [loading,       setLoading]       = useState(false);
  const [showEmoji,     setShowEmoji]     = useState(false);
  const [showCardSearch, setShowCardSearch] = useState(false);
  const [linkedCard,    setLinkedCard]    = useState(null);   // card selecionado p/ enviar

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const openRef   = useRef(open);
  openRef.current = open;

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
    const onMessage = (msg) => {
      setMessages(prev => [...prev, msg]);
      if (!openRef.current) setUnread(n => n + 1);
    };
    const onCleared = () => setMessages([]);
    socket.on('chat:message', onMessage);
    socket.on('chat:cleared',  onCleared);
    return () => {
      socket.off('chat:message', onMessage);
      socket.off('chat:cleared',  onCleared);
    };
  }, []);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  // Fecha emoji picker ao clicar fora
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
    setShowCardSearch(false);
    setLinkedCard(null);
  };

  const handleSend = () => {
    const text = input.trim();
    if ((!text && !linkedCard) || !user) return;
    socket.emit('chat:send', {
      username:     user.username,
      display_name: user.display_name || user.username,
      color:        user.color || FALLBACK_COLOR,
      text:         text || '',
      card:         linkedCard || null,
    });
    setInput('');
    setLinkedCard(null);
    setShowEmoji(false);
    setShowCardSearch(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') {
      setShowEmoji(false);
      setShowCardSearch(false);
    }
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

  const canSend = input.trim() || linkedCard;

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
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[#f0f0f0] text-sm font-semibold">Chat</span>
              <span className="text-[#555] text-xs">· todos os usuários</span>
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
                // Usa a cor salva na mensagem (propagada no momento do envio)
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
                      className="max-w-[85%]"
                    >
                      {/* Texto principal */}
                      {msg.text && (
                        <div
                          className="px-3 py-2 rounded-2xl text-sm leading-relaxed break-words"
                          style={isMe
                            ? { background: '#1d4ed8', color: '#f0f0f0', borderBottomRightRadius: grouped ? '1rem' : '0.25rem' }
                            : { background: '#1c1c1c', color: '#e5e5e5', borderBottomLeftRadius:  grouped ? '1rem' : '0.25rem' }
                          }
                        >
                          {renderText(msg.text, user?.username)}
                        </div>
                      )}

                      {/* Card linkado */}
                      {msg.card && <LinkedCard card={msg.card} />}
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

            {/* Card Search Modal */}
            {showCardSearch && (
              <CardSearchModal
                onSelect={card => {
                  setLinkedCard(card);
                  setShowCardSearch(false);
                  inputRef.current?.focus();
                }}
                onClose={() => setShowCardSearch(false)}
              />
            )}

            {/* Preview do card linkado */}
            {linkedCard && (
              <div
                className="mb-2 rounded-xl px-3 py-2 flex items-center gap-2"
                style={{ background: '#0a0a0a', border: '1px solid #2a2a2a' }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 21V9"/>
                </svg>
                <span className="text-[#8a8a8a] text-[10px] flex-1 truncate">{linkedCard.title}</span>
                <button
                  onClick={() => setLinkedCard(null)}
                  className="text-[#555] hover:text-[#ef4444] transition-colors flex-shrink-0"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            )}

            <div className="flex items-end gap-2">
              {/* Botão emoji */}
              <button
                onClick={() => { setShowEmoji(e => !e); setShowCardSearch(false); }}
                className="emoji-btn w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl transition-all text-lg"
                style={showEmoji
                  ? { background: '#2563eb20', border: '1px solid #2563eb50' }
                  : { background: '#1c1c1c',   border: '1px solid #2a2a2a', color: '#555' }
                }
                title="Emojis"
              >
                😊
              </button>

              {/* Botão linkar card */}
              <button
                onClick={() => { setShowCardSearch(c => !c); setShowEmoji(false); }}
                className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl transition-all"
                style={showCardSearch || linkedCard
                  ? { background: '#2563eb20', border: '1px solid #2563eb50', color: '#3b82f6' }
                  : { background: '#1c1c1c',   border: '1px solid #2a2a2a',   color: '#555' }
                }
                title="Linkar card"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 21V9"/>
                </svg>
              </button>

              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={linkedCard ? 'Adicione um comentário...' : 'Mensagem...'}
                rows={1}
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
                disabled={!canSend}
                className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl transition-all"
                style={canSend
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
