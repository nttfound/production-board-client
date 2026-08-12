import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useCidades } from '../../contexts/CidadesContext';

const EMPTY_FORM = { nome: '', cidade: '' };

// Só é possível vincular cidades já existentes no projeto (mesmo conjunto usado em "Carga")
export default function ClienteManager({ onClose }) {
  const { cidades } = useCidades();
  const [clientes,  setClientes]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState(null); // cliente sendo editado
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [isNew,     setIsNew]     = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');

  useEffect(() => { fetchClientes(); }, []);

  async function fetchClientes() {
    setLoading(true);
    try {
      const res = await api.get('/api/clientes');
      setClientes(res.data);
    } catch { setError('Erro ao carregar clientes'); }
    finally { setLoading(false); }
  }

  function selectCliente(c) {
    setIsNew(false);
    setError('');
    setSelected(c);
    setForm({ nome: c.nome, cidade: c.cidade });
  }

  function newCliente() {
    setIsNew(true);
    setSelected(null);
    setError('');
    setForm({ ...EMPTY_FORM });
  }

  async function save() {
    setError('');
    if (!form.nome.trim())   return setError('Nome é obrigatório');
    if (!form.cidade.trim()) return setError('Cidade é obrigatória');
    setSaving(true);
    try {
      if (isNew) {
        const res = await api.post('/api/clientes', form);
        setClientes(c => [...c, res.data].sort((a, b) => a.nome.localeCompare(b.nome)));
        setSelected(res.data);
        setIsNew(false);
      } else {
        const res = await api.put(`/api/clientes/${selected.id}`, form);
        setClientes(c => c.map(x => x.id === res.data.id ? res.data : x).sort((a, b) => a.nome.localeCompare(b.nome)));
        setSelected(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  async function deleteCliente() {
    if (!selected) return;
    if (!window.confirm(`Excluir cliente ${selected.nome}?`)) return;
    try {
      await api.delete(`/api/clientes/${selected.id}`);
      setClientes(c => c.filter(x => x.id !== selected.id));
      setSelected(null);
      setForm(EMPTY_FORM);
      setIsNew(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao excluir');
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={e => e.stopPropagation()}
      >
        <div
          className="w-full max-w-2xl rounded-2xl flex flex-col overflow-hidden"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', maxHeight: '85vh' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#1c1c1c] flex-shrink-0">
            <div>
              <p className="text-[var(--text-primary)] text-sm font-semibold">Gerenciar Clientes</p>
              <p className="text-[var(--text-muted)] text-[10px]">Somente itadobras</p>
            </div>
            <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Lista de clientes */}
            <div className="w-48 border-r border-[#1c1c1c] flex flex-col flex-shrink-0">
              <div className="flex-1 overflow-y-auto py-2">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="w-5 h-5 border-2 border-[var(--border-default)] border-t-[#3b82f6] rounded-full animate-spin" />
                  </div>
                ) : clientes.length === 0 ? (
                  <p className="text-[#444] text-[11px] px-4 py-3">Nenhum cliente cadastrado</p>
                ) : clientes.map(c => (
                  <button
                    key={c.id}
                    onClick={() => selectCliente(c)}
                    className="w-full text-left px-4 py-3 transition-colors"
                    style={{
                      background: selected?.id === c.id ? '#1c1c1c' : 'transparent',
                      borderLeft: selected?.id === c.id ? '2px solid #2563eb' : '2px solid transparent',
                    }}
                  >
                    <p className="text-[var(--text-primary)] text-xs font-medium truncate">{c.nome}</p>
                    <p className="text-[var(--text-muted)] text-[10px] truncate">{c.cidade}</p>
                  </button>
                ))}
              </div>
              <div className="p-3 border-t border-[#1c1c1c]">
                <button
                  onClick={newCliente}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium text-[#3b82f6] transition-all"
                  style={{ background: '#2563eb15', border: '1px solid #2563eb30' }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Novo Cliente
                </button>
              </div>
            </div>

            {/* Formulário */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {!selected && !isNew ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-[#444] text-xs">Selecione um cliente ou crie um novo</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
                  {/* Nome */}
                  <div>
                    <label className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider mb-1.5 block">Nome *</label>
                    <input
                      value={form.nome}
                      onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                      placeholder="Ex: Ricardo"
                      className="w-full bg-[var(--bg-surface2)] border border-[var(--border-default)] rounded-xl px-3 py-2 text-[var(--text-primary)] text-sm outline-none focus:border-[var(--accent-blue)] transition-all"
                    />
                  </div>

                  {/* Cidade */}
                  <div>
                    <label className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider mb-1.5 block">Cidade *</label>
                    <select
                      value={form.cidade}
                      onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))}
                      className="w-full bg-[var(--bg-surface2)] border border-[var(--border-default)] rounded-xl px-3 py-2 text-[var(--text-primary)] text-sm outline-none focus:border-[var(--accent-blue)] transition-all"
                    >
                      <option value="" disabled>Selecione uma cidade</option>
                      {cidades.map(cidade => (
                        <option key={cidade} value={cidade}>{cidade}</option>
                      ))}
                    </select>
                  </div>

                  {error && <p className="text-[#ef4444] text-xs">{error}</p>}
                </div>
              )}

              {/* Footer actions */}
              {(selected || isNew) && (
                <div className="px-6 py-4 border-t border-[#1c1c1c] flex items-center gap-2 flex-shrink-0">
                  {selected && !isNew && (
                    <button
                      onClick={deleteCliente}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-[#ef4444] transition-all"
                      style={{ background: '#ef444415', border: '1px solid #ef444430' }}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                      </svg>
                      Excluir
                    </button>
                  )}
                  <div className="flex-1" />
                  <button
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={save}
                    disabled={saving}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-white transition-all"
                    style={{ background: saving ? '#1d4ed860' : '#2563eb' }}
                  >
                    {saving ? 'Salvando...' : isNew ? 'Criar Cliente' : 'Salvar'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
