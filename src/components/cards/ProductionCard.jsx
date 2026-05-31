import React, { useEffect, useState } from 'react';
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

function Tag({ label, color, extra }) {
  return (
    <span
      className="inline-flex items-center gap-1 font-mono uppercase tracking-wider rounded-tag tag-pill"
      style={{
        fontSize: '9px',
        fontWeight: 600,
        letterSpacing: '0.08em',
        color,
        background: `${color}10`,
        border: `1px solid ${color}22`,
        padding: '4px 8px',
      }}
    >
      <span style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: color, display: 'inline-block', boxShadow: `0 0 5px ${color}90` }} />
      {extra && <span style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 3, padding: '1px 4px', marginRight: 2 }}>{extra}</span>}
      {label}
    </span>
  );
}

export default function ProductionCard({ card, cargaOrder, onStatusChange, onDelete }) {
  const { user } = useAuth();
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showImageModal,  setShowImageModal]  = useState(false);
  const [showObsModal,    setShowObsModal]    = useState(false);
  const [localCard,       setLocalCard]       = useState(card);

  useEffect(() => { setLocalCard(card); }, [card]);

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

  const isUrgent = localCard.urgente;
  const hasCarga = mostrarCarga && localCard.carga;

  const accentColor = isUrgent ? URGENTE_COLOR : hasCarga ? CARGA_COLOR : s.color;

  const tags = [
    localCard.corte       && { label: 'Corte',       color: CORTE_COLOR },
    localCard.dobra       && { label: 'Dobra',       color: DOBRA_COLOR },
    localCard.mao_de_obra && { label: 'Mao de Obra', color: MAO_COLOR   },
  ].filter(Boolean);

  const canEdit = user?.role === 'creator' || user?.role === 'operator';

  return (
    <>
      <div
        className="production-card group flex flex-col overflow-hidden animate-fade-in"
        style={{
          background: '#0e0e0e',
          borderRadius: 10,
          border: `1px solid ${accentColor}20`,
          boxShadow: `0 1px 3px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.03)`,
        }}
      >
        {/* Top accent line */}
        <div style={{ height: 2, background: `linear-gradient(90deg, ${accentColor}80, transparent)` }} />

        {/* Image area */}
        {imageUrl ? (
          <div
            className="relative overflow-hidden cursor-zoom-in"
            style={{ height: 160, background: '#0a0a0a' }}
            onClick={() => setShowImageModal(true)}
          >
            <img
              src={imageUrl}
              alt={localCard.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              style={{ filter: 'brightness(0.9) contrast(1.05)' }}
            />
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)',
            }} />
            <div style={{
              position: 'absolute', top: 8, right: 8,
              background: 'rgba(0,0,0,0.6)', borderRadius: 6, padding: '4px 6px',
              backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" strokeLinecap="round">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
              </svg>
            </div>
          </div>
        ) : (
          <div style={{ height: 80, background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="1.5" strokeLinecap="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
        )}

        {/* Body */}
        <div className="flex flex-col gap-3 p-3.5 flex-1">

          {/* Badges row */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <StatusBadge status={localCard.status} />
              {isUrgent && <Tag label="Urgente" color={URGENTE_COLOR} />}
              {hasCarga && <Tag label={localCard.carga === 'Itapira' ? 'Itapira' : localCard.carga} color={CARGA_COLOR} extra={cargaOrder} />}
              {tags.map(tag => <Tag key={tag.label} label={tag.label} color={tag.color} />)}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {canEdit && (
                <button
                  onClick={() => setShowStatusModal(true)}
                  className="transition-opacity text-[#444] hover:text-[#888]"
                  style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', letterSpacing: '0.04em' }}
                >
                  editar
                </button>
              )}
              {user?.role === 'creator' && (
                <button
                  onClick={() => onDelete(localCard.id)}
                  className="text-[#333] hover:text-[#ef4444] transition-colors opacity-0 group-hover:opacity-100"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Title */}
          <h3 style={{ color: '#ddd', fontWeight: 600, fontSize: 13, lineHeight: 1.4 }} className="line-clamp-2">
            {localCard.title}
          </h3>

          {/* Observation */}
          <div className="relative group/obs flex-1">
            {localCard.observation ? (
              <div>
                <p style={{ color: '#666', fontSize: 11, lineHeight: 1.6, fontFamily: 'DM Mono, monospace' }} className="line-clamp-3">
                  {localCard.observation}
                </p>
                {localCard.observation_by && (
                  <p style={{ color: '#333', fontSize: 9, marginTop: 4, fontFamily: 'DM Mono, monospace' }}>
                    — {localCard.observation_by}
                  </p>
                )}
              </div>
            ) : (
              <p style={{ color: '#333', fontSize: 11, fontStyle: 'italic', fontFamily: 'DM Mono, monospace' }}>sem observacao</p>
            )}
            {canEdit && (
              <button
                onClick={() => setShowObsModal(true)}
                className="absolute top-0 right-0 opacity-0 group-hover/obs:opacity-100 transition-opacity text-[#444] hover:text-[#888]"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            )}
          </div>

          {localCard.status === 'Scheduled' && scheduledStr && (
            <div style={{ fontSize: 10, color: '#7c3aed', fontFamily: 'DM Mono, monospace', letterSpacing: '0.04em' }}>
              ◷ {scheduledStr}
            </div>
          )}

          {/* Footer */}
          <div
            className="flex items-center justify-between pt-3"
            style={{ borderTop: '1px solid #151515' }}
          >
            <span style={{ color: '#333', fontSize: 10, fontFamily: 'DM Mono, monospace' }}>{localCard.created_by}</span>
            <span style={{ color: '#333', fontSize: 10, fontFamily: 'DM Mono, monospace' }}>{formattedDate}</span>
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
