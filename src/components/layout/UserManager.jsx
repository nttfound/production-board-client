import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const PERMISSIONS = [
  { key: 'criar_card',          label: 'Criar Card' },
  { key: 'deletar_card',        label: 'Deletar Card' },
  { key: 'mudar_status',        label: 'Mudar Status' },
  { key: 'alterar_observacao',  label: 'Alterar Observacao' },
  { key: 'selecionar',          label: 'Selecionar (bulk)' },
  { key: 'marcar_urgente',      label: 'Marcar Urgente' },
  { key: 'marcar_carga',        label: 'Marcar Carga' },
  { key: 'servico_corte',       label: 'Servico Corte' },
  { key: 'servico_dobra',       label: 'Servico Dobra' },
  { key: 'servico_mao_de_obra', label: 'Servico Mao de Obra' },
  { key: 'servico_calandra',    label: 'Servico Calandra' },
  { key: 'ver_registro',        label: 'Ver Registro' },
  { key: 'upload_anexo',        label: 'Upload de Anexo' },
];

const PERMISSION_KEYS = PERMISSIONS.map(p => p.key);
const SERVICE_KEYS = ['servico_corte', 'servico_dobra', 'servico_mao_de_obra', 'servico_calandra'];
const EMPTY_PERMS = Object.fromEntries(PERMISSIONS.map(p => [p.key, false]));

const PRESET_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
  '#f97316', '#a78bfa', '#34d399', '#fb7185',
];

const EMPTY_FORM = {
  display_name: '',
  username:     '',
  password:     '',
  color:        '#3b82f6',
  permissions:  { ...EMPTY_PERMS },
};

function normalizePermissions(permissions = {}) {
  const normalized = { ...EMPTY_PERMS };
  for (const key of PERMISSION_KEYS) normalized[key] = Boolean(permissions[key]);

  const hasNewServiceKeys = SERVICE_KEYS.some(key => Object.prototype.hasOwnProperty.call(permissions, key));
  if (permissions.alterar_servicos && !hasNewServiceKeys) {
    for (const key of SERVICE_KEYS) normalized[key] = true;
  }

  return normalized;
}

function cleanPermissions(permissions) {
  return Object.fromEntries(PERMISSION_KEYS.map(key => [key, Boolean(permissions[key])]));
}

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

function ColorPicker({ value, onChange }) {
  return (
    <div>
      <label className="text-[#555] text-[10px] uppercase tracking-wider mb-2 block">
        Cor no Chat
      </label>
      <div className="flex flex-wrap gap-2 items-center">
        {PRESET_COLORS.map(color => (
          <button
            key={color}
            onClick={() => onChange(color)}
            className="w-7 h-7 rounded-full transition-all flex-shrink-0"
            style={{
              background:  color,
              outline:     value === color ? `2px solid ${color}` : '2px solid transparent',
              outlineOffset: '2px',
              transform:   value === color ? 'scale(1.15)' : 'scale(1)',
            }}
            title={color}
          />
        ))}
        {/* Input de cor livre */}
        <label
          className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-all overflow-hidden"
          style={{
            background:  value && !PRESET_COLORS.includes(value) ? value : '#1c1c1c',
            border:      '1px dashed #444',
            outline:     value && !PRESET_COLORS.includes(value) ? `2px solid ${value}` : '2px solid transparent',
            outlineOffset: '2px',
          }}
          title="Cor personalizada"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/>
            <circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/>
            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
          </svg>
          <input
            type="color"
            value={value || '#3b82f6'}
            onChange={e => onChange(e.target.value)}
            className="absolute opacity-0 w-0 h-0"
          />
        </label>

        {/* Preview com nome */}
        <span
          className="ml-1 text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: value + '20', color: value }}
        >
          Preview
        </span>
      </div>
    </div>
  );
}

export default function UserManager({ onClose }) {
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [isNew,    setIsNew]    = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await api.get('/api/auth/users');
      setUsers(res.data.filter(u => u.username !== 'itadobras'));
    } catch { setError('Erro ao carregar usuarios'); }
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
      color:        u.color || '#3b82f6',
      permissions:  normalizePermissions(u.permissions),
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
          return setError('Preencha usuario, nome e senha');
        const res = await api.post('/api/auth/users', {
          ...form,
          permissions: cleanPermissions(form.permissions),
        });
        setUsers(u => [...u, res.data]);
        setSelected(res.data);
        setIsNew(false);
        setForm(f => ({ ...f, password: '' }));
      } else {
        const payload = {
          display_name: form.display_name,
          color:        form.color,
          permissions:  cleanPermissions(form.permissions),
        };
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
          style={{ background: '#0f0f0f', border: '1px solid #1c1c1c', maxHeight: '85vh' }}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#1c1c1c] flex-shrink-0">
            <div>
              <p className="text-[#f0f0f0] text-sm font-semibold">Gerenciar Usuarios</p>
              <p className="text-[#555] text-[10px]">Somente itadobras</p>
            </div>
            <button onClick={onClose} className="text-[#555] hover:text-[#8a8a8a] transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Lista lateral */}
            <div className="w-48 border-r border-[#1c1c1c] flex flex-col flex-shrink-0">
              <div className="flex-1 overflow-y-auto py-2">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="w-5 h-5 border-2 border-[#2a2a2a] border-t-[#3b82f6] rounded-full animate-spin" />
                  </div>
                ) : users.map(u => (
                  <button
                    key={u.id}
                    onClick={() => selectUser(u)}
                    className="w-full text-left px-4 py-3 transition-colors"
                    style={{
                      background: selected?.id === u.id ? '#1c1c1c' : 'transparent',
                      borderLeft: selected?.id === u.id ? `2px solid ${u.color || '#2563eb'}` : '2px solid transparent',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {/* Bolinha de cor do usuário */}
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: u.color || '#3b82f6' }}
                      />
                      <div className="min-w-0">
                        <p className="text-[#f0f0f0] text-xs font-medium truncate">{u.display_name}</p>
                        <p className="text-[#555] text-[10px] truncate">@{u.username}</p>
                      </div>
                    </div>
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
                  Novo Usuario
                </button>
              </div>
            </div>

            {/* Painel de edição */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {!selected && !isNew ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-[#444] text-xs">Selecione um usuario ou crie um novo</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
                  <div>
                    <label className="text-[#555] text-[10px] uppercase tracking-wider mb-1.5 block">Nome de Exibicao</label>
                    <input
                      value={form.display_name}
                      onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                      placeholder="Ex: Laser"
                      className="w-full bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl px-3 py-2 text-[#f0f0f0] text-sm outline-none focus:border-[#2563eb] transition-all"
                    />
                  </div>

                  {isNew && (
                    <div>
                      <label className="text-[#555] text-[10px] uppercase tracking-wider mb-1.5 block">Usuario (login)</label>
                      <input
                        value={form.username}
                        onChange={e => setForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/\s/g,'') }))}
                        placeholder="Ex: operador"
                        className="w-full bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl px-3 py-2 text-[#f0f0f0] text-sm outline-none focus:border-[#2563eb] transition-all"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-[#555] text-[10px] uppercase tracking-wider mb-1.5 block">
                      {isNew ? 'Senha' : 'Nova Senha (deixe vazio para nao alterar)'}
                    </label>
                    <input
                      type="password"
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      placeholder={isNew ? 'Senha' : '******'}
                      className="w-full bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl px-3 py-2 text-[#f0f0f0] text-sm outline-none focus:border-[#2563eb] transition-all"
                    />
                  </div>

                  {/* Color Picker */}
                  <ColorPicker
                    value={form.color}
                    onChange={color => setForm(f => ({ ...f, color }))}
                  />

                  <div>
                    <label className="text-[#555] text-[10px] uppercase tracking-wider mb-2 block">Permissoes</label>
                    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1c1c1c' }}>
                      {PERMISSIONS.map((p, i) => (
                        <div
                          key={p.key}
                          className="flex items-center justify-between px-4 py-3"
                          style={{ background: i % 2 === 0 ? '#141414' : '#111', borderBottom: i < PERMISSIONS.length - 1 ? '1px solid #1c1c1c' : 'none' }}
                        >
                          <span className="text-[#8a8a8a] text-xs">{p.label}</span>
                          <Toggle value={!!form.permissions[p.key]} onChange={() => togglePerm(p.key)} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {error && <p className="text-[#ef4444] text-xs">{error}</p>}
                </div>
              )}

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
                    className="px-4 py-2 rounded-xl text-xs font-medium text-[#555] hover:text-[#8a8a8a] transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={save}
                    disabled={saving}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-white transition-all"
                    style={{ background: saving ? '#1d4ed860' : '#2563eb' }}
                  >
                    {saving ? 'Salvando...' : isNew ? 'Criar Usuario' : 'Salvar'}
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
