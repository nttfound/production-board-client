import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import socket from '../../services/socket';
import { useAuth } from '../../contexts/AuthContext';

export default function AnexoGlobal() {
  const { user } = useAuth();
  const [anexo,   setAnexo]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [tempo,   setTempo]   = useState('');
  const inputRef = useRef();

  const isCreator  = user?.role === 'creator' || Boolean(user?.permissions?.upload_anexo);
  const canDownload = user?.role === 'creator' || user?.role === 'operator';

  // Carrega anexo ativo ao montar
  useEffect(() => {
    api.get('/api/anexo').then(res => setAnexo(res.data)).catch(() => {});
  }, []);

  // Escuta atualizações em tempo real
  useEffect(() => {
    socket.on('anexo:atualizado', (data) => setAnexo(data));
    return () => socket.off('anexo:atualizado');
  }, []);

  // Contador regressivo
  useEffect(() => {
    if (!anexo?.expira_em) { setTempo(''); return; }
    const interval = setInterval(() => {
      const diff = new Date(anexo.expira_em) - new Date();
      if (diff <= 0) { setAnexo(null); setTempo(''); return; }
      const min = Math.floor(diff / 60000);
      const sec = Math.floor((diff % 60000) / 1000);
      setTempo(`${min}:${sec.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [anexo]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Maximo 5MB'); return; }

    setLoading(true);
    const formData = new FormData();
    formData.append('arquivo', file);
    try {
      const res = await api.post('/api/anexo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAnexo(res.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Erro no upload');
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    if (!anexo) return;
    setLoading(true);
    try {
      await api.delete(`/api/anexo/${anexo.id}`);
      setAnexo(null);
    } catch (err) {
      alert('Erro ao remover');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center gap-1.5 px-2 rounded-md bg-[#1a1a1a] border border-[#2a2a2a] w-[128px] max-w-[24vw] h-[30px] overflow-hidden">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".dxf,.dwg,.png,.jpg,.jpeg"
        onChange={handleUpload}
      />

      {anexo ? (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8a8a8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
          </svg>
          <span className="text-[#f0f0f0] text-[11px] truncate min-w-0 flex-1">{anexo.nome}</span>
          <span className="text-[#555] text-[9px] font-mono flex-shrink-0">{tempo}</span>
       
        {canDownload && (
          <button
            onClick={async () => {
              try {
                const res = await fetch(anexo.url);
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = anexo.nome;
                a.click();
                URL.revokeObjectURL(url);
              } catch {
                window.open(anexo.url, '_blank');
              }
            }}
            className="text-[#2563eb] hover:text-[#1d4ed8] transition-colors flex-shrink-0" title="Baixar">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </button>
        )}

          {isCreator && (
            <button onClick={handleRemove} disabled={loading}
              className="text-[#555] hover:text-[#ef4444] transition-colors flex-shrink-0" title="Remover">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </>
      ) : (
        isCreator ? (
          <button
            onClick={() => inputRef.current?.click()}
            disabled={loading}
            className="flex items-center justify-center gap-1.5 text-[#555] hover:text-[#8a8a8a] text-[11px] transition-colors w-full h-full disabled:opacity-50"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
            {loading ? 'Enviando...' : 'Anexar'}
          </button>
        ) : (
          <span className="text-[#555] text-xs">Sem anexo</span>
        )
      )}
    </div>
  );
}
