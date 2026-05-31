import React, { useState } from 'react';
import { STATUSES, URGENTE_COLOR, CARGA_COLOR, CALANDRA_COLOR } from '../../services/statusConfig';
import { CARGA_POR_DIA, CIDADE_SEMPRE } from '../../services/cargaConfig';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

const CORTE_COLOR = '#06b6d4';
const DOBRA_COLOR = '#8b5cf6';
const MAO_COLOR   = '#f59e0b';
const CALA_COLOR  = CALANDRA_COLOR;

const SERVICE_OPTIONS = [
  { key: 'corte',       perm: 'servico_corte',       label: 'Corte',       color: CORTE_COLOR },
  { key: 'dobra',       perm: 'servico_dobra',       label: 'Dobra',       color: DOBRA_COLOR },
  { key: 'mao_de_obra', perm: 'servico_mao_de_obra', label: 'Mao de Obra', color: MAO_COLOR },
  { key: 'calandra',    perm: 'servico_calandra',    label: 'Calandra',    color: CALA_COLOR },
];

export default function StatusModal({ card, onClose, onSave }) {
  const { can } = useAuth();
  const [selected,  setSelected]  = useState(card.status);
  const [schedDate, setSchedDate] = useState(card.scheduled_date?.slice(0, 10) || '');
  const [urgente,   setUrgente]   = useState(card.urgente || false);
  const [carga,     setCarga]     = useState(card.carga || null);
  const [corte,     setCorte]     = useState(card.corte || false);
  const [dobra,     setDobra]     = useState(card.dobra || false);
  const [maoDeObra, setMaoDeObra] = useState(card.mao_de_obra || false);
  const [calandra,  setCalandra]  = useState(card.calandra || false);
  const [tab,       setTab]       = useState('status');
  const [diaAberto, setDiaAberto] = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState(null);

  const canStatus = can('mudar_status');
  const allowedServices = SERVICE_OPTIONS.filter(service => can(service.perm));
  const canServices = allowedServices.length > 0;
  const tabs = [];
  if (canStatus)             tabs.push({ key: 'status',   label: 'Status'   });
  if (can('marcar_urgente'))   tabs.push({ key: 'urgente',  label: 'Urgente'   });
  if (can('marcar_carga'))     tabs.push({ key: 'carga',    label: 'Carga'     });
  if (canServices)             tabs.push({ key: 'servicos', label: 'Servicos'  });
  const activeTab = tabs.some(t => t.key === tab) ? tab : tabs[0]?.key;

  const handleSave = async () => {
    if (canStatus && selected === 'Scheduled' && !schedDate) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updates = {};
      if (can('marcar_urgente') && urgente !== (card.urgente || false)) {
        await api.patch(`/api/cards/${card.id}/urgente`, { urgente });
        updates.urgente = urgente;
      }
      if (can('marcar_carga') && carga !== (card.carga || null)) {
        await api.patch(`/api/cards/${card.id}/carga`, { carga });
        updates.carga = carga;
      }
      if (canServices && (
        corte !== (card.corte || false) ||
        dobra !== (card.dobra || false) ||
        maoDeObra !== (card.mao_de_obra || false) ||
        calandra !== (card.calandra || false)
      )) {
        const servicePayload = {};
        if (can('servico_corte')) servicePayload.corte = corte;
        if (can('servico_dobra')) servicePayload.dobra = dobra;
        if (can('servico_mao_de_obra')) servicePayload.mao_de_obra = maoDeObra;
        if (can('servico_calandra')) servicePayload.calandra = calandra;
        await api.patch(`/api/cards/${card.id}/servicos`, servicePayload);
        Object.assign(updates, servicePayload);
      }
      onSave(canStatus ? selected : card.status, canStatus ? (schedDate || null) : card.scheduled_date, updates, { updateStatus: canStatus });
    } catch (err) {
      const msg = err?.response?.data?.error || 'Falha ao salvar. Tente novamente.';
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  const ToggleBtn = ({ label, value, onChange, color }) => (
    <button
      onClick={() => onChange(!value)}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm transition-all"
      style={value
        ? { borderColor: `${color}60`, background: `${color}12`, color }
        : { borderColor: '#2a2a2a', color: '#f0f0f0' }
      }
    >
      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: value ? color : '#333' }} />
      {label}
      {value && (
        <svg className="ml-auto" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      )}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 animate-fade-in" onClick={onClose}>
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-6 w-96 max-h-[90vh] overflow-y-auto shadow-modal animate-scale-in" onClick={e => e.stopPropagation()}>
        <h2 className="text-[#f0f0f0] font-semibold mb-1">Alterar Card</h2>
        <p className="text-[#555] text-xs mb-4 font-mono">{card.title}</p>

        <div className="flex gap-1 mb-5 bg-[#1c1c1c] p-1 rounded-xl">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === t.key ? 'bg-[#2a2a2a] text-[#f0f0f0]' : 'text-[#555] hover:text-[#8a8a8a]'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* STATUS */}
        {activeTab === 'status' && canStatus && (
          <div className="space-y-2">
            {STATUSES.map(s => (
              <button key={s.value} onClick={() => setSelected(s.value)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm transition-all ${selected === s.value ? 'border-[#3a3a3a] bg-[#1c1c1c]' : 'border-transparent hover:bg-[#1c1c1c]'}`}>
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-[#f0f0f0]">{s.label}</span>
                {selected === s.value && (
                  <svg className="ml-auto" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </button>
            ))}
            {selected === 'Scheduled' && (
              <div className="mt-3">
                <label className="block text-xs text-[#8a8a8a] mb-2 uppercase tracking-wider">Data agendada</label>
                <input type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)}
                  className="w-full bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-[#f0f0f0] text-sm outline-none" />
              </div>
            )}
          </div>
        )}

        {/* URGENTE */}
        {activeTab === 'urgente' && can('marcar_urgente') && (
          <div className="flex flex-col items-center gap-5 py-4">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl cursor-pointer transition-all duration-200 border-2"
              style={{ borderColor: urgente ? URGENTE_COLOR : '#2a2a2a', background: urgente ? `${URGENTE_COLOR}15` : '#1c1c1c' }}
              onClick={() => setUrgente(!urgente)}>
              {urgente ? '🟠' : '⚡'}
            </div>
            <div className="text-center">
              <p className="text-[#f0f0f0] font-medium">{urgente ? 'Marcado como Urgente' : 'Nao Urgente'}</p>
              <p className="text-[#555] text-xs mt-1">Clique para {urgente ? 'remover' : 'marcar como urgente'}</p>
            </div>
            <button onClick={() => setUrgente(!urgente)}
              className="w-full py-2.5 rounded-xl text-sm font-medium transition-all border"
              style={urgente
                ? { background: `${URGENTE_COLOR}20`, borderColor: `${URGENTE_COLOR}50`, color: URGENTE_COLOR }
                : { background: '#1c1c1c', borderColor: '#2a2a2a', color: '#8a8a8a' }}>
              {urgente ? 'Urgente ativado' : 'Ativar Urgente'}
            </button>
          </div>
        )}

        {/* CARGA */}
        {activeTab === 'carga' && can('marcar_carga') && (
          <div className="space-y-3">
            <div>
              <p className="text-[#8a8a8a] text-xs uppercase tracking-wider mb-2">Sempre disponivel</p>
              <ToggleBtn
                label={CIDADE_SEMPRE}
                value={carga === CIDADE_SEMPRE}
                onChange={v => setCarga(v ? CIDADE_SEMPRE : null)}
                color={CARGA_COLOR}
              />
            </div>
            {Object.entries(CARGA_POR_DIA).map(([dia, cidades]) => (
              <div key={dia}>
                <button
                  onClick={() => setDiaAberto(diaAberto === dia ? null : dia)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-[#8a8a8a] hover:text-[#f0f0f0] hover:bg-[#1c1c1c] transition-all uppercase tracking-wider"
                >
                  <span>{dia}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    style={{ transform: diaAberto === dia ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                {diaAberto === dia && (
                  <div className="space-y-1.5 mt-1.5 pl-2">
                    {cidades.map(cidade => (
                      <ToggleBtn
                        key={cidade}
                        label={`CARGA - ${cidade}`}
                        value={carga === `CARGA - ${cidade}`}
                        onChange={v => setCarga(v ? `CARGA - ${cidade}` : null)}
                        color={CARGA_COLOR}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
            {carga && (
              <button onClick={() => setCarga(null)} className="w-full py-2 text-[#555] text-xs hover:text-[#8a8a8a] transition-colors">
                Remover carga
              </button>
            )}
          </div>
        )}

        {/* SERVICOS */}
        {activeTab === 'servicos' && canServices && (
          <div className="space-y-2">
            <p className="text-[#8a8a8a] text-xs uppercase tracking-wider mb-3">Servicos</p>
            {allowedServices.map(service => {
              const state = {
                corte: [corte, setCorte],
                dobra: [dobra, setDobra],
                mao_de_obra: [maoDeObra, setMaoDeObra],
                calandra: [calandra, setCalandra],
              }[service.key];
              return <ToggleBtn key={service.key} label={service.label} value={state[0]} onChange={state[1]} color={service.color} />;
            })}
          </div>
        )}

        {saveError && (
          <p className="mt-4 text-xs text-[#ef4444] bg-[#ef444410] border border-[#ef444430] rounded-xl px-3 py-2">
            {saveError}
          </p>
        )}
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} disabled={saving} className="flex-1 py-2.5 rounded-xl border border-[#2a2a2a] text-[#8a8a8a] text-sm hover:bg-[#1c1c1c] transition-colors disabled:opacity-40">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {saving && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
