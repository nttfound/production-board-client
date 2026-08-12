import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import socket from '../services/socket';
import { setCargaConfig } from '../services/cargaConfig';
import { useAuth } from './AuthContext';

const CidadesContext = createContext({
  cidades: [],
  config: null,
  refreshCidades: async () => {},
});

export function CidadesProvider({ children }) {
  const { user } = useAuth();
  const [config, setConfig] = useState(null);

  const refreshCidades = useCallback(async () => {
    if (!user) return;
    const res = await api.get('/api/clientes/cidades/config');
    setCargaConfig(res.data);
    setConfig(res.data);
  }, [user]);

  useEffect(() => {
    refreshCidades().catch(err => console.error('[CIDADES] Failed to load config:', err));
  }, [refreshCidades]);

  useEffect(() => {
    if (!user) return undefined;
    const handleUpdated = () => {
      refreshCidades().catch(err => console.error('[CIDADES] Failed to refresh config:', err));
    };
    socket.on('cidades:updated', handleUpdated);
    return () => socket.off('cidades:updated', handleUpdated);
  }, [user, refreshCidades]);

  const value = useMemo(() => ({
    config,
    cidades: config?.cidades || [],
    refreshCidades,
  }), [config, refreshCidades]);

  return (
    <CidadesContext.Provider value={value}>
      {children}
    </CidadesContext.Provider>
  );
}

export function useCidades() {
  return useContext(CidadesContext);
}
