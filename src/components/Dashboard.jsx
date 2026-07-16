import React, { useMemo, useState } from 'react';
import { SEGMENTS } from '@/lib/data';
import { cn } from '@/lib/utils';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { FeatureBoxPlot } from '@/components/FeatureBoxPlot';
import { SegmentDetailModal } from '@/components/SegmentDetailModal';
import {
  PieChart as PieChartIcon,
  ShieldCheck,
  AlertTriangle,
  Package,
  Activity,
  Info,
  Eye,
  MoreVertical,
} from 'lucide-react';

const CLASS_ORDER = ['Safe', 'Warning', 'Critical'];
const CLASS_LABEL = { Safe: 'Aman', Warning: 'Peringatan', Critical: 'Kritis' };
const CLASS_COLOR = { Safe: '#22c55e', Warning: '#f59e0b', Critical: '#ef4444' };

const FILTER_OPTIONS = [
  { id: 'all', label: 'Semua' },
  { id: 'Safe', label: 'Aman' },
  { id: 'Warning', label: 'Peringatan' },
  { id: 'Critical', label: 'Kritis' },
];

const DIAG_FEATURES = [
  { key: 'pressAvg', label: 'Tekanan rata-rata (bar)' },
  { key: 'phLevel', label: 'pH cairan' },
  { key: 'h2sPpm', label: 'H2S (ppm)' },
  { key: 'pco2Psi', label: 'pCO2 (psi)' },
  { key: 'corrosionRateMmYr', label: 'Laju korosi (mm/yr)' },
];

const ALL_SEGMENTS = SEGMENTS;
const TOTAL_ALL = ALL_SEGMENTS.length;
const SAFE_ALL = ALL_SEGMENTS.filter((s) => s.predictedClass === 'Safe').length;
const WARNING_ALL = ALL_SEGMENTS.filter((s) => s.predictedClass === 'Warning').length;
const CRITICAL_ALL = ALL_SEGMENTS.filter((s) => s.predictedClass === 'Critical').length;
const AVG_ALL = ALL_SEGMENTS.reduce((acc, s) => acc + s.priorityScore, 0) / TOTAL_ALL;

const pct = (n) => ((n / TOTAL_ALL) * 100).toFixed(1);

export const Dashboard = ({ searchQuery = '' }) => {
  const [classFilter, setClassFilter] = useState('all');
  const [feature, setFeature] = useState(DIAG_FEATURES[0].key);
  const [showAllRows, setShowAllRows] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = useMemo(() => {
    let rows = ALL_SEGMENTS;
    if (classFilter !== 'all') {
      rows = rows.filter((s) => s.predictedClass === classFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter(
        (s) =>
          s.name?.toLowerCase().includes(q) ||
          s.nodeId?.toLowerCase().includes(q) ||
          s.area?.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [classFilter, searchQuery]);

  const safeCount = filtered.filter((s) => s.predictedClass === 'Safe').length;
  const warningCount = filtered.filter((s) => s.predictedClass === 'Warning').length;
  const criticalCount = filtered.filter((s) => s.predictedClass === 'Critical').length;

  const classDist = CLASS_ORDER.map((c) => ({
    name: CLASS_LABEL[c],
    rawClass: c,
    value: c === 'Safe' ? safeCount : c === 'Warning' ? warningCount : criticalCount,
    color: CLASS_COLOR[c],
    pct: filtered.length ? ((c === 'Safe' ? safeCount : c === 'Warning' ? warningCount : criticalCount) / filtered.length) * 100 : 0,
  }));

  const majorityMessage = useMemo(() => {
    const max = Math.max(safeCount, warningCount, criticalCount);
    if (safeCount === max) return 'Mayoritas segmen berada dalam kondisi aman.';
    if (warningCount === max) return 'Perhatian: banyak segmen dalam status peringatan.';
    return 'Peringatan: segmen kritis memerlukan tindakan segera.';
  }, [safeCount, warningCount, criticalCount]);

  const featureLabel = DIAG_FEATURES.find((f) => f.key === feature)?.label ?? feature;

  const tableRows = useMemo(
    () => [...filtered].sort((a, b) => b.priorityScore - a.priorityScore),
    [filtered]
  );

  const visibleRows = showAllRows ? tableRows : tableRows.slice(0, 15);

  const openDetail = (segment) => {
    setSelectedSegment(segment);
    setModalOpen(true);
  };

  const kpiCards = [
    {
      label: 'Total Segmen',
      value: TOTAL_ALL,
      sub: '100% dari keseluruhan',
      icon: PieChartIcon,
      iconBg: 'bg-blue-50',
      iconColor: 'text-pg-accent',
    },
    {
      label: 'Segmen Aman',
      value: SAFE_ALL,
      sub: `${pct(SAFE_ALL)}%`,
      subColor: 'text-pg-safe',
      icon: ShieldCheck,
      iconBg: 'bg-green-50',
      iconColor: 'text-green-700',
    },
    {
      label: 'Segmen Peringatan',
      value: WARNING_ALL,
      sub: `${pct(WARNING_ALL)}%`,
      subColor: 'text-pg-warning',
      icon: AlertTriangle,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-700',
    },
    {
      label: 'Segmen Kritis',
      value: CRITICAL_ALL,
      sub: `${pct(CRITICAL_ALL)}%`,
      subColor: 'text-pg-critical',
      icon: Package,
      iconBg: 'bg-red-50',
      iconColor: 'text-red-700',
    },
    {
      label: 'Rata-rata Skor Risiko',
      value: AVG_ALL.toFixed(3),
      sub: 'Skor prioritas agregat',
      icon: Activity,
      iconBg: 'bg-slate-100',
      iconColor: 'text-pg-text-main',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs font-semibold text-pg-text-soft mr-1">
          Kelas prediksi
        </span>
        {FILTER_OPTIONS.map((opt) => {
          const active = classFilter === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                setClassFilter(opt.id);
                setShowAllRows(false);
              }}
              className={cn(
                'pg-filter-pill',
                active && 'pg-filter-pill-active',
                !active && opt.id === 'Safe' && 'pg-filter-pill-safe',
                !active && opt.id === 'Warning' && 'pg-filter-pill-warning',
                !active && opt.id === 'Critical' && 'pg-filter-pill-critical'
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpiCards.map((card) => (
          <div key={card.label} className="pg-kpi-card">
            <div className={cn('pg-kpi-icon', card.iconBg)}>
              <card.icon className={cn('w-5 h-5', card.iconColor)} />
            </div>
            <p className="text-xs font-semibold text-pg-text-soft mb-1 mt-3">
              {card.label}
            </p>
            <p className="text-3xl font-black text-pg-text-main">{card.value}</p>
            <p className={cn('text-xs font-semibold mt-1', card.subColor ?? 'text-pg-text-soft')}>
              {card.sub}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="pg-card">
          <h3 className="text-sm font-bold text-pg-text-main mb-4">
            Distribusi Kelas Prediksi
          </h3>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="h-52 w-full sm:w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={classDist}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                  >
                    {classDist.map((entry) => (
                      <Cell key={entry.rawClass} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #d9e2ec',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-3 w-full sm:w-auto">
              {classDist.map((entry) => (
                <div key={entry.rawClass} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-sm font-semibold text-pg-text-main">{entry.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-pg-text-main">{entry.value}</span>
                    <span className="text-xs text-pg-text-soft ml-2">
                      ({entry.pct.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="pg-info-banner mt-4">
            <Info className="w-4 h-4 text-pg-accent shrink-0" />
            <span>{majorityMessage}</span>
          </div>
        </div>

        <div className="pg-card">
          <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-pg-text-main">
              Distribusi Skor Risiko per Kelas
            </h3>
            <select
              value={feature}
              onChange={(e) => setFeature(e.target.value)}
              className="text-[11px] font-semibold bg-white border border-pg-border rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-pg-accent/30 focus:outline-none"
            >
              {DIAG_FEATURES.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <FeatureBoxPlot
            segments={filtered}
            featureKey={feature}
            featureLabel={featureLabel}
            classOrder={CLASS_ORDER}
            classLabel={CLASS_LABEL}
            classColor={CLASS_COLOR}
          />
        </div>
      </div>

      <div className="pg-card overflow-hidden p-0">
        <div className="p-6 border-b border-pg-border flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-sm font-bold text-pg-text-main">Ringkasan Risiko per Segmen</h3>
            <p className="text-xs text-pg-text-soft mt-0.5">
              Daftar segmen dengan risiko tertinggi
            </p>
          </div>
          {!showAllRows && tableRows.length > 15 && (
            <button
              type="button"
              onClick={() => setShowAllRows(true)}
              className="text-xs font-bold text-pg-accent hover:underline whitespace-nowrap"
            >
              Lihat Semua Segmen →
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#f8fbff] text-[10px] font-extrabold text-pg-text-soft uppercase tracking-wider">
                <th className="px-6 py-4">ID Node</th>
                <th className="px-6 py-4">Lokasi</th>
                <th className="px-6 py-4">Kelas Prediksi</th>
                <th className="px-6 py-4">Prob. Aman</th>
                <th className="px-6 py-4">Prob. Kritis</th>
                <th className="px-6 py-4">Skor Risiko</th>
                <th className="px-6 py-4">Prioritas</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pg-border">
              {visibleRows.map((segment) => (
                <tr key={segment.id} className="hover:bg-blue-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-mono text-xs font-bold text-pg-text-main">
                      {segment.name}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-pg-text-soft font-medium uppercase">
                      {segment.area}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        'ops-pill',
                        segment.predictedClass === 'Critical'
                          ? 'pill-critical'
                          : segment.predictedClass === 'Warning'
                          ? 'pill-warning'
                          : 'pill-safe'
                      )}
                    >
                      {CLASS_LABEL[segment.predictedClass]}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <div className="flex-1 bg-slate-100 rounded-full h-1.5 max-w-[60px] overflow-hidden">
                        <div
                          className="bg-green-500 h-1.5 rounded-full"
                          style={{ width: `${segment.safeProb * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-pg-text-soft">
                        {(segment.safeProb * 100).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <div className="flex-1 bg-slate-100 rounded-full h-1.5 max-w-[60px] overflow-hidden">
                        <div
                          className="bg-red-500 h-1.5 rounded-full"
                          style={{ width: `${segment.criticalProb * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-pg-text-soft">
                        {(segment.criticalProb * 100).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs font-bold bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
                      {segment.priorityScore.toFixed(3)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        'ops-pill text-[10px] font-bold',
                        segment.priorityTier === 'P1'
                          ? 'pill-critical'
                          : segment.priorityTier === 'P2'
                          ? 'pill-warning'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      )}
                    >
                      {segment.priorityTier}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openDetail(segment)}
                        className="pg-table-action"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Detail
                      </button>
                      <button
                        type="button"
                        className="p-1.5 rounded-lg text-pg-text-soft hover:bg-pg-surface-soft hover:text-pg-text-main transition-colors"
                        aria-label="Opsi lainnya"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visibleRows.length === 0 && (
            <div className="p-8 text-center text-sm text-pg-text-soft">
              Tidak ada segmen yang cocok dengan filter.
            </div>
          )}
        </div>
      </div>

      <SegmentDetailModal
        segment={selectedSegment}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedSegment(null);
        }}
      />
    </div>
  );
};
