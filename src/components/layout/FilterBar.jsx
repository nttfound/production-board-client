import React from 'react';
import { STATUSES, URGENTE_COLOR, CARGA_COLOR } from '../../services/statusConfig';
import { useAuth } from '../../contexts/AuthContext';

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
}) {
  const { can } = useAuth();

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
          </>
        )}
      </div>
    </div>
  );
}
