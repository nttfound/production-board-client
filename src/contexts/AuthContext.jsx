import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api    from '../services/api';
import socket from '../services/socket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) { setUser(null); setLoading(false); return; }
    try {
      const res = await api.get('/api/auth/me');
      setUser(res.data.user);
    } catch {
      localStorage.removeItem('auth_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carrega na inicialização
  useEffect(() => { fetchMe(); }, [fetchMe]);

  // Revalida permissões a cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      if (localStorage.getItem('auth_token')) fetchMe();
    }, 30_000);
    return () => clearInterval(interval);
  }, [fetchMe]);

  // Conecta/desconecta o socket conforme o estado de autenticação
  useEffect(() => {
    if (loading) return; // aguarda a verificação inicial antes de decidir

    const token = localStorage.getItem('auth_token');
    if (user && token) {
      // Passa o token para o middleware de autenticação do socket
      socket.auth = { token };
      if (!socket.connected) socket.connect();
    } else {
      if (socket.connected) socket.disconnect();
    }
  }, [user, loading]);

  const login = async (username, password) => {
    const res = await api.post('/api/auth/login', { username, password });
    localStorage.setItem('auth_token', res.data.token);
    setUser(res.data.user);
    // socket será conectado pelo useEffect acima na próxima renderização
    return res.data.user;
  };

  const logout = async () => {
    await api.post('/api/auth/logout');
    localStorage.removeItem('auth_token');
    setUser(null);
    // socket será desconectado pelo useEffect acima
  };

  // Checa permissão — itadobras sempre tem tudo
  const can = (perm) => {
    if (!user) return false;
    if (user.username === 'itadobras') return true;
    if (perm.startsWith('servico_') && user.permissions?.alterar_servicos) return true;
    return !!user.permissions?.[perm];
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
