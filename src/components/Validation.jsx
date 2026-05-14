import React from 'react';
import { Hero } from '@/components/Hero';
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
import { Zap, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { STRESS_SUMMARY, MULTI_SEED, SCENARIOS, MODEL_METRICS } from '@/lib/data';

const PCT = (v) => `${(v * 100).toFixed(1)}%`;

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
      Stress: STRESS_SUMMARY.stdAvgPriorityScore, // priority score not recomputed under stress
    },
  ];

  const seedSamples = MULTI_SEED.samples.map((row) => ({
    seed: `S${row.seed}`,
    criticalProbMean: row.criticalProbMean,
    criticalRateEst: row.criticalRateEst,
  }));

  const stressScenario = SCENARIOS.find((s) => s.scenario.includes('stress')) ?? SCENARIOS[2];
  const bestScenario = SCENARIOS.find((s) => s.scenario.includes('checkpoint terbaik')) ?? SCENARIOS[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Hero
        title="Evaluasi Metrik Model"
        subtitle="Bandingkan performa standar vs stress test serta cek stabilitas risiko saat terjadi degradasi sensor atau anomali kondisi."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="pg-card bg-green-50 border-green-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <h4 className="text-[10px] font-bold text-green-700 uppercase tracking-widest">Akurasi Standar</h4>
          </div>
          <p className="text-4xl font-black text-green-800">{bestScenario.accuracy.toFixed(3)}</p>
          <p className="text-xs text-green-600/80 font-medium mt-2">{bestScenario.purpose}.</p>
        </div>

        <div className="pg-card bg-amber-50 border-amber-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Zap className="w-5 h-5 text-amber-600" />
            </div>
            <h4 className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Akurasi Stress Test</h4>
          </div>
          <p className="text-4xl font-black text-amber-800">{stressScenario.accuracy.toFixed(3)}</p>
          <p className="text-xs text-amber-600/80 font-medium mt-2">{stressScenario.purpose}.</p>
        </div>

        <div className="pg-card bg-red-50 border-red-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <ShieldAlert className="w-5 h-5 text-red-600" />
            </div>
            <h4 className="text-[10px] font-bold text-red-700 uppercase tracking-widest">Critical F1 Score</h4>
          </div>
          <p className="text-4xl font-black text-red-800">{stressScenario.criticalF1.toFixed(3)}</p>
          <p className="text-xs text-red-600/80 font-medium mt-2">Skor F1 spesifik untuk deteksi Kritis saat uji stress.</p>
        </div>
      </div>

      <div className="pg-card">
        <h3 className="text-sm font-bold text-pg-text-soft uppercase mb-8">Perbandingan Uji Standar vs Uji Stress</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={compareData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="metric" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis fontSize={11} domain={[0, 1]} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #d9e2ec' }}
                formatter={(v) => (typeof v === 'number' ? v.toFixed(3) : v)}
              />
              <Legend verticalAlign="top" align="right" height={30} />
              <Bar dataKey="Standar" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Stress" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-3 text-[10px] text-pg-text-soft">
          Laju critical naik dari <span className="font-bold">{PCT(STRESS_SUMMARY.stdCriticalRate)}</span> menjadi{' '}
          <span className="font-bold">{PCT(STRESS_SUMMARY.stressCriticalRate)}</span> ketika sensor H2S/chloride/inhibitor/pH diperturbasi.
        </p>
      </div>

      <div className="pg-card">
        <h3 className="text-sm font-bold text-pg-text-soft uppercase mb-6">Stabilitas Multi-Seed (10 simulasi)</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="p-4 bg-pg-surface-soft rounded-xl border border-pg-border">
              <p className="text-[10px] font-bold text-pg-text-soft uppercase tracking-widest mb-1">Rata-rata critical_prob</p>
              <p className="text-2xl font-black text-pg-text-main">
                {MULTI_SEED.criticalProbMeanMean.toFixed(3)} ± {MULTI_SEED.criticalProbMeanStd.toFixed(3)}
              </p>
              <p className="text-[10px] text-pg-text-soft font-medium mt-1">Berdasarkan simulasi 10 benih (seeds).</p>
            </div>
            <div className="p-4 bg-pg-surface-soft rounded-xl border border-pg-border">
              <p className="text-[10px] font-bold text-pg-text-soft uppercase tracking-widest mb-1">Estimasi Laju Critical</p>
              <p className="text-2xl font-black text-pg-text-main">
                {PCT(MULTI_SEED.criticalRateMean)} ± {PCT(MULTI_SEED.criticalRateStd)}
              </p>
              <p className="text-[10px] text-pg-text-soft font-medium mt-1">Threshold probabilitas 0.60.</p>
            </div>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={seedSamples}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="seed" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} domain={[0, 1]} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #d9e2ec' }}
                  formatter={(v) => (typeof v === 'number' ? v.toFixed(3) : v)}
                />
                <Legend verticalAlign="top" align="right" height={30} />
                <Line type="monotone" dataKey="criticalProbMean" stroke="#3b82f6" strokeWidth={2.5} name="Rata-rata critical_prob" dot={{ r: 3 }} />
                <Line type="monotone" dataKey="criticalRateEst" stroke="#ef4444" strokeWidth={2.5} name="Estimasi laju critical" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="pg-card overflow-hidden p-0">
        <div className="p-6 border-b border-pg-border">
          <h3 className="text-sm font-bold text-pg-text-main">Metrik Skenario (Referensi Notebook)</h3>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-pg-border">
              {SCENARIOS.map((row) => (
                <tr key={row.scenario}>
                  <td className="px-6 py-3 text-xs font-bold text-pg-text-main">{row.scenario}</td>
                  <td className="px-6 py-3 text-right font-mono text-xs">{row.accuracy.toFixed(4)}</td>
                  <td className="px-6 py-3 text-right font-mono text-xs">{row.macroF1.toFixed(4)}</td>
                  <td className="px-6 py-3 text-right font-mono text-xs">{row.criticalF1.toFixed(4)}</td>
                  <td className="px-6 py-3 text-[11px] text-pg-text-soft">{row.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-slate-50 border-t border-pg-border text-[10px] text-pg-text-soft">
          Mode inferensi saat ini: <span className="font-bold uppercase">{MODEL_METRICS.inferenceMode}</span>.
          Arsitektur: <span className="font-bold">{MODEL_METRICS.architecture}</span>.
          Physics: <span className="font-bold">{MODEL_METRICS.physicsModel}</span>.
        </div>
      </div>
    </div>
  );
};
