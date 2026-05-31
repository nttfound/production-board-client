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
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
        fontFamily: 'DM Mono, monospace', textTransform: 'uppercase',
        color, background: `${color}14`,
        border: `1px solid ${color}30`,
        borderRadius: 6, padding: '3px 8px',
      }}
    >
      <span style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: color, boxShadow: `0 0 6px ${color}` }} />
      {extra && <span style={{ background: 'rgba(0,0,0,0.35)', borderRadius: 3, padding: '1px 5px', marginRight: 1 }}>{extra}</span>}
      {label}
    </span>
  );
}

function InfoRow({ icon, value, color = '#2e2e2e' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ color: '#2a2a2a', flexShrink: 0 }}>{icon}</span>
      <span style={{ color, fontSize: 10, fontFamily: 'DM Mono, monospace', letterSpacing: '0.04em' }}>{value}</span>
    </div>
  );
}

export default function ProductionCard({ card, cargaOrder, onStatusChange, onDelete }) {
  const { user } = useAuth();
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showImageModal,  setShowImageModal]  = useState(false);
  const [showObsModal,    setShowObsModal]    = useState(false);
  const [localCard,       setLocalCard]       = useState(card);
  const [imgError,        setImgError]        = useState(false);

  useEffect(() => { setLocalCard(card); setImgError(false); }, [card]);

  const imageUrl = !imgError && localCard.image_path
    ? localCard.image_path.startsWith('http') ? localCard.image_path : `${BASE_URL}${localCard.image_path}`
    : null;

  const s            = getStatus(localCard.status);
  const mostrarCarga = cargaAtivaAgora(localCard.carga);
  const isUrgent     = localCard.urgente;
  const hasCarga     = mostrarCarga && localCard.carga;
  const accentColor  = isUrgent ? URGENTE_COLOR : hasCarga ? CARGA_COLOR : s.color;

  const formattedDate = new Date(localCard.created_at).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
  });

  const scheduledStr = localCard.scheduled_date
    ? new Date(localCard.scheduled_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null;

  const tags = [
    localCard.corte       && { label: 'Corte',       color: CORTE_COLOR },
    localCard.dobra       && { label: 'Dobra',       color: DOBRA_COLOR },
    localCard.mao_de_obra && { label: 'Mão de Obra', color: MAO_COLOR   },
  ].filter(Boolean);

  const canEdit = user?.role === 'creator' || user?.role === 'operator';

  return (
    <>
      <div
        className="production-card group"
        style={{
          position: 'relative',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: 12,
          background: 'linear-gradient(160deg, #111 0%, #0c0c0c 100%)',
          border: `1px solid ${accentColor}1a`,
          boxShadow: `0 2px 8px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.025), 0 0 24px ${accentColor}08`,
          transition: 'box-shadow 0.2s, border-color 0.2s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.boxShadow = `0 4px 20px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04), 0 0 32px ${accentColor}14`;
          e.currentTarget.style.borderColor = `${accentColor}35`;
        }}
        onMouseLeave={e => {
          e.currentTarget.style.boxShadow = `0 2px 8px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.025), 0 0 24px ${accentColor}08`;
          e.currentTarget.style.borderColor = `${accentColor}1a`;
        }}
      >
        {/* Accent bar */}
        <div style={{
          height: 3,
          background: `linear-gradient(90deg, ${accentColor}cc, ${accentColor}33, transparent)`,
          flexShrink: 0,
        }} />

        {/* Urgent ribbon */}
        {isUrgent && (
          <div style={{
            position: 'absolute', top: 12, left: -20,
            background: URGENTE_COLOR, color: '#fff',
            fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
            fontFamily: 'DM Mono, monospace',
            padding: '3px 24px', transform: 'rotate(-45deg)', transformOrigin: 'center',
            boxShadow: `0 2px 8px ${URGENTE_COLOR}66`, zIndex: 10,
          }}>
            urgente
          </div>
        )}

        {/* Image area */}
        {imageUrl ? (
          <div
            className="relative overflow-hidden cursor-zoom-in"
            style={{ height: 150, background: '#080808', flexShrink: 0 }}
            onClick={() => setShowImageModal(true)}
          >
            <img
              src={imageUrl}
              alt={localCard.title}
              onError={() => setImgError(true)}
              style={{
                width: '100%', height: '100%', objectFit: 'cover',
                filter: 'brightness(0.85) contrast(1.08) saturate(0.9)',
                transition: 'transform 0.5s ease, filter 0.3s ease',
              }}
              className="group-hover:scale-[1.05]"
            />
            {/* Gradient overlay */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to top, rgba(12,12,12,0.75) 0%, transparent 55%)',
            }} />
            {/* Zoom hint */}
            <div style={{
              position: 'absolute', top: 8, right: 8,
              background: 'rgba(0,0,0,0.55)', borderRadius: 7, padding: '5px 7px',
              backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.07)',
              opacity: 0, transition: 'opacity 0.2s',
            }} className="group-hover:opacity-100">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2.5" strokeLinecap="round">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
              </svg>
            </div>
          </div>
        ) : (
          <div style={{
            height: 64, background: '#080808', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderBottom: '1px solid #0e0e0e',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1c1c1c" strokeWidth="1.5" strokeLinecap="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
        )}

        {/* Body */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 14px', flex: 1 }}>

          {/* Status + actions row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, flex: 1, minWidth: 0 }}>
              <StatusBadge status={localCard.status} />
              {hasCarga && <Tag label={localCard.carga === 'Itapira' ? 'Itapira' : localCard.carga} color={CARGA_COLOR} extra={cargaOrder} />}
              {tags.map(tag => <Tag key={tag.label} label={tag.label} color={tag.color} />)}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {canEdit && (
                <button
                  onClick={() => setShowStatusModal(true)}
                  title="Editar status"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 24, height: 24, borderRadius: 6,
                    background: 'transparent', border: '1px solid #1a1a1a',
                    color: '#333', cursor: 'pointer', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#1a1a1a'; e.currentTarget.style.color = '#888'; e.currentTarget.style.borderColor = '#2a2a2a'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#333'; e.currentTarget.style.borderColor = '#1a1a1a'; }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
              )}
              {user?.role === 'creator' && (
                <button
                  onClick={() => onDelete(localCard.id)}
                  title="Excluir card"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 24, height: 24, borderRadius: 6,
                    background: 'transparent', border: '1px solid #1a1a1a',
                    color: '#2a2a2a', cursor: 'pointer', transition: 'all 0.15s',
                    opacity: 0,
                  }}
                  className="group-hover:opacity-100"
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#2a2a2a'; e.currentTarget.style.borderColor = '#1a1a1a'; }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'linear-gradient(90deg, #151515, #0e0e0e)' }} />

          {/* Title */}
          <h3 style={{
            color: '#d4d4d4', fontWeight: 700, fontSize: 13,
            lineHeight: 1.45, margin: 0,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {localCard.title}
          </h3>

          {/* Observation */}
          <div className="relative group/obs" style={{ flex: 1, position: 'relative' }}>
            {localCard.observation ? (
              <div>
                <p style={{
                  color: '#555', fontSize: 11, lineHeight: 1.65,
                  fontFamily: 'DM Mono, monospace', margin: 0,
                  display: '-webkit-box', WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {localCard.observation}
                </p>
                {localCard.observation_by && (
                  <p style={{ color: '#2a2a2a', fontSize: 9, marginTop: 5, fontFamily: 'DM Mono, monospace' }}>
                    — {localCard.observation_by}
                  </p>
                )}
              </div>
            ) : (
              <p style={{ color: '#252525', fontSize: 11, fontStyle: 'italic', fontFamily: 'DM Mono, monospace', margin: 0 }}>sem observação</p>
            )}
            {canEdit && (
              <button
                onClick={() => setShowObsModal(true)}
                title="Editar observação"
                style={{
                  position: 'absolute', top: 0, right: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 22, height: 22, borderRadius: 6,
                  background: '#0e0e0e', border: '1px solid #1a1a1a',
                  color: '#333', cursor: 'pointer', transition: 'all 0.15s',
                  opacity: 0,
                }}
                className="group-hover/obs:opacity-100"
                onMouseEnter={e => { e.currentTarget.style.color = '#888'; e.currentTarget.style.borderColor = '#2a2a2a'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#333'; e.currentTarget.style.borderColor = '#1a1a1a'; }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            )}
          </div>

          {/* Scheduled date */}
          {localCard.status === 'Scheduled' && scheduledStr && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
              fontSize: 10, color: '#7c3aed', fontFamily: 'DM Mono, monospace',
              background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)',
              borderRadius: 6, padding: '3px 8px',
            }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              {scheduledStr}
            </div>
          )}

          {/* Footer */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            paddingTop: 10, borderTop: '1px solid #111',
            marginTop: 'auto',
          }}>
            <InfoRow
              icon={<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
              value={localCard.created_by}
            />
            <InfoRow
              icon={<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
              value={formattedDate}
            />
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
