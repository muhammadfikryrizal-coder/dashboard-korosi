import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { Zap, ShieldAlert, CheckCircle2, Info, ArrowUp } from 'lucide-react';
import { STRESS_SUMMARY, MULTI_SEED, SCENARIOS, MODEL_METRICS } from '@/lib/data';
import { cn } from '@/lib/utils';
import { ShapAnalysis } from '@/components/ShapAnalysis';

const PCT = (v) => `${(v * 100).toFixed(1)}%`;

function scenarioCondition(row) {
  const text = `${row.scenario} ${row.purpose}`.toLowerCase();
  if (text.includes('stress')) return { label: 'Stress', tone: 'warning' };
  if (text.includes('standar') || text.includes('nominal') || text.includes('checkpoint')) {
    return { label: 'Nominal', tone: 'safe' };
  }
  return { label: 'Evaluasi', tone: 'neutral' };
}

function statusBadge(type) {
  if (type === 'good') return { label: 'Sangat Baik', tone: 'safe' };
  if (type === 'watch') return { label: 'Perlu Perhatian', tone: 'warning' };
  return { label: 'Kritis', tone: 'critical' };
}

export const Validation = () => {
  const compareData = [
    {
      metric: 'Laju critical',
      Standar: STRESS_SUMMARY.stdCriticalRate,
      Stress: STRESS_SUMMARY.stressCriticalRate,
    },
    {
      metric: 'Rata-rata critical_prob',
      Standar: STRESS_SUMMARY.stdAvgCriticalProb,
      Stress: STRESS_SUMMARY.stressAvgCriticalProb,
    },
    {
      metric: 'Rata-rata priority_score',
      Standar: STRESS_SUMMARY.stdAvgPriorityScore,
      Stress: STRESS_SUMMARY.stdAvgPriorityScore,
    },
  ];

  const seedSamples = MULTI_SEED.samples.map((row) => ({
    seed: `S${row.seed}`,
    criticalProbMean: row.criticalProbMean,
    criticalRateEst: row.criticalRateEst,
  }));

  const stressScenario =
    SCENARIOS.find((s) => s.scenario.toLowerCase().includes('stress')) ?? SCENARIOS[2];
  const bestScenario =
    SCENARIOS.find((s) => s.scenario.toLowerCase().includes('checkpoint terbaik')) ?? SCENARIOS[0];

  const kpis = [
    {
      title: 'Akurasi Standar',
      value: bestScenario.accuracy.toFixed(3),
      desc: 'Performa pada kondisi nominal.',
      icon: CheckCircle2,
      tone: 'safe',
      badge: statusBadge('good'),
    },
    {
      title: 'Akurasi Stress Test',
      value: stressScenario.accuracy.toFixed(3),
      desc: 'Robustness saat degradasi sensor.',
      icon: Zap,
      tone: 'warning',
      badge: statusBadge('watch'),
    },
    {
      title: 'Critical F1 Score',
      value: stressScenario.criticalF1.toFixed(3),
      desc: 'Skor F1 spesifik untuk deteksi Kritis saat uji stress.',
      icon: ShieldAlert,
      tone: 'critical',
      badge: statusBadge('critical'),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {kpis.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="metrics-kpi-card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl border flex items-center justify-center',
                      item.tone === 'safe' && 'bg-green-50 border-green-100',
                      item.tone === 'warning' && 'bg-amber-50 border-amber-100',
                      item.tone === 'critical' && 'bg-red-50 border-red-100'
                    )}
                  >
                    <Icon
                      className={cn(
                        'w-5 h-5',
                        item.tone === 'safe' && 'text-green-600',
                        item.tone === 'warning' && 'text-amber-600',
                        item.tone === 'critical' && 'text-red-600'
                      )}
                    />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-pg-text-soft">
                      {item.title}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 text-[42px] leading-none font-black text-pg-text-main">
                {item.value}
              </div>
              <div className="mt-3 flex items-end justify-between gap-3">
                <p className="text-xs text-pg-text-soft font-medium max-w-[250px]">{item.desc}</p>
                <span
                  className={cn(
                    'metrics-status-badge',
                    item.badge.tone === 'safe' && 'metrics-status-badge-safe',
                    item.badge.tone === 'warning' && 'metrics-status-badge-warning',
                    item.badge.tone === 'critical' && 'metrics-status-badge-critical'
                  )}
                >
                  {item.badge.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="metrics-panel">
          <div className="flex items-center gap-2 mb-6">
            <h3 className="text-sm font-bold text-pg-text-main">
              Perbandingan Uji Standar vs Uji Stress
            </h3>
            <Info className="w-4 h-4 text-pg-text-soft" />
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={compareData} margin={{ left: 0, right: 8, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf2f7" />
                <XAxis dataKey="metric" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} domain={[0, 1]} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #d9e2ec' }}
                  formatter={(v) => (typeof v === 'number' ? v.toFixed(3) : v)}
                />
                <Legend verticalAlign="top" align="right" height={30} />
                <Bar dataKey="Standar" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Stress" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="metrics-footer-note mt-4">
            <ArrowUp className="w-4 h-4 text-green-600 shrink-0" />
            <span>
              Laju critical naik dari <strong>{PCT(STRESS_SUMMARY.stdCriticalRate)}</strong>{' '}
              menjadi <strong>{PCT(STRESS_SUMMARY.stressCriticalRate)}</strong> ketika sensor
              H2S/chloride/inhibitor/pH diperturbasi.
            </span>
          </div>
        </div>

        <div className="metrics-panel">
          <div className="flex items-center gap-2 mb-6">
            <h3 className="text-sm font-bold text-pg-text-main">
              Stabilitas Multi-Seed (10 simulasi)
            </h3>
            <Info className="w-4 h-4 text-pg-text-soft" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6 items-start">
            <div className="space-y-4">
              <div className="metrics-mini-stat">
                <p className="text-xs font-semibold text-pg-text-soft mb-1">
                  Rata-rata critical_prob
                </p>
                <p className="text-3xl font-black text-pg-text-main">
                  {MULTI_SEED.criticalProbMeanMean.toFixed(3)} ±{' '}
                  {MULTI_SEED.criticalProbMeanStd.toFixed(3)}
                </p>
                <p className="text-[10px] text-pg-text-soft font-medium mt-1">
                  Berdasarkan simulasi 10 benih (seeds).
                </p>
              </div>

              <div className="metrics-mini-stat">
                <p className="text-xs font-semibold text-pg-text-soft mb-1">
                  Estimasi laju critical
                </p>
                <p className="text-3xl font-black text-pg-text-main">
                  {PCT(MULTI_SEED.criticalRateMean)} ± {PCT(MULTI_SEED.criticalRateStd)}
                </p>
                <p className="text-[10px] text-pg-text-soft font-medium mt-1">
                  Threshold probabilitas 0.60.
                </p>
              </div>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={seedSamples} margin={{ left: 0, right: 8, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf2f7" />
                  <XAxis dataKey="seed" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} domain={[0, 1]} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #d9e2ec' }}
                    formatter={(v) => (typeof v === 'number' ? v.toFixed(3) : v)}
                  />
                  <Legend verticalAlign="top" align="right" height={30} />
                  <Line
                    type="monotone"
                    dataKey="criticalRateEst"
                    stroke="#ef4444"
                    strokeWidth={2.5}
                    name="Estimasi laju critical"
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="criticalProbMean"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    name="Rata-rata critical_prob"
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="pg-card overflow-hidden p-0">
        <div className="p-6 border-b border-pg-border">
          <h3 className="text-sm font-bold text-pg-text-main">
            Metrik Skenario (Referensi Notebook)
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#f8fbff] text-[10px] font-extrabold text-pg-text-soft uppercase tracking-wider">
                <th className="px-6 py-3">Skenario</th>
                <th className="px-6 py-3 text-right">Akurasi</th>
                <th className="px-6 py-3 text-right">Macro F1</th>
                <th className="px-6 py-3 text-right">Critical F1</th>
                <th className="px-6 py-3">Tujuan</th>
                <th className="px-6 py-3">Kondisi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pg-border">
              {SCENARIOS.map((row) => {
                const condition = scenarioCondition(row);
                return (
                  <tr key={row.scenario}>
                    <td className="px-6 py-3 text-xs font-bold text-pg-text-main">{row.scenario}</td>
                    <td className="px-6 py-3 text-right font-mono text-xs">
                      {row.accuracy.toFixed(4)}
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-xs">
                      {row.macroF1.toFixed(4)}
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-xs">
                      {row.criticalF1.toFixed(4)}
                    </td>
                    <td className="px-6 py-3 text-[11px] text-pg-text-soft">{row.purpose}</td>
                    <td className="px-6 py-3">
                      <span
                        className={cn(
                          'metrics-table-badge',
                          condition.tone === 'safe' && 'metrics-table-badge-safe',
                          condition.tone === 'warning' && 'metrics-table-badge-warning',
                          condition.tone === 'neutral' && 'metrics-table-badge-neutral'
                        )}
                      >
                        {condition.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="metrics-footer-note m-4 mt-0">
          <Info className="w-4 h-4 text-pg-accent shrink-0" />
          <span>
            Mode inferensi saat ini: <strong className="uppercase">{MODEL_METRICS.inferenceMode}</strong>
            {' '}· Arsitektur: <strong>{MODEL_METRICS.architecture}</strong>
            {' '}· Physics: <strong>{MODEL_METRICS.physicsModel}</strong>
          </span>
        </div>
      </div>

      <div className="pg-section-divider">
        <div className="mb-6">
          <h2 className="pg-section-title">Explainability SHAP</h2>
          <p className="pg-section-sub">
            Kontribusi fitur diagnostik terhadap prediksi risiko per segmen pipa.
          </p>
        </div>
        <ShapAnalysis />
      </div>
    </div>
  );
};
