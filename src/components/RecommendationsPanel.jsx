import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SEGMENTS, EDGES } from '@/lib/data';
import { cn } from '@/lib/utils';
import { Download, Filter, ArrowUpRight, Search, Clock } from 'lucide-react';
import { RecommendationDetailModal } from '@/components/RecommendationDetailModal';
import {
  buildActionTickets,
  findTicketForSegment,
  flattenTicketsForCsv,
  priorityOrder,
  slaRank,
} from '@/lib/ticketClustering';

const CSV_COLUMNS = [
  ['ticket_id', 'ticket_id'],
  ['is_root', 'is_root'],
  ['is_residual', 'is_residual'],
  ['id', 'node_id'],
  ['name', 'segment'],
  ['area', 'area'],
  ['predictedClass', 'predicted_class'],
  ['priorityTier', 'priority_tier'],
  ['priorityScore', 'priority_score'],
  ['criticalProb', 'critical_prob'],
  ['recommendedAction', 'recommended_action'],
  ['targetSla', 'target_sla'],
  ['ticket_root', 'ticket_root'],
  ['ticket_tier', 'ticket_tier'],
];

function downloadCsv(rows) {
  const header = CSV_COLUMNS.map(([, h]) => h).join(',');
  const body = rows
    .map((row) =>
      CSV_COLUMNS.map(([k]) => {
        const v = row[k];
        if (v == null) return '';
        const s = typeof v === 'string' ? v.replace(/"/g, '""') : String(v);
        return /[",\n]/.test(s) ? `"${s}"` : s;
      }).join(',')
    )
    .join('\n');

  const csv = `${header}\n${body}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pipelineguard_tickets_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function mainParameter(segment) {
  if (!segment) return 'Parameter';
  const candidates = [
    { label: 'H2S', value: segment.h2sPpm },
    { label: 'Chloride', value: segment.chloridePpm },
    { label: 'Inhibitor', value: segment.inhibitorPpm },
    { label: 'Laju Korosi', value: segment.corrosionRateMmYr },
  ];
  const best = candidates
    .filter((c) => typeof c.value === 'number' && Number.isFinite(c.value))
    .sort((a, b) => b.value - a.value)[0];
  return best?.label ?? 'Parameter';
}

function tierToChipTone(tier) {
  if (tier === 'P1') return 'critical';
  if (tier === 'P2') return 'warning';
  return 'neutral';
}

function memberPreview(members, limit = 3) {
  const names = members.map((m) => m.name);
  if (names.length <= limit) return names.join(', ');
  return `${names.slice(0, limit).join(', ')} +${names.length - limit}`;
}

export const RecommendationsPanel = ({ embeddedInNetwork = false, focusedSegmentId = null, focusTrigger = 0 }) => {
  const [tierFilter, setTierFilter] = useState('ALL');
  const [sortKey, setSortKey] = useState('priority');
  const [visibleCount, setVisibleCount] = useState(20);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const itemRefs = useRef(new Map());

  const allTickets = useMemo(() => buildActionTickets(SEGMENTS, EDGES), []);

  const ticketsSorted = useMemo(() => {
    const filtered =
      tierFilter === 'ALL' ? [...allTickets] : allTickets.filter((t) => t.priorityTier === tierFilter);
    return filtered.sort((a, b) => {
      if (sortKey === 'priority') {
        const p = priorityOrder(a.priorityTier) - priorityOrder(b.priorityTier);
        if (p !== 0) return p;
        return b.priorityScore - a.priorityScore;
      }
      if (sortKey === 'risk') return b.priorityScore - a.priorityScore;
      if (sortKey === 'criticalProb') return b.criticalProb - a.criticalProb;
      if (sortKey === 'sla') return slaRank(a.targetSla) - slaRank(b.targetSla);
      return 0;
    });
  }, [allTickets, tierFilter, sortKey]);

  const visible = ticketsSorted.slice(0, visibleCount);
  const focusedTicket = useMemo(
    () => findTicketForSegment(allTickets, focusedSegmentId),
    [allTickets, focusedSegmentId]
  );

  useEffect(() => {
    if (!focusedTicket || focusTrigger < 1) return;
    setTierFilter((prev) =>
      prev !== 'ALL' && focusedTicket.priorityTier !== prev ? 'ALL' : prev
    );
  }, [focusedTicket, focusTrigger]);

  useEffect(() => {
    if (!focusedTicket || focusTrigger < 1) return;
    const index = ticketsSorted.findIndex((t) => t.id === focusedTicket.id);
    if (index < 0) return;
    setVisibleCount((c) => Math.max(c, index + 1));
  }, [focusedTicket, focusTrigger, ticketsSorted]);

  useEffect(() => {
    if (!focusedTicket || focusTrigger < 1) return;
    const index = ticketsSorted.findIndex((t) => t.id === focusedTicket.id);
    if (index < 0 || index >= visibleCount) return;
    const el = itemRefs.current.get(focusedTicket.id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [focusedTicket, focusTrigger, ticketsSorted, visibleCount]);

  const counts = useMemo(() => {
    const c = { P1: 0, P2: 0, P3: 0 };
    for (const t of allTickets) c[t.priorityTier] = (c[t.priorityTier] ?? 0) + 1;
    return c;
  }, [allTickets]);

  const recommendationActive = allTickets.filter((t) => t.priorityTier === 'P1' || t.priorityTier === 'P2').length;
  const nodesCovered = useMemo(
    () => allTickets.reduce((acc, t) => acc + t.members.length, 0),
    [allTickets]
  );
  const filteredTotal = ticketsSorted.length;
  const exportRows = flattenTicketsForCsv(ticketsSorted);

  const tierChip = [
    { id: 'ALL', label: 'Semua' },
    { id: 'P1', label: 'P1 Kritis' },
    { id: 'P2', label: 'P2 Tinggi' },
    { id: 'P3', label: 'P3 Menengah' },
  ];

  return (
    <div className={cn('space-y-6 animate-in fade-in duration-500', embeddedInNetwork && 'pt-1')}>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <div className="ops-summary-card flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
              <span className="text-blue-700 text-lg font-black">T</span>
            </div>
            <span className="text-[10px] font-bold text-pg-text-soft uppercase tracking-widest">Tiket Aktif</span>
          </div>
          <div className="text-2xl font-black text-pg-text-main">{recommendationActive}</div>
          <div className="text-xs font-semibold text-pg-text-soft">Prioritas P1 &amp; P2</div>
        </div>
        <div className="ops-summary-card flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center">
              <span className="text-red-700 text-lg font-black">P</span>
            </div>
            <span className="text-[10px] font-bold text-pg-text-soft uppercase tracking-widest">Tiket P1</span>
          </div>
          <div className="text-2xl font-black text-pg-text-main">{counts.P1}</div>
          <div className="text-xs font-semibold text-red-600">
            <span className="font-bold">{counts.P1}</span> tiket kritis
          </div>
        </div>
        <div className="ops-summary-card flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
              <span className="text-amber-700 text-lg font-black">2</span>
            </div>
            <span className="text-[10px] font-bold text-pg-text-soft uppercase tracking-widest">Tiket P2</span>
          </div>
          <div className="text-2xl font-black text-pg-text-main">{counts.P2}</div>
          <div className="text-xs font-semibold text-pg-text-soft">{counts.P2} tiket watchlist</div>
        </div>
        <div className="ops-summary-card flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <span className="text-emerald-700 text-lg font-black">N</span>
            </div>
            <span className="text-[10px] font-bold text-pg-text-soft uppercase tracking-widest">Node Tercakup</span>
          </div>
          <div className="text-2xl font-black text-pg-text-main">{nodesCovered}</div>
          <div className="text-xs font-semibold text-pg-text-soft">Dalam {allTickets.length} tiket</div>
        </div>
        <button
          type="button"
          onClick={() => downloadCsv(exportRows)}
          className="ops-summary-card text-left flex flex-col gap-2 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="w-9 h-9 rounded-xl bg-white border border-pg-border flex items-center justify-center">
              <Download className="w-4 h-4 text-pg-text-soft" />
            </div>
            <span className="text-[10px] font-bold text-pg-text-soft uppercase tracking-widest">Ekspor CSV</span>
          </div>
          <div className="text-xs font-semibold text-blue-700">Unduh daftar tiket</div>
          <div className="mt-auto flex items-center gap-2 text-xs font-bold text-blue-600">
            Klik untuk ekspor <ArrowUpRight className="w-4 h-4" />
          </div>
        </button>
      </div>

      <div className="pg-card p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-pg-text-soft" />
              <span className="text-xs font-bold text-pg-text-soft uppercase tracking-wider">Filter Tier</span>
            </div>
            {tierChip.map((chip) => {
              const active = tierFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => {
                    setTierFilter(chip.id);
                    setVisibleCount(20);
                  }}
                  className={cn(
                    'ops-tier-chip',
                    active && 'ops-tier-chip-active',
                    chip.id === 'P1' && !active && 'ops-tier-chip-critical',
                    chip.id === 'P2' && !active && 'ops-tier-chip-warning',
                    chip.id === 'P3' && !active && 'ops-tier-chip-neutral'
                  )}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-3 flex-wrap justify-between lg:justify-end">
            <div className="text-[10px] font-bold text-pg-text-soft bg-white px-3 py-1.5 rounded-full border border-pg-border">
              MENAMPILKAN {Math.min(visibleCount, filteredTotal)} / {filteredTotal}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-pg-text-soft uppercase tracking-wider">Urutkan:</span>
              <select
                value={sortKey}
                onChange={(e) => {
                  setSortKey(e.target.value);
                  setVisibleCount(20);
                }}
                className="text-xs font-semibold bg-white border border-pg-border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500/30 focus:outline-none"
              >
                <option value="priority">Prioritas Tertinggi</option>
                <option value="risk">Skor Risiko Tertinggi</option>
                <option value="criticalProb">Probabilitas Kritis Tertinggi</option>
                <option value="sla">Target SLA Tercepat</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {visible.map((ticket) => {
          const tone = tierToChipTone(ticket.priorityTier);
          const param = mainParameter(ticket.rootSegment);
          const slaFast = slaRank(ticket.targetSla) <= 1;
          const isFocused = focusedTicket?.id === ticket.id;
          return (
            <div
              key={ticket.id}
              ref={(el) => {
                if (el) itemRefs.current.set(ticket.id, el);
                else itemRefs.current.delete(ticket.id);
              }}
              className={cn('ops-list-item group', isFocused && 'ops-list-item-active')}
            >
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    'ops-tier-chip',
                    tone === 'critical' && 'ops-tier-chip-critical',
                    tone === 'warning' && 'ops-tier-chip-warning',
                    tone === 'neutral' && 'ops-tier-chip-neutral'
                  )}
                  style={{ pointerEvents: 'none' }}
                >
                  {ticket.priorityTier}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-pg-text-main font-mono">{ticket.id}</span>
                    {ticket.isResidual && (
                      <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 rounded text-[9px] font-bold text-amber-700 uppercase">
                        Watchlist
                      </span>
                    )}
                    <span className="px-2 py-0.5 bg-blue-50 border border-blue-100 rounded text-[9px] font-bold text-blue-700 uppercase">
                      {ticket.members.length} node
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold text-pg-critical uppercase tracking-wider">ROOT</span>
                    <span className="text-sm font-bold text-pg-text-main">{ticket.rootName}</span>
                    <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[9px] font-bold text-slate-500 uppercase tracking-tighter">
                      {ticket.areaSummary}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[9px] font-bold text-slate-500 uppercase tracking-tighter">
                      Skor {ticket.priorityScore.toFixed(3)}
                    </span>
                    <span className="px-2 py-0.5 bg-red-50 border border-red-100 rounded text-[9px] font-bold text-red-600 uppercase tracking-tighter">
                      Crit {(ticket.criticalProb * 100).toFixed(0)}%
                    </span>
                  </div>
                  {ticket.inspectionNote && (
                    <p className="text-xs text-pg-text-soft font-medium leading-relaxed italic mt-2">
                      "{ticket.inspectionNote}"
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold text-pg-text-soft uppercase tracking-wider">ACTION:</span>
                    <span className="text-xs font-semibold text-pg-text-main">{ticket.recommendedAction}</span>
                  </div>
                  <div className="mt-2 text-xs text-pg-text-soft">
                    <span className="font-bold uppercase tracking-wider text-[10px]">Anggota: </span>
                    {memberPreview(ticket.members)}
                  </div>
                </div>
              </div>
              <div className="flex items-end gap-4 mt-3 md:mt-0 md:justify-between w-full">
                <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-1">
                  <div className="ops-meta-item">
                    <div className="text-[10px] font-bold text-pg-text-soft uppercase tracking-wider">Critical</div>
                    <div className="text-xs font-semibold text-pg-text-main">{ticket.criticalCount}</div>
                  </div>
                  <div className="ops-meta-item">
                    <div className="text-[10px] font-bold text-pg-text-soft uppercase tracking-wider">Warning</div>
                    <div className="text-xs font-semibold text-pg-text-main">{ticket.warningCount}</div>
                  </div>
                  <div className="ops-meta-item col-span-2">
                    <div className="text-[10px] font-bold text-pg-text-soft uppercase tracking-wider">Parameter Utama (Root)</div>
                    <div className="text-xs font-semibold text-pg-text-main">{param}</div>
                  </div>
                </div>
                <div className="text-right min-w-[160px]">
                  <div className="text-[9px] font-bold text-pg-text-soft uppercase tracking-widest flex items-center justify-end gap-2">
                    <Clock className="w-3.5 h-3.5" />
                    TARGET SLA
                  </div>
                  <div className={cn('text-sm font-black mt-1', slaFast ? 'text-pg-critical' : 'text-pg-text-main')}>
                    {ticket.targetSla}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTicket(ticket);
                      setDetailOpen(true);
                    }}
                    className={cn('ops-link-btn', slaFast && 'ops-sla-danger')}
                  >
                    Lihat Detail <span className="ml-1">→</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {visible.length === 0 && (
          <div className="py-20 text-center space-y-4 bg-white rounded-2xl border border-pg-border border-dashed">
            <Search className="w-12 h-12 text-slate-200 mx-auto" />
            <p className="text-pg-text-soft text-sm font-medium">Tidak ada tiket sesuai filter tier Anda.</p>
          </div>
        )}

        {visible.length < filteredTotal && (
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={() => setVisibleCount((v) => v + 20)}
              className="text-xs font-bold text-blue-600 hover:underline px-6 py-2"
            >
              Muat 20 tiket berikutnya
            </button>
          </div>
        )}
      </div>

      <RecommendationDetailModal
        open={detailOpen}
        ticket={selectedTicket}
        onClose={() => {
          setDetailOpen(false);
          setSelectedTicket(null);
        }}
      />
    </div>
  );
};
