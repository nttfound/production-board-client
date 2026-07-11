import React, { useState } from 'react';
import { STATUSES, URGENTE_COLOR, CARGA_COLOR } from '../../services/statusConfig';
import { CARGA_POR_DIA, CIDADE_SEMPRE } from '../../services/cargaConfig';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

const CORTE_COLOR    = 'var(--corte)';
const DOBRA_COLOR    = 'var(--dobra)';
const MAO_COLOR      = 'var(--mao-obra)';
const CALANDRA_COLOR = 'var(--calandra)';
const MAX_URGENT_CARDS = 2;

export default function StatusModal({ card, urgentCount = 0, onClose, onSave }) {
  const { user } = useAuth();
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
  const [erro,      setErro]      = useState('');

  const isCreator = user?.role === 'creator';
  const canUrgente = isCreator || Boolean(user?.permissions?.marcar_urgente);
  const canCarga   = isCreator || Boolean(user?.permissions?.marcar_carga);
  const canServicoCorte     = isCreator || Boolean(user?.permissions?.alterar_servicos || user?.permissions?.servico_corte);
  const canServicoDobra     = isCreator || Boolean(user?.permissions?.alterar_servicos || user?.permissions?.servico_dobra);
  const canServicoMaoDeObra = isCreator || Boolean(user?.permissions?.alterar_servicos || user?.permissions?.servico_mao_de_obra);
  const canServicoCalandra  = isCreator || Boolean(user?.permissions?.alterar_servicos || user?.permissions?.servico_calandra);
  const canServicos = canServicoCorte || canServicoDobra || canServicoMaoDeObra || canServicoCalandra;
  const urgentLimitReached = !card.urgente && !urgente && urgentCount >= MAX_URGENT_CARDS;

  const toggleUrgente = () => {
    if (urgentLimitReached) {
      setErro(`Limite de ${MAX_URGENT_CARDS} cards urgentes atingido.`);
      return;
    }
    setErro('');
    setUrgente(value => !value);
  };

  const tabs = [{ key: 'status', label: 'Status' }];
  if (canUrgente) tabs.push({ key: 'urgente',  label: 'Urgente'  });
  if (canCarga)   tabs.push({ key: 'carga',    label: 'Carga'    });
  if (canServicos)tabs.push({ key: 'servicos', label: 'Servicos' });

  const handleSave = async () => {
    if (selected === 'Scheduled' && !schedDate) return;
    const updates = {};
    try {
      setErro('');
      if (canUrgente && urgente !== (card.urgente || false)) {
        await api.patch(`/api/cards/${card.id}/urgente`, { urgente });
        updates.urgente = urgente;
      }
      if (canCarga && carga !== (card.carga || null)) {
        await api.patch(`/api/cards/${card.id}/carga`, { carga });
        updates.carga = carga;
      }
      if (canServicos) {
        if (corte !== (card.corte||false) || dobra !== (card.dobra||false) || maoDeObra !== (card.mao_de_obra||false) || calandra !== (card.calandra||false)) {
          const payload = {};
          if (canServicoCorte)     payload.corte       = corte;
          if (canServicoDobra)     payload.dobra       = dobra;
          if (canServicoMaoDeObra) payload.mao_de_obra = maoDeObra;
          if (canServicoCalandra)  payload.calandra    = calandra;
          await api.patch(`/api/cards/${card.id}/servicos`, payload);
          updates.corte = corte; updates.dobra = dobra; updates.mao_de_obra = maoDeObra; updates.calandra = calandra;
        }
      }
      onSave(selected, schedDate || null, updates);
    } catch (err) {
      setErro(err.response?.data?.error || 'Nao foi possivel salvar as alteracoes.');
    }
  };

  const ToggleBtn = ({ label, value, onChange, color }) => (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 14px', borderRadius: 12, border: '1px solid',
        fontSize: 13, transition: 'all 0.13s', cursor: 'pointer',
        borderColor: value ? `${color}60` : 'var(--border-default)',
        background: value ? `${color}12` : 'transparent',
        color: value ? color : 'var(--text-primary)',
      }}
    >
      <span style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, backgroundColor: value ? color : 'var(--text-faint)' }} />
      {label}
      {value && (
        <svg style={{ marginLeft: 'auto' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      )}
    </button>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-overlay)' }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-surface1)', border: '1px solid var(--border-default)',
        borderRadius: 16, padding: 24, width: 384, maxHeight: '90vh',
        overflowY: 'auto', boxShadow: 'var(--shadow-modal)', animation: 'scaleIn 0.18s ease',
      }} onClick={e => e.stopPropagation()}>

        <h2 style={{ color: 'var(--text-primary)', fontWeight: 600, margin: '0 0 4px', fontSize: 16 }}>Alterar Card</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-text)', margin: '0 0 20px' }}>{card.title}</p>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-surface2)', padding: 4, borderRadius: 12 }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              flex: 1, padding: '6px', borderRadius: 12, fontSize: 11, fontWeight: 500,
              border: 'none', cursor: 'pointer', transition: 'all 0.13s',
              background: tab === t.key ? 'var(--bg-surface)' : 'transparent',
              color: tab === t.key ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* STATUS */}
        {tab === 'status' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {STATUSES.map(s => (
              <button key={s.value} onClick={() => setSelected(s.value)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 12, fontSize: 13,
                border: '1px solid',
                borderColor: selected === s.value ? 'var(--border-accent)' : 'transparent',
                background: selected === s.value ? 'var(--bg-surface2)' : 'transparent',
                color: 'var(--text-primary)', cursor: 'pointer', transition: 'all 0.13s',
              }}
              onMouseEnter={e => { if (selected !== s.value) e.currentTarget.style.background = 'var(--bg-surface2)'; }}
              onMouseLeave={e => { if (selected !== s.value) e.currentTarget.style.background = 'transparent'; }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, backgroundColor: s.color }} />
                <span>{s.label}</span>
                {selected === s.value && (
                  <svg style={{ marginLeft: 'auto' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </button>
            ))}
            {selected === 'Scheduled' && (
              <div style={{ marginTop: 8 }}>
                <label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-text)' }}>Data agendada</label>
                <input type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: 12, padding: '10px 14px', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }} />
              </div>
            )}
          </div>
        )}

        {/* URGENTE */}
        {tab === 'urgente' && canUrgente && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '16px 0' }}>
            <div
              style={{ width: 80, height: 80, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, cursor: 'pointer', transition: 'all 0.2s', border: '2px solid',
                borderColor: urgente ? URGENTE_COLOR : urgentLimitReached ? 'rgba(239,68,68,0.36)' : 'var(--border-default)',
                background: urgente ? `${URGENTE_COLOR}15` : urgentLimitReached ? 'rgba(239,68,68,0.08)' : 'var(--bg-surface2)' }}
              onClick={toggleUrgente}>
              {urgente ? '🟠' : '⚡'}
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--text-primary)', fontWeight: 500, margin: 0 }}>{urgente ? 'Marcado como Urgente' : 'Não Urgente'}</p>
              <p style={{ color: urgentLimitReached ? 'var(--status-red)' : 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>
                {urgentLimitReached ? `Ja existem ${MAX_URGENT_CARDS} cards urgentes` : `Clique para ${urgente ? 'remover' : 'marcar como urgente'}`}
              </p>
            </div>
            <button onClick={toggleUrgente} disabled={urgentLimitReached} style={{
              width: '100%', padding: '10px', borderRadius: 12, fontSize: 13, fontWeight: 500,
              border: '1px solid', cursor: urgentLimitReached ? 'not-allowed' : 'pointer', transition: 'all 0.13s',
              borderColor: urgente ? `${URGENTE_COLOR}50` : urgentLimitReached ? 'rgba(239,68,68,0.30)' : 'var(--border-default)',
              background: urgente ? `${URGENTE_COLOR}20` : urgentLimitReached ? 'rgba(239,68,68,0.08)' : 'var(--bg-surface2)',
              color: urgente ? URGENTE_COLOR : urgentLimitReached ? 'var(--status-red)' : 'var(--text-secondary)',
            }}>
              {urgente ? 'Urgente ativado' : urgentLimitReached ? 'Limite atingido' : 'Ativar Urgente'}
            </button>
          </div>
        )}

        {/* CARGA */}
        {tab === 'carga' && canCarga && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-text)', marginBottom: 8, marginTop: 0 }}>Sempre disponível</p>
              <ToggleBtn label={CIDADE_SEMPRE} value={carga === CIDADE_SEMPRE} onChange={v => setCarga(v ? CIDADE_SEMPRE : null)} color={CARGA_COLOR} />
            </div>

            {Object.entries(CARGA_POR_DIA).map(([dia, cidades]) => (
              <div key={dia}>
                <button onClick={() => setDiaAberto(diaAberto === dia ? null : dia)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '6px 10px', borderRadius: 12, fontSize: 10, fontWeight: 500,
                  color: 'var(--text-secondary)', background: 'transparent', border: 'none',
                  cursor: 'pointer', transition: 'all 0.13s', textTransform: 'uppercase', letterSpacing: '0.08em',
                  fontFamily: 'var(--font-text)',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-surface2)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}>
                  <span>{dia}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                    style={{ transform: diaAberto === dia ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                {diaAberto === dia && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6, paddingLeft: 8 }}>
                    {cidades.map(cidade => (
                      <ToggleBtn key={cidade} label={`CARGA - ${cidade}`} value={carga === `CARGA - ${cidade}`} onChange={v => setCarga(v ? `CARGA - ${cidade}` : null)} color={CARGA_COLOR} />
                    ))}
                  </div>
                )}
              </div>
            ))}

            {carga && (
              <button onClick={() => setCarga(null)} style={{ padding: '6px', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer', transition: 'color 0.13s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                Remover carga
              </button>
            )}
          </div>
        )}

        {/* SERVICOS */}
        {tab === 'servicos' && canServicos && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-text)', marginBottom: 4, marginTop: 0 }}>Serviços</p>
            {canServicoCorte    && <ToggleBtn label="Corte"       value={corte}     onChange={setCorte}     color={CORTE_COLOR} />}
            {canServicoDobra    && <ToggleBtn label="Dobra"       value={dobra}     onChange={setDobra}     color={DOBRA_COLOR} />}
            {canServicoMaoDeObra && <ToggleBtn label="Mão de Obra" value={maoDeObra} onChange={setMaoDeObra} color={MAO_COLOR}   />}
            {canServicoCalandra  && <ToggleBtn label="Calandra"    value={calandra}  onChange={setCalandra}  color={CALANDRA_COLOR} />}
          </div>
        )}

        {erro && (
          <p style={{ color: 'var(--status-red)', fontSize: 11, margin: '14px 0 0', fontFamily: 'var(--font-text)' }}>
            {erro}
          </p>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: '10px', borderRadius: 12, border: '1px solid var(--border-default)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', transition: 'all 0.13s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-surface2)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}>
            Cancelar
          </button>
          <button onClick={handleSave}
            style={{ flex: 1, padding: '10px', borderRadius: 12, border: 'none', background: 'var(--accent-blue)', color: '#fff', fontSize: 13, cursor: 'pointer', transition: 'background 0.13s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-blue-dim)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--accent-blue)'}>
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
