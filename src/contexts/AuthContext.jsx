import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

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

  const login = async (username, password) => {
    const res = await api.post('/api/auth/login', { username, password });
    localStorage.setItem('auth_token', res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = async () => {
    await api.post('/api/auth/logout');
    localStorage.removeItem('auth_token');
    setUser(null);
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
