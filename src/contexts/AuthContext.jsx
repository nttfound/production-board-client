import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { setAuthToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const legacyToken = localStorage.getItem('auth_token');
    if (legacyToken) {
      setAuthToken(legacyToken);
      localStorage.removeItem('auth_token');
    }
    api.get('/api/auth/me')
      .then(res => setUser(res.data.user))
      .catch(() => {
        setAuthToken(null);
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const login = async (username, password) => {
    const res = await api.post('/api/auth/login', { username, password });
    setAuthToken(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } finally {
      setAuthToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
