import React, { useMemo, useState } from 'react';

const CANVAS_W = 640;
const CANVAS_H = 280;
const PAD_LEFT = 56;
const PAD_RIGHT = 24;
const PAD_TOP = 16;
const PAD_BOTTOM = 36;

const PLOT_W = CANVAS_W - PAD_LEFT - PAD_RIGHT;
const PLOT_H = CANVAS_H - PAD_TOP - PAD_BOTTOM;

function quantile(sortedAsc, p) {
  if (sortedAsc.length === 0) return 0;
  if (sortedAsc.length === 1) return sortedAsc[0];
  const idx = (sortedAsc.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedAsc[lo];
  const frac = idx - lo;
  return sortedAsc[lo] * (1 - frac) + sortedAsc[hi] * frac;
}

function computeBoxStats(values) {
  const sorted = [...values].filter((v) => typeof v === 'number' && Number.isFinite(v)).sort((a, b) => a - b);
  if (sorted.length === 0) {
    return null;
  }
  const q1 = quantile(sorted, 0.25);
  const median = quantile(sorted, 0.5);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  const fenceLow = q1 - 1.5 * iqr;
  const fenceHigh = q3 + 1.5 * iqr;
  const inFence = sorted.filter((v) => v >= fenceLow && v <= fenceHigh);
  const whiskerLow = inFence.length ? inFence[0] : q1;
  const whiskerHigh = inFence.length ? inFence[inFence.length - 1] : q3;
  const outliers = sorted.filter((v) => v < fenceLow || v > fenceHigh);
  return { count: sorted.length, q1, median, q3, whiskerLow, whiskerHigh, outliers, sorted };
}

function niceTicks(min, max, count = 5) {
  if (min === max) {
    return [min];
  }
  const span = max - min;
  const step = Math.pow(10, Math.floor(Math.log10(span / count)));
  const candidates = [1, 2, 2.5, 5, 10].map((m) => m * step);
  const target = span / count;
  const chosen = candidates.reduce((best, c) => (Math.abs(c - target) < Math.abs(best - target) ? c : best), candidates[0]);
  const start = Math.ceil(min / chosen) * chosen;
  const ticks = [];
  for (let v = start; v <= max + chosen / 2; v += chosen) {
    ticks.push(Number(v.toFixed(10)));
  }
  return ticks;
}

export const FeatureBoxPlot = ({
  segments,
  featureKey,
  featureLabel,
  classOrder,
  classLabel,
  classColor,
}) => {
  const [hover, setHover] = useState(null);

  const stats = useMemo(() => {
    return classOrder.map((cls) => {
      const values = segments.filter((s) => s.predictedClass === cls).map((s) => s[featureKey]);
      return { cls, label: classLabel[cls], color: classColor[cls], stats: computeBoxStats(values) };
    });
  }, [segments, featureKey, classOrder, classLabel, classColor]);

  // Domain: include all data points, with a small padding band.
  const { yMin, yMax } = useMemo(() => {
    let lo = Infinity;
    let hi = -Infinity;
    stats.forEach(({ stats: s }) => {
      if (!s) return;
      lo = Math.min(lo, s.sorted[0]);
      hi = Math.max(hi, s.sorted[s.sorted.length - 1]);
    });
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return { yMin: 0, yMax: 1 };
    if (lo === hi) {
      return { yMin: lo - 1, yMax: hi + 1 };
    }
    const pad = (hi - lo) * 0.08;
    return { yMin: lo - pad, yMax: hi + pad };
  }, [stats]);

  const yToPixel = (v) => PAD_TOP + PLOT_H - ((v - yMin) / (yMax - yMin)) * PLOT_H;
  const ticks = useMemo(() => niceTicks(yMin, yMax, 5), [yMin, yMax]);

  const slotW = PLOT_W / classOrder.length;
  const boxW = Math.min(70, slotW * 0.45);

  return (
    <div className="w-full h-64 relative">
      <svg viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        {/* grid + y-axis ticks */}
        {ticks.map((t, i) => {
          const y = yToPixel(t);
          return (
            <g key={`tick-${i}`}>
              <line x1={PAD_LEFT} y1={y} x2={CANVAS_W - PAD_RIGHT} y2={y} stroke="#f1f5f9" strokeWidth={1} />
              <text x={PAD_LEFT - 8} y={y + 3} fontSize={10} textAnchor="end" fill="#64748b">
                {Number.isInteger(t) ? t : t.toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* axis labels */}
        <text
          transform={`translate(14 ${PAD_TOP + PLOT_H / 2}) rotate(-90)`}
          fontSize={10}
          fontWeight={700}
          fill="#64748b"
          textAnchor="middle"
        >
          {featureLabel}
        </text>

        {/* boxes */}
        {stats.map((entry, idx) => {
          const cx = PAD_LEFT + slotW * (idx + 0.5);
          if (!entry.stats) {
            return (
              <g key={entry.cls}>
                <text x={cx} y={PAD_TOP + PLOT_H / 2} fontSize={11} textAnchor="middle" fill="#94a3b8">
                  Tidak ada data
                </text>
                <text x={cx} y={CANVAS_H - 14} fontSize={11} fontWeight={700} fill="#475569" textAnchor="middle">
                  {entry.label}
                </text>
              </g>
            );
          }
          const s = entry.stats;
          const yQ1 = yToPixel(s.q1);
          const yQ3 = yToPixel(s.q3);
          const yMedian = yToPixel(s.median);
          const yWLow = yToPixel(s.whiskerLow);
          const yWHigh = yToPixel(s.whiskerHigh);

          const isHover = hover === entry.cls;

          return (
            <g
              key={entry.cls}
              onMouseEnter={() => setHover(entry.cls)}
              onMouseLeave={() => setHover((h) => (h === entry.cls ? null : h))}
            >
              {/* whisker line */}
              <line x1={cx} y1={yWLow} x2={cx} y2={yWHigh} stroke={entry.color} strokeWidth={1.4} />
              {/* whisker caps */}
              <line x1={cx - boxW * 0.3} y1={yWLow} x2={cx + boxW * 0.3} y2={yWLow} stroke={entry.color} strokeWidth={1.4} />
              <line x1={cx - boxW * 0.3} y1={yWHigh} x2={cx + boxW * 0.3} y2={yWHigh} stroke={entry.color} strokeWidth={1.4} />

              {/* box (Q1..Q3) */}
              <rect
                x={cx - boxW / 2}
                y={yQ3}
                width={boxW}
                height={Math.max(2, yQ1 - yQ3)}
                fill={entry.color}
                fillOpacity={isHover ? 0.55 : 0.35}
                stroke={entry.color}
                strokeWidth={1.6}
                rx={3}
              />
              {/* median line */}
              <line
                x1={cx - boxW / 2}
                y1={yMedian}
                x2={cx + boxW / 2}
                y2={yMedian}
                stroke="#0f172a"
                strokeWidth={2}
              />

              {/* outliers */}
              {s.outliers.map((v, i) => (
                <circle
                  key={`out-${i}`}
                  cx={cx}
                  cy={yToPixel(v)}
                  r={2.5}
                  fill="#ffffff"
                  stroke={entry.color}
                  strokeWidth={1.2}
                />
              ))}

              {/* class label */}
              <text x={cx} y={CANVAS_H - 14} fontSize={11} fontWeight={700} fill="#475569" textAnchor="middle">
                {entry.label} (n={s.count})
              </text>

              {/* hover tooltip */}
              {isHover && (
                <g pointerEvents="none">
                  <rect
                    x={Math.min(CANVAS_W - 150, cx + boxW / 2 + 8)}
                    y={Math.max(PAD_TOP, yMedian - 44)}
                    width={140}
                    height={80}
                    rx={6}
                    ry={6}
                    fill="#0f172a"
                    fillOpacity={0.94}
                  />
                  {[
                    `${entry.label} · n=${s.count}`,
                    `Q3  ${s.q3.toFixed(2)}`,
                    `Med ${s.median.toFixed(2)}`,
                    `Q1  ${s.q1.toFixed(2)}`,
                    `IQR ${(s.q3 - s.q1).toFixed(2)}`,
                  ].map((line, i) => (
                    <text
                      key={i}
                      x={Math.min(CANVAS_W - 150, cx + boxW / 2 + 8) + 10}
                      y={Math.max(PAD_TOP, yMedian - 44) + 16 + i * 14}
                      fontSize={i === 0 ? 11 : 10}
                      fontWeight={i === 0 ? 700 : 400}
                      fill={i === 0 ? '#f8fafc' : '#cbd5e1'}
                    >
                      {line}
                    </text>
                  ))}
                </g>
              )}
            </g>
          );
        })}

        {/* x-axis baseline */}
        <line
          x1={PAD_LEFT}
          y1={PAD_TOP + PLOT_H}
          x2={CANVAS_W - PAD_RIGHT}
          y2={PAD_TOP + PLOT_H}
          stroke="#e2e8f0"
          strokeWidth={1}
        />
      </svg>
    </div>
  );
};
