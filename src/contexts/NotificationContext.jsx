import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const NotificationContext = createContext(null);

let _idCounter = 0;
const nextId = () => ++_idCounter;

/**
 * Tipos suportados: 'chat' | 'producing' | 'urgent' | 'ready' | 'info'
 */
export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, exiting: true } : n));
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 320);
  }, []);

  const push = useCallback((type, title, body, opts = {}) => {
    const id = nextId();
    const duration = opts.duration ?? 5000;

    setNotifications(prev => {
      // Máximo 5 toasts na tela
      const next = [...prev, { id, type, title, body, exiting: false, opts }];
      return next.slice(-5);
    });

    if (duration > 0) {
      timers.current[id] = setTimeout(() => dismiss(id), duration);
    }

    return id;
  }, [dismiss]);

  // Atalhos semânticos
  const notifyChat       = useCallback((sender, preview) =>
    push('chat',      `💬 Mensagem de ${sender}`, preview), [push]);

  const notifyProducing  = useCallback((cardTitle) =>
    push('producing', '⚙️ Em produção',           cardTitle), [push]);

  const notifyUrgent     = useCallback((cardTitle) =>
    push('urgent',    '🚨 Urgente',               cardTitle, { duration: 7000 }), [push]);

  const notifyReady      = useCallback((cardTitle) =>
    push('ready',     '✅ Pronto',                cardTitle), [push]);

  return (
    <NotificationContext.Provider value={{
      notifications, push, dismiss,
      notifyChat, notifyProducing, notifyUrgent, notifyReady,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
