import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const DEFAULT_VALUES = {
  diametroMaior: '510',
  diametroMenor: '100',
  altura: '250',
  espessura: '1,50',
};

function parseNumber(value) {
  const normalized = String(value || '').replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value, digits = 1) {
  if (!Number.isFinite(value)) return '-';
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function calculateCone(values) {
  const D = parseNumber(values.diametroMaior);
  const d = parseNumber(values.diametroMenor);
  const h = parseNumber(values.altura);
  const e = parseNumber(values.espessura);
  const deltaRadius = (D - d) / 2;
  const neutralLargeRadius = (D - e) / 2;
  const neutralSmallRadius = (d - e) / 2;

  if (D <= 0 || d <= 0 || h <= 0 || e < 0 || deltaRadius <= 0 || neutralSmallRadius <= 0 || neutralLargeRadius <= 0) {
    return null;
  }

  const geratriz = Math.sqrt((h * h) + (deltaRadius * deltaRadius));
  const raioExterno = geratriz * (neutralLargeRadius / deltaRadius);
  const raioInterno = geratriz * (neutralSmallRadius / deltaRadius);
  const anguloChapa = 360 * (deltaRadius / geratriz);
  const meioAngulo = anguloChapa / 2;
  const senoMeioAngulo = Math.sin((meioAngulo * Math.PI) / 180);
  const flatSize = getFlatPatternSize(raioExterno, raioInterno, anguloChapa);

  return {
    D,
    d,
    h,
    raioExterno,
    raioInterno,
    geratriz,
    cordaExterna: 2 * raioExterno * senoMeioAngulo,
    cordaInterna: 2 * raioInterno * senoMeioAngulo,
    anguloChapa,
    meioAngulo,
    flatWidth: flatSize.width,
    flatHeight: flatSize.height,
  };
}

function getFlatPatternSize(outerRadius, innerRadius, angle) {
  const halfAngle = angle / 2;
  const start = -90 - halfAngle;
  const end = -90 + halfAngle;
  const points = [];

  for (let a = start; a <= end; a += 1) {
    points.push(polarPoint(0, 0, outerRadius, a));
    points.push(polarPoint(0, 0, innerRadius, a));
  }
  points.push(polarPoint(0, 0, outerRadius, end));
  points.push(polarPoint(0, 0, innerRadius, end));

  const xs = points.map(point => point.x);
  const ys = points.map(point => point.y);
  return {
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
}

function InputField({ label, value, onChange }) {
  return (
    <label className="cone-input">
      <span className="cone-input-label">
        {label}
      </span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        inputMode="decimal"
        style={{
          height: 38,
          background: 'var(--bg-surface2)',
          border: '1px solid var(--border-default)',
          borderRadius: 7,
          color: 'var(--text-primary)',
          padding: '0 12px',
          fontSize: 14,
          fontFamily: 'var(--font-text)',
          outline: 'none',
          width: '100%',
          minWidth: 0,
        }}
        onFocus={e => { e.target.style.borderColor = '#f59e0b'; }}
        onBlur={e => { e.target.style.borderColor = 'var(--border-default)'; }}
      />
    </label>
  );
}

function SizePanel({ result }) {
  return (
    <div className="cone-size-card">
      <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-text)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Tamanho da peca desenvolvida
      </p>
      <p style={{ margin: '10px 0 0', color: '#f59e0b', fontSize: 'clamp(18px, 2.4vw, 26px)', fontFamily: 'var(--font-text)', fontWeight: 800, overflowWrap: 'anywhere' }}>
        {result ? `${formatNumber(result.flatWidth, 1)} x ${formatNumber(result.flatHeight, 1)}` : '-'}
      </p>
      <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-text)' }}>
        largura x altura em milimetros
      </p>
    </div>
  );
}

function ResultCell({ label, value, digits = 1 }) {
  return (
    <div className="cone-result-cell">
      <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-text)', fontWeight: 800 }}>
        {label}
      </p>
      <p style={{ margin: '7px 0 0', color: 'var(--text-primary)', fontSize: 16, fontFamily: 'var(--font-text)', fontWeight: 700 }}>
        {formatNumber(value, digits)}
      </p>
    </div>
  );
}

function FrustumPreview({ result }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(3.2, 2.1, 4.8);
    camera.lookAt(0, 0.1, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.1;
    controls.minDistance = 2.5;
    controls.maxDistance = 10;
    controls.target.set(0, 0, 0);

    const group = new THREE.Group();
    scene.add(group);

    const major = result?.D || 510;
    const minor = result?.d || 100;
    const height = result?.h || 250;
    const bottomRadius = 1.25;
    const topRadius = Math.max(0.18, bottomRadius * Math.min(minor / major, 0.92));
    const modelHeight = Math.min(2.5, Math.max(1.3, height / Math.max(major, 1) * 2.7));

    const bodyGeometry = new THREE.CylinderGeometry(topRadius, bottomRadius, modelHeight, 96, 1, true);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xb8c0c8,
      metalness: 0.86,
      roughness: 0.24,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.94,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    group.add(body);

    const edgeGeometry = new THREE.EdgesGeometry(bodyGeometry, 24);
    const edges = new THREE.LineSegments(
      edgeGeometry,
      new THREE.LineBasicMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.3 })
    );
    group.add(edges);

    const topRing = new THREE.Mesh(
      new THREE.TorusGeometry(topRadius, 0.018, 10, 96),
      new THREE.MeshBasicMaterial({ color: 0xe5e7eb })
    );
    topRing.position.y = modelHeight / 2;
    topRing.rotation.x = Math.PI / 2;
    group.add(topRing);

    const bottomRing = new THREE.Mesh(
      new THREE.TorusGeometry(bottomRadius, 0.02, 10, 96),
      new THREE.MeshBasicMaterial({ color: 0xf5f5f5 })
    );
    bottomRing.position.y = -modelHeight / 2;
    bottomRing.rotation.x = Math.PI / 2;
    group.add(bottomRing);

    const fillTop = new THREE.Mesh(
      new THREE.CircleGeometry(topRadius, 96),
      new THREE.MeshBasicMaterial({ color: 0xcbd5e1, transparent: true, opacity: 0.26, side: THREE.DoubleSide })
    );
    fillTop.position.y = modelHeight / 2;
    fillTop.rotation.x = Math.PI / 2;
    group.add(fillTop);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x111827, 1.9));
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(3, 4, 5);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x93c5fd, 1.05);
    rimLight.position.set(-4, 2, -3);
    scene.add(rimLight);

    const resize = () => {
      const width = Math.max(mount.clientWidth, 1);
      const heightPx = Math.max(mount.clientHeight, 1);
      camera.aspect = width / heightPx;
      camera.updateProjectionMatrix();
      renderer.setSize(width, heightPx, false);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    let raf = 0;
    const animate = () => {
      group.rotation.x = -0.08;
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      mount.removeChild(renderer.domElement);
      controls.dispose();
      bodyGeometry.dispose();
      bodyMaterial.dispose();
      edgeGeometry.dispose();
      topRing.geometry.dispose();
      bottomRing.geometry.dispose();
      fillTop.geometry.dispose();
      renderer.dispose();
    };
  }, [result]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 184 }}>
      <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />
      <span style={{
        position: 'absolute',
        top: 12,
        left: 14,
        color: '#f59e0b',
        fontSize: 10,
        fontFamily: 'var(--font-text)',
        fontWeight: 800,
        letterSpacing: '0.08em',
      }}>
        VISUAL 3D
      </span>
    </div>
  );
}

function Preview3DModal({ result, onClose }) {
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,0.72)' }} onClick={onClose} />
      <div style={{
        position: 'fixed',
        inset: 'clamp(12px, 7vh, 64px) clamp(12px, 7vw, 96px)',
        zIndex: 81,
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 10,
        boxShadow: 'var(--shadow-modal)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div style={{
          minHeight: 48,
          borderBottom: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          flexShrink: 0,
        }}>
          <div>
            <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: 14, fontFamily: 'var(--font-text)', fontWeight: 800 }}>
              Visualizacao 3D
            </p>
            <p style={{ margin: '2px 0 0', color: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-text)' }}>
              Arraste para girar, use a roda para zoom e arraste com o botao direito para mover.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: '1px solid var(--border-default)',
              background: 'var(--bg-surface2)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Fechar"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 260, background: 'var(--bg-app)' }}>
          <FrustumPreview result={result} />
        </div>
      </div>
    </>
  );
}

function ConeSketch() {
  return (
    <svg viewBox="0 0 360 210" style={{ width: '100%', height: 'auto', maxHeight: 210, display: 'block' }} role="img" aria-label="Tronco de cone">
      <line x1="108" y1="166" x2="252" y2="166" stroke="#e5e7eb" strokeWidth="3" strokeLinecap="round" />
      <line x1="153" y1="50" x2="207" y2="50" stroke="#e5e7eb" strokeWidth="3" strokeLinecap="round" />
      <line x1="108" y1="166" x2="153" y2="50" stroke="#e5e7eb" strokeWidth="3" strokeLinecap="round" />
      <line x1="252" y1="166" x2="207" y2="50" stroke="#e5e7eb" strokeWidth="3" strokeLinecap="round" />
      <line x1="96" y1="180" x2="264" y2="180" stroke="#8a8a8a" strokeWidth="1.5" />
      <line x1="96" y1="174" x2="96" y2="186" stroke="#8a8a8a" strokeWidth="1.5" />
      <line x1="264" y1="174" x2="264" y2="186" stroke="#8a8a8a" strokeWidth="1.5" />
      <line x1="220" y1="50" x2="295" y2="50" stroke="#8a8a8a" strokeWidth="1.5" />
      <line x1="295" y1="50" x2="295" y2="166" stroke="#8a8a8a" strokeWidth="1.5" />
      <line x1="286" y1="50" x2="304" y2="50" stroke="#8a8a8a" strokeWidth="1.5" />
      <line x1="286" y1="166" x2="304" y2="166" stroke="#8a8a8a" strokeWidth="1.5" />
      <line x1="153" y1="35" x2="207" y2="35" stroke="#8a8a8a" strokeWidth="1.5" />
      <line x1="153" y1="29" x2="153" y2="41" stroke="#8a8a8a" strokeWidth="1.5" />
      <line x1="207" y1="29" x2="207" y2="41" stroke="#8a8a8a" strokeWidth="1.5" />
      <text x="180" y="200" textAnchor="middle" fill="#f3f4f6" fontSize="16" fontWeight="700">D</text>
      <text x="180" y="27" textAnchor="middle" fill="#f3f4f6" fontSize="16" fontWeight="700">d</text>
      <text x="313" y="113" fill="#f3f4f6" fontSize="16" fontWeight="700">h</text>
    </svg>
  );
}

function polarPoint(cx, cy, radius, angleDeg) {
  const angle = (angleDeg * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}

function DevelopmentSketch({ result }) {
  if (!result) {
    return (
      <div style={{ height: 360, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
        Informe medidas validas para gerar o desenvolvimento.
      </div>
    );
  }

  const cx = 360;
  const cy = 275;
  const outerRadius = 185;
  const innerRadius = Math.max(28, outerRadius * (result.raioInterno / result.raioExterno));
  const halfAngle = Math.min(170, result.anguloChapa / 2);
  const startAngle = -90 - halfAngle;
  const endAngle = -90 + halfAngle;
  const largeArc = result.anguloChapa > 180 ? 1 : 0;
  const outerStart = polarPoint(cx, cy, outerRadius, startAngle);
  const outerEnd = polarPoint(cx, cy, outerRadius, endAngle);
  const innerStart = polarPoint(cx, cy, innerRadius, startAngle);
  const innerEnd = polarPoint(cx, cy, innerRadius, endAngle);
  const chordY = Math.min(Math.max(outerStart.y, outerEnd.y) + 26, 382);
  const innerChordY = chordY - 48;
  const anglePoint = polarPoint(cx, cy, outerRadius * 0.92, -46);
  const radiusExternalPoint = polarPoint(cx, cy, outerRadius * 0.52, -68);
  const radiusInternalPoint = polarPoint(cx, cy, innerRadius * 0.92, -148);
  const vgLabelPoint = {
    x: (outerStart.x + innerStart.x) / 2 - 30,
    y: (outerStart.y + innerStart.y) / 2 + 4,
  };

  const path = [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');

  return (
    <svg viewBox="0 0 720 420" style={{ width: '100%', display: 'block' }} role="img" aria-label="Desenvolvimento do cone">
      <defs>
        <marker id="devArrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#d1d5db" />
        </marker>
        <marker id="devArrowRed" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
        </marker>
      </defs>
      <path d={path} fill="rgba(245,158,11,0.08)" stroke="#e5e7eb" strokeWidth="2.5" />
      <line x1={cx} y1={cy} x2={anglePoint.x} y2={anglePoint.y} stroke="#ef4444" strokeWidth="2" markerEnd="url(#devArrowRed)" />
      <line x1={cx} y1={cy} x2={outerStart.x} y2={outerStart.y} stroke="#ef4444" strokeWidth="1.4" strokeDasharray="6 5" />
      <line x1={cx} y1={cy} x2={innerStart.x} y2={innerStart.y} stroke="#d1d5db" strokeWidth="1" />
      <line x1={cx} y1={cy} x2={outerEnd.x} y2={outerEnd.y} stroke="#d1d5db" strokeWidth="1" />
      <circle cx={cx} cy={cy} r="4" fill="#f59e0b" />
      <line x1={outerStart.x} y1={outerStart.y} x2={outerStart.x} y2={chordY + 14} stroke="#8a8a8a" strokeWidth="1" />
      <line x1={outerEnd.x} y1={outerEnd.y} x2={outerEnd.x} y2={chordY + 14} stroke="#8a8a8a" strokeWidth="1" />
      <line x1={innerStart.x} y1={innerStart.y} x2={innerStart.x} y2={innerChordY + 12} stroke="#8a8a8a" strokeWidth="1" strokeDasharray="5 5" />
      <line x1={innerEnd.x} y1={innerEnd.y} x2={innerEnd.x} y2={innerChordY + 12} stroke="#8a8a8a" strokeWidth="1" strokeDasharray="5 5" />
      <line x1={outerStart.x} y1={chordY} x2={outerEnd.x} y2={chordY} stroke="#d1d5db" strokeWidth="1.4" markerStart="url(#devArrow)" markerEnd="url(#devArrow)" />
      <line x1={innerStart.x} y1={innerChordY} x2={innerEnd.x} y2={innerChordY} stroke="#d1d5db" strokeWidth="1.4" markerStart="url(#devArrow)" markerEnd="url(#devArrow)" />
      <line x1={outerStart.x + 14} y1={outerStart.y + 22} x2={innerStart.x + 10} y2={innerStart.y + 8} stroke="#d1d5db" strokeWidth="1.2" markerStart="url(#devArrow)" markerEnd="url(#devArrow)" />

      <text x={anglePoint.x + 16} y={anglePoint.y - 6} fill="#f3f4f6" fontSize="13">Angulo da chapa</text>
      <text x={anglePoint.x + 16} y={anglePoint.y + 12} fill="#f59e0b" fontSize="13" fontWeight="700">{formatNumber(result.anguloChapa, 2)}</text>
      <text x={radiusExternalPoint.x + 10} y={radiusExternalPoint.y + 18} fill="#f3f4f6" fontSize="13">{formatNumber(result.raioExterno, 1)}</text>
      <text x={radiusInternalPoint.x + 10} y={radiusInternalPoint.y + 8} fill="#f3f4f6" fontSize="13">{formatNumber(result.raioInterno, 1)}</text>
      <text x={vgLabelPoint.x} y={vgLabelPoint.y} fill="#f3f4f6" fontSize="13">{formatNumber(result.geratriz, 1)}</text>
      <text x={cx} y={innerChordY - 10} textAnchor="middle" fill="#f3f4f6" fontSize="13">{formatNumber(result.cordaInterna, 1)}</text>
      <text x={cx} y={chordY + 22} textAnchor="middle" fill="#f3f4f6" fontSize="13">{formatNumber(result.cordaExterna, 1)}</text>
    </svg>
  );
}

export default function ConeCalculator() {
  const [values, setValues] = useState(DEFAULT_VALUES);
  const [show3D, setShow3D] = useState(false);
  const result = useMemo(() => calculateCone(values), [values]);

  const updateValue = (key, value) => {
    setValues(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="cone-page">
      <style>{`
        .cone-page {
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-width: 0;
        }
        .cone-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .cone-workspace {
          display: grid;
          grid-template-columns: minmax(320px, 380px) minmax(0, 1fr);
          gap: 16px;
          align-items: start;
          min-width: 0;
        }
        .cone-panel {
          border: 1px solid var(--border-default);
          background: var(--bg-surface);
          border-radius: 8px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          min-width: 0;
        }
        .cone-panel-title {
          margin: 0;
          color: var(--text-primary);
          font-size: 14px;
          font-family: var(--font-text);
          font-weight: 800;
        }
        .cone-panel-subtitle {
          margin: 4px 0 0;
          color: var(--text-muted);
          font-size: 11px;
          font-family: var(--font-text);
        }
        .cone-input-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .cone-input {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 0;
        }
        .cone-input-label {
          color: var(--text-muted);
          font-size: 10px;
          font-family: var(--font-text);
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .cone-sketch-card,
        .cone-drawing-card {
          border: 1px solid var(--border-default);
          border-radius: 8px;
          background: var(--bg-app);
          overflow: hidden;
          min-width: 0;
        }
        .cone-sketch-card {
          padding: 10px;
        }
        .cone-result-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .cone-result-grid {
          display: grid;
          grid-template-columns: minmax(260px, 1.6fr) repeat(3, minmax(118px, 1fr));
          gap: 10px;
          align-items: stretch;
        }
        .cone-size-card,
        .cone-result-cell {
          border: 1px solid var(--border-default);
          background: var(--bg-surface2);
          border-radius: 7px;
          padding: 12px;
          min-width: 0;
        }
        .cone-size-card {
          min-height: 74px;
        }
        .cone-result-cell {
          min-height: 74px;
        }
        .cone-drawing-card {
          min-height: 430px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .cone-view-3d {
          height: 32px;
          display: flex;
          align-items: center;
          gap: 7px;
          border: 1px solid rgba(245,158,11,0.42);
          background: rgba(245,158,11,0.12);
          color: #f59e0b;
          border-radius: 7px;
          padding: 0 12px;
          font-size: 11px;
          font-family: var(--font-text);
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
        }
        @media (max-width: 1280px) {
          .cone-workspace {
            grid-template-columns: 1fr;
          }
          .cone-result-grid {
            grid-template-columns: repeat(3, minmax(150px, 1fr));
          }
          .cone-size-card {
            grid-column: 1 / -1;
          }
        }
        @media (max-width: 720px) {
          .cone-header,
          .cone-result-header {
            align-items: flex-start;
            flex-direction: column;
          }
          .cone-input-grid,
          .cone-result-grid {
            grid-template-columns: 1fr;
          }
          .cone-panel {
            padding: 12px;
          }
          .cone-drawing-card {
            min-height: 300px;
          }
        }
      `}</style>

      <div className="cone-header">
        <div>
          <p style={{ margin: 0, color: '#f59e0b', fontSize: 11, fontFamily: 'var(--font-text)', fontWeight: 800, letterSpacing: '0.08em' }}>
            CALDEIRARIA
          </p>
          <h1 style={{ margin: '4px 0 0', color: 'var(--text-primary)', fontSize: 22, fontFamily: 'var(--font-text)', fontWeight: 800 }}>
            CONE
          </h1>
        </div>
      </div>

      <div className="cone-workspace">
        <section className="cone-panel">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <p className="cone-panel-title">
                Medidas externas
              </p>
              <p className="cone-panel-subtitle">
                Valores em milimetros.
              </p>
            </div>
          </div>

          <div className="cone-input-grid">
            <InputField label="Diametro Maior" value={values.diametroMaior} onChange={value => updateValue('diametroMaior', value)} />
            <InputField label="Diametro Menor" value={values.diametroMenor} onChange={value => updateValue('diametroMenor', value)} />
            <InputField label="Altura" value={values.altura} onChange={value => updateValue('altura', value)} />
            <InputField label="Espessura" value={values.espessura} onChange={value => updateValue('espessura', value)} />
          </div>

          <div className="cone-sketch-card">
            <ConeSketch />
          </div>
        </section>

        <section className="cone-panel">
          <div className="cone-result-header">
            <p className="cone-panel-title">
              Desenvolvimento
            </p>
            <button
              onClick={() => setShow3D(true)}
              className="cone-view-3d"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <path d="M3.3 7 12 12l8.7-5"/><path d="M12 22V12"/>
              </svg>
              Visualizar 3D
            </button>
          </div>

          <div className="cone-result-grid">
            <SizePanel result={result} />
            <ResultCell label="Raio externo" value={result?.raioExterno} />
            <ResultCell label="Raio interno" value={result?.raioInterno} />
            <ResultCell label="V.G" value={result?.geratriz} digits={2} />
            <ResultCell label="Corda externa" value={result?.cordaExterna} />
            <ResultCell label="Corda interna" value={result?.cordaInterna} />
            <ResultCell label="Angulo da chapa" value={result?.anguloChapa} />
          </div>

          <div className="cone-drawing-card">
            <DevelopmentSketch result={result} />
          </div>
        </section>
      </div>

      {show3D && <Preview3DModal result={result} onClose={() => setShow3D(false)} />}
    </div>
  );
}
