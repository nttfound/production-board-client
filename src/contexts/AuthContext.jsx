import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { setAuthToken } from '../services/api';
import socket from '../services/socket'; // ← IMPORTAR O SOCKET

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // api.js já restaura o token do sessionStorage automaticamente
    api.get('/api/auth/me')
      .then(res => {
        setUser(res.data.user);
        // ← CONECTAR SOCKET APÓS AUTENTICAÇÃO
        if (res.data.user) {
          socket.connect();
        }
      })
      .catch(() => {
        setAuthToken(null);
        setUser(null);
        // ← DESCONECTAR SOCKET SE NÃO AUTENTICADO
        socket.disconnect();
      })
      .finally(() => {
        setLoading(false);
      });

    // ← LIMPEZA AO DESMONTAR
    return () => {
      socket.disconnect();
    };
  }, []);

  const login = async (username, password) => {
    const res = await api.post('/api/auth/login', { username, password });
    setAuthToken(res.data.token);
    setUser(res.data.user);
    
    // ← CONECTAR SOCKET APÓS LOGIN
    socket.connect();
    
    return res.data.user;
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } finally {
      setAuthToken(null);
      setUser(null);
      
      // ← DESCONECTAR SOCKET NO LOGOUT
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