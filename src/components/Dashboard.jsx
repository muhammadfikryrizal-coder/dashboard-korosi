import React, { useMemo, useState } from 'react';
import { Hero } from '@/components/Hero';
import { SEGMENTS } from '@/lib/data';
import { cn } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { FeatureBoxPlot } from '@/components/FeatureBoxPlot';
import { Activity, ClipboardList, TriangleAlert } from 'lucide-react';

const CLASS_ORDER = ['Safe', 'Warning', 'Critical'];
const CLASS_LABEL = { Safe: 'Aman', Warning: 'Peringatan', Critical: 'Kritis' };
const CLASS_COLOR = { Safe: '#22c55e', Warning: '#f59e0b', Critical: '#ef4444' };

const DIAG_FEATURES = [
  { key: 'pressAvg', label: 'Tekanan rata-rata (bar)' },
  { key: 'phLevel', label: 'pH cairan' },
  { key: 'h2sPpm', label: 'H2S (ppm)' },
  { key: 'pco2Psi', label: 'pCO2 (psi)' },
  { key: 'corrosionRateMmYr', label: 'Laju korosi (mm/yr)' },
];

export const Dashboard = () => {
  const [classFilter, setClassFilter] = useState(new Set(CLASS_ORDER));
  const [feature, setFeature] = useState(DIAG_FEATURES[0].key);

  const filtered = useMemo(
    () => SEGMENTS.filter((s) => classFilter.has(s.predictedClass)),
    [classFilter]
  );

  const totalNodes = filtered.length;
  const criticalCount = filtered.filter((s) => s.predictedClass === 'Critical').length;
  const warningCount = filtered.filter((s) => s.predictedClass === 'Warning').length;
  const safeCount = totalNodes - criticalCount - warningCount;
  const p1Count = filtered.filter((s) => s.priorityTier === 'P1').length;
  const avgPriority = totalNodes
    ? filtered.reduce((acc, s) => acc + s.priorityScore, 0) / totalNodes
    : 0;

  const classDist = CLASS_ORDER.map((c) => ({
    name: CLASS_LABEL[c],
    rawClass: c,
    value: c === 'Safe' ? safeCount : c === 'Warning' ? warningCount : criticalCount,
    color: CLASS_COLOR[c],
  }));

  const featureLabel = DIAG_FEATURES.find((f) => f.key === feature)?.label ?? feature;

  const tableRows = useMemo(
    () => [...filtered].sort((a, b) => b.priorityScore - a.priorityScore),
    [filtered]
  );

  const [visibleCount, setVisibleCount] = useState(15);
  const visibleRows = tableRows.slice(0, visibleCount);

  const toggleClass = (cls) => {
    setClassFilter((prev) => {
      const next = new Set(prev);
      if (next.has(cls)) next.delete(cls);
      else next.add(cls);
      if (next.size === 0) CLASS_ORDER.forEach((c) => next.add(c));
      return next;
    });
    setVisibleCount(15);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Hero
        title="Dashboard Risiko Korosi"
        subtitle="Pantau distribusi risiko, probabilitas critical, dan indikator diagnostik utama per segmen pipa berdasarkan hasil inferensi GraphSAGE."
      />

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[10px] font-bold text-pg-text-soft uppercase tracking-wider mr-2">
          Filter kelas prediksi:
        </span>
        {CLASS_ORDER.map((cls) => {
          const active = classFilter.has(cls);
          return (
            <button
              key={cls}
              onClick={() => toggleClass(cls)}
              className={cn(
                'ops-pill cursor-pointer transition-opacity',
                active ? 'opacity-100' : 'opacity-40 grayscale',
                cls === 'Critical' ? 'pill-critical' : cls === 'Warning' ? 'pill-warning' : 'pill-safe'
              )}
            >
              {CLASS_LABEL[cls]}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="pg-stat-card border-l-4 border-l-blue-500 shadow-sm">
          <p className="text-[10px] font-bold text-pg-text-soft uppercase tracking-wider mb-1">Total Segmen</p>
          <p className="text-3xl font-black text-pg-text-main">{totalNodes}</p>
        </div>
        <div className="pg-stat-card border-l-4 border-l-pg-critical shadow-sm">
          <p className="text-[10px] font-bold text-pg-text-soft uppercase tracking-wider mb-1">Status Kritis</p>
          <p className="text-3xl font-black text-pg-critical">{criticalCount}</p>
        </div>
        <div className="pg-stat-card border-l-4 border-l-pg-warning shadow-sm">
          <p className="text-[10px] font-bold text-pg-text-soft uppercase tracking-wider mb-1">Status Peringatan</p>
          <p className="text-3xl font-black text-pg-warning">{p1Count}</p>
        </div>
        <div className="pg-stat-card border-l-4 border-l-pg-safe shadow-sm">
          <p className="text-[10px] font-bold text-pg-text-soft uppercase tracking-wider mb-1">Rata-rata Skor Risiko</p>
          <p className="text-3xl font-black text-pg-text-main">{avgPriority.toFixed(3)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="pg-card">
          <h3 className="text-sm font-bold text-pg-text-soft uppercase mb-6 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-500" />
            Distribusi Kelas Prediksi
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classDist}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: '#f8fbff' }}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #d9e2ec', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {classDist.map((entry) => (
                    <Cell key={entry.rawClass} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="pg-card">
          <div className="flex items-center justify-between mb-6 gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-pg-text-soft uppercase flex items-center gap-2">
              <TriangleAlert className="w-4 h-4 text-amber-500" />
              Distribusi Fitur per Kelas Prediksi
            </h3>
            <select
              value={feature}
              onChange={(e) => setFeature(e.target.value)}
              className="text-[11px] font-semibold bg-white border border-pg-border rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {DIAG_FEATURES.map((f) => (
                <option key={f.key} value={f.key}>{f.label}</option>
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
          <p className="mt-3 text-[10px] text-pg-text-soft font-medium">
            Boxplot {featureLabel} per kelas prediksi — kotak = Q1–Q3, garis tengah = median, whiskers = 1.5× IQR, titik = outlier.
          </p>
        </div>
      </div>

      <div className="pg-card overflow-hidden p-0">
        <div className="p-6 border-b border-pg-border flex items-center justify-between">
          <h3 className="text-sm font-bold text-pg-text-main flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-500" />
            Tabel Risiko Per Segmen
          </h3>
          <div className="text-[10px] font-bold text-pg-text-soft bg-pg-surface-soft px-3 py-1 rounded-full border border-pg-border">
            MENAMPILKAN {visibleRows.length} / {tableRows.length}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#f8fbff] text-[10px] font-extrabold text-pg-text-soft uppercase tracking-wider">
                <th className="px-6 py-4">ID Node</th>
                <th className="px-6 py-4">Kelas Prediksi</th>
                <th className="px-6 py-4 text-center">Prob Aman</th>
                <th className="px-6 py-4 text-center">Prob Kritis</th>
                <th className="px-6 py-4">Prioritas</th>
                <th className="px-6 py-4 text-right">Skor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pg-border">
              {visibleRows.map((segment) => (
                <tr key={segment.id} className="hover:bg-blue-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-mono text-xs font-bold text-pg-text-main">{segment.name}</div>
                    <div className="text-[10px] text-pg-text-soft font-medium uppercase tracking-tight">{segment.area}</div>
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
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-full bg-slate-100 rounded-full h-1.5 max-w-[60px] overflow-hidden">
                        <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${segment.safeProb * 100}%` }} />
                      </div>
                      <span className="text-[10px] font-mono text-pg-text-soft">{(segment.safeProb * 100).toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-full bg-slate-100 rounded-full h-1.5 max-w-[60px] overflow-hidden">
                        <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${segment.criticalProb * 100}%` }} />
                      </div>
                      <span className="text-[10px] font-mono text-pg-text-soft">{(segment.criticalProb * 100).toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div
                      className={cn(
                        'text-xs font-bold',
                        segment.priorityTier === 'P1'
                          ? 'text-pg-critical'
                          : segment.priorityTier === 'P2'
                          ? 'text-pg-warning'
                          : 'text-pg-text-soft'
                      )}
                    >
                      {segment.priorityTier}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-mono text-xs font-bold bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
                      {segment.priorityScore.toFixed(3)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visibleCount < tableRows.length && (
            <div className="p-4 border-t border-pg-border flex justify-center">
              <button
                onClick={() => setVisibleCount((v) => v + 15)}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                Muat 15 segmen berikutnya
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
