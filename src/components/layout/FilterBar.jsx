import React from 'react';
import { STATUSES, URGENTE_COLOR, CARGA_COLOR } from '../../services/statusConfig';

export default function FilterBar({ search, onSearch, filterStatus, onFilterStatus, total }) {
  return (
    <div className="flex flex-col gap-3 px-6 py-4 border-b border-[#1c1c1c] flex-shrink-0">
      <div className="relative max-w-sm z-10">
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

      <div className="flex items-center gap-2 flex-wrap">
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
      </div>
    </div>
  );
}
