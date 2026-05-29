import React, { useState } from 'react';
import StatusBadge from '../ui/StatusBadge';
import StatusModal from './StatusModal';
import ImageModal from './ImageModal';
import ObservacaoEdit from './ObservacaoEdit';
import { useAuth } from '../../contexts/AuthContext';
import { getStatus, URGENTE_COLOR, CARGA_COLOR, CALANDRA_COLOR } from '../../services/statusConfig';
import { cargaAtivaAgora } from '../../services/cargaConfig';

const BASE_URL    = process.env.REACT_APP_API_URL || 'http://localhost:3000';
const CORTE_COLOR = '#06b6d4';
const DOBRA_COLOR = '#8b5cf6';
const MAO_COLOR   = '#f59e0b';

function fmtOrdem(n) {
  return String(n).padStart(2, '0');
}

function isHoje(dateStr) {
  if (!dateStr) return false;
  const [y, m, d] = dateStr.slice(0, 10).split('-');
  const data = new Date(+y, +m - 1, +d);
  const hoje = new Date();
  return data.getFullYear() === hoje.getFullYear()
    && data.getMonth()      === hoje.getMonth()
    && data.getDate()       === hoje.getDate();
}

export default function ProductionCard({
  card,
  ordem,
  onStatusChange,
  onDelete,
  selectionMode = false,
  selected      = false,
  onToggleSelect,
}) {
  const { can } = useAuth();
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showImageModal,  setShowImageModal]  = useState(false);
  const [showObsModal,    setShowObsModal]    = useState(false);
  const [localCard,       setLocalCard]       = useState(card);

  React.useEffect(() => { setLocalCard(card); }, [card]);

  const imageUrl = localCard.image_path
    ? localCard.image_path.startsWith('http') ? localCard.image_path : `${BASE_URL}${localCard.image_path}`
    : null;

  const s              = getStatus(localCard.status);
  const mostrarCarga   = cargaAtivaAgora(localCard.carga);
  const isUrgente      = localCard.urgente === true;
  const isAgendadoHoje = localCard.status === 'Scheduled' && isHoje(localCard.scheduled_date);

  const formattedDate = new Date(localCard.created_at).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
  });

  // Força parse local (evita UTC-3 virar dia anterior)
  const scheduledStr = localCard.scheduled_date
    ? (() => {
        const [y, m, d] = localCard.scheduled_date.slice(0, 10).split('-');
        return new Date(+y, +m - 1, +d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      })()
    : null;

  const tags = [
    localCard.dobra       && { label: 'Dobra',       color: DOBRA_COLOR    },
    localCard.calandra    && { label: 'Calandra',    color: CALANDRA_COLOR },
    localCard.corte       && { label: 'Corte',       color: CORTE_COLOR    },
    localCard.mao_de_obra && { label: 'Mão de Obra', color: MAO_COLOR      },
  ].filter(Boolean);

  // Cor de acento do card
  const accentColor = isUrgente
    ? URGENTE_COLOR
    : isAgendadoHoje
      ? '#7c3aed'
      : mostrarCarga
        ? CARGA_COLOR
        : s.color;

  // Borda
  const borderColor = selected
    ? '#2563eb'
    : isUrgente
      ? `${URGENTE_COLOR}80`
      : isAgendadoHoje
        ? '#7c3aed60'
        : mostrarCarga
          ? `${CARGA_COLOR}60`
          : `${s.color}30`;

  // Urgente e agendado-hoje não exibem número de ordem
  const mostrarOrdem = !isUrgente && !isAgendadoHoje && ordem != null;

  const canCardActions = can('mudar_status') || can('marcar_urgente') || can('marcar_carga')
    || can('servico_corte') || can('servico_dobra') || can('servico_mao_de_obra') || can('servico_calandra');
  const canObs    = can('alterar_observacao');
  const canDelete = can('deletar_card');

  const handleCardClick = (e) => {
    if (!selectionMode) return;
    e.stopPropagation();
    onToggleSelect?.(localCard.id);
  };

  return (
    <>
      <div
        className="group flex flex-col overflow-hidden animate-fade-in transition-all duration-200"
        style={{
          background:   selected ? '#141c2e' : '#111113',
          border:       '1px solid #1e1e22',
          borderRadius: 14,
          boxShadow:    isUrgente || isAgendadoHoje
            ? `0 4px 32px rgba(0,0,0,0.7), 0 0 40px ${accentColor}12`
            : '0 2px 16px rgba(0,0,0,0.5)',
          cursor:   selectionMode ? 'pointer' : 'default',
          position: 'relative',
        }}
        onClick={handleCardClick}
      >


        {/* Imagem */}
        {imageUrl ? (
          <div
            className="relative overflow-hidden"
            style={{ height: 160, cursor: selectionMode ? 'pointer' : 'zoom-in', background: '#0a0a0c' }}
            onClick={selectionMode ? handleCardClick : () => setShowImageModal(true)}
          >
            <img
              src={imageUrl}
              alt={localCard.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: 48,
              background: 'linear-gradient(transparent, rgba(17,17,19,0.85))',
            }} />
            {selectionMode && (
              <div className="absolute top-2.5 left-2.5"><Checkbox checked={selected} /></div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center relative" style={{ height: 72, background: '#0a0a0c' }}>
            {selectionMode ? (
              <div className="absolute top-2.5 left-2.5"><Checkbox checked={selected} /></div>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2a2a2e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2.5 p-3.5 flex-1">

          {/* Linha topo: número + badges + ações */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">

              {/* Número de ordem — branco, neutro */}
              {mostrarOrdem && (
                <span
                  className="flex-shrink-0 text-[11px] font-bold tabular-nums px-1.5 py-0.5 rounded-md"
                  style={{
                    color:      '#ffffff',
                    background: 'rgba(255,255,255,0.08)',
                    border:     '1px solid rgba(255,255,255,0.12)',
                    letterSpacing: '0.04em',
                  }}
                >
                  #{fmtOrdem(ordem)}
                </span>
              )}

              <StatusBadge status={localCard.status} />

              {isUrgente && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                  style={{ color: URGENTE_COLOR, background: `${URGENTE_COLOR}15`, border: `1px solid ${URGENTE_COLOR}40` }}
                >
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: URGENTE_COLOR }} />
                  Urgente
                </span>
              )}

              {isAgendadoHoje && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                  style={{ color: '#a78bfa', background: '#7c3aed18', border: '1px solid #7c3aed40' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: '#a78bfa' }} />
                  Hoje
                </span>
              )}

              {mostrarCarga && localCard.carga && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                  style={{ color: CARGA_COLOR, background: `${CARGA_COLOR}15`, border: `1px solid ${CARGA_COLOR}35` }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: CARGA_COLOR }} />
                  {localCard.carga.replace('CARGA - ', '')}
                </span>
              )}
            </div>

            {!selectionMode && (
              <div className="flex items-center gap-1 flex-shrink-0">
                {canCardActions && (
                  <button
                    onClick={() => setShowStatusModal(true)}
                    className="w-6 h-6 flex items-center justify-center rounded-md transition-all opacity-40 group-hover:opacity-100"
                    style={{ color: '#9ca3af' }}
                    title="Alterar"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
                    </svg>
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => onDelete(localCard.id)}
                    className="w-6 h-6 flex items-center justify-center rounded-md transition-all opacity-0 group-hover:opacity-100 hover:text-[#ef4444]"
                    style={{ color: '#6b7280' }}
                    title="Deletar"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14H6L5 6"/>
                      <path d="M10 11v6M14 11v6"/>
                    </svg>
                  </button>
                )}
              </div>
            )}

            {selectionMode && !imageUrl && <Checkbox checked={selected} />}
          </div>

          {/* Tags de serviço */}
          {tags.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {tags.map(tag => (
                <span
                  key={tag.label}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold"
                  style={{ color: tag.color, background: `${tag.color}12`, border: `1px solid ${tag.color}30` }}
                >
                  {tag.label}
                </span>
              ))}
            </div>
          )}

          {/* Título */}
          <h3 className="text-[#e5e7eb] font-medium text-sm leading-snug line-clamp-2">
            {localCard.title}
          </h3>

          {/* Observação */}
          <div className="relative group/obs flex-1">
            {localCard.observation ? (
              <div>
                <p className="text-[#8b9199] text-xs leading-relaxed line-clamp-3">{localCard.observation}</p>
                {localCard.observation_by && (
                  <p className="text-[#555b63] text-[10px] mt-1 font-mono">editado por {localCard.observation_by}</p>
                )}
              </div>
            ) : (
              <p className="text-[#3a3a40] text-xs italic">Sem observação</p>
            )}
            {canObs && !selectionMode && (
              <button
                onClick={() => setShowObsModal(true)}
                className="absolute top-0 right-0 opacity-0 group-hover/obs:opacity-100 transition-opacity"
                style={{ color: '#6b7280' }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            )}
          </div>

          {/* Agendado (data) */}
          {localCard.status === 'Scheduled' && scheduledStr && (
            <div className="flex items-center gap-1.5 text-[11px]" style={{ color: '#a78bfa' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              {scheduledStr}
            </div>
          )}

          {/* Rodapé */}
          <div
            className="flex items-center justify-between pt-2.5 mt-auto"
            style={{
              borderTop:  `1px solid ${accentColor}50`,
              boxShadow:  `0 -4px 12px ${accentColor}10`,
            }}
          >
            <span className="text-[#555b63] text-[10px] font-mono">{localCard.created_by}</span>
            <span className="text-[#555b63] text-[10px]">{formattedDate}</span>
          </div>
        </div>
      </div>

      {showStatusModal && (
        <StatusModal
          card={localCard}
          onClose={() => setShowStatusModal(false)}
          onSave={(status, date, updates, options = {}) => {
            setLocalCard(prev => ({ ...prev, status, scheduled_date: date, ...updates }));
            if (options.updateStatus) onStatusChange(localCard.id, status, date);
            setShowStatusModal(false);
          }}
        />
      )}

      {showObsModal && (
        <ObservacaoEdit
          card={localCard}
          onSave={text => setLocalCard(prev => ({ ...prev, observation: text }))}
          onClose={() => setShowObsModal(false)}
        />
      )}

      {showImageModal && imageUrl && (
        <ImageModal src={imageUrl} alt={localCard.title} onClose={() => setShowImageModal(false)} />
      )}
    </>
  );
}

function Checkbox({ checked }) {
  return (
    <div
      className="w-5 h-5 rounded-md flex items-center justify-center transition-all flex-shrink-0"
      style={{
        background:     checked ? '#2563eb' : 'rgba(0,0,0,0.5)',
        border:         checked ? '1.5px solid #2563eb' : '1.5px solid #3a3a40',
        backdropFilter: 'blur(4px)',
      }}
    >
      {checked && (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      )}
    </div>
  );
}
