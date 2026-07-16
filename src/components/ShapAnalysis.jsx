import React, { useMemo, useRef, useState } from 'react';
import { SHAP_GLOBAL_IMPORTANCE } from '@/lib/data';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  Activity,
  Info,
  Download,
  Lightbulb,
  CircleHelp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const ShapAnalysis = () => {
  const [viewMode, setViewMode] = useState('bar');
  const chartWrapRef = useRef(null);

  const sortedImportance = useMemo(
    () => [...SHAP_GLOBAL_IMPORTANCE].sort((a, b) => b.importance - a.importance),
    []
  );
  const meanShap = useMemo(
    () =>
      sortedImportance.reduce((acc, row) => acc + row.importance, 0) /
      Math.max(sortedImportance.length, 1),
    [sortedImportance]
  );
  const topFeature = sortedImportance[0]?.feature ?? '-';
  const secondFeature = sortedImportance[1]?.feature ?? '-';

  const summaryDots = useMemo(
    () =>
      sortedImportance.flatMap((row, i) => {
        const base = row.importance;
        return [-0.11, -0.06, -0.02, 0.03, 0.07, 0.12].map((offset, j) => ({
          feature: row.feature,
          y: i,
          x: Math.max(0, base + offset * (0.12 + base * 0.4)),
          magnitude: (j % 3) + 1,
        }));
      }),
    [sortedImportance]
  );

  const downloadChartImage = async () => {
    const wrap = chartWrapRef.current;
    if (!wrap) return;
    const svg = wrap.querySelector('svg');
    if (!svg) return;

    const serializer = new XMLSerializer();
    const svgText = serializer.serializeToString(svg);
    const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = svg.viewBox.baseVal.width || svg.clientWidth || 1200;
      canvas.height = svg.viewBox.baseVal.height || svg.clientHeight || 700;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `shap_${viewMode}_${new Date().toISOString().slice(0, 10)}.png`;
        link.click();
      }, 'image/png');
    };
    img.src = url;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="shap-kpi-card">
          <div className="shap-kpi-head">
            <div className="shap-kpi-icon bg-blue-50 text-pg-accent">
              <BarChart3 className="w-5 h-5" />
            </div>
            <span className="shap-kpi-title">Mean |SHAP| (ABS)</span>
          </div>
          <p className="shap-kpi-value">{meanShap.toFixed(3)}</p>
          <p className="shap-kpi-sub">Rata-rata kontribusi fitur terhadap prediksi risiko.</p>
        </div>

        <div className="shap-kpi-card">
          <div className="shap-kpi-head">
            <div className="shap-kpi-icon bg-emerald-50 text-emerald-700">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="shap-kpi-title">Fitur Paling Berpengaruh</span>
          </div>
          <p className="shap-kpi-value !text-2xl">{topFeature}</p>
          <p className="shap-kpi-sub">Kontribusi tertinggi terhadap risiko model.</p>
        </div>

        <div className="shap-kpi-card">
          <div className="shap-kpi-head">
            <div className="shap-kpi-icon bg-amber-50 text-amber-700">
              <Activity className="w-5 h-5" />
            </div>
            <span className="shap-kpi-title">Sensor Dominan</span>
          </div>
          <p className="shap-kpi-value !text-2xl">
            {topFeature.replace('_', ' ')}, {secondFeature.replace('_', ' ')}
          </p>
          <p className="shap-kpi-sub">Sensor paling berpengaruh dalam deteksi risiko.</p>
        </div>

        <div className="shap-kpi-card">
          <div className="shap-kpi-head">
            <div className="shap-kpi-icon bg-slate-100 text-pg-text-main">
              <Info className="w-5 h-5" />
            </div>
            <span className="shap-kpi-title">Interpretasi</span>
          </div>
          <p className="shap-kpi-value !text-2xl">Global</p>
          <p className="shap-kpi-sub">Analisis berdasarkan seluruh data pada periode terpilih.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
        <div className="shap-main-panel">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-pg-text-main">
                Pentingnya Fitur Global (Mean |SHAP|)
              </h3>
              <CircleHelp className="w-4 h-4 text-pg-text-soft" />
            </div>
            <button type="button" onClick={downloadChartImage} className="ops-link-btn !mt-0">
              <Download className="w-3.5 h-3.5" />
              Unduh Gambar
            </button>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <button
              className={cn('shap-tab-btn', viewMode === 'bar' && 'shap-tab-btn-active')}
              onClick={() => setViewMode('bar')}
              type="button"
            >
              Bar Chart
            </button>
            <button
              className={cn('shap-tab-btn', viewMode === 'summary' && 'shap-tab-btn-active')}
              onClick={() => setViewMode('summary')}
              type="button"
            >
              Summary Plot
            </button>
          </div>

          <div ref={chartWrapRef} className="h-[360px]">
            {viewMode === 'bar' ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sortedImportance} layout="vertical" margin={{ left: 40, right: 15 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eef2f7" />
                  <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} domain={[0, 1]} />
                  <YAxis
                    dataKey="feature"
                    type="category"
                    width={130}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip formatter={(v) => Number(v).toFixed(3)} />
                  <Bar dataKey="importance" radius={[0, 6, 6, 0]}>
                    {sortedImportance.map((entry, idx) => (
                      <Cell
                        key={entry.feature}
                        fill={idx === 0 ? '#ef4444' : idx === 1 ? '#f97316' : idx === 2 ? '#f59e0b' : '#64748b'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                  <CartesianGrid stroke="#eef2f7" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="SHAP"
                    domain={[0, 1]}
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    label={{ value: 'Nilai SHAP (ringkasan)', position: 'insideBottom', offset: -2 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    domain={[-0.5, sortedImportance.length - 0.5]}
                    ticks={sortedImportance.map((_, i) => i)}
                    tickFormatter={(i) => sortedImportance[i]?.feature || ''}
                    width={140}
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                  />
                  <ZAxis type="number" dataKey="magnitude" range={[40, 120]} />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    formatter={(v, n) => [typeof v === 'number' ? v.toFixed(3) : v, n]}
                  />
                  <Scatter data={summaryDots} fill="#1d4ed8" />
                </ScatterChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="metrics-footer-note mt-4">
            <Info className="w-4 h-4 text-pg-accent shrink-0" />
            <span>
              Grafik menunjukkan rata-rata kontribusi absolut (|SHAP|) setiap fitur terhadap prediksi
              probabilitas Kritis. Semakin besar nilai, semakin berpengaruh fitur tersebut terhadap
              keputusan model.
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="shap-side-panel">
            <h4 className="text-xs font-bold text-pg-text-main mb-3">Mekanisme Analisis</h4>
            <div className="space-y-3">
              <div className="shap-step-item">
                <span>1</span>
                <p>Menghitung nilai SHAP untuk setiap prediksi model pada seluruh data.</p>
              </div>
              <div className="shap-step-item">
                <span>2</span>
                <p>Mengambil rata-rata absolut nilai SHAP per fitur.</p>
              </div>
              <div className="shap-step-item">
                <span>3</span>
                <p>Mengurutkan fitur berdasarkan kontribusi untuk mengidentifikasi faktor dominan.</p>
              </div>
            </div>
          </div>

          <div className="shap-side-panel">
            <h4 className="text-xs font-bold text-pg-text-main mb-3">Ringkasan Analisis</h4>
            <ul className="space-y-2 text-xs text-pg-text-soft">
              <li className="flex gap-2">
                <Lightbulb className="w-3.5 h-3.5 mt-0.5 text-pg-accent shrink-0" />
                <span>
                  3 fitur teratas menyumbang{' '}
                  <strong className="text-pg-text-main">
                    {(
                      ((sortedImportance[0]?.importance || 0) +
                        (sortedImportance[1]?.importance || 0) +
                        (sortedImportance[2]?.importance || 0)) *
                      100
                    ).toFixed(1)}
                    %
                  </strong>{' '}
                  dari total kontribusi.
                </span>
              </li>
              <li className="flex gap-2">
                <Lightbulb className="w-3.5 h-3.5 mt-0.5 text-pg-accent shrink-0" />
                <span>
                  Konsentrasi {topFeature} dan {secondFeature} menjadi faktor utama risiko kritis.
                </span>
              </li>
              <li className="flex gap-2">
                <Lightbulb className="w-3.5 h-3.5 mt-0.5 text-pg-accent shrink-0" />
                <span>Fokus mitigasi pada parameter-parameter ini akan memberi dampak terbesar.</span>
              </li>
            </ul>
          </div>

          <div className="shap-note-box">
            <h4 className="text-xs font-bold text-pg-text-main mb-2">Catatan Operator</h4>
            <p className="text-xs text-pg-text-soft leading-relaxed">
              Analisis SHAP bersifat global dan membantu memahami pola umum. Untuk detail per segmen,
              gunakan analisis lokal SHAP pada halaman detail risiko segmen.
            </p>
          </div>
        </div>
      </div>

      <p className="text-center text-[11px] text-pg-text-soft">
        Metode: SHAP KernelExplainer • Model: GraphSAGE • Dataset: 75 segmen pipa (7 hari terakhir)
      </p>
    </div>
  );
};
