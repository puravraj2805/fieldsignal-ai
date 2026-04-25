'use client';

import { useState } from 'react';

interface ConfidenceStripProps {
  forecastQuality: number;
  latestYear: number;
  statesTracked: number;
}

function qualityLabel(q: number): { label: string; cls: string } {
  if (q >= 0.7) return { label: 'High', cls: 'text-teal-400' };
  if (q >= 0.4) return { label: 'Medium', cls: 'text-slate-300' };
  return { label: 'Low', cls: 'text-rose-400' };
}

export function ConfidenceStrip({ forecastQuality, latestYear, statesTracked }: ConfidenceStripProps) {
  const [expanded, setExpanded] = useState(false);
  const q = qualityLabel(forecastQuality);

  return (
    <div
      className="rounded-xl overflow-hidden opacity-80"
      style={{ background: 'var(--fs-surface)', border: '1px solid rgba(20,32,48,0.8)' }}
    >
      <button
        className="w-full flex items-center gap-4 px-5 py-2 hover:bg-white/[0.015] transition-colors text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="text-[9px] font-medium text-slate-600 uppercase tracking-widest shrink-0">
          Data & Methodology
        </span>
        <div className="flex items-center gap-3 flex-1 flex-wrap">
          <span className="flex items-center gap-1 text-[10px] text-slate-600">
            Forecast confidence:
            <span className={`font-semibold ${q.cls}`}>{q.label}</span>
            <span className="text-slate-700 tabular-nums">({forecastQuality.toFixed(2)})</span>
          </span>
          <span className="text-[10px] text-slate-700">5-yr CAGR model</span>
          <span className="text-[10px] text-slate-700">EIA data through {latestYear}</span>
          <span className="text-[10px] text-slate-700">{statesTracked} states tracked</span>
        </div>
        <span className="text-[9px] text-slate-700 shrink-0 select-none">
          {expanded ? '↑ Hide' : 'Methodology ↓'}
        </span>
      </button>

      {expanded && (
        <div
          className="px-5 py-4 grid grid-cols-3 gap-6"
          style={{ borderTop: '1px solid rgba(20,32,48,0.8)' }}
        >
          <div>
            <p className="text-[9px] font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Forecast Method
            </p>
            <p className="text-[10px] text-slate-600 leading-relaxed">
              Uses EIA historical annual production data. Computes a 5-year compound annual growth
              rate (CAGR), clamped to −5% / +20% to prevent implausible extrapolation on short data
              windows. Projects year-by-year to 2030.
            </p>
          </div>
          <div>
            <p className="text-[9px] font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Confidence Score
            </p>
            <p className="text-[10px] text-slate-600 leading-relaxed">
              Quality = (history score + stability score) / 2. History score rises with more data
              years. Stability score falls when annual growth rates are volatile. Score ≥ 0.70 is
              High; 0.40–0.69 is Medium; below 0.40 is Low.
            </p>
          </div>
          <div>
            <p className="text-[9px] font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Assumptions & Limits
            </p>
            <p className="text-[10px] text-slate-600 leading-relaxed">
              Model assumes recent CAGR persists to 2030. Does not account for regulatory change,
              commodity price shocks, or infrastructure constraints. Action Center signals and
              Scenario outputs are FieldSignal heuristics — not official EIA analysis or forecasts.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
