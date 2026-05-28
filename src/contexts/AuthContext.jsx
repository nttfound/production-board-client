import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import api, { setMemoryToken, clearMemoryToken } from '../services/api';
import socket from '../services/socket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // Token em memória — nunca em localStorage.
  // Sobrevive a re-renders mas some se a página fechar (XSS não consegue ler).
  const socketTokenRef = useRef(null);

  const fetchMe = useCallback(async () => {
    try {
      // Cookie httpOnly vai automaticamente — não precisa passar token manualmente
      const res = await api.get('/api/auth/me');
      setUser(res.data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Verifica sessão na inicialização (cookie enviado automaticamente)
  useEffect(() => { fetchMe(); }, [fetchMe]);

  // Revalida permissões a cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      if (user) fetchMe();
    }, 30_000);
    return () => clearInterval(interval);
  }, [fetchMe, user]);

  // Conecta/desconecta o socket conforme autenticação
  useEffect(() => {
    if (loading) return;

    if (user && socketTokenRef.current) {
      socket.auth = { token: socketTokenRef.current };
      if (!socket.connected) socket.connect();
    } else if (!user) {
      socketTokenRef.current = null;
      if (socket.connected) socket.disconnect();
    }
  }, [user, loading]);

  const login = async (username, password) => {
    const res = await api.post('/api/auth/login', { username, password });
    // Servidor setou o cookie httpOnly automaticamente na resposta
    // Guardamos o token em memória para o Socket.IO e para o interceptor do axios (Electron)
    socketTokenRef.current = res.data.token;
    setMemoryToken(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = async () => {
    try { await api.post('/api/auth/logout'); } catch { /* ignora erro de rede */ }
    socketTokenRef.current = null;
    clearMemoryToken();
    setUser(null);
    // api.post('/logout') já limpou o cookie no servidor via res.clearCookie
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
