import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { setAuthToken } from '../services/api';
import socket from '../services/socket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/auth/me')
      .then(res => {
        setUser(res.data.user);
        if (res.data.user) {
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

    // NÃO desconectar o socket aqui — o StrictMode do React em dev
    // desmonta e remonta o componente, o que matava a conexão.
    // O socket só é desconectado explicitamente no logout.
  }, []);

  const login = async (username, password) => {
    const res = await api.post('/api/auth/login', { username, password });
    setAuthToken(res.data.token);
    setUser(res.data.user);
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
