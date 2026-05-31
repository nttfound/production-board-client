import React, { useMemo, useState } from 'react';
import { STATUSES, URGENTE_COLOR, CARGA_COLOR } from '../../services/statusConfig';
import { CARGA_POR_DIA, CIDADE_SEMPRE } from '../../services/cargaConfig';

const SERVICE_FILTERS = [
  { key: 'dobra',    label: 'Dobra',    color: '#8b5cf6' },
  { key: 'corte',    label: 'Corte',    color: '#06b6d4' },
  { key: 'calandra', label: 'Calandra', color: '#f59e0b' },
];

const ADVANCED_STATUSES = STATUSES.filter(s => s.value !== 'Ready');

function FilterChip({ active, color, dot, onClick, children }) {
  const baseStyle = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '5px 11px', borderRadius: 7,
    fontSize: 11, fontWeight: 600, fontFamily: 'Syne, sans-serif',
    cursor: 'pointer', transition: 'all 0.13s ease',
    border: '1px solid transparent',
    letterSpacing: '0.02em',
    background: 'none',
  };

  const activeStyle = color ? {
    ...baseStyle,
    color,
    background: `${color}12`,
    border: `1px solid ${color}28`,
  } : {
    ...baseStyle,
    color: '#ccc',
    background: '#151515',
    border: '1px solid #222',
  };

  const inactiveStyle = {
    ...baseStyle,
    color: '#444',
    border: '1px solid transparent',
  };

  return (
    <button style={active ? activeStyle : inactiveStyle} onClick={onClick}>
      {dot && (
        <span style={{
          width: 5, height: 5, borderRadius: '50%',
          backgroundColor: active ? (color || '#888') : '#333',
          boxShadow: active ? `0 0 6px ${color || '#888'}80` : 'none',
          display: 'inline-block', flexShrink: 0,
          transition: 'all 0.13s ease',
        }} />
      )}
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
      padding: '12px 20px 14px',
      borderBottom: '1px solid #111',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      background: '#080808',
    }}>
      {/* Search */}
      <div style={{ position: 'relative', maxWidth: 280, zIndex: 10 }}>
        <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#333' }}
          width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder="buscar cards..."
          style={{
            width: '100%',
            background: '#0e0e0e',
            border: '1px solid #191919',
            borderRadius: 8,
            padding: '7px 12px 7px 32px',
            color: '#ccc',
            fontSize: 12,
            fontFamily: 'DM Mono, monospace',
            outline: 'none',
            transition: 'border-color 0.15s',
          }}
          onFocus={e => e.target.style.borderColor = '#2a2a2a'}
          onBlur={e => e.target.style.borderColor = '#191919'}
        />
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
        <FilterChip
          active={filterStatus === 'fila'}
          onClick={() => onFilterStatus('fila')}
        >
          Fila
          <span style={{ color: filterStatus === 'fila' ? '#555' : '#2a2a2a', fontSize: 10, fontFamily: 'DM Mono, monospace' }}>
            {total}
          </span>
        </FilterChip>

        <FilterChip active={filterStatus === 'Ready'} color="#16a34a" dot onClick={() => onFilterStatus('Ready')}>
          Pronto
        </FilterChip>

        <FilterChip active={advancedFilters.urgent} color={URGENTE_COLOR} dot onClick={() => updateAdvanced({ urgent: !advancedFilters.urgent })}>
          Urgente
        </FilterChip>

        <FilterChip active={advancedFilters.withCarga} color={CARGA_COLOR} dot onClick={() => updateAdvanced({ withCarga: !advancedFilters.withCarga })}>
          Carga
        </FilterChip>

        {/* Divider */}
        <div style={{ width: 1, height: 16, background: '#181818', margin: '0 4px' }} />

        {/* Advanced filter */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setOpen(v => !v)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 11px', borderRadius: 7,
              fontSize: 11, fontWeight: 600, fontFamily: 'Syne, sans-serif',
              cursor: 'pointer', transition: 'all 0.13s ease',
              color: open || advancedCount > 0 ? '#ccc' : '#444',
              background: open || advancedCount > 0 ? '#151515' : 'transparent',
              border: open || advancedCount > 0 ? '1px solid #222' : '1px solid transparent',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M3 5h18M6 12h12M10 19h4"/>
            </svg>
            Filtros
            {advancedCount > 0 && (
              <span style={{
                background: '#2563eb', color: '#fff',
                fontSize: 9, fontFamily: 'DM Mono, monospace',
                borderRadius: 4, padding: '1px 5px', fontWeight: 700,
              }}>
                {advancedCount}
              </span>
            )}
          </button>

          {open && (
            <div style={{
              position: 'absolute', left: 0, top: 'calc(100% + 8px)',
              zIndex: 40, width: 300,
              borderRadius: 10,
              border: '1px solid #1a1a1a',
              background: '#0c0c0c',
              boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.03)',
              padding: 16,
              display: 'grid', gap: 14,
            }}>
              <div style={{ display: 'grid', gap: 6 }}>
                <label style={{ fontSize: 9, color: '#444', fontFamily: 'DM Mono, monospace', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Status
                </label>
                <select
                  value={advancedFilters.status}
                  onChange={e => updateAdvanced({ status: e.target.value })}
                  style={{
                    background: '#0e0e0e', border: '1px solid #1a1a1a', borderRadius: 7,
                    padding: '8px 12px', color: '#ccc', fontSize: 11,
                    fontFamily: 'Syne, sans-serif', outline: 'none',
                  }}
                >
                  <option value="all">Todos da fila</option>
                  {ADVANCED_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gap: 6 }}>
                <label style={{ fontSize: 9, color: '#444', fontFamily: 'DM Mono, monospace', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Cidade
                </label>
                <select
                  value={advancedFilters.city}
                  onChange={e => updateAdvanced({ city: e.target.value })}
                  style={{
                    background: '#0e0e0e', border: '1px solid #1a1a1a', borderRadius: 7,
                    padding: '8px 12px', color: '#ccc', fontSize: 11,
                    fontFamily: 'Syne, sans-serif', outline: 'none',
                  }}
                >
                  <option value="all">Todas</option>
                  {cities.map(city => <option key={city} value={city}>{city}</option>)}
                </select>
              </div>

              <div>
                <p style={{ fontSize: 9, color: '#444', fontFamily: 'DM Mono, monospace', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                  Servicos
                </p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {SERVICE_FILTERS.map(service => {
                    const active = advancedFilters.services?.[service.key];
                    return (
                      <button
                        key={service.key}
                        onClick={() => toggleService(service.key)}
                        style={{
                          padding: '5px 10px', borderRadius: 6,
                          fontSize: 10, fontWeight: 600, fontFamily: 'Syne, sans-serif',
                          cursor: 'pointer', transition: 'all 0.13s',
                          letterSpacing: '0.04em',
                          color: active ? service.color : '#444',
                          background: active ? `${service.color}12` : 'transparent',
                          border: active ? `1px solid ${service.color}30` : '1px solid #1a1a1a',
                        }}
                      >
                        {service.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={() => onAdvancedFilters({ status: 'all', city: 'all', services: {}, urgent: false, withCarga: false })}
                style={{
                  padding: '8px', borderRadius: 7,
                  border: '1px solid #1a1a1a', background: 'transparent',
                  color: '#555', fontSize: 11, fontFamily: 'Syne, sans-serif',
                  cursor: 'pointer', transition: 'all 0.13s',
                  letterSpacing: '0.02em',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#111'; e.currentTarget.style.color = '#888'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#555'; }}
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
