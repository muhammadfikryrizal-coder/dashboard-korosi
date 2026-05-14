import React, { useMemo, useState } from 'react';
import { Hero } from '@/components/Hero';
import { SEGMENTS } from '@/lib/data';
import { cn } from '@/lib/utils';
import { Filter, Download, ArrowUpRight, Search } from 'lucide-react';

const CSV_COLUMNS = [
  ['id', 'node_id'],
  ['name', 'segment'],
  ['area', 'area'],
  ['predictedClass', 'predicted_class'],
  ['priorityTier', 'priority_tier'],
  ['priorityScore', 'priority_score'],
  ['criticalProb', 'critical_prob'],
  ['recommendedAction', 'recommended_action'],
  ['targetSla', 'target_sla'],
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
  a.download = `pipelineguard_recommendations_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const Recommendations = () => {
  const [areaFilter, setAreaFilter] = useState('ALL');
  const [tierFilter, setTierFilter] = useState('ALL');
  const [visibleCount, setVisibleCount] = useState(20);

  const filteredSegments = useMemo(
    () =>
      SEGMENTS.filter((s) => {
        const areaMatch = areaFilter === 'ALL' || s.area === areaFilter;
        const tierMatch = tierFilter === 'ALL' || s.priorityTier === tierFilter;
        return areaMatch && tierMatch;
      }).sort((a, b) => b.priorityScore - a.priorityScore),
    [areaFilter, tierFilter]
  );

  const visible = filteredSegments.slice(0, visibleCount);
  const areas = useMemo(() => Array.from(new Set(SEGMENTS.map((s) => s.area))), []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Hero
        title="Rekomendasi Operasional"
        subtitle="Gunakan filter area dan tier untuk menghasilkan rencana tindakan inspeksi yang paling berdampak berdasarkan prioritas risiko."
      />

      <div className="pg-card flex flex-wrap items-center gap-4 bg-pg-surface-soft/50 py-4">
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-pg-text-soft" />
          <span className="text-xs font-bold text-pg-text-soft uppercase tracking-wider">Filter:</span>
        </div>

        <select
          value={areaFilter}
          onChange={(e) => {
            setAreaFilter(e.target.value);
            setVisibleCount(20);
          }}
          className="text-xs font-semibold bg-white border border-pg-border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          <option value="ALL">Semua Area</option>
          {areas.map((area) => (
            <option key={area} value={area}>
              {area}
            </option>
          ))}
        </select>

        <select
          value={tierFilter}
          onChange={(e) => {
            setTierFilter(e.target.value);
            setVisibleCount(20);
          }}
          className="text-xs font-semibold bg-white border border-pg-border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          <option value="ALL">Semua Tier</option>
          <option value="P1">Tier P1 (Kritis)</option>
          <option value="P2">Tier P2 (Peringatan)</option>
          <option value="P3">Tier P3 (Rutin)</option>
        </select>

        <div className="flex-1" />

        <div className="text-[10px] font-bold text-pg-text-soft bg-white px-3 py-1.5 rounded-full border border-pg-border">
          {filteredSegments.length} SEGMEN COCOK
        </div>

        <button
          onClick={() => downloadCsv(filteredSegments)}
          className="flex items-center gap-2 px-4 py-2 bg-[#0d1b2a] text-white rounded-lg text-xs font-bold hover:bg-[#1b263b] transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Ekspor CSV
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {visible.map((segment) => (
          <div
            key={segment.id}
            className="pg-card flex flex-col md:flex-row items-start md:items-center gap-6 group hover:border-pg-warning/50"
          >
            <div className="flex-shrink-0 flex items-center justify-center w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl">
              <span
                className={cn(
                  'text-lg font-black',
                  segment.priorityTier === 'P1'
                    ? 'text-pg-critical'
                    : segment.priorityTier === 'P2'
                    ? 'text-pg-warning'
                    : 'text-pg-text-soft'
                )}
              >
                {segment.priorityTier}
              </span>
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h4 className="text-sm font-bold text-pg-text-main">{segment.name}</h4>
                <div className="px-2 py-0.5 bg-slate-100 rounded text-[9px] font-bold text-slate-500 uppercase tracking-tighter">
                  {segment.area}
                </div>
                <div className="px-2 py-0.5 bg-slate-100 rounded text-[9px] font-bold text-slate-500 uppercase tracking-tighter">
                  Skor {segment.priorityScore.toFixed(3)}
                </div>
                <div className="px-2 py-0.5 bg-red-50 text-red-600 rounded text-[9px] font-bold uppercase tracking-tighter">
                  Crit {(segment.criticalProb * 100).toFixed(0)}%
                </div>
              </div>
              {segment.inspectionNote && (
                <p className="text-xs text-pg-text-soft font-medium leading-relaxed italic">
                  "{segment.inspectionNote}"
                </p>
              )}
              <div className="pt-2 flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-pg-critical" />
                  <span className="text-[10px] font-bold text-pg-text-soft uppercase">Action:</span>
                  <span className="text-[11px] font-semibold text-pg-text-main">{segment.recommendedAction}</span>
                </div>
              </div>
            </div>

            <div className="w-full md:w-auto flex md:flex-col items-center md:items-end justify-between gap-2 border-t md:border-t-0 md:border-l border-pg-border pt-4 md:pt-0 md:pl-6">
              <div className="text-right">
                <p className="text-[9px] font-bold text-pg-text-soft uppercase tracking-widest mb-0.5">Target SLA</p>
                <p className="text-sm font-black text-pg-text-main">{segment.targetSla}</p>
              </div>
              <button className="p-2 rounded-lg bg-pg-surface-soft text-blue-600 hover:bg-blue-600 hover:text-white transition-all">
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {visible.length < filteredSegments.length && (
          <div className="flex justify-center">
            <button
              onClick={() => setVisibleCount((v) => v + 20)}
              className="text-xs font-bold text-blue-600 hover:underline px-4 py-2"
            >
              Muat 20 rekomendasi berikutnya
            </button>
          </div>
        )}

        {filteredSegments.length === 0 && (
          <div className="py-20 text-center space-y-4 bg-white rounded-2xl border border-pg-border border-dashed">
            <Search className="w-12 h-12 text-slate-200 mx-auto" />
            <p className="text-pg-text-soft text-sm font-medium">Tidak ada segmen yang cocok dengan kriteria filter Anda.</p>
          </div>
        )}
      </div>
    </div>
  );
};
