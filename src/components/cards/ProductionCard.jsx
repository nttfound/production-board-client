import React, { useState } from 'react';
import StatusBadge from '../ui/StatusBadge';
import StatusModal from './StatusModal';
import ImageModal from './ImageModal';
import ObservacaoEdit from './ObservacaoEdit';
import { useAuth } from '../../contexts/AuthContext';
import { getStatus, URGENTE_COLOR, CARGA_COLOR } from '../../services/statusConfig';
import { cargaAtivaAgora } from '../../services/cargaConfig';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
const CORTE_COLOR = '#06b6d4';
const DOBRA_COLOR = '#8b5cf6';
const MAO_COLOR   = '#f59e0b';

export default function ProductionCard({ card, onStatusChange, onDelete }) {
  const { user } = useAuth();
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showImageModal,  setShowImageModal]  = useState(false);
  const [showObsModal,    setShowObsModal]    = useState(false);
  const [localCard,       setLocalCard]       = useState(card);

  const imageUrl = localCard.image_path
    ? localCard.image_path.startsWith('http') ? localCard.image_path : `${BASE_URL}${localCard.image_path}`
    : null;

  const s = getStatus(localCard.status);
  const mostrarCarga = cargaAtivaAgora(localCard.carga);

  const formattedDate = new Date(localCard.created_at).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
  });

  const scheduledStr = localCard.scheduled_date
    ? new Date(localCard.scheduled_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null;

  const borderColor = localCard.urgente
    ? `${URGENTE_COLOR}70`
    : mostrarCarga ? `${CARGA_COLOR}70` : `${s.color}50`;

  const canEdit = user?.role === 'creator' || user?.role === 'operator';

  const tags = [
    localCard.corte       && { label: 'Corte',       color: CORTE_COLOR },
    localCard.dobra       && { label: 'Dobra',       color: DOBRA_COLOR },
    localCard.mao_de_obra && { label: 'Mao de Obra', color: MAO_COLOR   },
  ].filter(Boolean);

  return (
    <>
      <div
        className="group bg-[#141414] rounded-card shadow-card hover:shadow-card-hover transition-all duration-200 flex flex-col overflow-hidden animate-fade-in"
        style={{ border: `1.5px solid ${borderColor}` }}
      >
        {imageUrl ? (
          <div className="relative h-44 bg-[#1c1c1c] overflow-hidden cursor-zoom-in" onClick={() => setShowImageModal(true)}>
            <img src={imageUrl} alt={localCard.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
          </div>
        ) : (
          <div className="h-28 bg-[#1c1c1c] flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
        )}

        <div className="flex flex-col gap-3 p-4 flex-1">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <StatusBadge status={localCard.status} />
              {localCard.urgente && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ color: URGENTE_COLOR, background: `${URGENTE_COLOR}15`, border: `1px solid ${URGENTE_COLOR}35` }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: URGENTE_COLOR }} />
                  Urgente
                </span>
              )}
              {mostrarCarga && localCard.carga && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ color: CARGA_COLOR, background: `${CARGA_COLOR}15`, border: `1px solid ${CARGA_COLOR}35` }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: CARGA_COLOR }} />
                  {localCard.carga === 'Itapira' ? 'Itapira' : localCard.carga}
                </span>
              )}
              {tags.map(tag => (
                <span key={tag.label} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ color: tag.color, background: `${tag.color}15`, border: `1px solid ${tag.color}35` }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
                  {tag.label}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {canEdit && (
                <button onClick={() => setShowStatusModal(true)}
                  className="text-[#555] hover:text-[#8a8a8a] transition-colors text-xs underline underline-offset-2">
                  alterar
                </button>
              )}
              {user?.role === 'creator' && (
                <button onClick={() => onDelete(localCard.id)}
                  className="text-[#555] hover:text-[#ef4444] transition-colors opacity-0 group-hover:opacity-100">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14H6L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          <h3 className="text-[#f0f0f0] font-medium text-sm leading-snug line-clamp-2">{localCard.title}</h3>

        <div className="relative group/obs">
          {localCard.observation
            ? (
              <div>
                <p className="text-[#8a8a8a] text-xs leading-relaxed line-clamp-3">{localCard.observation}</p>
                {localCard.observation_by && (
                  <p className="text-[#444] text-[10px] mt-1 font-mono">editado por {localCard.observation_by}</p>
                )}
              </div>
            )
            : <p className="text-[#444] text-xs italic">Sem observacao</p>
          }
            {canEdit && (
              <button onClick={() => setShowObsModal(true)}
                className="absolute top-0 right-0 opacity-0 group-hover/obs:opacity-100 transition-opacity text-[#555] hover:text-[#8a8a8a]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            )}
          </div>

          {localCard.status === 'Scheduled' && scheduledStr && (
            <div className="text-xs" style={{ color: '#7c3aed' }}>Agendado: {scheduledStr}</div>
          )}

          <div className="flex items-center justify-between mt-auto pt-3 border-t border-[#1c1c1c]">
            <span className="text-[#555] text-xs font-mono">{localCard.created_by}</span>
            <span className="text-[#555] text-xs">{formattedDate}</span>
          </div>
        </div>
      </div>

      {showStatusModal && (
        <StatusModal
          card={localCard}
          onClose={() => setShowStatusModal(false)}
          onSave={(status, date, updates) => {
            setLocalCard(prev => ({ ...prev, status, scheduled_date: date, ...updates }));
            onStatusChange(localCard.id, status, date);
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
