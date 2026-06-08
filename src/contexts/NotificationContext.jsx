import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

const NotificationContext = createContext(null);

let idCounter = 0;
const nextId = () => ++idCounter;

/**
 * Tipos suportados: 'chat' | 'producing' | 'urgent' | 'ready' | 'info'
 */
export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const dismiss = useCallback((id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, exiting: true } : n));
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 320);
  }, []);

  // Limpar todas ao entrar no app (mount)
  useEffect(() => {
    setNotifications([]);
  }, []);

  const push = useCallback((type, title, body) => {
    const id = nextId();

    setNotifications(prev => {
      const next = [...prev, { id, type, title, body, exiting: false }];
      // Máximo 5 toasts na tela
      if (next.length > 5) next.shift();
      return next;
    });

    // Sem auto-dismiss — só some ao fechar manualmente ou reabrir o app
    return id;
  }, []);

  // Atalhos semânticos
  const notifyChat = useCallback((sender, preview) =>
    push('chat', `Mensagem de ${sender}`, preview), [push]);

  const notifyProducing = useCallback((cardTitle) =>
    push('producing', 'Em produção', cardTitle), [push]);

  const notifyUrgent = useCallback((cardTitle, changedBy) =>
    push('urgent', '🚨 Urgente', `${cardTitle}${changedBy ? `\nalterado por ${changedBy}` : ''}`), [push]);

  const notifyReady = useCallback((cardTitle) =>
    push('ready', 'Pronto', cardTitle), [push]);

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
