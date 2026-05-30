import React, { useState, useRef, useEffect } from 'react';
import { CARGA_COLOR, STATUSES } from '../../services/statusConfig';
import { CARGA_POR_DIA, CIDADE_SEMPRE } from '../../services/cargaConfig';
import { useAuth } from '../../contexts/AuthContext';
import { SERVICOS } from '../../config/tagColors';

const DIAS_CARGA = Object.entries(CARGA_POR_DIA);

// Status individuais disponíveis no filtro avançado
// (Fila e Prontos já ficam nos chips rápidos da barra principal)
const STATUS_FILTERS = STATUSES.filter(s =>
  !['Ready'].includes(s.value)
);

// Abreviações para exibir cidades no botão do dia
const abreviar = (cidade) => {
  const map = {
    'Monte Alegre do Sul': 'M. Alegre',
    'Aguas de Lindoia':    'Á. Lindoia',
    'Monte Siao':          'M. Sião',
    'Ouro Fino':           'O. Fino',
  };
  return map[cidade] || cidade;
};

export default function FilterBar({
  search,
  onSearch,
  filterStatus,
  onFilterStatus,
  total,
  selectionMode,
  onToggleSelectionMode,
  selectedCount,
  onSelectAll,
  onDeselectAll,
  filteredCount,
  showAudit,
  onToggleAudit,
  filterDias,
  onFilterDias,
  filterServicos,
  onFilterServicos,
}) {
  const { can } = useAuth();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const advancedRef = useRef(null);

  const itapiraAtivo  = filterDias.includes('Itapira');
  const statusAtivo   = !['fila', 'prontos'].includes(filterStatus) ? 1 : 0;
  const totalAtivos   = filterDias.length + filterServicos.length + statusAtivo;

  useEffect(() => {
    if (!showAdvanced) return;
    const handler = (e) => {
      if (advancedRef.current && !advancedRef.current.contains(e.target))
        setShowAdvanced(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showAdvanced]);

  const toggleDia = (dia) => {
    onFilterDias(prev =>
      prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]
    );
  };

  const toggleServico = (key) => {
    onFilterServicos(prev =>
      prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]
    );
  };

  const limparAvancado = () => {
    onFilterDias([]);
    onFilterServicos([]);
    onFilterStatus('fila');
  };

  return (
    <div className="flex flex-col gap-3 px-6 py-4 border-b border-[#1c1c1c] flex-shrink-0">
      <div className="flex items-center gap-3">

        {/* Busca */}
        <div className="relative max-w-sm flex-1 z-10">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder="Buscar cards..."
            className="w-full bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl pl-9 pr-4 py-2 text-[#f0f0f0] text-sm placeholder-[#555] outline-none focus:border-[#2563eb] transition-all"
          />
        </div>

        {/* Selecionar */}
        {can('selecionar') && (
          <button
            onClick={onToggleSelectionMode}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all flex-shrink-0"
            style={selectionMode
              ? { background: '#2563eb20', color: '#3b82f6', border: '1px solid #2563eb50' }
              : { background: 'transparent', color: '#555', border: '1px solid #2a2a2a' }
            }
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {selectionMode
                ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                : <><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></>
              }
            </svg>
            {selectionMode ? 'Cancelar' : 'Selecionar'}
          </button>
        )}

        <div className="flex-1" />

        {/* Filtro avançado */}
        <div className="relative flex-shrink-0" ref={advancedRef}>
          <button
            onClick={() => setShowAdvanced(p => !p)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all"
            style={showAdvanced || totalAtivos > 0
              ? { background: '#7c3aed20', color: '#a78bfa', border: '1px solid #7c3aed50' }
              : { background: 'transparent', color: '#555', border: '1px solid #2a2a2a' }
            }
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="6" x2="20" y2="6"/>
              <line x1="8" y1="12" x2="16" y2="12"/>
              <line x1="11" y1="18" x2="13" y2="18"/>
            </svg>
            Filtrar
            {totalAtivos > 0 && (
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                style={{ background: '#7c3aed', color: '#fff' }}>
                {totalAtivos}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {showAdvanced && (
            <div
              className="absolute right-0 top-full mt-2 z-50 rounded-2xl border border-[#222] shadow-2xl"
              style={{ width: '320px', background: '#0f0f0f' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a]">
                <span className="text-[#888] text-[11px] font-semibold uppercase tracking-widest">Filtros</span>
                {totalAtivos > 0 && (
                  <button
                    onClick={limparAvancado}
                    className="text-[11px] text-[#555] hover:text-[#ef4444] transition-colors flex items-center gap-1"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                    Limpar tudo
                  </button>
                )}
              </div>

              {/* Dias */}
              <div className="p-3">
                <p className="text-[#3a3a3a] text-[10px] uppercase tracking-widest mb-2.5 px-1 font-semibold">Dia de carga</p>
                <div className="grid grid-cols-1 gap-1.5">
                  {DIAS_CARGA.map(([dia, cidades]) => {
                    const ativo = filterDias.includes(dia);
                    return (
                      <button
                        key={dia}
                        onClick={() => toggleDia(dia)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left"
                        style={ativo
                          ? { background: `${CARGA_COLOR}18`, border: `1px solid ${CARGA_COLOR}60` }
                          : { background: '#161616', border: '1px solid #1e1e1e' }
                        }
                      >
                        {/* Checkbox visual */}
                        <div
                          className="w-4 h-4 rounded-[5px] flex items-center justify-center flex-shrink-0 transition-all"
                          style={ativo
                            ? { background: CARGA_COLOR, border: `1.5px solid ${CARGA_COLOR}` }
                            : { background: 'transparent', border: '1.5px solid #333' }
                          }
                        >
                          {ativo && (
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          )}
                        </div>

                        {/* Nome do dia */}
                        <span
                          className="text-[12px] font-semibold w-14 flex-shrink-0"
                          style={{ color: ativo ? CARGA_COLOR : '#666' }}
                        >
                          {dia}
                        </span>

                        {/* Cidades */}
                        <span className="text-[10px] truncate" style={{ color: ativo ? '#6aafbf' : '#383838' }}>
                          {cidades.map(abreviar).join(' · ')}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ height: 1, background: '#1a1a1a', margin: '0 12px' }} />

              {/* Itapira */}
              <div className="p-3">
                <p className="text-[#3a3a3a] text-[10px] uppercase tracking-widest mb-2.5 px-1 font-semibold">Sempre disponível</p>
                <button
                  onClick={() => toggleDia('Itapira')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left"
                  style={itapiraAtivo
                    ? { background: `${CARGA_COLOR}18`, border: `1px solid ${CARGA_COLOR}60` }
                    : { background: '#161616', border: '1px solid #1e1e1e' }
                  }
                >
                  <div
                    className="w-4 h-4 rounded-[5px] flex items-center justify-center flex-shrink-0 transition-all"
                    style={itapiraAtivo
                      ? { background: CARGA_COLOR, border: `1.5px solid ${CARGA_COLOR}` }
                      : { background: 'transparent', border: '1.5px solid #333' }
                    }
                  >
                    {itapiraAtivo && (
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </div>
                  <span className="text-[12px] font-semibold" style={{ color: itapiraAtivo ? CARGA_COLOR : '#666' }}>
                    {CIDADE_SEMPRE}
                  </span>
                  <span className="text-[10px]" style={{ color: itapiraAtivo ? '#6aafbf' : '#383838' }}>
                    disponível todos os dias
                  </span>
                </button>
              </div>

              <div style={{ height: 1, background: '#1a1a1a', margin: '0 12px' }} />

              {/* Status */}
              <div className="p-3">
                <p className="text-[#3a3a3a] text-[10px] uppercase tracking-widest mb-2.5 px-1 font-semibold">Status</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {STATUS_FILTERS.map(s => {
                    const ativo = filterStatus === s.value;
                    return (
                      <button
                        key={s.value}
                        onClick={() => {
                          onFilterStatus(ativo ? 'fila' : s.value);
                          setShowAdvanced(false);
                        }}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all text-left"
                        style={ativo
                          ? { background: `${s.color}18`, border: `1px solid ${s.color}60` }
                          : { background: '#161616', border: '1px solid #1e1e1e' }
                        }
                      >
                        <div
                          className="w-4 h-4 rounded-[5px] flex items-center justify-center flex-shrink-0 transition-all"
                          style={ativo
                            ? { background: s.color, border: `1.5px solid ${s.color}` }
                            : { background: 'transparent', border: '1.5px solid #333' }
                          }
                        >
                          {ativo && (
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          )}
                        </div>
                        <span className="text-[12px] font-semibold truncate" style={{ color: ativo ? s.color : '#666' }}>
                          {s.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ height: 1, background: '#1a1a1a', margin: '0 12px' }} />

              {/* Serviços */}
              <div className="p-3">
                <p className="text-[#3a3a3a] text-[10px] uppercase tracking-widest mb-2.5 px-1 font-semibold">Serviços</p>
                <div className="flex gap-2">
                  {SERVICOS.map(s => {
                    const ativo = filterServicos.includes(s.key);
                    return (
                      <button
                        key={s.key}
                        onClick={() => toggleServico(s.key)}
                        className="flex-1 py-2.5 rounded-xl text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5"
                        style={ativo
                          ? { background: `${s.color}18`, color: s.color, border: `1px solid ${s.color}60` }
                          : { background: '#161616', color: '#555', border: '1px solid #1e1e1e' }
                        }
                      >
                        {ativo && (
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Registro */}
        {can('ver_registro') && (
          <button
            onClick={onToggleAudit}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all flex-shrink-0"
            style={showAudit
              ? { background: '#3b82f620', color: '#3b82f6', border: '1px solid #3b82f650' }
              : { background: 'transparent', color: '#555', border: '1px solid #2a2a2a' }
            }
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
            Registro
          </button>
        )}
      </div>

      {/* Barra de status / chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {selectionMode ? (
          <>
            <span className="text-[#555] text-xs">
              {selectedCount === 0
                ? 'Clique nos cards para selecionar'
                : `${selectedCount} de ${filteredCount} selecionados`
              }
            </span>
            <button onClick={onSelectAll} className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#3b82f6] hover:bg-[#1c1c1c] transition-all">
              Selecionar todos
            </button>
            {selectedCount > 0 && (
              <button onClick={onDeselectAll} className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#555] hover:text-[#8a8a8a] hover:bg-[#1c1c1c] transition-all">
                Desmarcar todos
              </button>
            )}
          </>
        ) : (
          <>
            {/* ── 3 filtros principais ── */}
            {[
              { key: 'fila',    label: 'Fila',   color: '#9ca3af' },
              { key: 'prontos', label: 'Prontos', color: '#16a34a' },
            ].map(({ key, label, color }) => {
              const ativo = filterStatus === key;
              return (
                <button
                  key={key}
                  onClick={() => onFilterStatus(key)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5"
                  style={ativo
                    ? { background: `${color}18`, color, border: `1px solid ${color}40` }
                    : { color: '#555' }
                  }
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                  {label}
                  {key === 'fila' && <span className="ml-0.5" style={{ color: '#444' }}>{total}</span>}
                </button>
              );
            })}

            {/* Chip do status individual ativo */}
            {statusAtivo > 0 && (() => {
              const s = STATUSES.find(st => st.value === filterStatus);
              return s ? (
                <span
                  key={s.value}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all hover:opacity-75"
                  style={{ background: `${s.color}20`, color: s.color, border: `1px solid ${s.color}40` }}
                  onClick={() => onFilterStatus('fila')}
                >
                  {s.label}
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </span>
              ) : null;
            })()}

            {/* Chips dos dias ativos */}
            {filterDias.map(dia => (
              <span
                key={dia}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all hover:opacity-75"
                style={{ background: `${CARGA_COLOR}20`, color: CARGA_COLOR, border: `1px solid ${CARGA_COLOR}40` }}
                onClick={() => toggleDia(dia)}
              >
                {dia}
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </span>
            ))}

            {/* Chips serviços */}
            {filterServicos.map(key => {
              const s = SERVICOS.find(s => s.key === key);
              return (
                <span
                  key={key}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all hover:opacity-75"
                  style={{ background: `${s.color}20`, color: s.color, border: `1px solid ${s.color}40` }}
                  onClick={() => toggleServico(key)}
                >
                  {s.label}
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </span>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
