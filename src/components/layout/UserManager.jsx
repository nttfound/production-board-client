import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const PERMISSIONS = [
  { key: 'criar_card',         label: 'Criar Card' },
  { key: 'deletar_card',       label: 'Deletar Card' },
  { key: 'mudar_status',       label: 'Mudar Status' },
  { key: 'alterar_observacao', label: 'Alterar Observação' },
  { key: 'selecionar',         label: 'Selecionar (bulk)' },
  { key: 'marcar_urgente',     label: 'Marcar Urgente' },
  { key: 'marcar_carga',       label: 'Marcar Carga' },
  { key: 'alterar_servicos',   label: 'Alterar Serviços' },
  { key: 'servico_corte',      label: 'Servico Corte' },
  { key: 'servico_dobra',      label: 'Servico Dobra' },
  { key: 'servico_mao_de_obra', label: 'Servico Mao de Obra' },
  { key: 'servico_calandra',   label: 'Servico Calandra' },
  { key: 'ver_registro',       label: 'Ver Registro' },
  { key: 'upload_anexo',       label: 'Upload de Anexo' },
  { key: 'ver_caldeiraria',    label: 'Ver Caldeiraria' },
];

const EMPTY_PERMS = Object.fromEntries(PERMISSIONS.map(p => [p.key, false]));

const EMPTY_FORM = { display_name: '', username: '', password: '', permissions: { ...EMPTY_PERMS } };

function Toggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="relative inline-flex items-center w-9 h-5 rounded-full transition-colors flex-shrink-0"
      style={{ background: value ? '#2563eb' : '#2a2a2a' }}
    >
      <span
        className="absolute w-3.5 h-3.5 rounded-full bg-white transition-transform"
        style={{ transform: value ? 'translateX(18px)' : 'translateX(3px)' }}
      />
    </button>
  );
}

export default function UserManager({ onClose }) {
  const [users,     setUsers]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState(null); // user sendo editado
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [isNew,     setIsNew]     = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await api.get('/api/auth/users');
      setUsers(res.data.filter(u => u.username !== 'itadobras'));
    } catch { setError('Erro ao carregar usuários'); }
    finally { setLoading(false); }
  }

  function selectUser(u) {
    setIsNew(false);
    setError('');
    setSelected(u);
    setForm({
      display_name: u.display_name,
      username:     u.username,
      password:     '',
      permissions:  { ...EMPTY_PERMS, ...(u.permissions || {}) },
    });
  }

  function newUser() {
    setIsNew(true);
    setSelected(null);
    setError('');
    setForm({ ...EMPTY_FORM, permissions: { ...EMPTY_PERMS } });
  }

  function togglePerm(key) {
    setForm(f => ({ ...f, permissions: { ...f.permissions, [key]: !f.permissions[key] } }));
  }

  async function save() {
    setError('');
    setSaving(true);
    try {
      if (isNew) {
        if (!form.username || !form.display_name || !form.password)
          return setError('Preencha usuário, nome e senha');
        const res = await api.post('/api/auth/users', form);
        setUsers(u => [...u, res.data]);
        setSelected(res.data);
        setIsNew(false);
        setForm(f => ({ ...f, password: '' }));
      } else {
        const payload = { display_name: form.display_name, permissions: form.permissions };
        if (form.password) payload.password = form.password;
        const res = await api.put(`/api/auth/users/${selected.id}`, payload);
        setUsers(u => u.map(x => x.id === res.data.id ? res.data : x));
        setSelected(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser() {
    if (!selected) return;
    if (!window.confirm(`Deletar ${selected.display_name}?`)) return;
    try {
      await api.delete(`/api/auth/users/${selected.id}`);
      setUsers(u => u.filter(x => x.id !== selected.id));
      setSelected(null);
      setForm(EMPTY_FORM);
      setIsNew(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao deletar');
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
              <p className="text-[var(--text-primary)] text-sm font-semibold">Gerenciar Usuários</p>
              <p className="text-[var(--text-muted)] text-[10px]">Somente itadobras</p>
            </div>
            <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Lista de usuários */}
            <div className="w-48 border-r border-[#1c1c1c] flex flex-col flex-shrink-0">
              <div className="flex-1 overflow-y-auto py-2">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="w-5 h-5 border-2 border-[var(--border-default)] border-t-[#3b82f6] rounded-full animate-spin" />
                  </div>
                ) : users.map(u => (
                  <button
                    key={u.id}
                    onClick={() => selectUser(u)}
                    className="w-full text-left px-4 py-3 transition-colors"
                    style={{
                      background: selected?.id === u.id ? '#1c1c1c' : 'transparent',
                      borderLeft: selected?.id === u.id ? '2px solid #2563eb' : '2px solid transparent',
                    }}
                  >
                    <p className="text-[var(--text-primary)] text-xs font-medium truncate">{u.display_name}</p>
                    <p className="text-[var(--text-muted)] text-[10px] truncate">@{u.username}</p>
                  </button>
                ))}
              </div>
              <div className="p-3 border-t border-[#1c1c1c]">
                <button
                  onClick={newUser}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium text-[#3b82f6] transition-all"
                  style={{ background: '#2563eb15', border: '1px solid #2563eb30' }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Novo Usuário
                </button>
              </div>
            </div>

            {/* Formulário */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {!selected && !isNew ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-[#444] text-xs">Selecione um usuário ou crie um novo</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
                  {/* Nome */}
                  <div>
                    <label className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider mb-1.5 block">Nome de Exibição</label>
                    <input
                      value={form.display_name}
                      onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                      placeholder="Ex: Laser"
                      className="w-full bg-[var(--bg-surface2)] border border-[var(--border-default)] rounded-xl px-3 py-2 text-[var(--text-primary)] text-sm outline-none focus:border-[var(--accent-blue)] transition-all"
                    />
                  </div>

                  {/* Usuário (só no create) */}
                  {isNew && (
                    <div>
                      <label className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider mb-1.5 block">Usuário (login)</label>
                      <input
                        value={form.username}
                        onChange={e => setForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/\s/g,'') }))}
                        placeholder="Ex: laser"
                        className="w-full bg-[var(--bg-surface2)] border border-[var(--border-default)] rounded-xl px-3 py-2 text-[var(--text-primary)] text-sm outline-none focus:border-[var(--accent-blue)] transition-all"
                      />
                    </div>
                  )}

                  {/* Senha */}
                  <div>
                    <label className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider mb-1.5 block">
                      {isNew ? 'Senha' : 'Nova Senha (deixe vazio para não alterar)'}
                    </label>
                    <input
                      type="password"
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      placeholder={isNew ? 'Senha' : '••••••'}
                      className="w-full bg-[var(--bg-surface2)] border border-[var(--border-default)] rounded-xl px-3 py-2 text-[var(--text-primary)] text-sm outline-none focus:border-[var(--accent-blue)] transition-all"
                    />
                  </div>

                  {/* Permissões */}
                  <div>
                    <label className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider mb-2 block">Permissões</label>
                    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
                      {PERMISSIONS.map((p, i) => (
                        <div
                          key={p.key}
                          className="flex items-center justify-between px-4 py-3"
                          style={{ background: i % 2 === 0 ? '#141414' : '#111', borderBottom: i < PERMISSIONS.length - 1 ? '1px solid #1c1c1c' : 'none' }}
                        >
                          <span className="text-[var(--text-secondary)] text-xs">{p.label}</span>
                          <Toggle value={!!form.permissions[p.key]} onChange={() => togglePerm(p.key)} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {error && <p className="text-[#ef4444] text-xs">{error}</p>}
                </div>
              )}

              {/* Footer actions */}
              {(selected || isNew) && (
                <div className="px-6 py-4 border-t border-[#1c1c1c] flex items-center gap-2 flex-shrink-0">
                  {selected && !isNew && (
                    <button
                      onClick={deleteUser}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-[#ef4444] transition-all"
                      style={{ background: '#ef444415', border: '1px solid #ef444430' }}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                      </svg>
                      Deletar
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
                    {saving ? 'Salvando...' : isNew ? 'Criar Usuário' : 'Salvar'}
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
