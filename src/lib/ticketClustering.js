/**
 * Critical Seed Clustering with Limited Risk Contagion
 *
 * 1. Seeds = Critical nodes
 * 2. Partition = connected components on Critical–Critical edges only
 * 3. Expand Warning nodes within 1 hop (exclusive assignment)
 * 4. Residual Warning → singleton tickets
 * 5. Root = most upstream Critical (min layer), tie-break priorityScore
 */

const PRIMARY_INLET = 0;

function priorityOrder(tier) {
  if (tier === 'P1') return 1;
  if (tier === 'P2') return 2;
  return 3;
}

function slaRank(targetSla) {
  if (!targetSla) return Number.POSITIVE_INFINITY;
  if (targetSla.includes('jam')) return 1;
  if (targetSla.includes('7 hari')) return 7;
  if (targetSla.includes('30 hari')) return 30;
  return Number.POSITIVE_INFINITY;
}

function computeLayers(segments, edges, rootId = PRIMARY_INLET) {
  const n = Math.max(...segments.map((s) => s.nodeId), -1) + 1;
  const layer = new Array(n).fill(0);
  for (let pass = 0; pass < n; pass++) {
    for (const edge of edges) {
      if (edge.source === edge.target) continue;
      layer[edge.target] = Math.max(layer[edge.target], layer[edge.source] + 1);
    }
  }
  // Ensure root is 0; secondary inlets may sit at 0 until soft-adjusted
  layer[rootId] = 0;
  return layer;
}

function buildUndirectedAdj(nodeIds, edges, filterFn) {
  const set = new Set(nodeIds);
  const adj = new Map(nodeIds.map((id) => [id, []]));
  for (const edge of edges) {
    if (edge.source === edge.target) continue;
    if (!set.has(edge.source) || !set.has(edge.target)) continue;
    if (filterFn && !filterFn(edge.source, edge.target)) continue;
    adj.get(edge.source).push(edge.target);
    adj.get(edge.target).push(edge.source);
  }
  return adj;
}

function connectedComponents(nodeIds, adj) {
  const seen = new Set();
  const comps = [];
  for (const id of nodeIds) {
    if (seen.has(id)) continue;
    const stack = [id];
    const comp = [];
    seen.add(id);
    while (stack.length) {
      const u = stack.pop();
      comp.push(u);
      for (const v of adj.get(u) || []) {
        if (!seen.has(v)) {
          seen.add(v);
          stack.push(v);
        }
      }
    }
    comps.push(comp);
  }
  return comps;
}

function buildFullAdj(segments, edges) {
  const adj = new Map(segments.map((s) => [s.nodeId, []]));
  for (const edge of edges) {
    if (edge.source === edge.target) continue;
    if (!adj.has(edge.source) || !adj.has(edge.target)) continue;
    adj.get(edge.source).push(edge.target);
    adj.get(edge.target).push(edge.source);
  }
  return adj;
}

function pickRoot(criticalMembers, byNodeId, layer) {
  return [...criticalMembers].sort((a, b) => {
    const la = layer[a] ?? 0;
    const lb = layer[b] ?? 0;
    if (la !== lb) return la - lb;
    return (byNodeId.get(b)?.priorityScore ?? 0) - (byNodeId.get(a)?.priorityScore ?? 0);
  })[0];
}

function worstTier(members) {
  return members.reduce((best, s) => (priorityOrder(s.priorityTier) < priorityOrder(best) ? s.priorityTier : best), members[0]?.priorityTier ?? 'P3');
}

function tightestSla(members) {
  return [...members].sort((a, b) => slaRank(a.targetSla) - slaRank(b.targetSla))[0]?.targetSla ?? '';
}

function majorityArea(members, fallback) {
  const counts = {};
  for (const m of members) counts[m.area] = (counts[m.area] ?? 0) + 1;
  let best = fallback;
  let bestN = -1;
  for (const [area, n] of Object.entries(counts)) {
    if (n > bestN) {
      bestN = n;
      best = area;
    }
  }
  return best;
}

function makeTicket({ id, memberIds, byNodeId, layer, isResidual = false }) {
  const members = memberIds.map((nid) => byNodeId.get(nid)).filter(Boolean);
  if (members.length === 0) return null;

  const criticalMembers = members.filter((m) => m.predictedClass === 'Critical').map((m) => m.nodeId);
  let rootNodeId;
  if (criticalMembers.length > 0) {
    rootNodeId = pickRoot(criticalMembers, byNodeId, layer);
  } else {
    rootNodeId = [...members].sort((a, b) => b.priorityScore - a.priorityScore)[0].nodeId;
  }

  const root = byNodeId.get(rootNodeId);
  const priorityScore = Math.max(...members.map((m) => m.priorityScore ?? 0));
  const criticalProb = Math.max(...members.map((m) => m.criticalProb ?? 0));

  return {
    id,
    rootNodeId,
    rootName: root?.name ?? `N${rootNodeId}`,
    rootSegment: root,
    memberNodeIds: memberIds,
    members,
    priorityTier: worstTier(members),
    priorityScore,
    criticalProb,
    targetSla: tightestSla(members),
    recommendedAction: root?.recommendedAction ?? members[0]?.recommendedAction ?? '',
    inspectionNote: root?.inspectionNote ?? '',
    areaSummary: majorityArea(members, root?.area ?? ''),
    criticalCount: members.filter((m) => m.predictedClass === 'Critical').length,
    warningCount: members.filter((m) => m.predictedClass === 'Warning').length,
    isResidual,
  };
}

/**
 * @param {Array} segments
 * @param {Array} edges
 * @returns {Array} tickets sorted by priority then score
 */
export function buildActionTickets(segments, edges) {
  if (!segments?.length) return [];

  const byNodeId = new Map(segments.map((s) => [s.nodeId, s]));
  const layer = computeLayers(segments, edges);
  const fullAdj = buildFullAdj(segments, edges);

  const criticalIds = segments.filter((s) => s.predictedClass === 'Critical').map((s) => s.nodeId);
  const warningIds = segments.filter((s) => s.predictedClass === 'Warning').map((s) => s.nodeId);

  const critAdj = buildUndirectedAdj(criticalIds, edges);
  const critComps = connectedComponents(criticalIds, critAdj);

  // Cluster state: array of Sets of nodeIds (start with critical comps)
  const clusters = critComps.map((comp) => new Set(comp));
  const maxScore = clusters.map((c) =>
    Math.max(...[...c].map((id) => byNodeId.get(id)?.priorityScore ?? 0))
  );

  const assignedWarning = new Set();

  // Exclusive hop-1 assignment for Warning nodes
  for (const w of warningIds) {
    const candidates = [];
    for (let i = 0; i < clusters.length; i++) {
      const critInCluster = [...clusters[i]].filter(
        (id) => byNodeId.get(id)?.predictedClass === 'Critical'
      );
      const hop1 = critInCluster.some((c) => (fullAdj.get(c) || []).includes(w));
      if (hop1) candidates.push(i);
    }

    if (candidates.length === 0) continue;

    candidates.sort((a, b) => maxScore[b] - maxScore[a]);
    const chosen = candidates[0];
    clusters[chosen].add(w);
    assignedWarning.add(w);
  }

  const tickets = [];
  let ticketIdx = 1;

  for (const cluster of clusters) {
    const ticket = makeTicket({
      id: `TKT-${String(ticketIdx).padStart(3, '0')}`,
      memberIds: [...cluster],
      byNodeId,
      layer,
      isResidual: false,
    });
    if (ticket) {
      tickets.push(ticket);
      ticketIdx += 1;
    }
  }

  // Residual warnings as singleton tickets
  for (const w of warningIds) {
    if (assignedWarning.has(w)) continue;
    const ticket = makeTicket({
      id: `TKT-${String(ticketIdx).padStart(3, '0')}`,
      memberIds: [w],
      byNodeId,
      layer,
      isResidual: true,
    });
    if (ticket) {
      tickets.push(ticket);
      ticketIdx += 1;
    }
  }

  tickets.sort((a, b) => {
    const p = priorityOrder(a.priorityTier) - priorityOrder(b.priorityTier);
    if (p !== 0) return p;
    return b.priorityScore - a.priorityScore;
  });

  // Re-number after sort for stable display order
  tickets.forEach((t, i) => {
    t.id = `TKT-${String(i + 1).padStart(3, '0')}`;
  });

  return tickets;
}

/** Find ticket containing a segment id (string) or nodeId */
export function findTicketForSegment(tickets, segmentId) {
  if (!segmentId || !tickets?.length) return null;
  return (
    tickets.find((t) =>
      t.members.some((m) => m.id === segmentId || String(m.nodeId) === String(segmentId))
    ) ?? null
  );
}

export function flattenTicketsForCsv(tickets) {
  const rows = [];
  for (const t of tickets) {
    for (const m of t.members) {
      rows.push({
        ticket_id: t.id,
        is_root: m.nodeId === t.rootNodeId ? 'yes' : 'no',
        is_residual: t.isResidual ? 'yes' : 'no',
        id: m.id,
        name: m.name,
        area: m.area,
        predictedClass: m.predictedClass,
        priorityTier: m.priorityTier,
        priorityScore: m.priorityScore,
        criticalProb: m.criticalProb,
        recommendedAction: t.recommendedAction,
        targetSla: t.targetSla,
        ticket_root: t.rootName,
        ticket_tier: t.priorityTier,
      });
    }
  }
  return rows;
}

export { priorityOrder, slaRank };
