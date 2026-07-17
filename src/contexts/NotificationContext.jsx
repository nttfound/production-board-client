import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const NotificationContext = createContext(null);

let idCounter = 0;
const nextId = () => ++idCounter;

function sendOSToast(type, title, body, duration) {
  try {
    window.electronAPI?.sendNotification({ type, title, body, duration });
  } catch (e) {
    // Fora do Electron, fica apenas no historico do app.
  }
}

/**
 * Tipos: 'chat' | 'producing' | 'urgent' | 'ready' | 'attachment' | 'info'
 */
export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const dismiss = useCallback((id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, exiting: true } : n));
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 320);
  }, []);

  useEffect(() => { setNotifications([]); }, []);

  const push = useCallback((type, title, body, options = {}) => {
    const id = nextId();
    const duration = Number.isFinite(options.duration) ? options.duration : 12000;

    setNotifications(prev => {
      const next = [...prev, { id, type, title, body, duration, exiting: false }];
      if (next.length > 5) next.shift();
      return next;
    });

    sendOSToast(type, title, body, duration);
    if (duration > 0) setTimeout(() => dismiss(id), duration);

    return id;
  }, [dismiss]);

  const notifyChat     = useCallback((sender, preview) => push('chat',      `Mensagem de ${sender}`, preview), [push]);
  const notifyProducing = useCallback((cardTitle)        => push('producing', 'Em produção',           cardTitle), [push]);
  const notifyUrgent   = useCallback((cardTitle, by)     => push('urgent',    '🚨 Urgente',            `${cardTitle}${by ? ` — ${by}` : ''}`), [push]);
  const notifyReady    = useCallback((cardTitle)          => push('ready',     'Pronto ✓',              cardTitle), [push]);

  const notifyAttachment = useCallback((fileName) => push('attachment', 'Novo anexo', `${fileName || 'Arquivo'} pronto para download`, { duration: 20000 }), [push]);

  return (
    <NotificationContext.Provider value={{
      notifications, push, dismiss,
      notifyChat, notifyProducing, notifyUrgent, notifyReady, notifyAttachment,
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
