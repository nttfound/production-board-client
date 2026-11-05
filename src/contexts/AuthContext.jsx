import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { setAuthToken } from '../services/api';
import socket from '../services/socket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/auth/me')
      .then(res => {
        setAuthToken(res.data.token);
        setUser(res.data.user);
        if (res.data.user && res.data.realtimeToken) socket.connect(res.data.realtimeToken);
      })
      .catch((error) => {
        setUser(null);
        if (error.response?.status === 401) {
          setAuthToken(null);
          socket.disconnect();
        }
      })
      .finally(() => {
        setLoading(false);
      });

    // NÃO desconectar no cleanup — o StrictMode do React em dev
    // desmonta/remonta o componente e mataria a conexão.
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    const timer = setInterval(async () => {
      try {
        const res = await api.get('/api/auth/me');
        if (res.data.realtimeToken) await socket.refreshAuth(res.data.realtimeToken);
      } catch {
        // The regular authenticated API request will handle an expired session.
      }
    }, 45 * 60 * 1000);
    return () => clearInterval(timer);
  }, [user]);

  const login = async (username, password) => {
    const res = await api.post('/api/auth/login', { username, password });
    setAuthToken(res.data.token);
    setUser(res.data.user);
    socket.connect(res.data.realtimeToken);
    return res.data.user;
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } finally {
      setAuthToken(null);
      setUser(null);
      socket.disconnect();
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
