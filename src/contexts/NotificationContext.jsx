import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

const NotificationContext = createContext(null);

let idCounter = 0;
const nextId = () => ++idCounter;

/**
 * Tipos suportados: 'chat' | 'producing' | 'urgent' | 'ready' | 'info'
 */
export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const timers = useRef({});

  // Cleanup dos timers ao desmontar
  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach(clearTimeout);
    };
  }, []);

  const dismiss = useCallback((id) => {
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, exiting: true } : n));
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 320);
  }, []);

  const push = useCallback((type, title, body, opts = {}) => {
    const id = nextId();
    const duration = opts.duration ?? 5000;

    setNotifications(prev => {
      const next = [...prev, { id, type, title, body, exiting: false, opts }];
      // Máximo 5 toasts na tela (remove o mais antigo)
      if (next.length > 5) next.shift();
      return next;
    });

    if (duration > 0) {
      timers.current[id] = setTimeout(() => dismiss(id), duration);
    }

    return id;
  }, [dismiss]);

  // Atalhos semânticos
  const notifyChat = useCallback((sender, preview) =>
    push('chat', `💬 Mensagem de ${sender}`, preview), [push]);

  const notifyProducing = useCallback((cardTitle) =>
    push('producing', '⚙️ Em produção', cardTitle), [push]);

  const notifyUrgent = useCallback((cardTitle) =>
    push('urgent', '🚨 Urgente', cardTitle, { duration: 7000 }), [push]);

  const notifyReady = useCallback((cardTitle) =>
    push('ready', '✅ Pronto', cardTitle), [push]);

  return (
    <NotificationContext.Provider value={{
      notifications, push, dismiss,
      notifyChat, notifyProducing, notifyUrgent, notifyReady,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications deve estar dentro de NotificationProvider');
  return ctx;
};