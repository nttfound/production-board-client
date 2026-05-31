import React, { useState } from 'react';
import api from '../../services/api';

export default function ObservacaoEdit({ card, onSave, onClose }) {
  const [text, setText] = useState(card.observation || '');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const handleSave = async () => {
    setLoading(true);
    setErro('');
    try {
      const res = await api.patch(`/api/cards/${card.id}/observacao`, { observation: text });
      onSave(text);
      onClose();
    } catch (err) {
      console.error('[OBS] Erro:', err.response?.data || err.message);
      setErro(err.response?.data?.error || 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 animate-fade-in" onClick={onClose}>
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-6 w-96 shadow-modal animate-scale-in" onClick={e => e.stopPropagation()}>
        <h2 className="text-[#f0f0f0] font-semibold mb-1">Editar Observacao</h2>
        <p className="text-[#555] text-xs mb-4 font-mono">{card.title}</p>

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={5}
          placeholder="Observacao..."
          className="w-full bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl px-4 py-3 text-[#f0f0f0] text-sm placeholder-[#555] outline-none focus:border-[#2563eb] transition-all resize-none"
          autoFocus
        />

        {erro && (
          <p className="text-[#ef4444] text-xs mt-2">{erro}</p>
        )}

        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[#2a2a2a] text-[#8a8a8a] text-sm hover:bg-[#1c1c1c] transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-50 text-white text-sm transition-colors">
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
