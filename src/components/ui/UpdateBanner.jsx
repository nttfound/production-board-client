import React, { useEffect, useState, useCallback } from 'react';

// Guard: só ativa se electronAPI existir E tiver os métodos de update
const isElectron = typeof window !== 'undefined'
  && !!window.electronAPI
  && typeof window.electronAPI.onUpdateStatus === 'function';

export default function UpdateBanner() {
  const [update,    setUpdate]    = useState(null);
  const [progress,  setProgress]  = useState(null);
  const [visible,   setVisible]   = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isElectron) return;

    const unsubStatus   = window.electronAPI.onUpdateStatus((payload) => {
      setUpdate(payload);
      if (payload.status === 'available' || payload.status === 'downloaded') {
        setVisible(true);
        setDismissed(false);
      }
    });

    const unsubProgress = window.electronAPI.onUpdateProgress((p) => {
      setProgress(p);
      setVisible(true);
    });

    return () => { unsubStatus(); unsubProgress(); };
  }, []);

  const handleDownload = useCallback(() => {
    window.electronAPI?.downloadUpdate?.();
    setUpdate(prev => ({ ...prev, status: 'downloading' }));
  }, []);

  const handleInstall  = useCallback(() => window.electronAPI?.installUpdate?.(), []);
  const handleDismiss  = useCallback(() => { setDismissed(true); setVisible(false); }, []);

  if (!isElectron || !visible || dismissed || !update) return null;

  const { status, version, message } = update;

  const container = {
    position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
    width: 320,
    background: 'rgba(10,10,10,0.97)',
    backdropFilter: 'blur(16px)',
    border: '1px solid #1e1e1e',
    borderRadius: 14,
    boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)',
    overflow: 'hidden',
    fontFamily: 'var(--font-display)',
    animation: 'slideInUp 0.25s cubic-bezier(0.34,1.56,0.64,1)',
  };
  const accentLine = (color) => ({ height: 2, background: `linear-gradient(90deg,${color}cc,${color}33,transparent)` });
  const btnPrimary = (color = '#2563eb', shadow = '37,99,235') => ({
    flex: 1, padding: '7px 12px', borderRadius: 8,
    background: `linear-gradient(135deg,${color},${color}cc)`,
    border: `1px solid ${color}55`,
    color: '#fff', fontSize: 11, fontWeight: 600,
    cursor: 'pointer', transition: 'all 0.15s',
    boxShadow: `0 2px 8px rgba(${shadow},0.35)`,
  });
  const btnGhost = {
    flex: 1, padding: '7px 12px', borderRadius: 8,
    background: 'transparent', border: '1px solid #222',
    color: '#555', fontSize: 11, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
  };
  const CloseBtn = () => (
    <button onClick={handleDismiss} style={{ background:'none',border:'none',color:'#333',cursor:'pointer',padding:4,lineHeight:1 }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  );

  if (status === 'downloading') return (
    <div style={container}>
      <style>{`@keyframes slideInUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={accentLine('#2563eb')} />
      <div style={{ padding:'16px 18px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
          <div style={{ width:30,height:30,borderRadius:8,background:'rgba(37,99,235,0.12)',border:'1px solid rgba(37,99,235,0.2)',display:'flex',alignItems:'center',justifyContent:'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"
              style={{ animation:'spin 1.5s linear infinite' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </div>
          <div>
            <p style={{ color:'#e8e8e8',fontSize:12,fontWeight:700,margin:0 }}>Baixando atualização…</p>
            <p style={{ color:'#3b82f6',fontSize:10,fontFamily:'var(--font-text)',margin:0 }}>{progress?.percent ?? 0}%</p>
          </div>
        </div>
        <div style={{ height:4,borderRadius:4,background:'#111',overflow:'hidden' }}>
          <div style={{ height:'100%',width:`${progress?.percent ?? 0}%`,borderRadius:4,background:'linear-gradient(90deg,#2563eb,#60a5fa)',transition:'width 0.3s ease' }} />
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (status === 'available') return (
    <div style={container}>
      <style>{`@keyframes slideInUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={accentLine('#2563eb')} />
      <div style={{ padding:'16px 18px' }}>
        <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:12 }}>
          <div style={{ display:'flex',alignItems:'center',gap:8 }}>
            <div style={{ width:30,height:30,borderRadius:8,background:'rgba(37,99,235,0.12)',border:'1px solid rgba(37,99,235,0.2)',display:'flex',alignItems:'center',justifyContent:'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </div>
            <div>
              <p style={{ color:'#e8e8e8',fontSize:12,fontWeight:700,margin:0 }}>Atualização disponível</p>
              <p style={{ color:'#3b82f6',fontSize:10,fontFamily:'var(--font-text)',margin:0 }}>v{version}</p>
            </div>
          </div>
          <CloseBtn />
        </div>
        <p style={{ color:'#555',fontSize:11,margin:'0 0 14px',lineHeight:1.5,fontFamily:'var(--font-text)' }}>
          Nova versão disponível. Baixe agora para continuar atualizado.
        </p>
        <div style={{ display:'flex',gap:8 }}>
          <button style={btnGhost} onClick={handleDismiss}
            onMouseEnter={e=>e.currentTarget.style.color='#aaa'}
            onMouseLeave={e=>e.currentTarget.style.color='#555'}>Depois</button>
          <button style={btnPrimary()} onClick={handleDownload}
            onMouseEnter={e=>e.currentTarget.style.boxShadow='0 4px 16px rgba(37,99,235,0.5)'}
            onMouseLeave={e=>e.currentTarget.style.boxShadow='0 2px 8px rgba(37,99,235,0.35)'}>Baixar</button>
        </div>
      </div>
    </div>
  );

  if (status === 'downloaded') return (
    <div style={container}>
      <style>{`@keyframes slideInUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={accentLine('#16a34a')} />
      <div style={{ padding:'16px 18px' }}>
        <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:12 }}>
          <div style={{ display:'flex',alignItems:'center',gap:8 }}>
            <div style={{ width:30,height:30,borderRadius:8,background:'rgba(22,163,74,0.12)',border:'1px solid rgba(22,163,74,0.2)',display:'flex',alignItems:'center',justifyContent:'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div>
              <p style={{ color:'#e8e8e8',fontSize:12,fontWeight:700,margin:0 }}>Pronto para instalar</p>
              <p style={{ color:'#22c55e',fontSize:10,fontFamily:'var(--font-text)',margin:0 }}>v{version} baixada</p>
            </div>
          </div>
          <CloseBtn />
        </div>
        <p style={{ color:'#555',fontSize:11,margin:'0 0 14px',lineHeight:1.5,fontFamily:'var(--font-text)' }}>
          O app será reiniciado para aplicar a atualização.
        </p>
        <div style={{ display:'flex',gap:8 }}>
          <button style={btnGhost} onClick={handleDismiss}
            onMouseEnter={e=>e.currentTarget.style.color='#aaa'}
            onMouseLeave={e=>e.currentTarget.style.color='#555'}>Mais tarde</button>
          <button style={btnPrimary('#16a34a','22,163,74')} onClick={handleInstall}
            onMouseEnter={e=>e.currentTarget.style.boxShadow='0 4px 16px rgba(22,163,74,0.5)'}
            onMouseLeave={e=>e.currentTarget.style.boxShadow='0 2px 8px rgba(22,163,74,0.35)'}>
            Reiniciar e instalar
          </button>
        </div>
      </div>
    </div>
  );

  if (status === 'error') return (
    <div style={container}>
      <div style={accentLine('#ef4444')} />
      <div style={{ padding:'16px 18px' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8 }}>
          <p style={{ color:'#ef4444',fontSize:12,fontWeight:700,margin:0 }}>Erro ao atualizar</p>
          <CloseBtn />
        </div>
        <p style={{ color:'#444',fontSize:10,fontFamily:'var(--font-text)',margin:0,wordBreak:'break-word' }}>{message}</p>
      </div>
    </div>
  );

  return null;
}
