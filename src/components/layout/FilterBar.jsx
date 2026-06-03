import React, { useMemo, useState } from 'react';
import { STATUSES, URGENTE_COLOR, CARGA_COLOR } from '../../services/statusConfig';
import { CARGA_POR_DIA, CIDADE_SEMPRE } from '../../services/cargaConfig';

const SERVICE_FILTERS = [
  { key: 'dobra',    label: 'Dobra',    color: '#8b5cf6' },
  { key: 'corte',    label: 'Corte',    color: '#06b6d4' },
  { key: 'calandra', label: 'Calandra', color: '#f59e0b' },
];

const TAG_FILTERS = [
  { key: 'urgent',    label: 'Urgente', color: URGENTE_COLOR },
  { key: 'withCarga', label: 'Carga',   color: CARGA_COLOR   },
];

const ADVANCED_STATUSES = STATUSES.filter(s => s.value !== 'Ready');

function Chip({ active, color, onClick, children }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '5px 12px', borderRadius: 7, cursor: 'pointer',
        fontSize: 11, fontWeight: 600, fontFamily: 'Syne, sans-serif',
        letterSpacing: '0.02em', transition: 'all 0.13s',
        background: active
          ? (color ? `${color}18` : 'var(--bg-surface3)')
          : (hover ? 'var(--bg-surface2)' : 'transparent'),
        border: active
          ? `1px solid ${color ? `${color}40` : 'var(--border-accent)'}`
          : `1px solid ${hover ? 'var(--border-light)' : 'transparent'}`,
        color: active ? (color || 'var(--text-primary)') : (hover ? 'var(--text-secondary)' : 'var(--text-muted)'),
      }}
    >
      {children}
    </button>
  );
}

export default function FilterBar({ search, onSearch, filterStatus, onFilterStatus, advancedFilters, onAdvancedFilters, total }) {
  const [open, setOpen] = useState(false);
  const cities = useMemo(() => {
    const all = Object.values(CARGA_POR_DIA).flat();
    return [CIDADE_SEMPRE, ...Array.from(new Set(all)).sort((a, b) => a.localeCompare(b))];
  }, []);

  const serviceCount = Object.values(advancedFilters.services || {}).filter(Boolean).length;
  const advancedCount = [
    advancedFilters.status !== 'all',
    advancedFilters.city !== 'all',
    serviceCount > 0,
    advancedFilters.urgent,
    advancedFilters.withCarga,
  ].filter(Boolean).length;

  const updateAdvanced = patch => onAdvancedFilters({ ...advancedFilters, ...patch });
  const toggleService = key => onAdvancedFilters({
    ...advancedFilters,
    services: { ...advancedFilters.services, [key]: !advancedFilters.services?.[key] },
  });

  return (
    <div style={{
      padding: '8px 16px 10px',
      borderBottom: '1px solid var(--border-default)',
      flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6,
      background: 'var(--bg-surface)',
    }}>
      {/* Search */}
      <div style={{ position: 'relative', maxWidth: 260 }}>
        <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text" value={search} onChange={e => onSearch(e.target.value)}
          placeholder="buscar..."
          style={{
            width: '100%',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-default)',
            borderRadius: 7, padding: '6px 12px 6px 30px',
            color: 'var(--text-primary)', fontSize: 12, fontFamily: 'DM Mono, monospace', outline: 'none',
            transition: 'border-color 0.13s',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--border-accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border-default)'}
        />
      </div>

      {/* Chips */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
        <Chip active={filterStatus === 'fila'} onClick={() => onFilterStatus('fila')}>
          Fila
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--text-muted)' }}>
            {total}
          </span>
        </Chip>

        <Chip active={filterStatus === 'Ready'} color="var(--status-green)" onClick={() => onFilterStatus('Ready')}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: filterStatus === 'Ready' ? 'var(--status-green)' : 'var(--text-faint)', display: 'inline-block' }} />
          Pronto
        </Chip>

        <div style={{ flex: 1 }} />

        <div style={{ position: 'relative' }}>
          <Chip active={open || advancedCount > 0} onClick={() => setOpen(v => !v)}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M3 5h18M6 12h12M10 19h4"/>
            </svg>
            Filtros
            {advancedCount > 0 && (
              <span style={{
                background: 'var(--accent-blue)', color: '#fff',
                fontSize: 9, fontFamily: 'DM Mono, monospace',
                borderRadius: 4, padding: '1px 5px', fontWeight: 700, marginLeft: 2,
              }}>
                {advancedCount}
              </span>
            )}
          </Chip>

          {open && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 8px)', zIndex: 40,
              width: 290, borderRadius: 10,
              border: '1px solid var(--border-default)',
              background: 'var(--bg-surface1)',
              boxShadow: 'var(--shadow-modal)',
              padding: 16, display: 'grid', gap: 14,
            }}>
              {/* Status */}
              <div style={{ display: 'grid', gap: 6 }}>
                <p style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>Status</p>
                <select
                  value={advancedFilters.status}
                  onChange={e => updateAdvanced({ status: e.target.value })}
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: 7, padding: '8px 12px', color: 'var(--text-primary)', fontSize: 11, fontFamily: 'Syne, sans-serif', outline: 'none' }}
                >
                  <option value="all">Todos da fila</option>
                  {ADVANCED_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>

              {/* Cidade */}
              <div style={{ display: 'grid', gap: 6 }}>
                <p style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>Cidade</p>
                <select
                  value={advancedFilters.city}
                  onChange={e => updateAdvanced({ city: e.target.value })}
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: 7, padding: '8px 12px', color: 'var(--text-primary)', fontSize: 11, fontFamily: 'Syne, sans-serif', outline: 'none' }}
                >
                  <option value="all">Todas</option>
                  {cities.map(city => <option key={city} value={city}>{city}</option>)}
                </select>
              </div>

              {/* Serviços */}
              <div>
                <p style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8, marginTop: 0 }}>Serviços</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {SERVICE_FILTERS.map(svc => {
                    const active = advancedFilters.services?.[svc.key];
                    return (
                      <button key={svc.key} onClick={() => toggleService(svc.key)} style={{
                        padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
                        fontSize: 10, fontWeight: 600, fontFamily: 'Syne, sans-serif',
                        letterSpacing: '0.04em', transition: 'all 0.13s',
                        color: active ? svc.color : 'var(--text-secondary)',
                        background: active ? `${svc.color}18` : 'transparent',
                        border: active ? `1px solid ${svc.color}40` : '1px solid var(--border-default)',
                      }}>
                        {svc.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tags */}
              <div>
                <p style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8, marginTop: 0 }}>Tags</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {TAG_FILTERS.map(tag => {
                    const active = advancedFilters[tag.key];
                    return (
                      <button key={tag.key} onClick={() => updateAdvanced({ [tag.key]: !active })} style={{
                        padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
                        fontSize: 10, fontWeight: 600, fontFamily: 'Syne, sans-serif',
                        letterSpacing: '0.04em', transition: 'all 0.13s',
                        color: active ? tag.color : 'var(--text-secondary)',
                        background: active ? `${tag.color}18` : 'transparent',
                        border: active ? `1px solid ${tag.color}40` : '1px solid var(--border-default)',
                        display: 'flex', alignItems: 'center', gap: 5,
                      }}>
                        <span style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: active ? tag.color : 'var(--text-muted)', display: 'inline-block', boxShadow: active ? `0 0 5px ${tag.color}` : 'none' }} />
                        {tag.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={() => { onAdvancedFilters({ status: 'all', city: 'all', services: {}, urgent: false, withCarga: false }); setOpen(false); }}
                style={{
                  padding: '8px', borderRadius: 7, border: '1px solid var(--border-default)',
                  background: 'transparent', color: 'var(--text-secondary)', fontSize: 11,
                  fontFamily: 'Syne, sans-serif', cursor: 'pointer', transition: 'all 0.13s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-surface3)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >
                Limpar filtros
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
