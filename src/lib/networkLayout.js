export const CANVAS_W = 960;
export const CANVAS_H = 600;
export const PADDING = 60;
export const PRIMARY_INLET_NODE = 0;
export const PRIMARY_OUTLET_NODE = 74;

const MIN_NODE_GAP = 28;
const LAYER_GAP = 32;
const AREA_BANDS = 3;
const BARY_ALPHA = 0.7;
const BARY_ORDER_ITERS = 12;
const ANCHOR_BLEND = 0.8;

const RISK_RANK = { Safe: 0, Warning: 1, Critical: 2 };
const RISK_EDGE_COLOR = { Safe: '#cbd5e1', Warning: '#f59e0b', Critical: '#ef4444' };

const AREA_TRACK = { OFFSHORE: 0, MAIN: 1, ONSHORE: 2 };

function buildGraph(segments, edges) {
  const nodeIds = segments.map((s) => s.nodeId);
  const n = Math.max(...nodeIds, -1) + 1;
  const inEdges = Array.from({ length: n }, () => []);
  const outEdges = Array.from({ length: n }, () => []);

  for (const edge of edges) {
    if (edge.source === edge.target) continue;
    outEdges[edge.source].push(edge.target);
    inEdges[edge.target].push(edge.source);
  }

  const inlets = [];
  const outlets = [];
  for (let i = 0; i < n; i++) {
    if (inEdges[i].length === 0 && outEdges[i].length > 0) inlets.push(i);
    if (outEdges[i].length === 0 && inEdges[i].length > 0) outlets.push(i);
  }

  if (inlets.length === 0) {
    let minDeg = Infinity;
    for (let i = 0; i < n; i++) minDeg = Math.min(minDeg, inEdges[i].length);
    for (let i = 0; i < n; i++) {
      if (inEdges[i].length === minDeg) inlets.push(i);
    }
  }

  return { n, inEdges, outEdges, inlets, outlets };
}

/** Layer only from primary root — secondary inlets are not forced to layer 0. */
function assignLayersFromRoot(n, edges, rootId = PRIMARY_INLET_NODE) {
  const layer = new Array(n).fill(0);
  const reachable = new Array(n).fill(false);
  reachable[rootId] = true;

  for (let pass = 0; pass < n; pass++) {
    for (const edge of edges) {
      if (edge.source === edge.target) continue;
      if (!reachable[edge.source] && edge.source !== rootId) continue;
      reachable[edge.source] = true;
      reachable[edge.target] = true;
      layer[edge.target] = Math.max(layer[edge.target], layer[edge.source] + 1);
    }
  }

  // Secondary sources (not reachable from root via longest-path init): place via
  // their outgoing targets once those have layers, or leave at computed depth.
  for (let pass = 0; pass < n; pass++) {
    for (const edge of edges) {
      if (edge.source === edge.target) continue;
      layer[edge.target] = Math.max(layer[edge.target], layer[edge.source] + 1);
    }
  }

  // Nodes that are pure secondary inlets (never a target) stay at layer 0 only if
  // they are the primary root; otherwise push them near the earliest neighbor they feed.
  for (let pass = 0; pass < n; pass++) {
    for (const edge of edges) {
      if (edge.source === edge.target) continue;
      if (edge.source === rootId) continue;
      // Soft: if source has only out-edges and layer still 0 while target is deep, set layer = max(0, target-1)
      const hasIncoming = edges.some((e) => e.target === edge.source && e.source !== edge.source);
      if (!hasIncoming && layer[edge.source] === 0 && layer[edge.target] > 1) {
        layer[edge.source] = Math.max(0, layer[edge.target] - 1);
      }
    }
  }

  return layer;
}

function groupByLayer(n, layer) {
  const maxLayer = Math.max(...layer, 0);
  const groups = Array.from({ length: maxLayer + 1 }, () => []);
  for (let i = 0; i < n; i++) groups[layer[i]].push(i);
  for (const g of groups) g.sort((a, b) => a - b);
  return groups;
}

function neighborBarycenter(nodeId, rank, edges, direction) {
  const neighbors = [];
  for (const edge of edges) {
    if (direction === 'in' && edge.target === nodeId) neighbors.push(edge.source);
    if (direction === 'out' && edge.source === nodeId) neighbors.push(edge.target);
  }
  const inLayer = neighbors.filter((id) => rank.get(id) != null);
  if (inLayer.length === 0) return rank.get(nodeId) ?? 0;
  return inLayer.reduce((sum, id) => sum + rank.get(id), 0) / inLayer.length;
}

function orderLayers(groups, edges) {
  const rank = new Map();
  groups.forEach((nodes) => {
    nodes.forEach((id, idx) => rank.set(id, idx));
  });

  for (let iter = 0; iter < BARY_ORDER_ITERS; iter++) {
    for (let L = 1; L < groups.length; L++) {
      groups[L].sort((a, b) => {
        const ba = neighborBarycenter(a, rank, edges, 'in');
        const bb = neighborBarycenter(b, rank, edges, 'in');
        return ba - bb || a - b;
      });
      groups[L].forEach((id, idx) => rank.set(id, idx));
    }
    for (let L = groups.length - 2; L >= 0; L--) {
      groups[L].sort((a, b) => {
        const ba = neighborBarycenter(a, rank, edges, 'out');
        const bb = neighborBarycenter(b, rank, edges, 'out');
        return ba - bb || a - b;
      });
      groups[L].forEach((id, idx) => rank.set(id, idx));
    }
  }

  return groups;
}

function areaTrack(segment) {
  if (!segment) return 1;
  return AREA_TRACK[segment.area] ?? 1;
}

function computeBaseY(segments, n, innerH, padding) {
  const bandH = innerH / AREA_BANDS;
  const byNodeId = new Map(segments.map((s) => [s.nodeId, s]));
  const baseY = new Array(n).fill(padding + innerH / 2);
  for (let i = 0; i < n; i++) {
    const track = areaTrack(byNodeId.get(i));
    baseY[i] = padding + track * bandH + bandH / 2;
  }
  return baseY;
}

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function refineYWithParents(n, edges, inEdges, baseY, y) {
  // Topological-ish forward passes: y*(v) = α·median(y_p) + (1-α)·baseY(v)
  for (let pass = 0; pass < 2; pass++) {
    for (let v = 0; v < n; v++) {
      const parents = inEdges[v];
      if (!parents || parents.length === 0) {
        y[v] = baseY[v];
        continue;
      }
      const parentYs = parents.map((u) => y[u]);
      const med = median(parentYs);
      y[v] = BARY_ALPHA * med + (1 - BARY_ALPHA) * baseY[v];
    }
  }
  return y;
}

function compactLayer(nodes, y, minGap) {
  if (nodes.length === 0) return;
  const sorted = [...nodes].sort((a, b) => y[a] - y[b] || a - b);

  // Forward: enforce min gap from top
  for (let j = 1; j < sorted.length; j++) {
    const prev = sorted[j - 1];
    const cur = sorted[j];
    y[cur] = Math.max(y[cur], y[prev] + minGap);
  }

  // Mirror: pull back from bottom so cluster stays centered
  for (let j = sorted.length - 2; j >= 0; j--) {
    const next = sorted[j + 1];
    const cur = sorted[j];
    y[cur] = Math.min(y[cur], y[next] - minGap);
  }

  // Re-apply forward in case mirror created collisions upward
  for (let j = 1; j < sorted.length; j++) {
    const prev = sorted[j - 1];
    const cur = sorted[j];
    y[cur] = Math.max(y[cur], y[prev] + minGap);
  }
}

function computeDynamicCanvasW(maxLayer, padding = PADDING) {
  return Math.max(CANVAS_W, padding * 2 + maxLayer * LAYER_GAP + 40);
}

function applyTerminalAnchors(y, padding, innerH) {
  const inletTarget = padding + 0.15 * innerH;
  const outletTarget = padding + 0.85 * innerH;
  if (y[PRIMARY_INLET_NODE] != null) {
    y[PRIMARY_INLET_NODE] =
      ANCHOR_BLEND * inletTarget + (1 - ANCHOR_BLEND) * y[PRIMARY_INLET_NODE];
  }
  if (y[PRIMARY_OUTLET_NODE] != null) {
    y[PRIMARY_OUTLET_NODE] =
      ANCHOR_BLEND * outletTarget + (1 - ANCHOR_BLEND) * y[PRIMARY_OUTLET_NODE];
  }
}

function pipelineCoordinateLayout(segments, edges, options = {}) {
  const canvasH = options.canvasH ?? CANVAS_H;
  const padding = options.padding ?? PADDING;

  if (segments.length === 0) {
    return {
      positions: [],
      meta: { inlets: [], outlets: [], canvasW: CANVAS_W, canvasH },
    };
  }

  const { n, inEdges, inlets, outlets } = buildGraph(segments, edges);
  const layer = assignLayersFromRoot(n, edges, PRIMARY_INLET_NODE);
  const maxLayer = Math.max(...layer, 0);
  const canvasW = options.canvasW ?? computeDynamicCanvasW(maxLayer, padding);
  const innerH = canvasH - 2 * padding;

  const groups = orderLayers(groupByLayer(n, layer), edges);
  const baseY = computeBaseY(segments, n, innerH, padding);
  const y = baseY.slice();

  refineYWithParents(n, edges, inEdges, baseY, y);

  for (const nodes of groups) {
    compactLayer(nodes, y, MIN_NODE_GAP);
  }

  applyTerminalAnchors(y, padding, innerH);

  // Re-compact layers after anchors so min-gap still holds
  for (const nodes of groups) {
    compactLayer(nodes, y, MIN_NODE_GAP);
  }

  let yMin = Infinity;
  let yMax = -Infinity;
  for (let i = 0; i < n; i++) {
    yMin = Math.min(yMin, y[i]);
    yMax = Math.max(yMax, y[i]);
  }
  const yRange = Math.max(yMax - yMin, 1e-6);

  const posByNode = new Map();
  for (let i = 0; i < n; i++) {
    posByNode.set(i, {
      x: padding + layer[i] * LAYER_GAP,
      y: padding + ((y[i] - yMin) / yRange) * innerH,
    });
  }

  const positions = segments.map((s) => posByNode.get(s.nodeId) ?? { x: padding, y: padding });

  return {
    positions,
    meta: {
      inlets,
      outlets,
      primaryInlet: PRIMARY_INLET_NODE,
      primaryOutlet: PRIMARY_OUTLET_NODE,
      canvasW,
      canvasH,
      maxLayer,
    },
  };
}

export function hierarchicalLayout(segments, edges, options = {}) {
  return pipelineCoordinateLayout(segments, edges, options);
}

export function edgePath(x1, y1, x2, y2) {
  const mx = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
}

export function edgeRiskColor(sourceClass, targetClass) {
  const rank = Math.max(RISK_RANK[sourceClass] ?? 0, RISK_RANK[targetClass] ?? 0);
  if (rank >= 2) return RISK_EDGE_COLOR.Critical;
  if (rank >= 1) return RISK_EDGE_COLOR.Warning;
  return RISK_EDGE_COLOR.Safe;
}

export function normalizePositions(positions, width, height, pad = 4) {
  if (positions.length === 0) return [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of positions) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const rangeX = Math.max(maxX - minX, 1);
  const rangeY = Math.max(maxY - minY, 1);
  const innerW = width - 2 * pad;
  const innerH = height - 2 * pad;
  return positions.map((p) => ({
    x: pad + ((p.x - minX) / rangeX) * innerW,
    y: pad + ((p.y - minY) / rangeY) * innerH,
  }));
}
