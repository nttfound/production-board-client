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
const CALANDRA_COLOR = '#22c55e';

function ServicePill({ label, color }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
      fontFamily: 'DM Mono, monospace', textTransform: 'uppercase',
      color,
      background: `${color}22`,
      border: `1px solid ${color}55`,
      borderRadius: 5, padding: '3px 8px',
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
        background: color, boxShadow: `0 0 6px ${color}cc`,
      }} />
      {label}
    </span>
  );
}

function CargaBadge({ label, color }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
      fontFamily: 'DM Mono, monospace', textTransform: 'uppercase',
      color,
      background: `${color}22`,
      border: `1px solid ${color}55`,
      borderRadius: 5, padding: '3px 8px',
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
        background: color, boxShadow: `0 0 6px ${color}cc`,
      }} />
      {label}
    </span>
  );
}

function OrderBadge({ order, color }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      minWidth: 22, height: 18,
      fontSize: 9, fontWeight: 800,
      fontFamily: 'DM Mono, monospace',
      color: '#000',
      background: color,
      borderRadius: 4, padding: '0 5px',
      boxShadow: `0 0 8px ${color}88`,
    }}>
      #{order}
    </span>
  );
}

function ActionBtn({ onClick, title, danger, children, alwaysVisible }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick} title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 26, height: 26, borderRadius: 6,
        background: hover ? (danger ? 'rgba(239,68,68,0.10)' : 'rgba(255,255,255,0.06)') : 'transparent',
        border: `1px solid ${hover ? (danger ? 'rgba(239,68,68,0.30)' : '#333') : '#1e1e1e'}`,
        color: hover ? (danger ? '#ef4444' : '#aaa') : '#444',
        cursor: 'pointer', transition: 'all 0.14s',
        opacity: alwaysVisible ? 1 : undefined,
      }}
      className={alwaysVisible ? undefined : 'group-hover:opacity-100'}
    >
      {children}
    </button>
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

  const services = [
    localCard.corte       && { label: 'Corte',       color: CORTE_COLOR },
    localCard.dobra       && { label: 'Dobra',       color: DOBRA_COLOR },
    localCard.mao_de_obra && { label: 'Mão de Obra', color: MAO_COLOR   },
    localCard.calandra    && { label: 'Calandra',    color: CALANDRA_COLOR },
  ].filter(Boolean);

  const isCreator = user?.role === 'creator';
  const canChangeStatus = isCreator || Boolean(user?.permissions?.mudar_status);
  const canEditObservation = isCreator || Boolean(user?.permissions?.alterar_observacao);
  const canDelete = isCreator || Boolean(user?.permissions?.deletar_card);

  return (
    <>
      <div
        className="production-card group"
        style={{
          position: 'relative',
          display: 'flex', flexDirection: 'column',
          borderRadius: 10,
          background: '#111',
          border: '1px solid #1e1e1e',
          overflow: 'hidden',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = '#2a2a2a';
          e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,0.65)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = '#1e1e1e';
          e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.5)';
        }}
      >


        {/* Image */}
        {imageUrl ? (
          <div
            style={{ height: 144, background: '#0a0a0a', flexShrink: 0, overflow: 'hidden', position: 'relative', cursor: 'zoom-in' }}
            onClick={() => setShowImageModal(true)}
          >
            <img
              src={imageUrl} alt={localCard.title} onError={() => setImgError(true)}
              style={{
                width: '100%', height: '100%', objectFit: 'cover',
                filter: 'brightness(0.88) saturate(0.9)',
                transition: 'transform 0.5s ease, filter 0.3s',
              }}
              className="group-hover:scale-[1.04]"
            />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(17,17,17,0.85) 0%, transparent 50%)' }} />
            <div
              style={{
                position: 'absolute', top: 8, right: 8,
                background: 'rgba(0,0,0,0.65)', borderRadius: 6,
                padding: '4px 6px', backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.08)',
                opacity: 0, transition: 'opacity 0.18s',
              }}
              className="group-hover:opacity-100"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" strokeLinecap="round">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
              </svg>
            </div>
          </div>
        ) : (
          <div style={{
            height: 44, flexShrink: 0, background: '#0d0d0d',
            borderBottom: '1px solid #1a1a1a',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#252525" strokeWidth="1.5" strokeLinecap="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
        )}

        {/* Body */}
        <div style={{ padding: '11px 13px 12px', display: 'flex', flexDirection: 'column', gap: 9, flex: 1 }}>

          {/* Status + carga + actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, flex: 1, minWidth: 0 }}>
              <StatusBadge status={localCard.status} />
              {hasCarga && (
                <CargaBadge
                  label={localCard.carga === 'Itapira' ? 'Itapira' : localCard.carga}
                  color={CARGA_COLOR}
                />
              )}
            </div>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              {canChangeStatus && (
                <ActionBtn onClick={() => setShowStatusModal(true)} title="Editar status" alwaysVisible>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </ActionBtn>
              )}
              {canDelete && (
                <ActionBtn onClick={() => onDelete(localCard.id)} title="Excluir" danger>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14H6L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                  </svg>
                </ActionBtn>
              )}
            </div>
          </div>

          {/* Title */}
          <h3 style={{
            color: '#e0e0e0', fontWeight: 700, fontSize: 13,
            lineHeight: 1.5, margin: 0, letterSpacing: '-0.01em',
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {localCard.title}
          </h3>

          {/* Services */}
          {services.length > 0 && (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {services.map(sv => <ServicePill key={sv.label} label={sv.label} color={sv.color} />)}
            </div>
          )}

          {/* Observation */}
          <div className="relative group/obs" style={{ position: 'relative', flex: 1 }}>
            {localCard.observation ? (
              <div>
                <p style={{
                  color: '#999', fontSize: 11, lineHeight: 1.7,
                  fontFamily: 'DM Mono, monospace', margin: 0,
                  display: '-webkit-box', WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {localCard.observation}
                </p>
                {localCard.observation_by && (
                  <p style={{ color: '#555', fontSize: 9, marginTop: 4, fontFamily: 'DM Mono, monospace' }}>
                    — {localCard.observation_by}
                  </p>
                )}
              </div>
            ) : (
              <p style={{ color: '#444', fontSize: 11, fontFamily: 'DM Mono, monospace', margin: 0, fontStyle: 'italic' }}>
                sem observação
              </p>
            )}
            {canEditObservation && (
              <button
                onClick={() => setShowObsModal(true)} title="Editar observação"
                style={{
                  position: 'absolute', top: -1, right: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 22, height: 22, borderRadius: 5,
                  background: '#141414', border: '1px solid #222',
                  color: '#444', cursor: 'pointer', transition: 'all 0.14s', opacity: 0,
                }}
                className="group-hover/obs:opacity-100"
                onMouseEnter={e => { e.currentTarget.style.color = '#aaa'; e.currentTarget.style.borderColor = '#333'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#444'; e.currentTarget.style.borderColor = '#222'; }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            )}
          </div>

          {/* Accent divider — entre observação e footer */}
          <div style={{
            height: 1, flexShrink: 0,
            background: `linear-gradient(90deg, ${accentColor} 0%, ${accentColor}66 40%, transparent 100%)`,
          }} />

          {/* Scheduled */}
          {localCard.status === 'Scheduled' && scheduledStr && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 10, color: '#7c3aed', fontFamily: 'DM Mono, monospace',
              background: 'rgba(124,58,237,0.10)', border: '1px solid rgba(124,58,237,0.28)',
              borderRadius: 5, padding: '3px 8px', alignSelf: 'flex-start',
            }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              {scheduledStr}
            </div>
          )}

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 }}>
            <span style={{ color: '#666', fontSize: 10, fontFamily: 'DM Mono, monospace', display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              {localCard.created_by}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {hasCarga && cargaOrder && <OrderBadge order={cargaOrder} color={CARGA_COLOR} />}
              <span style={{ color: '#444', fontSize: 10, fontFamily: 'DM Mono, monospace' }}>
                {formattedDate}
              </span>
            </div>
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
