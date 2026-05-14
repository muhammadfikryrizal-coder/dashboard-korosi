import React from 'react';
import { Hero } from '@/components/Hero';
import { SHAP_GLOBAL_IMPORTANCE } from '@/lib/data';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell
} from 'recharts';
import { Fingerprint, Info, CheckCircle, AlertTriangle } from 'lucide-react';

export const ShapAnalysis = () => {
  const sortedImportance = [...SHAP_GLOBAL_IMPORTANCE].sort((a, b) => b.importance - a.importance);
  const topFeatures = sortedImportance.slice(0, 2).map((f) => f.feature);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Hero 
        title="Explainability SHAP" 
        subtitle="Analisis faktor pendorong risiko menggunakan nilai SHAP. Membantu operator memahami kontribusi fitur terhadap probabilitas Kritis."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 pg-card">
          <h3 className="text-sm font-bold text-pg-text-soft uppercase mb-6 flex items-center gap-2">
            Pentingnya Fitur Global (Mean |SHAP|)
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sortedImportance} layout="vertical" margin={{ left: 50 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis dataKey="feature" type="category" fontSize={11} tickLine={false} axisLine={false} width={120} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: '1px solid #d9e2ec' }}
                />
                <Bar dataKey="importance" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                  {sortedImportance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index < 3 ? '#ef4444' : '#64748b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-4 text-[10px] text-pg-text-soft font-medium bg-slate-50 p-3 rounded-lg border border-slate-100">
            Interpretasi: Fitur{' '}
            <span className="font-bold text-red-600">{topFeatures[0]}</span> dan{' '}
            <span className="font-bold text-red-600">{topFeatures[1]}</span> merupakan pendorong utama klasifikasi risiko Kritis pada jaringan saat ini.
            Nilai importance dihitung sebagai |korelasi Pearson| antara setiap fitur dengan probabilitas kritis hasil inferensi GraphSAGE.
          </p>
        </div>

        <div className="space-y-6">
          <div className="pg-card bg-[#0d1b2a] border-[#1b263b] text-white">
            <h4 className="text-[10px] font-bold text-[#486581] uppercase tracking-widest mb-4">Mekanisme Analisis</h4>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold">1</div>
                <p className="text-[11px] text-[#9ca3af] leading-relaxed">Mengekstraksi bobot kontribusi tiap sensor melalui Kernel SHAP.</p>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold">2</div>
                <p className="text-[11px] text-[#9ca3af] leading-relaxed">Identifikasi deviasi terhadap target operasional industri.</p>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold">3</div>
                <p className="text-[11px] text-[#9ca3af] leading-relaxed">Menghasilkan rekomendasi preskriptif berbasis data pendorong.</p>
              </div>
            </div>
          </div>

          <div className="pg-card border-dashed">
            <h4 className="text-xs font-bold text-pg-text-main flex items-center gap-2 mb-4">
              <Info className="w-4 h-4 text-blue-500" />
              Catatan Operator
            </h4>
            <p className="text-[10px] text-pg-text-soft leading-relaxed">
              Analisis SHAP memungkinkan tim integritas melakukan audit terhadap keputusan model AI, memastikan bahwa peringatan yang dihasilkan selaras dengan logika fisika korosivitas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
