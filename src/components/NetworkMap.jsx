import React, { useMemo, useState } from 'react';
import { Hero } from '@/components/Hero';
import { SEGMENTS, EDGES } from '@/lib/data';
import { cn } from '@/lib/utils';
import { Info, Map as MapIcon, AlertTriangle, Fingerprint } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CANVAS_W = 820;
const CANVAS_H = 540;
const PADDING = 60;

const CLASS_COLOR = { Safe: '#22c55e', Warning: '#f59e0b', Critical: '#ef4444' };
const CLASS_FILL_ALPHA = 0.85;

function classColor(cls) {
  return CLASS_COLOR[cls] ?? '#60a5fa';
}

// Port of networkx.spring_layout (Fruchterman–Reingold) with a deterministic
// seed so the visualisation is stable across renders. The algorithm runs in a
// unit-ish box; we rescale to the SVG canvas at the very end so nodes spread
// across the whole viewport instead of being clamped at every iteration.
function springLayout(segments, edges, { iterations = 300, seed = 42 } = {}) {
  const n = segments.length;
  if (n === 0) return [];

  // mulberry32 PRNG for deterministic initial positions.
  let s = seed >>> 0;
  const rand = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // Initial positions in [-0.5, 0.5].
  const pos = Array.from({ length: n }, () => [rand() - 0.5, rand() - 0.5]);

  // Ideal edge length (Fruchterman–Reingold's `k`).
  const k = Math.sqrt(1.0 / n);
  let t = 0.1; // initial temperature
  const cool = t / (iterations + 1);

  const edgePairs = edges
    .filter((e) => e.source !== e.target)
    .map((e) => [e.source, e.target]);

  for (let iter = 0; iter < iterations; iter++) {
    const disp = Array.from({ length: n }, () => [0, 0]);

    // Repulsive forces (every pair).
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = pos[i][0] - pos[j][0];
        const dy = pos[i][1] - pos[j][1];
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 1e-4) dist = 1e-4;
        const force = (k * k) / dist;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        disp[i][0] += fx;
        disp[i][1] += fy;
        disp[j][0] -= fx;
        disp[j][1] -= fy;
      }
    }

    // Attractive forces (edges only).
    for (const [u, v] of edgePairs) {
      const dx = pos[u][0] - pos[v][0];
      const dy = pos[u][1] - pos[v][1];
      let dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1e-4) dist = 1e-4;
      const force = (dist * dist) / k;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      disp[u][0] -= fx;
      disp[u][1] -= fy;
      disp[v][0] += fx;
      disp[v][1] += fy;
    }

    // Apply displacement bounded by current temperature.
    for (let i = 0; i < n; i++) {
      const d = Math.sqrt(disp[i][0] ** 2 + disp[i][1] ** 2);
      if (d < 1e-9) continue;
      const cap = Math.min(d, t);
      pos[i][0] += (disp[i][0] / d) * cap;
      pos[i][1] += (disp[i][1] / d) * cap;
    }

    t -= cool;
  }

  // Normalise to [0, 1] and project into the canvas, leaving padding so the
  // largest critical-node radius doesn't get clipped at the edges.
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of pos) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const rangeX = Math.max(maxX - minX, 1e-6);
  const rangeY = Math.max(maxY - minY, 1e-6);
  const innerW = CANVAS_W - 2 * PADDING;
  const innerH = CANVAS_H - 2 * PADDING;
  return pos.map(([x, y]) => ({
    x: PADDING + ((x - minX) / rangeX) * innerW,
    y: PADDING + ((y - minY) / rangeY) * innerH,
  }));
}

// Node radius scales with corrosion rate (mirrors the Plotly version's
// `10 + min(28, corr * 2.4)` heuristic).
function nodeRadius(corrosionRateMmYr) {
  const r = 5 + Math.min(14, (corrosionRateMmYr ?? 0) * 1.2);
  return Math.max(4, r);
}

// Edge stroke width scales with flow_vol (mirrors the Plotly version).
function edgeWidth(flowVol) {
  return 0.8 + Math.min(3.5, (flowVol ?? 0) / 50);
}

export const NetworkMap = () => {
  const initialNode =
    [...SEGMENTS].sort((a, b) => b.priorityScore - a.priorityScore)[0] ?? SEGMENTS[0];
  const [selectedNode, setSelectedNode] = useState(initialNode);
  const [hoverIdx, setHoverIdx] = useState(null);

  const positions = useMemo(() => springLayout(SEGMENTS, EDGES), []);

  const nodeIndexById = useMemo(() => {
    const map = new Map();
    SEGMENTS.forEach((s, idx) => map.set(s.nodeId, idx));
    return map;
  }, []);

  const auditCandidates = useMemo(
    () =>
      SEGMENTS.filter((s) => s.predictedClass !== 'Safe')
        .sort((a, b) => b.priorityScore - a.priorityScore)
        .slice(0, 8),
    []
  );

  const counts = useMemo(() => {
    const c = { Safe: 0, Warning: 0, Critical: 0 };
    SEGMENTS.forEach((s) => {
      c[s.predictedClass] = (c[s.predictedClass] ?? 0) + 1;
    });
    return c;
  }, []);

  const selectedIdx = selectedNode ? nodeIndexById.get(selectedNode.nodeId) : null;
  const incidentEdges = useMemo(() => {
    if (selectedIdx == null) return new Set();
    const out = new Set();
    EDGES.forEach((e, idx) => {
      const sIdx = nodeIndexById.get(e.source);
      const tIdx = nodeIndexById.get(e.target);
      if (sIdx === selectedIdx || tIdx === selectedIdx) out.add(idx);
    });
    return out;
  }, [selectedIdx, nodeIndexById]);

  const hoverSegment = hoverIdx != null ? SEGMENTS[hoverIdx] : null;
  const hoverPos = hoverIdx != null ? positions[hoverIdx] : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Hero
        title="Peta Jaringan Pipeline"
        subtitle="Visualisasi topologi berdasarkan edge_data.csv dengan layout spring (Fruchterman–Reingold). Ukuran node sebanding corrosion_rate; tebal edge sebanding flow_vol."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 pg-card relative bg-[#f8fafc] overflow-hidden p-3">
          <div className="absolute top-4 left-4 z-10 text-[10px] font-bold text-pg-text-soft uppercase tracking-widest bg-white/80 backdrop-blur px-3 py-1.5 rounded-full border border-pg-border">
            Peta risiko topologi — klik node untuk diagnosis
          </div>

          <svg
            viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
            className="w-full h-[560px]"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* edges first so nodes sit on top */}
            <g>
              {EDGES.map((edge, idx) => {
                const sIdx = nodeIndexById.get(edge.source);
                const tIdx = nodeIndexById.get(edge.target);
                if (sIdx == null || tIdx == null) return null;
                const sPos = positions[sIdx];
                const tPos = positions[tIdx];
                const highlighted = incidentEdges.has(idx);
                return (
                  <line
                    key={idx}
                    x1={sPos.x}
                    y1={sPos.y}
                    x2={tPos.x}
                    y2={tPos.y}
                    stroke={highlighted ? '#3b82f6' : '#9ca3af'}
                    strokeOpacity={highlighted ? 0.85 : 0.45}
                    strokeWidth={edgeWidth(edge.flowVol) + (highlighted ? 0.8 : 0)}
                    strokeLinecap="round"
                  />
                );
              })}
            </g>

            {/* nodes */}
            <g>
              {SEGMENTS.map((segment, idx) => {
                const pos = positions[idx];
                const isSelected = selectedNode?.id === segment.id;
                const isHover = hoverIdx === idx;
                const color = classColor(segment.predictedClass);
                const r = nodeRadius(segment.corrosionRateMmYr);

                return (
                  <g
                    key={segment.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedNode(segment)}
                    onMouseEnter={() => setHoverIdx(idx)}
                    onMouseLeave={() => setHoverIdx((current) => (current === idx ? null : current))}
                  >
                    {/* hit area */}
                    <circle cx={pos.x} cy={pos.y} r={Math.max(r + 6, 10)} fill="transparent" />
                    {/* outer ring for selected */}
                    {isSelected && (
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={r + 6}
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth={2}
                        strokeDasharray="3 2"
                      />
                    )}
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={r}
                      fill={color}
                      fillOpacity={CLASS_FILL_ALPHA}
                      stroke="#111827"
                      strokeWidth={isSelected || isHover ? 1.6 : 0.9}
                    />
                  </g>
                );
              })}
            </g>

            {/* hover tooltip */}
            {hoverSegment && hoverPos && (
              <g pointerEvents="none">
                <rect
                  x={Math.min(CANVAS_W - 200, hoverPos.x + 10)}
                  y={Math.max(0, hoverPos.y - 70)}
                  width={190}
                  height={62}
                  rx={6}
                  ry={6}
                  fill="#0f172a"
                  fillOpacity={0.92}
                />
                <text
                  x={Math.min(CANVAS_W - 200, hoverPos.x + 10) + 10}
                  y={Math.max(0, hoverPos.y - 70) + 18}
                  fontSize={11}
                  fontWeight={700}
                  fill="#f8fafc"
                >
                  Node {hoverSegment.nodeId} — {hoverSegment.predictedClass}
                </text>
                <text
                  x={Math.min(CANVAS_W - 200, hoverPos.x + 10) + 10}
                  y={Math.max(0, hoverPos.y - 70) + 34}
                  fontSize={10}
                  fill="#cbd5e1"
                >
                  critical_prob {hoverSegment.criticalProb.toFixed(3)} · corr {hoverSegment.corrosionRateMmYr.toFixed(2)}
                </text>
                <text
                  x={Math.min(CANVAS_W - 200, hoverPos.x + 10) + 10}
                  y={Math.max(0, hoverPos.y - 70) + 50}
                  fontSize={10}
                  fill="#cbd5e1"
                >
                  pH {hoverSegment.phLevel.toFixed(2)} · H2S {hoverSegment.h2sPpm.toFixed(1)} ppm
                </text>
              </g>
            )}
          </svg>

          <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm p-4 rounded-xl border border-pg-border shadow-sm space-y-2">
            <h4 className="text-[10px] font-bold text-pg-text-soft uppercase tracking-wider">Legenda</h4>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-pg-safe" />
              <span className="text-xs font-semibold">Aman ({counts.Safe})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-pg-warning" />
              <span className="text-xs font-semibold">Peringatan ({counts.Warning})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-pg-critical" />
              <span className="text-xs font-semibold">Kritis ({counts.Critical})</span>
            </div>
            <p className="text-[9px] text-pg-text-soft pt-2 border-t border-pg-border/50 leading-snug max-w-[180px]">
              Ukuran node ∝ corrosion_rate · ketebalan edge ∝ flow_vol
            </p>
          </div>
        </div>

        <div className="pg-card flex flex-col h-full overflow-hidden p-0">
          <AnimatePresence mode="wait">
            {selectedNode ? (
              <motion.div
                key={selectedNode.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col h-full"
              >
                <div className="p-6 border-b border-pg-border bg-pg-surface-soft">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold text-pg-text-soft bg-white border border-pg-border px-3 py-1 rounded-full">
                      ID: {selectedNode.id}
                    </span>
                    <span
                      className={cn(
                        'ops-pill',
                        selectedNode.predictedClass === 'Critical' ? 'pill-critical' : selectedNode.predictedClass === 'Warning' ? 'pill-warning' : 'pill-safe'
                      )}
                    >
                      {selectedNode.predictedClass}
                    </span>
                  </div>
                  <h3 className="text-xl font-extrabold text-pg-text-main mb-1">{selectedNode.name}</h3>
                  <p className="text-xs text-pg-text-soft font-medium uppercase">{selectedNode.area} Area</p>
                </div>

                <div className="p-6 flex-1 space-y-6 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-pg-text-soft uppercase">Critical Prob.</p>
                      <p className="text-lg font-black text-pg-critical">{(selectedNode.criticalProb * 100).toFixed(1)}%</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-pg-text-soft uppercase">Risk Score</p>
                      <p className="text-lg font-black text-pg-text-main">{selectedNode.priorityScore.toFixed(3)}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-pg-text-main flex items-center gap-2">
                      <Info className="w-4 h-4 text-blue-500" />
                      Parameter Utama
                    </h4>
                    {[
                      { label: 'Temperatur', value: selectedNode.tempAvg, unit: '°C' },
                      { label: 'Tekanan', value: selectedNode.pressAvg, unit: 'bar' },
                      { label: 'Tingkat pH', value: selectedNode.phLevel, unit: '' },
                      { label: 'Kadar H2S', value: selectedNode.h2sPpm, unit: 'ppm' },
                      { label: 'Chloride', value: selectedNode.chloridePpm, unit: 'ppm' },
                      { label: 'Inhibitor', value: selectedNode.inhibitorPpm, unit: 'ppm' },
                      { label: 'Laju Korosi', value: selectedNode.corrosionRateMmYr, unit: 'mm/yr' },
                      { label: 'Loss Ketebalan', value: selectedNode.thicknessLossPct, unit: '%' },
                    ].map((param, i) => (
                      <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-pg-border/50 border-dotted">
                        <span className="text-pg-text-soft font-medium">{param.label}</span>
                        <span className="font-bold text-pg-text-main">
                          {typeof param.value === 'number' ? param.value : '—'} {param.unit}
                        </span>
                      </div>
                    ))}
                  </div>

                  {selectedNode.inspectionNote && (
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                      <h4 className="text-xs font-bold text-blue-700 mb-2">Catatan Inspeksi</h4>
                      <p className="text-[11px] text-blue-900 leading-relaxed font-medium">
                        {selectedNode.inspectionNote}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="p-12 text-center flex flex-col items-center justify-center h-full">
                <MapIcon className="w-12 h-12 text-pg-border mb-4" />
                <p className="text-pg-text-soft text-sm font-medium">Pilih node pada peta untuk melihat detail diagnosis industri.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="pg-card">
        <h3 className="text-sm font-bold text-pg-text-soft uppercase mb-6">Audit Penjelasan Per Node (Top 8)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {auditCandidates.map((s) => {
            const drivers = [
              { key: 'corrosionRateMmYr', label: 'corrosion_rate_mm_yr', value: s.corrosionRateMmYr },
              { key: 'h2sPpm', label: 'h2s_ppm', value: s.h2sPpm },
              { key: 'chloridePpm', label: 'chloride_ppm', value: s.chloridePpm },
              { key: 'phLevel', label: 'ph_level (acidic)', value: 7.0 - s.phLevel, raw: s.phLevel },
            ];
            const top = drivers.sort((a, b) => b.value - a.value)[0];
            return (
              <div key={s.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="text-xs font-bold text-pg-text-main">{s.name}</h5>
                    <p className="text-[10px] text-pg-text-soft uppercase tracking-tighter">{s.area} • prob critical {(s.criticalProb * 100).toFixed(0)}%</p>
                  </div>
                  {s.predictedClass === 'Critical' ? (
                    <AlertTriangle className="w-4 h-4 text-pg-critical" />
                  ) : (
                    <Fingerprint className="w-4 h-4 text-pg-warning" />
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-pg-text-soft uppercase">Pendorong utama:</p>
                  <p className="text-[10px] text-pg-text-main font-medium leading-relaxed">
                    <span className="font-bold underline">{top.label}</span> ={' '}
                    <span className="font-mono">{(top.raw ?? top.value).toFixed(2)}</span>
                    {' '}— berkontribusi paling besar terhadap kelas {s.predictedClass}.
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
