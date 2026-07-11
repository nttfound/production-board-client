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
        // Conecta o socket assim que confirma autenticação
        if (res.data.user && res.data.token) {
          socket.auth = { token: res.data.token };
          socket.connect();
        }
      })
      .catch(() => {
        setAuthToken(null);
        setUser(null);
        socket.disconnect();
      })
      .finally(() => {
        setLoading(false);
      });

    // NÃO desconectar no cleanup — o StrictMode do React em dev
    // desmonta/remonta o componente e mataria a conexão.
  }, []);

  const login = async (username, password) => {
    const res = await api.post('/api/auth/login', { username, password });
    setAuthToken(res.data.token);
    setUser(res.data.user);
    socket.auth = { token: res.data.token };
    socket.connect();
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
