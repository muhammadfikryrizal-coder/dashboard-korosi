import React, { useMemo, useState } from 'react';
import { SEGMENTS, EDGES } from '@/lib/data';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  Activity,
  CircleGauge,
  ScanSearch,
  Plus,
  Minus,
  RotateCcw,
  Expand,
  X,
  Shrink,
} from 'lucide-react';
import { RecommendationsPanel } from '@/components/RecommendationsPanel';
import {
  CANVAS_H as DEFAULT_CANVAS_H,
  PRIMARY_INLET_NODE,
  PRIMARY_OUTLET_NODE,
  hierarchicalLayout,
  edgePath,
  edgeRiskColor,
} from '@/lib/networkLayout';

const CLASS_COLOR = { Safe: '#22c55e', Warning: '#f59e0b', Critical: '#ef4444' };
const CLASS_FILL_ALPHA = 0.88;

function classColor(cls) {
  return CLASS_COLOR[cls] ?? '#60a5fa';
}

function thicknessColor(loss = 0) {
  if (loss < 20) return '#22c55e';
  if (loss < 30) return '#f59e0b';
  return '#ef4444';
}

function nodeRadius(priorityScore) {
  const r = 6 + Math.min(14, (priorityScore ?? 0) * 18);
  return Math.max(5, r);
}

function edgeWidth(flowVol) {
  return 0.8 + Math.min(3.5, (flowVol ?? 0) / 50);
}

function classLabel(cls) {
  if (cls === 'Safe') return 'Aman';
  if (cls === 'Warning') return 'Peringatan';
  return 'Kritis';
}

function tooltipPosition(pos, canvasW, canvasH) {
  const boxW = 220;
  const boxH = 88;
  const flipX = pos.x > canvasW * 0.55;
  const x = flipX ? Math.max(8, pos.x - boxW - 14) : Math.min(canvasW - boxW - 8, pos.x + 14);
  const y = Math.max(8, Math.min(canvasH - boxH - 8, pos.y - boxH / 2));
  return { x, y, boxW, boxH, flipX };
}

export const NetworkMap = () => {
  const initialNode =
    [...SEGMENTS].sort((a, b) => b.priorityScore - a.priorityScore)[0] ?? SEGMENTS[0];
  const [selectedNode, setSelectedNode] = useState(initialNode);
  const [focusTrigger, setFocusTrigger] = useState(0);
  const [hoverIdx, setHoverIdx] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [viewMode, setViewMode] = useState('risk');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const layout = useMemo(() => hierarchicalLayout(SEGMENTS, EDGES), []);
  const positions = layout.positions;
  const canvasW = layout.meta?.canvasW ?? 960;
  const canvasH = layout.meta?.canvasH ?? DEFAULT_CANVAS_H;

  const nodeIndexById = useMemo(() => {
    const map = new Map();
    SEGMENTS.forEach((s, idx) => map.set(s.nodeId, idx));
    return map;
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
  const tooltip = hoverSegment && hoverPos ? tooltipPosition(hoverPos, canvasW, canvasH) : null;

  const counts = useMemo(() => {
    const c = { Safe: 0, Warning: 0, Critical: 0 };
    SEGMENTS.forEach((s) => {
      c[s.predictedClass] = (c[s.predictedClass] ?? 0) + 1;
    });
    return c;
  }, []);

  const avgRisk = useMemo(
    () => SEGMENTS.reduce((acc, node) => acc + node.priorityScore, 0) / SEGMENTS.length,
    []
  );

  const zoomTranslateX = (1 - zoomLevel) * (canvasW / 2);
  const zoomTranslateY = (1 - zoomLevel) * (canvasH / 2);

  const selectNode = (segment) => {
    setSelectedNode(segment);
    setFocusTrigger((t) => t + 1);
  };

  const kpiItems = [
    {
      label: 'Total Node',
      value: SEGMENTS.length,
      sub: '100% dari keseluruhan',
      icon: CircleGauge,
      iconClass: 'text-pg-accent',
      iconBg: 'bg-blue-50',
    },
    {
      label: 'Node Aman',
      value: counts.Safe,
      sub: `${((counts.Safe / SEGMENTS.length) * 100).toFixed(1)}%`,
      icon: Activity,
      iconClass: 'text-green-700',
      iconBg: 'bg-green-50',
    },
    {
      label: 'Node Peringatan',
      value: counts.Warning,
      sub: `${((counts.Warning / SEGMENTS.length) * 100).toFixed(1)}%`,
      icon: AlertTriangle,
      iconClass: 'text-amber-700',
      iconBg: 'bg-amber-50',
    },
    {
      label: 'Node Kritis',
      value: counts.Critical,
      sub: `${((counts.Critical / SEGMENTS.length) * 100).toFixed(1)}%`,
      icon: AlertTriangle,
      iconClass: 'text-red-700',
      iconBg: 'bg-red-50',
    },
    {
      label: 'Rata-rata Skor Risiko',
      value: avgRisk.toFixed(3),
      sub: 'Skor prioritas agregat',
      icon: ScanSearch,
      iconClass: 'text-pg-text-main',
      iconBg: 'bg-slate-100',
    },
  ];

  const mapShell = (
    <>
      <div className="absolute top-4 left-4 z-20">
        <h3 className="text-sm font-bold text-pg-text-main">
          Topologi Jaringan Pipeline
        </h3>
      </div>

      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <div className="bg-white border border-pg-border rounded-xl p-1 flex gap-1">
          <button
            type="button"
            onClick={() => setViewMode('risk')}
            className={cn('network-mode-tab', viewMode === 'risk' && 'network-mode-tab-active')}
          >
            Risiko
          </button>
          <button
            type="button"
            onClick={() => setViewMode('thickness')}
            className={cn('network-mode-tab', viewMode === 'thickness' && 'network-mode-tab-active')}
          >
            Ketebalan
          </button>
          <button
            type="button"
            onClick={() => setViewMode('flow')}
            className={cn('network-mode-tab', viewMode === 'flow' && 'network-mode-tab-active')}
          >
            Aliran
          </button>
        </div>
        <select
          className="network-view-select"
          value="hierarchy"
          disabled
          aria-label="Tampilan topologi"
        >
          <option value="hierarchy">Hierarki</option>
        </select>
      </div>

      <div className="absolute top-20 left-4 z-20 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setZoomLevel((z) => Math.min(1.8, z + 0.1))}
          className="network-toolbar-btn"
          aria-label="Zoom in"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setZoomLevel((z) => Math.max(0.8, z - 0.1))}
          className="network-toolbar-btn"
          aria-label="Zoom out"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setZoomLevel(1)}
          className="network-toolbar-btn"
          aria-label="Reset zoom"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setIsFullscreen((v) => !v)}
          className="network-toolbar-btn"
          aria-label={isFullscreen ? 'Keluar layar penuh' : 'Layar penuh'}
        >
          {isFullscreen ? <Shrink className="w-4 h-4" /> : <Expand className="w-4 h-4" />}
        </button>
      </div>

      <div className="pt-12">
        <svg
          viewBox={`0 0 ${canvasW} ${canvasH}`}
          className="w-full h-[560px] min-w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <filter id="criticalGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g transform={`translate(${zoomTranslateX} ${zoomTranslateY}) scale(${zoomLevel})`}>
            {EDGES.map((edge, idx) => {
              const sIdx = nodeIndexById.get(edge.source);
              const tIdx = nodeIndexById.get(edge.target);
              if (sIdx == null || tIdx == null) return null;
              const sPos = positions[sIdx];
              const tPos = positions[tIdx];
              const sSeg = SEGMENTS[sIdx];
              const tSeg = SEGMENTS[tIdx];
              const highlighted = incidentEdges.has(idx);
              const baseOpacity = viewMode === 'flow' ? 0.75 : 0.55;
              const widthBoost = viewMode === 'flow' ? 1.2 : 0;

              let stroke = '#94a3b8';
              if (highlighted) {
                stroke = '#3b82f6';
              } else if (viewMode === 'risk') {
                stroke = edgeRiskColor(sSeg.predictedClass, tSeg.predictedClass);
              } else if (viewMode === 'thickness') {
                stroke = thicknessColor(
                  Math.max(sSeg.thicknessLossPct ?? 0, tSeg.thicknessLossPct ?? 0)
                );
              }

              return (
                <path
                  key={idx}
                  d={edgePath(sPos.x, sPos.y, tPos.x, tPos.y)}
                  fill="none"
                  stroke={stroke}
                  strokeOpacity={highlighted ? 0.95 : baseOpacity}
                  strokeWidth={edgeWidth(edge.flowVol) + (highlighted ? 0.8 : 0) + widthBoost}
                  strokeLinecap="round"
                />
              );
            })}

            {SEGMENTS.map((segment, idx) => {
              const pos = positions[idx];
              const isSelected = selectedNode?.id === segment.id;
              const isHover = hoverIdx === idx;
              const isCritical = segment.predictedClass === 'Critical';
              const color =
                viewMode === 'thickness'
                  ? thicknessColor(segment.thicknessLossPct)
                  : classColor(segment.predictedClass);
              const r = nodeRadius(segment.priorityScore);
              const isPrimaryInlet = segment.nodeId === PRIMARY_INLET_NODE;
              const isPrimaryOutlet = segment.nodeId === PRIMARY_OUTLET_NODE;

              return (
                <g
                  key={segment.id}
                  className="cursor-pointer"
                  onClick={() => selectNode(segment)}
                  onMouseEnter={() => setHoverIdx(idx)}
                  onMouseLeave={() => setHoverIdx((current) => (current === idx ? null : current))}
                >
                  <circle cx={pos.x} cy={pos.y} r={Math.max(r + 8, 12)} fill="transparent" />

                  {isCritical && (
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={r + 8}
                      fill="#ef4444"
                      fillOpacity={0.18}
                      className="network-node-critical-glow"
                      filter="url(#criticalGlow)"
                    />
                  )}

                  {isSelected && (
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={r + 7}
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth={2}
                      strokeDasharray="4 2"
                    />
                  )}

                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={r}
                    fill={color}
                    fillOpacity={CLASS_FILL_ALPHA}
                    stroke="#1e293b"
                    strokeWidth={isSelected || isHover ? 1.8 : 1}
                  />

                  {isPrimaryInlet && (
                    <g pointerEvents="none">
                      <rect
                        x={pos.x - r - 52}
                        y={pos.y - 10}
                        width={44}
                        height={20}
                        rx={4}
                        fill="#ecfdf5"
                        stroke="#22c55e"
                        strokeWidth={1}
                      />
                      <text
                        x={pos.x - r - 30}
                        y={pos.y + 4}
                        textAnchor="middle"
                        fontSize={9}
                        fontWeight={700}
                        fill="#15803d"
                      >
                        INLET
                      </text>
                    </g>
                  )}

                  {isPrimaryOutlet && (
                    <g pointerEvents="none">
                      <rect
                        x={pos.x + r + 8}
                        y={pos.y + r - 4}
                        width={52}
                        height={20}
                        rx={4}
                        fill="#eff6ff"
                        stroke="#3b82f6"
                        strokeWidth={1}
                      />
                      <text
                        x={pos.x + r + 34}
                        y={pos.y + r + 10}
                        textAnchor="middle"
                        fontSize={9}
                        fontWeight={700}
                        fill="#1d4ed8"
                      >
                        OUTLET
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>

          {tooltip && hoverSegment && (
            <g pointerEvents="none">
              <rect
                x={tooltip.x}
                y={tooltip.y}
                width={tooltip.boxW}
                height={tooltip.boxH}
                rx={10}
                ry={10}
                fill="#0f172a"
                fillOpacity={0.96}
              />
              <text x={tooltip.x + 12} y={tooltip.y + 20} fontSize={11} fontWeight={700} fill="#f8fafc">
                {hoverSegment.name} — {classLabel(hoverSegment.predictedClass)}
              </text>
              <text x={tooltip.x + 12} y={tooltip.y + 38} fontSize={10} fill="#cbd5e1">
                Prob. kritis {(hoverSegment.criticalProb * 100).toFixed(1)}% · Skor{' '}
                {hoverSegment.priorityScore.toFixed(3)}
              </text>
              <text x={tooltip.x + 12} y={tooltip.y + 54} fontSize={10} fill="#cbd5e1">
                Tekanan {hoverSegment.pressAvg.toFixed(2)} bar · H2S {hoverSegment.h2sPpm.toFixed(1)} ppm
              </text>
              <text x={tooltip.x + 12} y={tooltip.y + 72} fontSize={10} fontWeight={700} fill="#60a5fa">
                Lihat Detail →
              </text>
            </g>
          )}
        </svg>
      </div>

      <div className="absolute bottom-4 left-4 flex gap-2 z-20">
        <div className="network-legend">
          <h4 className="network-legend-title">Legenda Risiko</h4>
          <div className="network-legend-row">
            <span className="w-2.5 h-2.5 rounded-full bg-pg-safe" />
            <span>Aman ({counts.Safe})</span>
          </div>
          <div className="network-legend-row">
            <span className="w-2.5 h-2.5 rounded-full bg-pg-warning" />
            <span>Peringatan ({counts.Warning})</span>
          </div>
          <div className="network-legend-row">
            <span className="w-2.5 h-2.5 rounded-full bg-pg-critical" />
            <span>Kritis ({counts.Critical})</span>
          </div>
        </div>

        <div className="network-summary-card">
          <h4 className="network-legend-title">Ringkasan</h4>
          <div className="network-summary-row">
            <span>Total Node</span>
            <span className="font-bold">{SEGMENTS.length}</span>
          </div>
          <div className="network-summary-row">
            <span>Segmen Kritis</span>
            <span className="font-bold text-pg-critical">{counts.Critical}</span>
          </div>
          <div className="network-summary-row">
            <span>Rata-rata Skor</span>
            <span className="font-bold">{avgRisk.toFixed(3)}</span>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {kpiItems.map((item) => (
          <div key={item.label} className="network-kpi-card">
            <div className={cn('network-kpi-icon', item.iconBg)}>
              <item.icon className={cn('w-4 h-4', item.iconClass)} />
            </div>
            <p className="network-kpi-label">{item.label}</p>
            <p className="network-kpi-value">{item.value}</p>
            <p className="network-kpi-sub">{item.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div
          className={cn(
            'xl:col-span-2 network-map-shell relative overflow-hidden',
            isFullscreen && 'network-map-fullscreen'
          )}
        >
          {mapShell}
        </div>

        <div className="network-detail-panel">
          {selectedNode ? (
            <>
              <div className="network-detail-header">
                <div>
                  <p className="network-detail-overline">ID NODE</p>
                  <h3 className="network-detail-id">{selectedNode.name}</h3>
                  <p className="network-detail-area">{selectedNode.area}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'ops-pill',
                      selectedNode.predictedClass === 'Critical'
                        ? 'pill-critical'
                        : selectedNode.predictedClass === 'Warning'
                        ? 'pill-warning'
                        : 'pill-safe'
                    )}
                  >
                    {classLabel(selectedNode.predictedClass)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedNode(null)}
                    className="network-close-btn"
                    aria-label="Clear selected node"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="network-detail-metric-grid">
                <div className="network-metric-box">
                  <p className="network-metric-label">Probabilitas Kritis</p>
                  <p className="network-metric-critical">
                    {(selectedNode.criticalProb * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="network-metric-box">
                  <p className="network-metric-label">Risk Score</p>
                  <p className="network-metric-value">{selectedNode.priorityScore.toFixed(3)}</p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="network-section-title">Parameter Utama</h4>
                {[
                  { label: 'Temperatur', value: selectedNode.tempAvg, unit: '°C' },
                  { label: 'Tekanan', value: selectedNode.pressAvg, unit: 'bar' },
                  { label: 'Tingkat pH', value: selectedNode.phLevel, unit: '' },
                  { label: 'Kadar H2S', value: selectedNode.h2sPpm, unit: 'ppm' },
                  { label: 'Chloride', value: selectedNode.chloridePpm, unit: 'ppm' },
                  { label: 'Inhibitor', value: selectedNode.inhibitorPpm, unit: 'ppm' },
                  { label: 'Laju Korosi', value: selectedNode.corrosionRateMmYr, unit: 'mm/yr' },
                  { label: 'Loss Ketebalan', value: selectedNode.thicknessLossPct, unit: '%' },
                ].map((param) => (
                  <div key={param.label} className="network-param-row">
                    <span>{param.label}</span>
                    <span className="font-bold text-pg-text-main">
                      {typeof param.value === 'number' ? param.value.toFixed(2) : '-'} {param.unit}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-center p-6 text-pg-text-soft text-sm">
              Pilih node pada peta untuk melihat detail risiko.
            </div>
          )}
        </div>
      </div>

      <RecommendationsPanel embeddedInNetwork focusedSegmentId={selectedNode?.id ?? null} focusTrigger={focusTrigger} />
    </div>
  );
};
