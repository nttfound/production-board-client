import React, { useEffect, useMemo, useRef, useState } from 'react';

const PRINT_LOGO_URL = `${process.env.PUBLIC_URL}/print-logo.png`;

function isDxf(card) {
  return /\.dxf($|\?)/i.test(card?.anexo_nome || card?.anexo_path || '');
}

function toNumber(value) {
  const number = Number(String(value || '').trim());
  return Number.isFinite(number) ? number : null;
}

function pairRows(text) {
  const lines = text.replace(/\r/g, '').split('\n');
  const pairs = [];
  for (let i = 0; i < lines.length - 1; i += 2) {
    const code = Number.parseInt(lines[i].trim(), 10);
    if (Number.isFinite(code)) pairs.push({ code, value: lines[i + 1].trim() });
  }
  return pairs;
}

function sampleArc(cx, cy, radius, start, end, steps = 36) {
  let sweep = end - start;
  if (sweep < 0) sweep += 360;
  return Array.from({ length: steps + 1 }, (_, index) => {
    const angle = ((start + (sweep * index) / steps) * Math.PI) / 180;
    return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
  });
}

function addPoint(bounds, point) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
  bounds.minX = Math.min(bounds.minX, point.x);
  bounds.minY = Math.min(bounds.minY, point.y);
  bounds.maxX = Math.max(bounds.maxX, point.x);
  bounds.maxY = Math.max(bounds.maxY, point.y);
}

function computeBounds(entities) {
  const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  entities.forEach(entity => {
    if (entity.type === 'LINE') {
      addPoint(bounds, entity.start);
      addPoint(bounds, entity.end);
    }
    if (entity.type === 'POLYLINE') {
      entity.points.forEach(point => addPoint(bounds, point));
    }
    if (entity.type === 'CIRCLE') {
      addPoint(bounds, { x: entity.cx - entity.radius, y: entity.cy - entity.radius });
      addPoint(bounds, { x: entity.cx + entity.radius, y: entity.cy + entity.radius });
    }
    if (entity.type === 'ARC') {
      sampleArc(entity.cx, entity.cy, entity.radius, entity.start, entity.end).forEach(point => addPoint(bounds, point));
    }
    if (entity.type === 'DIMENSION') {
      addPoint(bounds, entity.p1);
      addPoint(bounds, entity.p2);
      addPoint(bounds, entity.labelPoint);
    }
  });

  if (!Number.isFinite(bounds.minX)) return null;
  const width = Math.max(bounds.maxX - bounds.minX, 1);
  const height = Math.max(bounds.maxY - bounds.minY, 1);
  return { ...bounds, width, height };
}

function createRawEntity(type) {
  return { type, pairs: [] };
}

function addRawPair(entity, code, value) {
  entity.pairs.push({ code, value });
}

function rawValues(entity, code) {
  return entity.pairs.filter(pair => pair.code === code).map(pair => pair.value);
}

function rawString(entity, code, fallback = '') {
  return rawValues(entity, code)[0] || fallback;
}

function rawNumber(entity, code, fallback = 0) {
  const value = toNumber(rawString(entity, code));
  return value === null ? fallback : value;
}

function rawInt(entity, code, fallback = 0) {
  const value = Number.parseInt(rawString(entity, code), 10);
  return Number.isFinite(value) ? value : fallback;
}

function isGeometryType(type) {
  return ['LINE', 'CIRCLE', 'ARC', 'LWPOLYLINE', 'POLYLINE', 'SPLINE', 'ELLIPSE', 'DIMENSION'].includes(type);
}

function appendVertex(polyline, vertex) {
  addRawPair(polyline, 10, rawString(vertex, 10, '0'));
  addRawPair(polyline, 20, rawString(vertex, 20, '0'));
  addRawPair(polyline, 42, rawString(vertex, 42, '0'));
}

function transformRawEntity(entity, ox, oy, sx, sy, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const xs = {};
  const ys = {};

  entity.pairs.forEach(pair => {
    if (pair.code >= 10 && pair.code <= 15) {
      const value = toNumber(pair.value);
      if (value !== null) xs[pair.code] = value * sx;
    }
    if (pair.code >= 20 && pair.code <= 25) {
      const value = toNumber(pair.value);
      if (value !== null) ys[pair.code] = value * sy;
    }
  });

  const transformed = createRawEntity(entity.type);
  entity.pairs.forEach(pair => {
    const isX = pair.code >= 10 && pair.code <= 15;
    const isY = pair.code >= 20 && pair.code <= 25;
    const paired = isX ? pair.code + 10 : pair.code - 10;

    if (isX && Object.prototype.hasOwnProperty.call(xs, pair.code)) {
      const x = xs[pair.code];
      const y = Object.prototype.hasOwnProperty.call(ys, paired) ? ys[paired] : 0;
      addRawPair(transformed, pair.code, String(x * cos - y * sin + ox));
      return;
    }
    if (isY && Object.prototype.hasOwnProperty.call(ys, pair.code)) {
      const y = ys[pair.code];
      const x = Object.prototype.hasOwnProperty.call(xs, paired) ? xs[paired] : 0;
      addRawPair(transformed, pair.code, String(x * sin + y * cos + oy));
      return;
    }
    if (pair.code === 40 && ['CIRCLE', 'ARC'].includes(entity.type)) {
      const radius = toNumber(pair.value);
      addRawPair(transformed, pair.code, radius === null ? pair.value : String(radius * (Math.abs(sx) + Math.abs(sy)) / 2));
      return;
    }
    addRawPair(transformed, pair.code, pair.value);
  });

  return transformed;
}

function parseBlocks(pairs) {
  const blocks = {};
  let inBlocks = false;
  let blockName = null;
  let blockEntities = null;
  let current = null;
  let currentPolyline = null;

  function commitBlock() {
    if (blockName && blockEntities?.length) blocks[blockName.toLowerCase()] = blockEntities;
  }

  function flushCurrent() {
    if (!current || !blockEntities) {
      current = null;
      return;
    }
    if (current.type === 'VERTEX' && currentPolyline) appendVertex(currentPolyline, current);
    else if (current.type === 'SEQEND' && currentPolyline) {
      blockEntities.push(currentPolyline);
      currentPolyline = null;
    } else if (!['BLOCK', 'ENDBLK'].includes(current.type) && isGeometryType(current.type)) {
      if (current.type === 'POLYLINE') currentPolyline = current;
      else blockEntities.push(current);
    }
    current = null;
  }

  pairs.forEach(pair => {
    if (pair.code === 2 && !inBlocks && pair.value === 'BLOCKS') {
      inBlocks = true;
      return;
    }
    if (pair.code === 0 && pair.value === 'ENDSEC' && inBlocks) {
      flushCurrent();
      commitBlock();
      inBlocks = false;
      blockName = null;
      blockEntities = null;
      return;
    }
    if (!inBlocks || pair.code === 100 || pair.code >= 1000) return;

    if (pair.code === 0) {
      flushCurrent();
      if (pair.value === 'BLOCK') {
        commitBlock();
        blockName = null;
        blockEntities = [];
        currentPolyline = null;
      } else if (pair.value === 'ENDBLK') {
        if (currentPolyline) blockEntities.push(currentPolyline);
        currentPolyline = null;
        commitBlock();
        blockName = null;
        blockEntities = null;
      }
      current = createRawEntity(pair.value);
      return;
    }

    if (pair.code === 2 && current?.type === 'BLOCK') {
      blockName = pair.value;
      return;
    }
    if (current) addRawPair(current, pair.code, pair.value);
  });

  return blocks;
}

function parseRawEntities(pairs, blocks) {
  const result = [];
  let inEntities = false;
  let current = null;
  let currentPolyline = null;

  function commit() {
    if (!current) return;
    if (current.type === 'VERTEX' && currentPolyline) appendVertex(currentPolyline, current);
    else if (current.type === 'SEQEND' && currentPolyline) {
      result.push(currentPolyline);
      currentPolyline = null;
    } else if (current.type === 'INSERT') {
      const name = rawString(current, 2).toLowerCase();
      const blockEntities = blocks[name] || [];
      const ox = rawNumber(current, 10);
      const oy = rawNumber(current, 20);
      const sx = rawNumber(current, 41, 1);
      const sy = rawNumber(current, 42, 1);
      const angle = rawNumber(current, 50);
      blockEntities.forEach(entity => result.push(transformRawEntity(entity, ox, oy, sx, sy, angle)));
    } else if (isGeometryType(current.type)) {
      if (currentPolyline) {
        result.push(currentPolyline);
        currentPolyline = null;
      }
      if (current.type === 'POLYLINE') currentPolyline = current;
      else result.push(current);
    }
    current = null;
  }

  pairs.forEach(pair => {
    if (pair.code === 2 && !inEntities && pair.value === 'ENTITIES') {
      inEntities = true;
      return;
    }
    if (pair.code === 0 && pair.value === 'ENDSEC' && inEntities) {
      commit();
      if (currentPolyline) result.push(currentPolyline);
      currentPolyline = null;
      inEntities = false;
      return;
    }
    if (!inEntities || pair.code === 100 || pair.code >= 1000) return;

    if (pair.code === 0) {
      commit();
      current = createRawEntity(pair.value);
      return;
    }
    if (current) addRawPair(current, pair.code, pair.value);
  });
  commit();

  return result;
}

function bulgeToPoints(start, end, bulge, segments = 24) {
  if (Math.abs(bulge) < 1e-6) return [start, end];
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const chord = Math.hypot(dx, dy);
  if (chord < 1e-9) return [start, end];

  const absBulge = Math.abs(bulge);
  const radius = chord * (1 + absBulge * absBulge) / (4 * absBulge);
  const centerDistance = Math.sqrt(Math.max(0, radius * radius - chord * chord / 4));
  const mx = (start.x + end.x) / 2;
  const my = (start.y + end.y) / 2;
  const px = -dy / chord;
  const py = dx / chord;
  let centerSign = bulge > 0 ? 1 : -1;
  if (absBulge > 1) centerSign = -centerSign;
  const cx = mx + centerSign * centerDistance * px;
  const cy = my + centerSign * centerDistance * py;
  const startAngle = Math.atan2(start.y - cy, start.x - cx);
  const sweep = 4 * Math.atan(absBulge) * (bulge > 0 ? 1 : -1);

  return Array.from({ length: segments + 1 }, (_, index) => {
    const angle = startAngle + (sweep * index) / segments;
    return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
  });
}

function rawPolylineToEntity(raw) {
  const xs = rawValues(raw, 10);
  const ys = rawValues(raw, 20);
  const bulges = rawValues(raw, 42);
  const count = Math.min(xs.length, ys.length);
  if (count < 2) return null;

  const points = Array.from({ length: count }, (_, index) => ({
    x: toNumber(xs[index]) || 0,
    y: toNumber(ys[index]) || 0,
    bulge: toNumber(bulges[index]) || 0,
  }));
  const closed = Boolean(rawInt(raw, 70) & 1);
  const segments = closed ? count : count - 1;
  const sampled = [];

  for (let i = 0; i < segments; i += 1) {
    const current = points[i];
    const next = points[(i + 1) % count];
    const segmentPoints = bulgeToPoints(current, next, current.bulge);
    if (sampled.length) segmentPoints.shift();
    sampled.push(...segmentPoints);
  }
  if (!closed && sampled.length === 0) sampled.push(...points);
  return sampled.length > 1 ? { type: 'POLYLINE', points: sampled, closed } : null;
}

function rawToRenderEntity(raw) {
  if (raw.type === 'LINE') {
    return {
      type: 'LINE',
      start: { x: rawNumber(raw, 10), y: rawNumber(raw, 20) },
      end: { x: rawNumber(raw, 11), y: rawNumber(raw, 21) },
    };
  }
  if (raw.type === 'CIRCLE') {
    return { type: 'CIRCLE', cx: rawNumber(raw, 10), cy: rawNumber(raw, 20), radius: Math.abs(rawNumber(raw, 40)) };
  }
  if (raw.type === 'ARC') {
    return { type: 'ARC', cx: rawNumber(raw, 10), cy: rawNumber(raw, 20), radius: Math.abs(rawNumber(raw, 40)), start: rawNumber(raw, 50), end: rawNumber(raw, 51) };
  }
  if (raw.type === 'LWPOLYLINE' || raw.type === 'POLYLINE') {
    return rawPolylineToEntity(raw);
  }
  if (raw.type === 'SPLINE') {
    const xs = rawValues(raw, 10);
    const ys = rawValues(raw, 20);
    const count = Math.min(xs.length, ys.length);
    const points = Array.from({ length: count }, (_, index) => ({ x: toNumber(xs[index]) || 0, y: toNumber(ys[index]) || 0 }));
    return points.length > 1 ? { type: 'POLYLINE', points, closed: false } : null;
  }
  if (raw.type === 'ELLIPSE') {
    const cx = rawNumber(raw, 10);
    const cy = rawNumber(raw, 20);
    const majorX = rawNumber(raw, 11);
    const majorY = rawNumber(raw, 21);
    const majorLen = Math.hypot(majorX, majorY);
    if (majorLen < 1e-9) return null;
    const minorLen = majorLen * Math.abs(rawNumber(raw, 40, 1));
    const rotation = Math.atan2(majorY, majorX);
    let start = rawNumber(raw, 41, 0);
    let end = rawNumber(raw, 42, Math.PI * 2);
    if (end <= start) end += Math.PI * 2;
    const points = Array.from({ length: 73 }, (_, index) => {
      const t = start + ((end - start) * index) / 72;
      const lx = majorLen * Math.cos(t);
      const ly = minorLen * Math.sin(t);
      return {
        x: cx + lx * Math.cos(rotation) - ly * Math.sin(rotation),
        y: cy + lx * Math.sin(rotation) + ly * Math.cos(rotation),
      };
    });
    return { type: 'POLYLINE', points, closed: false };
  }
  if (raw.type === 'DIMENSION') {
    const p1 = { x: rawNumber(raw, 13), y: rawNumber(raw, 23) };
    const p2 = { x: rawNumber(raw, 14), y: rawNumber(raw, 24) };
    const labelPoint = { x: rawNumber(raw, 10, (p1.x + p2.x) / 2), y: rawNumber(raw, 20, (p1.y + p2.y) / 2) };
    const measured = rawNumber(raw, 42, Math.hypot(p2.x - p1.x, p2.y - p1.y));
    return Number.isFinite(measured) ? { type: 'DIMENSION', p1, p2, labelPoint, text: formatMeasure(measured) } : null;
  }
  return null;
}

function parseDxf(text) {
  const pairs = pairRows(text);
  const blocks = parseBlocks(pairs);
  const rawEntities = parseRawEntities(pairs, blocks);
  const entities = [];
  rawEntities.forEach(raw => {
    const entity = rawToRenderEntity(raw);
    if (entity) entities.push(entity);
  });

  return { entities, bounds: computeBounds(entities) };
}

function formatMeasure(value) {
  if (!Number.isFinite(value)) return '-';
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getDrawingMetrics(bounds) {
  const size = Math.max(bounds.width, bounds.height);
  const dimGap = size * 0.09;
  const dimOffset = size * 0.2;
  const pad = size * 0.1;
  const textSize = Math.max(size * 0.03, 8);
  const strokeWidth = Math.max(size / 600, 1);
  return { size, dimGap, dimOffset, pad, textSize, strokeWidth };
}

function getSvgFrame(bounds, showDimensions) {
  const metrics = getDrawingMetrics(bounds);
  const rightExtra = showDimensions ? metrics.dimOffset + metrics.pad : metrics.pad;
  const bottomExtra = showDimensions ? metrics.dimOffset + metrics.pad : metrics.pad;
  return {
    metrics,
    minX: -metrics.pad,
    minY: -metrics.pad,
    width: bounds.width + metrics.pad + rightExtra,
    height: bounds.height + metrics.pad + bottomExtra,
  };
}

function drawingPoint(point, bounds) {
  return { x: point.x - bounds.minX, y: bounds.maxY - point.y };
}

function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function addSnapPoint(targets, point) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
  targets.points.push(point);
}

function addSnapSegment(targets, a, b) {
  if (!a || !b) return;
  targets.segments.push({ a, b });
  addSnapPoint(targets, a);
  addSnapPoint(targets, b);
  addSnapPoint(targets, midpoint(a, b));
}

function getSnapTargets(entities, bounds) {
  const targets = { points: [], segments: [] };
  if (!bounds) return targets;

  entities.forEach(entity => {
    if (entity.type === 'LINE') {
      addSnapSegment(targets, drawingPoint(entity.start, bounds), drawingPoint(entity.end, bounds));
    }
    if (entity.type === 'POLYLINE') {
      const points = entity.points.map(point => drawingPoint(point, bounds));
      for (let index = 0; index < points.length - 1; index += 1) {
        addSnapSegment(targets, points[index], points[index + 1]);
      }
      if (entity.closed && points.length > 1) addSnapSegment(targets, points[points.length - 1], points[0]);
    }
    if (entity.type === 'CIRCLE') {
      const center = drawingPoint({ x: entity.cx, y: entity.cy }, bounds);
      addSnapPoint(targets, center);
      addSnapPoint(targets, { x: center.x - entity.radius, y: center.y });
      addSnapPoint(targets, { x: center.x + entity.radius, y: center.y });
      addSnapPoint(targets, { x: center.x, y: center.y - entity.radius });
      addSnapPoint(targets, { x: center.x, y: center.y + entity.radius });
    }
    if (entity.type === 'ARC') {
      const points = sampleArc(entity.cx, entity.cy, entity.radius, entity.start, entity.end, 48)
        .map(point => drawingPoint(point, bounds));
      for (let index = 0; index < points.length - 1; index += 1) {
        addSnapSegment(targets, points[index], points[index + 1]);
      }
    }
    if (entity.type === 'DIMENSION') {
      addSnapPoint(targets, drawingPoint(entity.p1, bounds));
      addSnapPoint(targets, drawingPoint(entity.p2, bounds));
      addSnapPoint(targets, drawingPoint(entity.labelPoint, bounds));
    }
  });

  return targets;
}

function closestPointOnSegment(point, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq < 1e-9) return a;
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSq));
  return { x: a.x + dx * t, y: a.y + dy * t };
}

function snapPointToTargets(point, targets, threshold) {
  let best = null;
  let bestDistance = threshold;

  targets.points.forEach(target => {
    const distance = Math.hypot(point.x - target.x, point.y - target.y);
    if (distance <= bestDistance) {
      bestDistance = distance;
      best = target;
    }
  });

  targets.segments.forEach(segment => {
    const target = closestPointOnSegment(point, segment.a, segment.b);
    const distance = Math.hypot(point.x - target.x, point.y - target.y);
    if (distance <= bestDistance) {
      bestDistance = distance;
      best = target;
    }
  });

  return best ? { ...best, snapped: true } : point;
}

function DxfSvg({
  entities,
  bounds,
  viewport = { zoom: 1, panX: 0, panY: 0 },
  showDimensions = false,
  measurements = [],
  pendingMeasurement = null,
  snapPoint = null,
  printMode = false,
}) {
  if (!bounds) return null;
  const frame = getSvgFrame(bounds, showDimensions);
  const metrics = frame.metrics;
  const viewBox = `${frame.minX} ${frame.minY} ${frame.width} ${frame.height}`;
  const point = p => drawingPoint(p, bounds);
  const pathPoints = points => points.map((p, index) => {
    const next = point(p);
    return `${index === 0 ? 'M' : 'L'} ${next.x} ${next.y}`;
  }).join(' ');
  const stroke = printMode ? '#111827' : 'var(--text-primary)';
  const dimColor = printMode ? '#2563eb' : 'var(--accent-blue)';
  const nativeDimColor = printMode ? '#374151' : 'var(--text-muted)';
  const bg = printMode ? '#ffffff' : 'var(--bg-surface2)';
  const transform = printMode ? undefined : `translate(${viewport.panX} ${viewport.panY}) scale(${viewport.zoom})`;

  return (
    <svg width="100%" height="100%" viewBox={viewBox} preserveAspectRatio="xMidYMid meet">
      <defs>
        <marker id={printMode ? 'arrow-print' : 'arrow'} markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L8,4 L0,8 Z" fill={dimColor} />
        </marker>
      </defs>
      <rect x={frame.minX} y={frame.minY} width={frame.width} height={frame.height} fill={bg} />
      <g transform={transform}>
        {entities.map((entity, index) => {
          if (entity.type === 'LINE') {
            const a = point(entity.start);
            const b = point(entity.end);
            return <line key={index} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={stroke} strokeWidth={metrics.strokeWidth} vectorEffect="non-scaling-stroke" />;
          }
          if (entity.type === 'POLYLINE') {
            return <path key={index} d={`${pathPoints(entity.points)}${entity.closed ? ' Z' : ''}`} fill="none" stroke={stroke} strokeWidth={metrics.strokeWidth} vectorEffect="non-scaling-stroke" />;
          }
          if (entity.type === 'CIRCLE') {
            const center = point({ x: entity.cx, y: entity.cy });
            return <circle key={index} cx={center.x} cy={center.y} r={entity.radius} fill="none" stroke={stroke} strokeWidth={metrics.strokeWidth} vectorEffect="non-scaling-stroke" />;
          }
          if (entity.type === 'ARC') {
            return <path key={index} d={pathPoints(sampleArc(entity.cx, entity.cy, entity.radius, entity.start, entity.end))} fill="none" stroke={stroke} strokeWidth={metrics.strokeWidth} vectorEffect="non-scaling-stroke" />;
          }
          if (entity.type === 'DIMENSION') {
            return <NativeDimension key={index} entity={entity} point={point} metrics={metrics} color={nativeDimColor} />;
          }
          return null;
        })}
        {showDimensions && (
          <Dimensions
            bounds={bounds}
            metrics={metrics}
            color={dimColor}
            markerId={printMode ? 'arrow-print' : 'arrow'}
            labelBg={printMode ? '#ffffff' : 'var(--bg-card)'}
          />
        )}
        <MeasurementOverlay measurements={measurements} pendingMeasurement={pendingMeasurement} metrics={metrics} color={printMode ? '#2563eb' : 'var(--accent-blue)'} />
        {!printMode && snapPoint?.snapped && <SnapMarker point={snapPoint} metrics={metrics} color={dimColor} />}
      </g>
    </svg>
  );
}

function SnapMarker({ point, metrics, color }) {
  const size = Math.max(metrics.strokeWidth * 4, metrics.textSize * 0.28);
  return (
    <g stroke={color} fill="none" strokeWidth={metrics.strokeWidth * 1.15} vectorEffect="non-scaling-stroke" pointerEvents="none">
      <circle cx={point.x} cy={point.y} r={size} opacity="0.95" />
      <line x1={point.x - size * 1.55} y1={point.y} x2={point.x - size * 0.55} y2={point.y} />
      <line x1={point.x + size * 0.55} y1={point.y} x2={point.x + size * 1.55} y2={point.y} />
      <line x1={point.x} y1={point.y - size * 1.55} x2={point.x} y2={point.y - size * 0.55} />
      <line x1={point.x} y1={point.y + size * 0.55} x2={point.x} y2={point.y + size * 1.55} />
    </g>
  );
}

function MeasurementOverlay({ measurements, pendingMeasurement, metrics, color }) {
  const all = [...measurements];
  if (pendingMeasurement) all.push({ ...pendingMeasurement, pending: true });
  if (!all.length) return null;

  return (
    <g stroke={color} fill={color} strokeWidth={metrics.strokeWidth} vectorEffect="non-scaling-stroke">
      {all.map((measure, index) => {
        const dx = measure.end.x - measure.start.x;
        const dy = measure.end.y - measure.start.y;
        const distance = Math.hypot(dx, dy);
        const midX = (measure.start.x + measure.end.x) / 2;
        const midY = (measure.start.y + measure.end.y) / 2;
        const rawAngle = Math.atan2(dy, dx) * 180 / Math.PI;
        const angle = rawAngle > 90 || rawAngle < -90 ? rawAngle + 180 : rawAngle;
        const label = `${formatMeasure(distance)} mm`;
        return (
          <g key={index} opacity={measure.pending ? 0.65 : 1}>
            <line x1={measure.start.x} y1={measure.start.y} x2={measure.end.x} y2={measure.end.y} strokeDasharray={measure.pending ? '6 5' : undefined} />
            <circle cx={measure.start.x} cy={measure.start.y} r={metrics.strokeWidth * 2.3} />
            <circle cx={measure.end.x} cy={measure.end.y} r={metrics.strokeWidth * 2.3} />
            {!measure.pending && (
              <>
                <rect
                  x={midX - metrics.textSize * label.length * 0.27 - metrics.textSize * 0.7}
                  y={midY - metrics.textSize * 1.55}
                  width={metrics.textSize * label.length * 0.54 + metrics.textSize * 1.4}
                  height={metrics.textSize * 1.42}
                  rx={metrics.textSize * 0.22}
                  stroke="none"
                  fill="var(--bg-card)"
                  opacity="0.96"
                  transform={`rotate(${angle} ${midX} ${midY})`}
                />
                <text
                  x={midX}
                  y={midY - metrics.textSize * 0.48}
                  textAnchor="middle"
                  fontSize={metrics.textSize}
                  fontFamily="Arial, sans-serif"
                  stroke="none"
                  transform={`rotate(${angle} ${midX} ${midY})`}
                >
                  {label}
                </text>
              </>
            )}
          </g>
        );
      })}
    </g>
  );
}

function PrintSheet({ title, subtitle, data }) {
  const now = new Date().toLocaleDateString('pt-BR');
  const width = formatMeasure(data.bounds.width);
  const height = formatMeasure(data.bounds.height);

  return (
    <div className="dxf-print-sheet">
      <div className="dxf-print-page">
        <div className="dxf-print-drawing-area">
          <DxfSvg entities={data.entities} bounds={data.bounds} printMode />
        </div>

        <div className="dxf-print-stamp">
          <div className="dxf-print-logo-cell">
            <img src={PRINT_LOGO_URL} alt="Itadobras" />
          </div>
          <div className="dxf-print-info-cell dxf-print-title-cell">
            <span>DESENHO</span>
            <strong>{title}</strong>
            <small>{subtitle}</small>
          </div>
          <div className="dxf-print-info-cell">
            <span>MEDIDA TOTAL</span>
            <strong>{width} x {height} mm</strong>
          </div>
          <div className="dxf-print-info-cell">
            <span>DATA</span>
            <strong>{now}</strong>
          </div>
          <div className="dxf-print-info-cell">
            <span>ESCALA</span>
            <strong>Ajustada a folha</strong>
          </div>
          <div className="dxf-print-note-cell">
            Visualizacao em teste. Conferir medidas criticas antes da producao.
          </div>
        </div>
      </div>
    </div>
  );
}

function getPrintStyles() {
  return `
    @page { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, sans-serif; color: #111827; background: #fff; }
    .dxf-print-sheet { display: block; width: 100%; height: 186mm; }
    .dxf-print-page { height: 100%; border: 1.2pt solid #111827; display: grid; grid-template-rows: 1fr 34mm; background: #fff; }
    .dxf-print-drawing-area { min-height: 0; border-bottom: 1pt solid #111827; overflow: hidden; }
    .dxf-print-drawing-area svg { display: block; width: 100%; height: 100%; }
    .dxf-print-stamp { display: grid; grid-template-columns: 42mm 1fr 48mm 28mm 35mm; grid-template-rows: 17mm 17mm; color: #111827; }
    .dxf-print-stamp > div { border-right: 0.8pt solid #111827; border-bottom: 0.8pt solid #111827; padding: 2mm 3mm; overflow: hidden; }
    .dxf-print-stamp > div:nth-child(5), .dxf-print-stamp > div:nth-child(6) { border-right: 0; }
    .dxf-print-logo-cell { grid-row: 1 / 3; display: flex; align-items: center; justify-content: center; }
    .dxf-print-logo-cell img { max-width: 34mm; max-height: 16mm; object-fit: contain; }
    .dxf-print-title-cell { grid-row: 1 / 3; }
    .dxf-print-note-cell { grid-column: 3 / 6; font-size: 8pt; font-weight: 700; display: flex; align-items: center; color: #374151; }
    .dxf-print-info-cell span { display: block; font-size: 6pt; letter-spacing: 0.08em; color: #4b5563; margin-bottom: 1.5mm; }
    .dxf-print-info-cell strong { display: block; font-size: 9pt; line-height: 1.2; }
    .dxf-print-info-cell small { display: block; margin-top: 2mm; font-size: 7pt; color: #4b5563; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  `;
}

function NativeDimension({ entity, point, metrics, color }) {
  const p1 = point(entity.p1);
  const p2 = point(entity.p2);
  const label = point(entity.labelPoint);
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const length = Math.hypot(dx, dy);
  if (length < 1e-6) return null;
  const nx = -dy / length;
  const ny = dx / length;
  const offset = Math.max(Math.hypot(label.x - (p1.x + p2.x) / 2, label.y - (p1.y + p2.y) / 2), metrics.dimGap * 0.5);
  const d1 = { x: p1.x + nx * offset, y: p1.y + ny * offset };
  const d2 = { x: p2.x + nx * offset, y: p2.y + ny * offset };
  const mid = { x: (d1.x + d2.x) / 2, y: (d1.y + d2.y) / 2 };
  const angle = Math.atan2(d2.y - d1.y, d2.x - d1.x) * 180 / Math.PI;

  return (
    <g stroke={color} fill={color} strokeWidth={metrics.strokeWidth * 0.8} vectorEffect="non-scaling-stroke">
      <line x1={p1.x} y1={p1.y} x2={d1.x} y2={d1.y} strokeDasharray="3 4" />
      <line x1={p2.x} y1={p2.y} x2={d2.x} y2={d2.y} strokeDasharray="3 4" />
      <line x1={d1.x} y1={d1.y} x2={d2.x} y2={d2.y} />
      <circle cx={d1.x} cy={d1.y} r={metrics.strokeWidth * 2.2} />
      <circle cx={d2.x} cy={d2.y} r={metrics.strokeWidth * 2.2} />
      <text
        x={mid.x}
        y={mid.y - metrics.textSize * 0.45}
        textAnchor="middle"
        fontSize={metrics.textSize * 0.86}
        fontFamily="Arial, sans-serif"
        stroke="none"
        transform={`rotate(${angle} ${mid.x} ${mid.y})`}
      >
        {entity.text} mm
      </text>
    </g>
  );
}

function Dimensions({ bounds, metrics, color, markerId, labelBg }) {
  const y = bounds.height + metrics.dimGap;
  const x = bounds.width + metrics.dimGap;
  const tick = metrics.dimGap * 0.35;
  const marker = `url(#${markerId})`;
  const labelPadX = metrics.textSize * 0.85;
  const labelPadY = metrics.textSize * 0.55;
  const widthLabel = `${formatMeasure(bounds.width)} mm`;
  const heightLabel = `${formatMeasure(bounds.height)} mm`;

  return (
    <g stroke={color} fill={color} strokeWidth={metrics.strokeWidth} vectorEffect="non-scaling-stroke">
      <line x1="0" y1={bounds.height} x2="0" y2={y + tick} opacity="0.75" />
      <line x1={bounds.width} y1={bounds.height} x2={bounds.width} y2={y + tick} opacity="0.75" />
      <line x1="0" y1={y} x2={bounds.width} y2={y} markerStart={marker} markerEnd={marker} />
      <rect
        x={bounds.width / 2 - metrics.textSize * widthLabel.length * 0.27 - labelPadX}
        y={y - metrics.textSize * 1.55}
        width={metrics.textSize * widthLabel.length * 0.54 + labelPadX * 2}
        height={metrics.textSize + labelPadY}
        rx={metrics.textSize * 0.25}
        stroke="none"
        fill={labelBg}
        opacity="0.96"
      />
      <text x={bounds.width / 2} y={y - metrics.textSize * 0.35} textAnchor="middle" fontSize={metrics.textSize} fontFamily="Arial, sans-serif" stroke="none">
        {widthLabel}
      </text>

      <line x1={bounds.width} y1="0" x2={x + tick} y2="0" opacity="0.75" />
      <line x1={bounds.width} y1={bounds.height} x2={x + tick} y2={bounds.height} opacity="0.75" />
      <line x1={x} y1="0" x2={x} y2={bounds.height} markerStart={marker} markerEnd={marker} />
      <rect
        x={x + metrics.textSize * 0.05}
        y={bounds.height / 2 - metrics.textSize * heightLabel.length * 0.27 - labelPadX}
        width={metrics.textSize + labelPadY}
        height={metrics.textSize * heightLabel.length * 0.54 + labelPadX * 2}
        rx={metrics.textSize * 0.25}
        stroke="none"
        fill={labelBg}
        opacity="0.96"
      />
      <text
        x={x + metrics.textSize * 0.8}
        y={bounds.height / 2}
        textAnchor="middle"
        fontSize={metrics.textSize}
        fontFamily="Arial, sans-serif"
        stroke="none"
        transform={`rotate(90 ${x + metrics.textSize * 0.8} ${bounds.height / 2})`}
      >
        {heightLabel}
      </text>
    </g>
  );
}

function DxfViewport({
  data,
  viewport,
  onViewportChange,
  showDimensions,
  measureMode,
  measurements,
  pendingMeasurement,
  hoverPoint,
  onAddMeasurePoint,
  onPreviewMeasurePoint,
}) {
  const svgWrapRef = useRef(null);
  const dragRef = useRef(null);
  const snapTargets = useMemo(() => getSnapTargets(data.entities, data.bounds), [data.entities, data.bounds]);
  const snapPreview = measureMode ? hoverPoint : null;

  function zoomBy(multiplier) {
    onViewportChange(prev => ({ ...prev, zoom: Math.min(20, Math.max(0.1, prev.zoom * multiplier)) }));
  }

  function resetView() {
    onViewportChange({ zoom: 1, panX: 0, panY: 0 });
  }

  function handleWheel(event) {
    event.preventDefault();
    const factor = event.deltaY > 0 ? 0.9 : 1.1;
    zoomBy(factor);
  }

  function handlePointerDown(event) {
    if (measureMode) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY };
  }

  function handlePointerMove(event) {
    if (measureMode) {
      const point = clientToDrawingPoint(event.clientX, event.clientY, true);
      if (point) onPreviewMeasurePoint(point);
      return;
    }
    if (!dragRef.current || !svgWrapRef.current) return;
    const rect = svgWrapRef.current.getBoundingClientRect();
    const frame = getSvgFrame(data.bounds, showDimensions);
    const viewWidth = frame.width;
    const viewHeight = frame.height;
    const dx = ((event.clientX - dragRef.current.x) / Math.max(rect.width, 1)) * viewWidth / viewport.zoom;
    const dy = ((event.clientY - dragRef.current.y) / Math.max(rect.height, 1)) * viewHeight / viewport.zoom;
    dragRef.current = { x: event.clientX, y: event.clientY };
    onViewportChange(prev => ({ ...prev, panX: prev.panX + dx, panY: prev.panY + dy }));
  }

  function handlePointerUp(event) {
    dragRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }

  function clientToDrawingPoint(clientX, clientY, useSnap = false) {
    const rect = svgWrapRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const frame = getSvgFrame(data.bounds, showDimensions);
    const scale = Math.min(rect.width / frame.width, rect.height / frame.height);
    const offsetX = (rect.width - frame.width * scale) / 2;
    const offsetY = (rect.height - frame.height * scale) / 2;
    const svgX = frame.minX + (clientX - rect.left - offsetX) / scale;
    const svgY = frame.minY + (clientY - rect.top - offsetY) / scale;
    const point = {
      x: (svgX - viewport.panX) / viewport.zoom,
      y: (svgY - viewport.panY) / viewport.zoom,
    };
    if (!useSnap) return point;
    const unitsPerPixel = 1 / Math.max(scale * viewport.zoom, 0.0001);
    return snapPointToTargets(point, snapTargets, unitsPerPixel * 18);
  }

  function handleMeasureClick(event) {
    if (!measureMode) return;
    const point = clientToDrawingPoint(event.clientX, event.clientY, true);
    if (point) onAddMeasurePoint(point);
  }

  return (
    <>
      <div
        ref={svgWrapRef}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleMeasureClick}
        style={{ position: 'absolute', inset: 0, cursor: measureMode ? 'crosshair' : dragRef.current ? 'grabbing' : 'grab', touchAction: 'none' }}
      >
        <DxfSvg
          entities={data.entities}
          bounds={data.bounds}
          viewport={viewport}
          showDimensions={showDimensions}
          measurements={measurements}
          pendingMeasurement={pendingMeasurement}
          snapPoint={snapPreview}
        />
      </div>
      <div style={{ position: 'absolute', left: 14, bottom: 14, display: 'flex', gap: 6, zIndex: 2 }}>
        <ViewerButton onClick={() => zoomBy(1.18)} title="Aproximar">+</ViewerButton>
        <ViewerButton onClick={() => zoomBy(0.85)} title="Afastar">-</ViewerButton>
        <ViewerButton onClick={resetView} title="Centralizar">100%</ViewerButton>
      </div>
      <div style={{ position: 'absolute', right: 14, bottom: 17, color: 'var(--text-muted)', fontSize: 11, background: 'var(--bg-overlay)', border: '1px solid var(--border-default)', borderRadius: 7, padding: '5px 8px' }}>
        Zoom {Math.round(viewport.zoom * 100)}%
      </div>
    </>
  );
}

function ViewerButton({ onClick, title, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        minWidth: 32,
        height: 30,
        borderRadius: 7,
        border: '1px solid var(--border-default)',
        background: 'var(--bg-surface)',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {children}
    </button>
  );
}

export default function DxfViewerPage({ cards, search }) {
  const fileInputRef = useRef(null);
  const printRef = useRef(null);
  const dxfCards = useMemo(() => {
    const query = (search || '').trim().toLowerCase();
    return (cards || [])
      .filter(isDxf)
      .filter(card => !query || card.title?.toLowerCase().includes(query) || card.anexo_nome?.toLowerCase().includes(query));
  }, [cards, search]);

  const [selectedId, setSelectedId] = useState(null);
  const [importedDxf, setImportedDxf] = useState(null);
  const selectedCard = dxfCards.find(card => card.id === selectedId) || dxfCards[0] || null;
  const [state, setState] = useState({ status: 'idle', data: null, error: '' });
  const [viewport, setViewport] = useState({ zoom: 1, panX: 0, panY: 0 });
  const [showDimensions, setShowDimensions] = useState(false);
  const [measureMode, setMeasureMode] = useState(false);
  const [measurements, setMeasurements] = useState([]);
  const [measureStart, setMeasureStart] = useState(null);
  const [measureHover, setMeasureHover] = useState(null);
  const activeTitle = importedDxf?.name || selectedCard?.title || 'Selecione um DXF';
  const activeSubtitle = importedDxf ? 'Arquivo importado nesta pagina' : selectedCard?.anexo_nome || 'A visualizacao aparece aqui';
  const pendingMeasurement = measureMode && measureStart && measureHover
    ? { start: measureStart, end: measureHover }
    : null;

  useEffect(() => {
    if (!dxfCards.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedCard) setSelectedId(dxfCards[0].id);
  }, [dxfCards, selectedCard]);

  useEffect(() => {
    if (importedDxf) return;
    if (!selectedCard?.anexo_path) {
      setState({ status: 'idle', data: null, error: '' });
      return;
    }

    const controller = new AbortController();
    setState({ status: 'loading', data: null, error: '' });
    fetch(selectedCard.anexo_path, { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error('Nao foi possivel baixar o DXF.');
        return response.text();
      })
      .then(text => {
        const data = parseDxf(text);
        if (!data.entities.length || !data.bounds) throw new Error('Nenhuma geometria suportada foi encontrada no DXF.');
        setViewport({ zoom: 1, panX: 0, panY: 0 });
        setMeasureMode(false);
        setMeasureStart(null);
        setMeasureHover(null);
        setMeasurements([]);
        setShowDimensions(false);
        setState({ status: 'ready', data, error: '' });
      })
      .catch(error => {
        if (error.name !== 'AbortError') setState({ status: 'error', data: null, error: error.message || 'Erro ao ler o DXF.' });
      });

    return () => controller.abort();
  }, [selectedCard, importedDxf]);

  function handleImportFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/\.dxf$/i.test(file.name)) {
      setImportedDxf(null);
      setState({ status: 'error', data: null, error: 'Selecione um arquivo .dxf.' });
      event.target.value = '';
      return;
    }

    setSelectedId(null);
    setImportedDxf({ name: file.name });
    setState({ status: 'loading', data: null, error: '' });

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = parseDxf(String(reader.result || ''));
        if (!data.entities.length || !data.bounds) throw new Error('Nenhuma geometria suportada foi encontrada no DXF.');
        setViewport({ zoom: 1, panX: 0, panY: 0 });
        setMeasureMode(false);
        setMeasureStart(null);
        setMeasureHover(null);
        setMeasurements([]);
        setShowDimensions(false);
        setState({ status: 'ready', data, error: '' });
      } catch (error) {
        setState({ status: 'error', data: null, error: error.message || 'Erro ao ler o DXF.' });
      }
    };
    reader.onerror = () => setState({ status: 'error', data: null, error: 'Nao foi possivel ler o arquivo.' });
    reader.readAsText(file);
    event.target.value = '';
  }

  function clearImportedFile() {
    setImportedDxf(null);
    setState({ status: 'idle', data: null, error: '' });
    setMeasureMode(false);
    setMeasureStart(null);
    setMeasureHover(null);
    setMeasurements([]);
    setShowDimensions(false);
    if (dxfCards[0]) setSelectedId(dxfCards[0].id);
  }

  function handleAddMeasurePoint(point) {
    if (!measureStart) {
      setMeasureStart(point);
      setMeasureHover(point);
      return;
    }
    setMeasurements(prev => [...prev, { start: measureStart, end: point }]);
    setMeasureStart(null);
    setMeasureHover(null);
  }

  function handlePreviewMeasurePoint(point) {
    setMeasureHover(point);
  }

  function handlePrint() {
    if (state.status !== 'ready') return;
    const printContent = printRef.current?.innerHTML;
    if (!printContent) {
      window.print();
      return;
    }

    const oldFrame = document.getElementById('dxf-print-frame');
    oldFrame?.remove();

    const frame = document.createElement('iframe');
    frame.id = 'dxf-print-frame';
    frame.title = 'Impressao DXF';
    frame.style.position = 'fixed';
    frame.style.right = '0';
    frame.style.bottom = '0';
    frame.style.width = '0';
    frame.style.height = '0';
    frame.style.border = '0';
    document.body.appendChild(frame);

    const doc = frame.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(`
      <!doctype html>
      <html>
        <head>
          <title>${escapeHtml(activeTitle)}</title>
          <base href="${escapeHtml(window.location.href)}">
          <style>${getPrintStyles()}</style>
        </head>
        <body>${printContent}</body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      frame.contentWindow?.focus();
      frame.contentWindow?.addEventListener('afterprint', () => frame.remove(), { once: true });
      frame.contentWindow?.print();
    }, 250);
  }

  return (
    <div className="dxf-viewer-page" style={{ flex: 1, width: '100%', height: '100%', minHeight: 0, display: 'grid', gridTemplateColumns: '300px minmax(0, 1fr)', gap: 16 }}>
      <aside className="dxf-viewer-sidebar" style={{ minHeight: 0, border: '1px solid var(--border-default)', borderRadius: 8, background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--border-default)' }}>
          <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 14, fontWeight: 700 }}>Visualizacao</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 11 }}>{dxfCards.length} arquivo(s) DXF</p>
          <input ref={fileInputRef} type="file" accept=".dxf" onChange={handleImportFile} style={{ display: 'none' }} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: '100%',
              marginTop: 11,
              height: 34,
              border: '1px solid var(--accent-blue)',
              borderRadius: 7,
              background: 'var(--accent-blue)',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 700,
              fontFamily: 'var(--font-text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Importar DXF
          </button>
        </div>
        <div style={{ overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {importedDxf && (
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              style={{
                width: '100%',
                border: '1px solid var(--accent-blue)',
                background: 'color-mix(in srgb, var(--accent-blue) 10%, var(--bg-surface2))',
                color: 'var(--text-primary)',
                borderRadius: 7,
                padding: '10px 11px',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span style={{ display: 'block', fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{importedDxf.name}</span>
              <span style={{ display: 'block', marginTop: 3, color: 'var(--text-muted)', fontSize: 10 }}>Importado localmente</span>
            </button>
          )}
          {dxfCards.map(card => {
            const active = !importedDxf && selectedCard?.id === card.id;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => { setImportedDxf(null); setSelectedId(card.id); }}
                style={{
                  width: '100%',
                  border: `1px solid ${active ? 'var(--accent-blue)' : 'var(--border-default)'}`,
                  background: active ? 'color-mix(in srgb, var(--accent-blue) 10%, var(--bg-surface2))' : 'var(--bg-surface2)',
                  color: 'var(--text-primary)',
                  borderRadius: 7,
                  padding: '10px 11px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ display: 'block', fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.title}</span>
                <span style={{ display: 'block', marginTop: 3, color: 'var(--text-muted)', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.anexo_nome}</span>
              </button>
            );
          })}
          {!dxfCards.length && (
            <p style={{ margin: 12, color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.5 }}>Nenhum anexo DXF encontrado.</p>
          )}
        </div>
      </aside>

      <section className="dxf-viewer-main" style={{ minWidth: 0, minHeight: 0, border: '1px solid var(--border-default)', borderRadius: 8, background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-default)', background: 'color-mix(in srgb, var(--status-yellow) 11%, var(--bg-card))', color: 'var(--text-secondary)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--status-yellow)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          Visualizacao em teste. Bugs podem acontecer; confira medidas criticas antes de produzir.
        </div>

        <div className="dxf-viewer-toolbar" style={{ padding: '13px 16px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 15, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activeTitle}
            </h2>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activeSubtitle}
            </p>
          </div>
          <div className="dxf-viewer-actions" style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
            {showDimensions && state.data?.bounds && (
              <>
              <Measure label="Largura" value={state.data.bounds.width} />
              <Measure label="Altura" value={state.data.bounds.height} />
              </>
            )}
            <ToolButton
              active={showDimensions}
              disabled={state.status !== 'ready'}
              onClick={() => setShowDimensions(value => !value)}
            >
              Cotas gerais
            </ToolButton>
            <ToolButton
              active={measureMode}
              disabled={state.status !== 'ready'}
              onClick={() => {
                setMeasureMode(value => !value);
                setMeasureStart(null);
                setMeasureHover(null);
              }}
            >
              Medir
            </ToolButton>
            <ToolButton
              disabled={!measurements.length && !measureStart}
              onClick={() => {
                setMeasurements([]);
                setMeasureStart(null);
                setMeasureHover(null);
              }}
            >
              Limpar
            </ToolButton>
            <button
              type="button"
              onClick={handlePrint}
              disabled={state.status !== 'ready'}
              title="Imprimir desenho"
              style={{
                width: 34,
                height: 32,
                borderRadius: 7,
                border: '1px solid var(--border-default)',
                background: 'var(--bg-surface2)',
                color: state.status === 'ready' ? 'var(--text-secondary)' : 'var(--text-faint)',
                cursor: state.status === 'ready' ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"/>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
            </button>
            {importedDxf && (
              <button
                type="button"
                onClick={clearImportedFile}
                title="Fechar arquivo importado"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 7,
                  border: '1px solid var(--border-default)',
                  background: 'var(--bg-surface2)',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="grid-bg" style={{ position: 'relative', flex: 1, minHeight: 0, backgroundColor: 'var(--bg-surface2)' }}>
          {state.status === 'loading' && <CenterText text="Carregando DXF..." />}
          {state.status === 'error' && <CenterText text={state.error} />}
          {state.status === 'idle' && <CenterText text="Nenhum DXF selecionado." />}
          {state.status === 'ready' && measureMode && (
            <div style={{
              position: 'absolute',
              left: 14,
              top: 14,
              zIndex: 3,
              border: '1px solid var(--border-default)',
              borderRadius: 7,
              background: 'var(--bg-overlay)',
              color: 'var(--text-secondary)',
              fontSize: 11,
              padding: '6px 9px',
            }}>
              {measureStart ? 'Clique no segundo ponto - ima ativo' : 'Clique no primeiro ponto - ima ativo'}
            </div>
          )}
          {state.status === 'ready' && (
            <DxfViewport
              data={state.data}
              viewport={viewport}
              onViewportChange={setViewport}
              showDimensions={showDimensions}
              measureMode={measureMode}
              measurements={measurements}
              pendingMeasurement={pendingMeasurement}
              hoverPoint={measureHover}
              onAddMeasurePoint={handleAddMeasurePoint}
              onPreviewMeasurePoint={handlePreviewMeasurePoint}
            />
          )}
        </div>
      </section>

      {state.status === 'ready' && (
        <div ref={printRef} style={{ display: 'none' }}>
          <PrintSheet title={activeTitle} subtitle={activeSubtitle} data={state.data} />
        </div>
      )}
    </div>
  );
}

function ToolButton({ active = false, disabled = false, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        height: 32,
        borderRadius: 7,
        border: `1px solid ${active ? 'var(--accent-blue)' : 'var(--border-default)'}`,
        background: active ? 'color-mix(in srgb, var(--accent-blue) 16%, var(--bg-surface2))' : 'var(--bg-surface2)',
        color: disabled ? 'var(--text-faint)' : active ? 'var(--accent-blue)' : 'var(--text-secondary)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 10px',
        fontSize: 11,
        fontWeight: 700,
        fontFamily: 'var(--font-text)',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  );
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function Measure({ label, value }) {
  return (
    <div style={{ minWidth: 92, border: '1px solid var(--border-default)', borderRadius: 7, background: 'var(--bg-surface2)', padding: '7px 10px' }}>
      <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
      <strong style={{ display: 'block', color: 'var(--text-primary)', fontSize: 13, marginTop: 2 }}>{formatMeasure(value)} mm</strong>
    </div>
  );
}

function CenterText({ text }) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: 20 }}>
      {text}
    </div>
  );
}
