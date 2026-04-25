'use client';

import { getStateStats, fmt } from '@/lib/production';
import type { ProductionRecord, StateStats } from '@/types';

interface ComparePanelProps {
  data: ProductionRecord[];
  regions: string[];
  regionA: string;
  regionB: string;
  onRegionAChange: (r: string) => void;
  onRegionBChange: (r: string) => void;
  focusedState?: string | null;
}

function fmtYoY(pct: number | null): string {
  if (pct === null) return '—';
  return `${pct >= 0 ? '+' : ''}${pct}%`;
}

function yoyClass(pct: number | null): string {
  if (pct === null) return '';
  return pct >= 0 ? 'text-teal-400' : 'text-rose-400';
}

function MetricRows({
  a,
  b,
  latestYear,
}: {
  a: StateStats;
  b: StateStats;
  latestYear: number;
}) {
  const rows = [
    {
      label: `Oil ${latestYear}`,
      sublabel: 'Kbbl',
      va: a.oilKbbl ? fmt(a.oilKbbl) : '—',
      vb: b.oilKbbl ? fmt(b.oilKbbl) : '—',
      isYoY: false,
    },
    {
      label: `Gas ${latestYear}`,
      sublabel: 'MMCF',
      va: a.gasMMcf ? fmt(a.gasMMcf) : '—',
      vb: b.gasMMcf ? fmt(b.gasMMcf) : '—',
      isYoY: false,
    },
    {
      label: 'Oil YoY',
      sublabel: '',
      va: fmtYoY(a.oilYoYPct),
      vb: fmtYoY(b.oilYoYPct),
      isYoY: true,
      vaRaw: a.oilYoYPct,
      vbRaw: b.oilYoYPct,
    },
    {
      label: 'Gas YoY',
      sublabel: '',
      va: fmtYoY(a.gasYoYPct),
      vb: fmtYoY(b.gasYoYPct),
      isYoY: true,
      vaRaw: a.gasYoYPct,
      vbRaw: b.gasYoYPct,
    },
  ];

  return (
    <div className="flex flex-col">
      {rows.map(({ label, sublabel, va, vb, isYoY, vaRaw, vbRaw }, idx) => (
        <div
          key={label}
          className={`grid grid-cols-[1fr_auto_1fr] items-center py-2.5 ${
            idx < rows.length - 1 ? 'border-b border-[#142030]/80' : ''
          }`}
        >
          {/* State A value — teal accent (primary / focused) */}
          <span
            className={`text-sm font-semibold tabular-nums text-right pr-4 ${
              isYoY ? yoyClass(vaRaw ?? null) : 'text-teal-300/90'
            }`}
          >
            {va}
          </span>

          {/* Row label */}
          <div className="text-center px-2" style={{ minWidth: '4.5rem' }}>
            <p className="text-[10px] text-slate-500 leading-tight">{label}</p>
            {sublabel && (
              <p className="text-[9px] text-slate-700 leading-tight">{sublabel}</p>
            )}
          </div>

          {/* State B value — slate secondary (comparison) */}
          <span
            className={`text-sm font-semibold tabular-nums text-left pl-4 ${
              isYoY ? yoyClass(vbRaw ?? null) : 'text-slate-300/80'
            }`}
          >
            {vb}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ComparePanel({
  data,
  regions,
  regionA,
  regionB,
  onRegionAChange,
  onRegionBChange,
  focusedState,
}: ComparePanelProps) {
  const statsA = getStateStats(data, regionA);
  const statsB = getStateStats(data, regionB);
  const latestYear = Math.max(statsA.latestYear, statsB.latestYear);
  const isFocused = focusedState && regionA === focusedState;

  const selectStyle = {
    background: 'rgba(6,15,26,0.6)',
    border: '1px solid rgba(29,58,82,0.5)',
  };

  return (
    <div
      className="rounded-xl flex flex-col overflow-hidden"
      style={{
        background: 'var(--fs-surface)',
        border: '1px solid var(--fs-border)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.35)',
      }}
    >
      {/* Panel header */}
      <div
        className="flex items-center justify-between px-5 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--fs-border)' }}
      >
        <h2 className="text-xs font-semibold text-slate-300 tracking-wide uppercase">
          Compare States
        </h2>
        <span className="text-[10px] text-slate-600 tabular-nums">
          {latestYear > 0 ? `as of ${latestYear}` : '—'}
        </span>
      </div>

      <div className="flex-1 px-5 py-4 flex flex-col gap-4">
        {/* State selectors */}
        <div className="grid grid-cols-2 gap-3">
          {/* State A — teal accent (primary) */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400/50 shrink-0" />
              <label className="text-[10px] text-teal-400/70 font-medium uppercase tracking-widest">
                State A
              </label>
              {isFocused && (
                <span className="text-[9px] text-teal-400 border border-teal-500/25 bg-teal-500/8 rounded-full px-1.5 py-0.5 leading-none">
                  focused
                </span>
              )}
            </div>
            <select
              value={regionA}
              onChange={(e) => onRegionAChange(e.target.value)}
              className="w-full rounded-lg text-xs text-slate-200 px-2.5 py-1.5 focus:outline-none transition-colors"
              style={selectStyle}
            >
              {regions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* State B — slate secondary (comparison) */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500/40 shrink-0" />
              <label className="text-[10px] text-slate-500/70 font-medium uppercase tracking-widest">
                State B
              </label>
            </div>
            <select
              value={regionB}
              onChange={(e) => onRegionBChange(e.target.value)}
              className="w-full rounded-lg text-xs text-slate-200 px-2.5 py-1.5 focus:outline-none transition-colors"
              style={selectStyle}
            >
              {regions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Metric rows */}
        {latestYear > 0 ? (
          <MetricRows a={statsA} b={statsB} latestYear={latestYear} />
        ) : (
          <p className="text-xs text-slate-600 text-center py-4">
            No data for this selection.
          </p>
        )}

        <p className="text-center text-[10px] text-slate-700 mt-auto">
          EIA data · year range filter applied
        </p>
      </div>
    </div>
  );
}
