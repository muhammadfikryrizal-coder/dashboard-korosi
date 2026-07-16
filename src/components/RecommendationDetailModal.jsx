import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const CLASS_LABEL = { Safe: 'Aman', Warning: 'Peringatan', Critical: 'Kritis' };

export const RecommendationDetailModal = ({ open, onClose, ticket }) => {
  const [selectedMemberId, setSelectedMemberId] = useState(null);

  useEffect(() => {
    setSelectedMemberId(ticket?.rootNodeId ?? null);
  }, [ticket?.id, ticket?.rootNodeId]);

  if (!ticket) return null;

  const root = ticket.rootSegment ?? ticket.members.find((m) => m.nodeId === ticket.rootNodeId);
  const activeMember =
    ticket.members.find((m) => m.nodeId === selectedMemberId) ?? root ?? ticket.members[0];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-[60]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 18 }}
            transition={{ duration: 0.2 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl z-[70] border border-pg-border"
            role="dialog"
            aria-modal="true"
            aria-labelledby="recommendation-detail-title"
          >
            <div className="sticky top-0 bg-white border-b border-pg-border px-6 py-4 flex items-start justify-between gap-3 rounded-t-2xl z-10">
              <div className="min-w-0">
                <h2
                  id="recommendation-detail-title"
                  className="text-lg font-extrabold text-pg-text-main"
                >
                  Detail Tiket {ticket.id}
                </h2>
                <p className="text-sm text-pg-text-soft mt-1">
                  <span className="font-mono font-bold text-pg-text-main">{ticket.rootName}</span>
                  {' · '}
                  {ticket.areaSummary}
                  {' · '}
                  {ticket.members.length} node
                  {ticket.isResidual ? ' · Watchlist' : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg text-pg-text-soft hover:bg-pg-surface-soft hover:text-pg-text-main transition-colors"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border border-pg-border rounded-xl p-4 bg-pg-surface-soft">
                  <p className="text-[10px] font-bold text-pg-text-soft uppercase tracking-wider mb-2">
                    Prioritas Tiket
                  </p>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'ops-pill',
                        ticket.priorityTier === 'P1'
                          ? 'pill-critical'
                          : ticket.priorityTier === 'P2'
                            ? 'pill-warning'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                      )}
                    >
                      {ticket.priorityTier}
                    </span>
                    <span className="text-xs font-semibold text-pg-text-soft">
                      Risk score:{' '}
                      <span className="text-pg-text-main">{ticket.priorityScore.toFixed(3)}</span>
                    </span>
                  </div>
                  {ticket.targetSla && (
                    <p className="mt-3 text-sm font-bold text-pg-text-main">
                      Target SLA:{' '}
                      <span className="text-pg-text-soft font-semibold">{ticket.targetSla}</span>
                    </p>
                  )}
                  <p className="mt-2 text-xs text-pg-text-soft">
                    Critical {ticket.criticalCount} · Warning {ticket.warningCount}
                  </p>
                </div>

                <div className="border border-red-100 rounded-xl p-4 bg-red-50/60">
                  <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider mb-2">
                    Root Cause
                  </p>
                  <p className="text-base font-extrabold text-pg-text-main font-mono">{ticket.rootName}</p>
                  <p className="text-xs text-pg-text-soft mt-1">
                    {CLASS_LABEL[root?.predictedClass] ?? root?.predictedClass} ·{' '}
                    {root?.area} · Skor {(root?.priorityScore ?? 0).toFixed(3)}
                  </p>
                  <p className="text-xs text-pg-text-soft mt-2 leading-relaxed">
                    Node paling upstream dalam klaster Critical (tie-break skor prioritas).
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-[10px] font-bold text-pg-text-soft uppercase tracking-wider">
                  Anggota Tiket
                </h3>
                <div className="border border-pg-border rounded-xl overflow-hidden divide-y divide-pg-border">
                  {ticket.members
                    .slice()
                    .sort((a, b) => {
                      if (a.nodeId === ticket.rootNodeId) return -1;
                      if (b.nodeId === ticket.rootNodeId) return 1;
                      if (a.predictedClass === 'Critical' && b.predictedClass !== 'Critical') return -1;
                      if (b.predictedClass === 'Critical' && a.predictedClass !== 'Critical') return 1;
                      return b.priorityScore - a.priorityScore;
                    })
                    .map((m) => {
                      const isRoot = m.nodeId === ticket.rootNodeId;
                      const isActive = activeMember?.nodeId === m.nodeId;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setSelectedMemberId(m.nodeId)}
                          className={cn(
                            'w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-pg-surface-soft transition-colors',
                            isActive && 'bg-blue-50/70'
                          )}
                        >
                          <span
                            className={cn(
                              'ops-pill shrink-0',
                              m.predictedClass === 'Critical'
                                ? 'pill-critical'
                                : m.predictedClass === 'Warning'
                                  ? 'pill-warning'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                            )}
                          >
                            {CLASS_LABEL[m.predictedClass] ?? m.predictedClass}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-pg-text-main font-mono">{m.name}</span>
                              {isRoot && (
                                <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-red-100 text-red-700 border border-red-200">
                                  Root Cause
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-pg-text-soft mt-0.5">
                              {m.area} · Skor {m.priorityScore.toFixed(3)} · Crit{' '}
                              {((m.criticalProb ?? 0) * 100).toFixed(0)}%
                            </div>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>

              {activeMember && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="border border-pg-border rounded-xl p-4 bg-pg-surface-soft">
                      <p className="text-[10px] font-bold text-pg-text-soft uppercase tracking-wider mb-2">
                        Probabilitas — {activeMember.name}
                      </p>
                      <div className="space-y-2">
                        <ProbRow label="Aman" value={activeMember.safeProb} />
                        <ProbRow label="Peringatan" value={activeMember.warningProb} tone="amber" />
                        <ProbRow label="Kritis" value={activeMember.criticalProb} tone="red" />
                      </div>
                    </div>
                    <div className="border border-pg-border rounded-xl p-4 bg-white">
                      <div className="flex items-center gap-2 mb-2">
                        <Info className="w-4 h-4 text-blue-500" />
                        <h4 className="text-xs font-bold text-pg-text-main uppercase tracking-wider">
                          Catatan Inspeksi
                        </h4>
                      </div>
                      <p className="text-sm text-pg-text-soft leading-relaxed">
                        {activeMember.inspectionNote || '—'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-[10px] font-bold text-pg-text-soft uppercase tracking-wider">
                      Parameter Ringkas — {activeMember.name}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <MetaRow label="Temperatur" value={`${activeMember.tempAvg?.toFixed(2) ?? '—'} °C`} />
                      <MetaRow label="Tekanan" value={`${activeMember.pressAvg?.toFixed(2) ?? '—'} bar`} />
                      <MetaRow label="pH cairan" value={`${activeMember.phLevel?.toFixed(2) ?? '—'}`} />
                      <MetaRow label="H2S" value={`${activeMember.h2sPpm?.toFixed(1) ?? '—'} ppm`} />
                      <MetaRow label="Chloride" value={`${activeMember.chloridePpm?.toFixed(0) ?? '—'} ppm`} />
                      <MetaRow label="Inhibitor" value={`${activeMember.inhibitorPpm?.toFixed(1) ?? '—'} ppm`} />
                      <MetaRow
                        label="Laju Korosi"
                        value={`${activeMember.corrosionRateMmYr?.toFixed(3) ?? '—'} mm/yr`}
                      />
                      <MetaRow
                        label="Loss Ketebalan"
                        value={`${activeMember.thicknessLossPct?.toFixed(2) ?? '—'} %`}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="border border-pg-border rounded-xl p-4 bg-amber-50">
                <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">
                  Rekomendasi Tindakan (dari Root)
                </h4>
                <p className="text-sm text-pg-text-main leading-relaxed font-semibold">
                  {ticket.recommendedAction || '—'}
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-[#102a43] text-white text-sm font-bold hover:bg-[#1a3a5c] transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

function MetaRow({ label, value }) {
  return (
    <div className="flex flex-col gap-1 p-2 rounded-lg bg-pg-surface-soft border border-pg-border/50">
      <span className="text-[10px] font-bold text-pg-text-soft uppercase tracking-wider">{label}</span>
      <span className="text-sm font-semibold text-pg-text-main">{value}</span>
    </div>
  );
}

function ProbRow({ label, value, tone }) {
  const v = Math.max(0, Math.min(1, value ?? 0));
  const bar =
    tone === 'red' ? 'bg-red-500' : tone === 'amber' ? 'bg-amber-500' : 'bg-green-500';
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-pg-text-soft w-[84px] shrink-0">{label}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
        <div className={cn('h-2 rounded-full', bar)} style={{ width: `${v * 100}%` }} />
      </div>
      <span className="text-xs font-mono text-pg-text-soft w-14 text-right">{(v * 100).toFixed(0)}%</span>
    </div>
  );
}
