import React, { useState, useRef } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export default function AnexoSection({ card, onUpdate }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [erro,    setErro]    = useState('');
  const inputRef = useRef();

  const isCreator  = user?.role === 'creator' || Boolean(user?.permissions?.upload_anexo);
  const canDownload = user?.role === 'creator' || user?.role === 'operator';

  const temAnexo = !!card.anexo_path;

  const expiresIn = () => {
    if (!card.anexo_expira) return '';
    const diff = new Date(card.anexo_expira) - new Date();
    if (diff <= 0) return 'Expirado';
    const min = Math.floor(diff / 60000);
    const sec = Math.floor((diff % 60000) / 1000);
    return `${min}m ${sec}s`;
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErro('Arquivo muito grande. Maximo 5MB.');
      return;
    }

    setLoading(true);
    setErro('');
    const formData = new FormData();
    formData.append('anexo', file);

    try {
      const res = await api.post(`/api/cards/${card.id}/anexo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onUpdate(res.data);
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro no upload');
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    setLoading(true);
    try {
      const res = await api.delete(`/api/cards/${card.id}/anexo`);
      onUpdate(res.data);
    } catch (err) {
      setErro('Erro ao remover anexo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-[#1c1c1c]">
      {temAnexo ? (
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8a8a8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
          </svg>
          <span className="text-[#8a8a8a] text-xs flex-1 truncate">{card.anexo_nome}</span>
          <span className="text-[#555] text-[10px] font-mono">{expiresIn()}</span>
          {canDownload && (
            <a href={card.anexo_path} target="_blank" rel="noreferrer"
              className="text-[#2563eb] hover:text-[#1d4ed8] transition-colors"
              title="Baixar">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </a>
          )}
          {isCreator && (
            <button onClick={handleRemove} disabled={loading}
              className="text-[#555] hover:text-[#ef4444] transition-colors" title="Remover">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
      ) : (
        isCreator && (
          <div>
            <input ref={inputRef} type="file" className="hidden"
              accept=".dxf,.dwg,.png,.jpg,.jpeg"
              onChange={handleUpload} />
            <button
              onClick={() => inputRef.current?.click()}
              disabled={loading}
              className="flex items-center gap-1.5 text-[#555] hover:text-[#8a8a8a] text-xs transition-colors disabled:opacity-50"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
              </svg>
              {loading ? 'Enviando...' : 'Anexar arquivo'}
            </button>
          </div>
        )
      )}
      {erro && <p className="text-[#ef4444] text-[10px] mt-1">{erro}</p>}
    </div>
  );
}
