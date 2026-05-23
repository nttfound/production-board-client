/**
 * client/src/components/cards/BulkActionBar.jsx
 * Barra de ações em massa — aparece quando cards estão selecionados.
 */

import React, { useState } from 'react';
import { URGENTE_COLOR, CARGA_COLOR, CALANDRA_COLOR } from '../../services/statusConfig';
import { CARGA_POR_DIA, CIDADE_SEMPRE } from '../../services/cargaConfig';
import { STATUSES } from '../../services/statusConfig';

const CORTE_COLOR = '#06b6d4';
const DOBRA_COLOR = '#8b5cf6';
const MAO_COLOR   = '#f59e0b';

const TAGS = [
  { key: 'urgente',    label: 'Urgente',     color: URGENTE_COLOR },
  { key: 'corte',      label: 'Corte',       color: CORTE_COLOR   },
  { key: 'dobra',      label: 'Dobra',       color: DOBRA_COLOR   },
  { key: 'mao_de_obra',label: 'Mão de Obra', color: MAO_COLOR     },
  { key: 'calandra',   label: 'Calandra',    color: CALANDRA_COLOR },
];

export default function BulkActionBar({ count, onApplyTag, onApplyStatus, onApplyCarga, onCancel }) {
  const [activePanel, setActivePanel] = useState(null); // 'tag' | 'status' | 'carga'
  const [diaAberto,   setDiaAberto]   = useState(null);
  const [loading,     setLoading]     = useState(false);

  const closePanel = () => {
    setActivePanel(null);
    setDiaAberto(null);
  };

  const handleTag = async (tagKey, value) => {
    setLoading(true);
    await onApplyTag(tagKey, value);
    setLoading(false);
    closePanel();
  };

  const handleStatus = async (status) => {
    setLoading(true);
    await onApplyStatus(status);
    setLoading(false);
    closePanel();
  };

  const handleCarga = async (carga) => {
    setLoading(true);
    await onApplyCarga(carga);
    setLoading(false);
    closePanel();
  };

  return (
    <>
      {/* Overlay escuro para fechar painéis */}
      {activePanel && (
        <div className="fixed inset-0 z-40" onClick={closePanel} />
      )}

      {/* Barra principal */}
      <div
        className="fixed bottom-6 left-1/2 z-50 animate-fade-in"
        style={{ transform: 'translateX(-50%)' }}
      >
        <div
          className="flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border"
          style={{
            background: '#141414',
            borderColor: '#2a2a2a',
            boxShadow: '0 8px 40px rgba(0,0,0,0.7)',
          }}
        >
          {/* Contador */}
          <div className="flex items-center gap-2 pr-3 border-r border-[#2a2a2a]">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold"
              style={{ background: '#2563eb20', color: '#3b82f6', border: '1px solid #2563eb40' }}
            >
              {count}
            </div>
            <span className="text-[#8a8a8a] text-xs whitespace-nowrap">
              {count === 1 ? 'card selecionado' : 'cards selecionados'}
            </span>
          </div>

          {/* Botão: Tags */}
          <div className="relative">
            <button
              onClick={() => setActivePanel(activePanel === 'tag' ? null : 'tag')}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all"
              style={activePanel === 'tag'
                ? { background: '#2a2a2a', color: '#f0f0f0', border: '1px solid #3a3a3a' }
                : { background: 'transparent', color: '#8a8a8a', border: '1px solid #2a2a2a' }
              }
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                <line x1="7" y1="7" x2="7.01" y2="7"/>
              </svg>
              Tags
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: activePanel === 'tag' ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {/* Painel Tags */}
            {activePanel === 'tag' && (
              <div
                className="absolute bottom-full mb-2 left-0 rounded-2xl border p-3 w-64 animate-scale-in"
                style={{ background: '#141414', borderColor: '#2a2a2a', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}
              >
                <p className="text-[#555] text-[10px] uppercase tracking-wider mb-2 px-1">Ativar ou remover tag em todos</p>
                <div className="space-y-1">
                  {TAGS.map(tag => (
                    <div
                      key={tag.key}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl"
                      style={{ background: `${tag.color}08`, border: `1px solid ${tag.color}20` }}
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                      <span className="text-[#f0f0f0] text-xs flex-1">{tag.label}</span>
                      <button
                        onClick={() => handleTag(tag.key, true)}
                        disabled={loading}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-medium transition-all hover:opacity-80"
                        style={{ background: `${tag.color}25`, color: tag.color, border: `1px solid ${tag.color}40` }}
                      >
                        Ativar
                      </button>
                      <button
                        onClick={() => handleTag(tag.key, false)}
                        disabled={loading}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-medium transition-all hover:opacity-80"
                        style={{ background: '#2a2a2a', color: '#555', border: '1px solid #3a3a3a' }}
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Botão: Status */}
          <div className="relative">
            <button
              onClick={() => setActivePanel(activePanel === 'status' ? null : 'status')}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all"
              style={activePanel === 'status'
                ? { background: '#2a2a2a', color: '#f0f0f0', border: '1px solid #3a3a3a' }
                : { background: 'transparent', color: '#8a8a8a', border: '1px solid #2a2a2a' }
              }
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              Status
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: activePanel === 'status' ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {/* Painel Status */}
            {activePanel === 'status' && (
              <div
                className="absolute bottom-full mb-2 left-0 rounded-2xl border p-3 w-52 animate-scale-in"
                style={{ background: '#141414', borderColor: '#2a2a2a', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}
              >
                <p className="text-[#555] text-[10px] uppercase tracking-wider mb-2 px-1">Alterar status de todos</p>
                <div className="space-y-1">
                  {STATUSES.map(s => (
                    <button
                      key={s.value}
                      onClick={() => handleStatus(s.value)}
                      disabled={loading}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[#f0f0f0] transition-all hover:bg-[#1c1c1c]"
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Botão: Carga */}
          <div className="relative">
            <button
              onClick={() => setActivePanel(activePanel === 'carga' ? null : 'carga')}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all"
              style={activePanel === 'carga'
                ? { background: '#2a2a2a', color: '#f0f0f0', border: '1px solid #3a3a3a' }
                : { background: 'transparent', color: '#8a8a8a', border: '1px solid #2a2a2a' }
              }
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
              Carga
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: activePanel === 'carga' ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {/* Painel Carga */}
            {activePanel === 'carga' && (
              <div
                className="absolute bottom-full mb-2 left-0 rounded-2xl border p-3 w-64 max-h-80 overflow-y-auto animate-scale-in"
                style={{ background: '#141414', borderColor: '#2a2a2a', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}
              >
                <p className="text-[#555] text-[10px] uppercase tracking-wider mb-2 px-1">Definir carga de todos</p>

                {/* Itapira sempre */}
                <button
                  onClick={() => handleCarga(CIDADE_SEMPRE)}
                  disabled={loading}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all hover:bg-[#1c1c1c] mb-1"
                  style={{ color: CARGA_COLOR }}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CARGA_COLOR }} />
                  {CIDADE_SEMPRE}
                </button>

                {/* Por dia */}
                {Object.entries(CARGA_POR_DIA).map(([dia, cidades]) => (
                  <div key={dia}>
                    <button
                      onClick={() => setDiaAberto(diaAberto === dia ? null : dia)}
                      className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[10px] font-medium text-[#555] hover:text-[#8a8a8a] hover:bg-[#1c1c1c] transition-all uppercase tracking-wider"
                    >
                      {dia}
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        style={{ transform: diaAberto === dia ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </button>
                    {diaAberto === dia && (
                      <div className="pl-2 space-y-0.5 mt-0.5">
                        {cidades.map(cidade => (
                          <button
                            key={cidade}
                            onClick={() => handleCarga(`CARGA - ${cidade}`)}
                            disabled={loading}
                            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all hover:bg-[#1c1c1c]"
                            style={{ color: CARGA_COLOR }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: CARGA_COLOR }} />
                            CARGA - {cidade}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Remover */}
                <button
                  onClick={() => handleCarga(null)}
                  disabled={loading}
                  className="w-full mt-2 py-1.5 text-[#555] text-xs hover:text-[#8a8a8a] transition-colors border-t border-[#1c1c1c] pt-2"
                >
                  Remover carga
                </button>
              </div>
            )}
          </div>

          {/* Separador */}
          <div className="w-px h-5 bg-[#2a2a2a]" />

          {/* Spinner quando carregando */}
          {loading && (
            <div className="w-4 h-4 border-2 border-[#2a2a2a] border-t-[#3b82f6] rounded-full animate-spin" />
          )}

          {/* Cancelar */}
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-[#555] hover:text-[#8a8a8a] transition-all hover:bg-[#1c1c1c]"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
            Cancelar
          </button>
        </div>
      </div>
    </>
  );
}
