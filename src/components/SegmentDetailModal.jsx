import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const CLASS_LABEL = { Safe: 'Aman', Warning: 'Peringatan', Critical: 'Kritis' };

export const SegmentDetailModal = ({ segment, open, onClose }) => {
  if (!segment) return null;

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
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl z-[70] border border-pg-border"
            role="dialog"
            aria-modal="true"
            aria-labelledby="segment-modal-title"
          >
            <div className="sticky top-0 bg-white border-b border-pg-border px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div>
                <h2 id="segment-modal-title" className="text-lg font-extrabold text-pg-text-main">
                  Detail Segmen
                </h2>
                <p className="text-sm text-pg-text-soft font-mono">{segment.name}</p>
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
              <div className="grid grid-cols-2 gap-4">
                <InfoItem label="ID Node" value={segment.name} mono />
                <InfoItem label="Lokasi" value={segment.area} />
                <InfoItem
                  label="Kelas Prediksi"
                  value={
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
                  }
                />
                <InfoItem label="Prioritas" value={segment.priorityTier} highlight />
              </div>

              <div>
                <h3 className="text-[10px] font-bold text-pg-text-soft uppercase tracking-wider mb-3">
                  Probabilitas Prediksi
                </h3>
                <div className="space-y-2">
                  <ProbBar label="Aman" value={segment.safeProb} color="bg-green-500" />
                  <ProbBar label="Peringatan" value={segment.warningProb} color="bg-amber-500" />
                  <ProbBar label="Kritis" value={segment.criticalProb} color="bg-red-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <InfoItem label="Skor Risiko" value={segment.priorityScore.toFixed(3)} mono />
                <InfoItem
                  label="Laju Korosi"
                  value={`${segment.corrosionRateMmYr?.toFixed(3) ?? '—'} mm/yr`}
                />
                <InfoItem label="Tekanan Rata-rata" value={`${segment.pressAvg} bar`} />
                <InfoItem label="pH Cairan" value={segment.phLevel} />
              </div>

              {segment.inspectionNote && (
                <div>
                  <h3 className="text-[10px] font-bold text-pg-text-soft uppercase tracking-wider mb-2">
                    Catatan Inspeksi
                  </h3>
                  <p className="text-sm text-pg-text-main leading-relaxed bg-pg-surface-soft rounded-lg p-3 border border-pg-border">
                    {segment.inspectionNote}
                  </p>
                </div>
              )}

              {segment.recommendedAction && (
                <div>
                  <h3 className="text-[10px] font-bold text-pg-text-soft uppercase tracking-wider mb-2">
                    Rekomendasi Tindakan
                  </h3>
                  <p className="text-sm text-pg-text-main leading-relaxed bg-amber-50 rounded-lg p-3 border border-amber-200">
                    {segment.recommendedAction}
                  </p>
                </div>
              )}

              {segment.targetSla && (
                <InfoItem label="Target SLA" value={segment.targetSla} />
              )}
            </div>

            <div className="sticky bottom-0 bg-white border-t border-pg-border px-6 py-4 rounded-b-2xl">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 text-sm font-bold text-white bg-[#102a43] rounded-xl hover:bg-[#1a3a5c] transition-colors"
              >
                Tutup
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

function InfoItem({ label, value, mono, highlight }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-pg-text-soft uppercase tracking-wider mb-1">
        {label}
      </p>
      <div
        className={cn(
          'text-sm font-semibold text-pg-text-main',
          mono && 'font-mono',
          highlight && 'text-pg-critical'
        )}
      >
        {value}
      </div>
    </div>
  );
}

function ProbBar({ label, value, color }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-pg-text-soft w-20 shrink-0">{label}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
        <div className={cn('h-2 rounded-full', color)} style={{ width: `${value * 100}%` }} />
      </div>
      <span className="text-xs font-mono text-pg-text-soft w-10 text-right">
        {(value * 100).toFixed(0)}%
      </span>
    </div>
  );
}
