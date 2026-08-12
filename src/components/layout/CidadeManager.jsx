import React, { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { useCidades } from '../../contexts/CidadesContext';

const DIAS = ['Sempre', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta'];
const EMPTY_FORM = { nome: '', dia_ativo: 'Segunda' };

const DIA_LABEL = {
  Sempre: 'Sempre',
  Segunda: 'Segunda',
  Terca: 'Terca',
  Quarta: 'Quarta',
  Quinta: 'Quinta',
  Sexta: 'Sexta',
};

export default function CidadeManager({ onClose }) {
  const { refreshCidades } = useCidades();
  const [cidades, setCidades] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isNew, setIsNew] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchCidades(); }, []);

  async function fetchCidades() {
    setLoading(true);
    try {
      const res = await api.get('/api/clientes/cidades/gerenciar');
      setCidades(res.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao carregar cidades');
    } finally {
      setLoading(false);
    }
  }

  function selectCidade(cidade) {
    setSelected(cidade);
    setIsNew(false);
    setError('');
    setForm({ nome: cidade.nome, dia_ativo: cidade.dia_ativo });
  }

  function newCidade() {
    setSelected(null);
    setIsNew(true);
    setError('');
    setForm(EMPTY_FORM);
  }

  async function save() {
    setError('');
    if (!form.nome.trim()) return setError('Nome da cidade e obrigatorio');
    if (!form.dia_ativo) return setError('Dia ativo e obrigatorio');

    setSaving(true);
    try {
      if (isNew) {
        const res = await api.post('/api/clientes/cidades/gerenciar', form);
        setCidades(prev => [...prev, res.data]);
        setSelected(res.data);
        setIsNew(false);
      } else if (selected) {
        const res = await api.put(`/api/clientes/cidades/gerenciar/${selected.id}`, form);
        setCidades(prev => prev.map(c => c.id === res.data.id ? res.data : c));
        setSelected(res.data);
      }
      await refreshCidades();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar cidade');
    } finally {
      setSaving(false);
    }
  }

  const ordered = useMemo(() => {
    const order = Object.fromEntries(DIAS.map((dia, index) => [dia, index]));
    return [...cidades].sort((a, b) =>
      (order[a.dia_ativo] ?? 99) - (order[b.dia_ativo] ?? 99)
      || a.nome.localeCompare(b.nome, 'pt-BR')
    );
  }, [cidades]);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
        <div
          className="w-full max-w-2xl rounded-2xl flex flex-col overflow-hidden"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', maxHeight: '85vh' }}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#1c1c1c] flex-shrink-0">
            <div>
              <p className="text-[var(--text-primary)] text-sm font-semibold">Gerenciar Cidades</p>
              <p className="text-[var(--text-muted)] text-[10px]">Cidade e dia ativo como carga</p>
            </div>
            <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            <div className="w-56 border-r border-[#1c1c1c] flex flex-col flex-shrink-0">
              <div className="flex-1 overflow-y-auto py-2">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="w-5 h-5 border-2 border-[var(--border-default)] border-t-[#3b82f6] rounded-full animate-spin" />
                  </div>
                ) : ordered.map(cidade => (
                  <button
                    key={cidade.id}
                    onClick={() => selectCidade(cidade)}
                    className="w-full text-left px-4 py-3 transition-colors"
                    style={{
                      background: selected?.id === cidade.id ? '#1c1c1c' : 'transparent',
                      borderLeft: selected?.id === cidade.id ? '2px solid #2563eb' : '2px solid transparent',
                    }}
                  >
                    <p className="text-[var(--text-primary)] text-xs font-medium truncate">{cidade.nome}</p>
                    <p className="text-[var(--text-muted)] text-[10px] truncate">{DIA_LABEL[cidade.dia_ativo] || cidade.dia_ativo}</p>
                  </button>
                ))}
              </div>
              <div className="p-3 border-t border-[#1c1c1c]">
                <button
                  onClick={newCidade}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium text-[#3b82f6] transition-all"
                  style={{ background: '#2563eb15', border: '1px solid #2563eb30' }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Nova Cidade
                </button>
              </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
              {!selected && !isNew ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-[#444] text-xs">Selecione uma cidade ou crie uma nova</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
                  <div>
                    <label className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider mb-1.5 block">Nome da cidade *</label>
                    <input
                      value={form.nome}
                      onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                      placeholder="Ex: Serra Negra"
                      className="w-full bg-[var(--bg-surface2)] border border-[var(--border-default)] rounded-xl px-3 py-2 text-[var(--text-primary)] text-sm outline-none focus:border-[var(--accent-blue)] transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider mb-1.5 block">Dia ativo como carga *</label>
                    <select
                      value={form.dia_ativo}
                      onChange={e => setForm(f => ({ ...f, dia_ativo: e.target.value }))}
                      className="w-full bg-[var(--bg-surface2)] border border-[var(--border-default)] rounded-xl px-3 py-2 text-[var(--text-primary)] text-sm outline-none focus:border-[var(--accent-blue)] transition-all"
                    >
                      {DIAS.map(dia => <option key={dia} value={dia}>{DIA_LABEL[dia]}</option>)}
                    </select>
                  </div>
                  {error && <p className="text-[#ef4444] text-xs">{error}</p>}
                </div>
              )}

              {(selected || isNew) && (
                <div className="px-6 py-4 border-t border-[#1c1c1c] flex items-center gap-2 flex-shrink-0">
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
                    {saving ? 'Salvando...' : isNew ? 'Criar Cidade' : 'Salvar'}
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
