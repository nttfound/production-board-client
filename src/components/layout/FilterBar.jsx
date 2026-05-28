import React, { useState, useRef, useEffect } from 'react';
import { STATUSES, URGENTE_COLOR, CARGA_COLOR } from '../../services/statusConfig';
import { CARGA_POR_DIA, CIDADE_SEMPRE } from '../../services/cargaConfig';
import { useAuth } from '../../contexts/AuthContext';

const SERVICOS = [
  { key: 'corte',    label: 'Corte',    color: '#06b6d4' },
  { key: 'dobra',    label: 'Dobra',    color: '#8b5cf6' },
  { key: 'calandra', label: 'Calandra', color: '#ec4899' },
];

const DIAS_CARGA = Object.entries(CARGA_POR_DIA);

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
  filterCidades,
  onFilterCidades,
  filterServicos,
  onFilterServicos,
}) {
  const { can } = useAuth();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const advancedRef = useRef(null);

  // Dia selecionado: null = nenhum, string = dia ativo
  const diaAtivo = (() => {
    if (filterCidades.length === 0) return null;
    for (const [dia, cidades] of DIAS_CARGA) {
      if (cidades.every(c => filterCidades.includes(c))) return dia;
    }
    return null;
  })();

  const totalAtivos = (diaAtivo ? 1 : 0) + filterServicos.length +
    (filterCidades.includes(CIDADE_SEMPRE) ? 1 : 0);

  useEffect(() => {
    if (!showAdvanced) return;
    const handler = (e) => {
      if (advancedRef.current && !advancedRef.current.contains(e.target))
        setShowAdvanced(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showAdvanced]);

  // Seleciona/deseleciona um dia inteiro
  const toggleDia = (dia) => {
    const cidadesDoDia = CARGA_POR_DIA[dia] || [];
    if (diaAtivo === dia) {
      // Deseleciona o dia, mantém Itapira se estiver ativo
      onFilterCidades(prev => prev.filter(c => !cidadesDoDia.includes(c)));
    } else {
      // Seleciona o dia (substitui qualquer dia anterior, mantém Itapira)
      onFilterCidades(prev => {
        const semOutrosDias = prev.filter(c => c === CIDADE_SEMPRE);
        return [...semOutrosDias, ...cidadesDoDia];
      });
    }
  };

  // Seleciona/deseleciona Itapira (sempre disponível)
  const toggleItapira = () => {
    onFilterCidades(prev =>
      prev.includes(CIDADE_SEMPRE)
        ? prev.filter(c => c !== CIDADE_SEMPRE)
        : [...prev, CIDADE_SEMPRE]
    );
  };

  const toggleServico = (key) => {
    onFilterServicos(prev =>
      prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]
    );
  };

  const limparAvancado = () => {
    onFilterCidades([]);
    onFilterServicos([]);
  };

  // Label do chip do dia ativo
  const chipDiaLabel = diaAtivo;

  return (
    <div className="flex flex-col gap-3 px-6 py-4 border-b border-[#1c1c1c] flex-shrink-0">
      <div className="flex items-center gap-3">
        {/* Campo de busca */}
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

        {/* Botão Selecionar */}
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
              {selectionMode ? (
                <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
              ) : (
                <><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></>
              )}
            </svg>
            {selectionMode ? 'Cancelar' : 'Selecionar'}
          </button>
        )}

        <div className="flex-1" />

        {/* Botão Filtro Avançado */}
        <div className="relative flex-shrink-0" ref={advancedRef}>
          <button
            onClick={() => setShowAdvanced(p => !p)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all"
            style={showAdvanced || totalAtivos > 0
              ? { background: '#7c3aed20', color: '#7c3aed', border: '1px solid #7c3aed50' }
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
              className="absolute right-0 top-full mt-2 z-50 rounded-2xl border border-[#2a2a2a] shadow-2xl overflow-hidden"
              style={{ width: '300px', background: '#111111' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#1c1c1c]">
                <p className="text-[#f0f0f0] text-xs font-semibold">Filtros avancados</p>
                {totalAtivos > 0 && (
                  <button onClick={limparAvancado} className="text-[10px] text-[#555] hover:text-[#ef4444] transition-colors">
                    Limpar tudo
                  </button>
                )}
              </div>

              {/* Dias de carga — seleção direta */}
              <div className="px-4 py-3">
                <p className="text-[#444] text-[10px] uppercase tracking-widest mb-2 font-medium">Dia de carga</p>
                <div className="flex flex-col gap-1.5">
                  {DIAS_CARGA.map(([dia, cidades]) => {
                    const ativo = diaAtivo === dia;
                    return (
                      <button
                        key={dia}
                        onClick={() => toggleDia(dia)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all"
                        style={ativo
                          ? { background: `${CARGA_COLOR}20`, color: CARGA_COLOR, border: `1px solid ${CARGA_COLOR}50` }
                          : { background: '#1c1c1c', color: '#666', border: '1px solid #222' }
                        }
                      >
                        <div className="flex items-center gap-2">
                          {ativo && (
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          )}
                          <span className="font-semibold uppercase tracking-wider">{dia}</span>
                        </div>
                        <span style={{ color: ativo ? CARGA_COLOR : '#444', opacity: 0.8 }}>
                          {cidades.join(', ')}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ height: 1, background: '#1c1c1c', margin: '0 16px' }} />

              {/* Itapira — sempre disponível */}
              <div className="px-4 py-3">
                <p className="text-[#444] text-[10px] uppercase tracking-widest mb-2 font-medium">Sempre disponível</p>
                <button
                  onClick={toggleItapira}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all w-full"
                  style={filterCidades.includes(CIDADE_SEMPRE)
                    ? { background: `${CARGA_COLOR}20`, color: CARGA_COLOR, border: `1px solid ${CARGA_COLOR}50` }
                    : { background: '#1c1c1c', color: '#8a8a8a', border: '1px solid #2a2a2a' }
                  }
                >
                  {filterCidades.includes(CIDADE_SEMPRE) && (
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                  {CIDADE_SEMPRE}
                </button>
              </div>

              <div style={{ height: 1, background: '#1c1c1c' }} />

              {/* Serviços */}
              <div className="px-4 py-3">
                <p className="text-[#444] text-[10px] uppercase tracking-widest mb-2.5 font-medium">Serviços</p>
                <div className="flex gap-2">
                  {SERVICOS.map(s => (
                    <button
                      key={s.key}
                      onClick={() => toggleServico(s.key)}
                      className="flex-1 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5"
                      style={filterServicos.includes(s.key)
                        ? { background: `${s.color}20`, color: s.color, border: `1px solid ${s.color}50` }
                        : { background: '#1c1c1c', color: '#666', border: '1px solid #222' }
                      }
                    >
                      {filterServicos.includes(s.key) && (
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Botão Registro */}
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
            <button
              onClick={() => onFilterStatus('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterStatus === 'all' ? 'bg-[#2a2a2a] text-[#f0f0f0]' : 'text-[#555] hover:text-[#8a8a8a] hover:bg-[#1c1c1c]'}`}
            >
              Todos <span className="ml-1 text-[#555]">{total}</span>
            </button>

            {STATUSES.map(s => (
              <button
                key={s.value}
                onClick={() => onFilterStatus(s.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${filterStatus === s.value ? 'bg-[#2a2a2a] text-[#f0f0f0]' : 'text-[#555] hover:text-[#8a8a8a] hover:bg-[#1c1c1c]'}`}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                {s.label}
              </button>
            ))}

            <button
              onClick={() => onFilterStatus('urgente')}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5"
              style={filterStatus === 'urgente'
                ? { background: `${URGENTE_COLOR}20`, color: URGENTE_COLOR, border: `1px solid ${URGENTE_COLOR}40` }
                : { color: '#555' }
              }
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: URGENTE_COLOR }} />
              Urgente
            </button>

            <button
              onClick={() => onFilterStatus('carga')}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5"
              style={filterStatus === 'carga'
                ? { background: `${CARGA_COLOR}20`, color: CARGA_COLOR, border: `1px solid ${CARGA_COLOR}40` }
                : { color: '#555' }
              }
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: CARGA_COLOR }} />
              Carga
            </button>

            {/* Chip do dia ativo */}
            {chipDiaLabel && (
              <span
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all hover:opacity-80"
                style={{ background: `${CARGA_COLOR}20`, color: CARGA_COLOR, border: `1px solid ${CARGA_COLOR}40` }}
                onClick={() => toggleDia(chipDiaLabel)}
              >
                {chipDiaLabel}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </span>
            )}

            {/* Chip Itapira se ativo */}
            {filterCidades.includes(CIDADE_SEMPRE) && (
              <span
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all hover:opacity-80"
                style={{ background: `${CARGA_COLOR}20`, color: CARGA_COLOR, border: `1px solid ${CARGA_COLOR}40` }}
                onClick={toggleItapira}
              >
                {CIDADE_SEMPRE}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </span>
            )}

            {/* Chips de serviços */}
            {filterServicos.map(key => {
              const s = SERVICOS.find(s => s.key === key);
              return (
                <span
                  key={key}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all hover:opacity-80"
                  style={{ background: `${s.color}20`, color: s.color, border: `1px solid ${s.color}40` }}
                  onClick={() => toggleServico(key)}
                >
                  {s.label}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
