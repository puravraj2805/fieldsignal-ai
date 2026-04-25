'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  computeWellEconomics,
  STATE_PRESETS,
} from '@/lib/wellEconomics';
import type { AnnualPoint } from '@/lib/wellEconomics';

interface Props {
  focusedState: string | null;
}

// Display-friendly state — all units are human-readable (%, $M, $K)
interface UIInputs {
  initialRate: number;        // bbl/day
  declineRatePct: number;     // e.g. 35 (%)
  wellLifeYears: number;
  oilPrice: number;           // $/bbl
  capexMillions: number;      // $M
  loeThouMonth: number;       // $K/month
  discountRatePct: number;    // e.g. 10 (%)
}

const DEFAULT_UI: UIInputs = {
  initialRate: 300,
  declineRatePct: 35,
  wellLifeYears: 10,
  oilPrice: 70,
  capexMillions: 8.0,
  loeThouMonth: 15,
  discountRatePct: 10,
};

function toWellInputs(ui: UIInputs) {
  return {
    initialRateBblDay: Math.max(10, ui.initialRate),
    annualDeclineRate: Math.max(0.01, Math.min(0.80, ui.declineRatePct / 100)),
    wellLifeYears: Math.max(1, Math.min(30, ui.wellLifeYears)),
    oilPriceDollarsPerBbl: Math.max(1, ui.oilPrice),
    capexDollars: Math.max(100_000, ui.capexMillions * 1_000_000),
    monthlyLOEDollars: Math.max(1_000, ui.loeThouMonth * 1_000),
    discountRate: Math.max(0.01, Math.min(0.50, ui.discountRatePct / 100)),
  };
}

function fmtDollars(d: number): string {
  const abs = Math.abs(d);
  const sign = d < 0 ? '−$' : '$';
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(0)}K`;
  return `${sign}${abs.toFixed(0)}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InputRow({
  label, unit, value, min, max, step, onChange,
}: {
  label: string; unit: string;
  value: number; min: number; max: number; step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div
      className="flex items-center justify-between gap-2 py-1.5"
      style={{ borderBottom: '1px solid rgba(29,58,82,0.25)' }}
    >
      <span className="text-[10px] text-slate-500 leading-tight">{label}</span>
      <div className="flex items-center gap-1.5 shrink-0">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-16 bg-transparent text-[11px] text-slate-200 text-right tabular-nums outline-none rounded px-1.5 py-0.5 focus:bg-slate-800/30"
          style={{ border: '1px solid rgba(29,58,82,0.4)' }}
        />
        <span className="text-[9px] text-slate-700 w-14 text-left leading-tight">{unit}</span>
      </div>
    </div>
  );
}

function KPICard({
  label, value, sub, sign,
}: {
  label: string; value: string; sub?: string;
  sign?: 'positive' | 'negative' | 'neutral';
}) {
  const valueColor =
    sign === 'positive' ? 'text-teal-300' :
    sign === 'negative' ? 'text-rose-300' :
    'text-slate-200';

  return (
    <div
      className="flex flex-col gap-1 px-3 py-2.5 rounded-lg"
      style={{ background: 'rgba(4,10,18,0.55)', border: '1px solid rgba(18,32,50,0.9)' }}
    >
      <p className="text-[9px] text-slate-600 uppercase tracking-wider leading-none">{label}</p>
      <p className={`text-sm font-bold tabular-nums leading-tight ${valueColor}`}>{value}</p>
      {sub && <p className="text-[9px] text-slate-700 leading-none">{sub}</p>}
    </div>
  );
}

function DeclineCurveChart({ annual }: { annual: AnnualPoint[] }) {
  const maxProd = Math.max(...annual.map((p) => p.productionKbbl), 1);
  return (
    <div className="flex items-end gap-1" style={{ height: '72px' }}>
      {annual.map((pt) => (
        <div key={pt.year} className="flex-1 flex flex-col items-center gap-0.5 group">
          <div
            className="w-full rounded-t-sm cursor-default"
            style={{
              height: `${(pt.productionKbbl / maxProd) * 68}px`,
              background: 'rgba(245,158,11,0.55)',
              transition: 'background 0.15s',
            }}
            title={`Year ${pt.year}: ${pt.productionKbbl.toFixed(0)} Kbbl`}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(245,158,11,0.80)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(245,158,11,0.55)'; }}
          />
        </div>
      ))}
    </div>
  );
}

function CumulativeCFChart({ annual }: { annual: AnnualPoint[] }) {
  const VB_W = 400;
  const VB_H = 72;

  const minCum = Math.min(...annual.map((p) => p.cumulative));
  const maxCum = Math.max(...annual.map((p) => p.cumulative));

  // Ensure zero is always visible in the viewport
  const effectiveMin = Math.min(minCum, 0);
  const effectiveMax = Math.max(maxCum, 0);
  const totalRange = effectiveMax - effectiveMin || 1;

  // Y coordinate of the zero line in SVG space (0 = top)
  const zeroY = (effectiveMax / totalRange) * VB_H;

  const n = annual.length;
  const slotW = VB_W / n;
  const barW = slotW * 0.72;
  const barOffset = (slotW - barW) / 2;

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      width="100%"
      height={VB_H}
      style={{ overflow: 'visible' }}
    >
      {/* Zero baseline */}
      <line
        x1={0} y1={zeroY} x2={VB_W} y2={zeroY}
        stroke="rgba(29,58,82,0.7)"
        strokeWidth="0.75"
        strokeDasharray="3 3"
      />

      {annual.map((pt, i) => {
        const x = i * slotW + barOffset;
        let barH: number;
        let y: number;
        let fill: string;

        if (pt.cumulative >= 0) {
          barH = (pt.cumulative / totalRange) * VB_H;
          y = zeroY - barH;
          fill = 'rgba(45,212,191,0.50)';
        } else {
          barH = (Math.abs(pt.cumulative) / totalRange) * VB_H;
          y = zeroY;
          fill = 'rgba(251,113,133,0.40)';
        }

        return (
          <rect
            key={pt.year}
            x={x} y={y}
            width={barW} height={Math.max(barH, 1)}
            fill={fill}
            rx="1.5"
          />
        );
      })}
    </svg>
  );
}

function YearLabels({ annual }: { annual: AnnualPoint[] }) {
  return (
    <div className="flex mt-0.5">
      {annual.map((pt, i) => (
        <div key={pt.year} className="flex-1 text-center">
          {/* Show every other label to avoid crowding */}
          {(i === 0 || (i + 1) % 2 === 0 || i === annual.length - 1) && (
            <span className="text-[8px] text-slate-700 tabular-nums">{pt.year}</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function WellEconomicsCalculator({ focusedState }: Props) {
  const [inputs, setInputs] = useState<UIInputs>(() => {
    if (focusedState && STATE_PRESETS[focusedState]) {
      const p = STATE_PRESETS[focusedState];
      return {
        ...DEFAULT_UI,
        initialRate: p.initialRateBblDay,
        declineRatePct: Math.round(p.annualDeclineRate * 100),
        capexMillions: p.capexDollars / 1_000_000,
        loeThouMonth: p.monthlyLOEDollars / 1_000,
      };
    }
    return DEFAULT_UI;
  });

  // When the focused state changes, update well-parameter defaults (preserve oil price / discount rate)
  useEffect(() => {
    if (!focusedState) return;
    const p = STATE_PRESETS[focusedState];
    if (!p) return;
    setInputs((prev) => ({
      ...prev,
      initialRate: p.initialRateBblDay,
      declineRatePct: Math.round(p.annualDeclineRate * 100),
      capexMillions: p.capexDollars / 1_000_000,
      loeThouMonth: p.monthlyLOEDollars / 1_000,
    }));
  }, [focusedState]);

  const set = <K extends keyof UIInputs>(key: K) =>
    (v: number) => setInputs((prev) => ({ ...prev, [key]: v }));

  const result = useMemo(
    () => computeWellEconomics(toWellInputs(inputs)),
    [inputs],
  );

  const preset = focusedState ? STATE_PRESETS[focusedState] : null;
  const npvSign = result.profitable ? 'positive' : 'negative';

  const irrDisplay = result.irrPct !== null
    ? `${result.irrPct.toFixed(1)}%`
    : '< 0%';

  const paybackDisplay = result.paybackMonths !== null
    ? `${result.paybackMonths} mo`
    : `>${inputs.wellLifeYears * 12} mo`;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: 'var(--fs-surface-hi)',
        border: '1px solid rgba(29,58,82,0.5)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: '1px solid var(--fs-border)' }}
      >
        <div className="flex items-center gap-2">
          <h2 className="text-[10px] font-semibold text-slate-300 tracking-widest uppercase">
            Well Economics Calculator
          </h2>
          <span className="text-[9px] text-slate-600">
            Single horizontal well · Decline curve model
          </span>
        </div>
        <span
          className={`text-[9px] font-semibold rounded-full px-1.5 py-0.5 border ${
            result.profitable
              ? 'text-teal-400 bg-teal-400/10 border-teal-400/25'
              : 'text-rose-300/80 bg-rose-400/8 border-rose-400/20'
          }`}
        >
          Illustrative model · {result.profitable ? 'NPV positive' : 'NPV negative'}
        </span>
      </div>

      {/* Two-panel body */}
      <div className="flex">

        {/* Left: Inputs */}
        <div
          className="w-72 shrink-0 px-5 py-5 flex flex-col gap-4"
          style={{
            borderRight: '1px solid var(--fs-border)',
            background: 'rgba(4,10,18,0.45)',
          }}
        >
          <p className="text-[9px] font-semibold text-slate-600 uppercase tracking-[0.14em]">
            Inputs
          </p>

          {/* Well Parameters */}
          <div className="flex flex-col gap-0">
            <p className="text-[9px] text-slate-700 uppercase tracking-widest mb-1.5">
              Well Parameters
            </p>
            <InputRow
              label="Initial Rate"
              unit="bbl/day"
              value={inputs.initialRate}
              min={10} max={2000} step={10}
              onChange={set('initialRate')}
            />
            <InputRow
              label="Annual Decline"
              unit="%/yr"
              value={inputs.declineRatePct}
              min={1} max={80} step={1}
              onChange={set('declineRatePct')}
            />
            <InputRow
              label="Well Life"
              unit="years"
              value={inputs.wellLifeYears}
              min={1} max={30} step={1}
              onChange={set('wellLifeYears')}
            />
          </div>

          {/* Economics */}
          <div className="flex flex-col gap-0">
            <p className="text-[9px] text-slate-700 uppercase tracking-widest mb-1.5">
              Economics
            </p>
            <InputRow
              label="Oil Price"
              unit="$/bbl"
              value={inputs.oilPrice}
              min={10} max={200} step={1}
              onChange={set('oilPrice')}
            />
            <InputRow
              label="D&C Cost"
              unit="$M"
              value={inputs.capexMillions}
              min={0.5} max={30} step={0.5}
              onChange={set('capexMillions')}
            />
            <InputRow
              label="Monthly LOE"
              unit="$K/mo"
              value={inputs.loeThouMonth}
              min={1} max={100} step={1}
              onChange={set('loeThouMonth')}
            />
            <InputRow
              label="Discount Rate"
              unit="%"
              value={inputs.discountRatePct}
              min={1} max={40} step={1}
              onChange={set('discountRatePct')}
            />
          </div>

          {/* Footer note */}
          <div
            className="mt-auto pt-3"
            style={{ borderTop: '1px solid rgba(29,58,82,0.4)' }}
          >
            {preset ? (
              <p className="text-[9px] text-teal-400/80 leading-relaxed">
                Well parameters from{' '}
                <span className="text-teal-400 font-semibold">{preset.label}</span>{' '}
                profile · {preset.basin}
              </p>
            ) : (
              <p className="text-[9px] text-slate-700 leading-relaxed">
                Select a state on the map to load regional defaults.
              </p>
            )}
          </div>
        </div>

        {/* Right: Outputs */}
        <div className="flex-1 px-6 py-5 flex flex-col gap-4 min-w-0">
          <p className="text-[9px] font-semibold text-slate-600 uppercase tracking-[0.14em]">
            Results
          </p>

          {/* KPI cards */}
          <div className="grid grid-cols-5 gap-2">
            <KPICard
              label="EUR"
              value={`${result.eurKbbl.toFixed(0)}`}
              sub="Kbbl"
            />
            <KPICard
              label="NPV @ 10%"
              value={fmtDollars(result.npvDollars)}
              sign={npvSign}
            />
            <KPICard
              label="IRR"
              value={irrDisplay}
              sign={result.irrPct !== null && result.irrPct > 0 ? 'positive' : 'negative'}
            />
            <KPICard
              label="Payback"
              value={paybackDisplay}
              sign={result.paybackMonths !== null ? 'positive' : 'negative'}
            />
            <KPICard
              label="Breakeven"
              value={`$${result.breakEvenPriceDollars.toFixed(0)}`}
              sub="$/bbl"
              sign={result.breakEvenPriceDollars < inputs.oilPrice ? 'positive' : 'negative'}
            />
          </div>

          {/* Production Decline Chart */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[9px] text-slate-600 uppercase tracking-wider">
                Production Decline
              </p>
              <span className="text-[8px] text-slate-700 tabular-nums">Kbbl / year</span>
            </div>
            <DeclineCurveChart annual={result.annual} />
            <YearLabels annual={result.annual} />
          </div>

          {/* Cumulative Cash Flow Chart */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[9px] text-slate-600 uppercase tracking-wider">
                Cumulative Cash Flow
              </p>
              <div className="flex items-center gap-3 text-[8px] text-slate-700">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm inline-block" style={{ background: 'rgba(45,212,191,0.5)' }} />
                  Positive
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm inline-block" style={{ background: 'rgba(251,113,133,0.4)' }} />
                  Negative
                </span>
              </div>
            </div>
            <CumulativeCFChart annual={result.annual} />
            <YearLabels annual={result.annual} />
          </div>

          {/* Methodology note */}
          <p className="text-[9px] text-slate-700 mt-auto leading-relaxed">
            Illustrative well model based on exponential decline. Revenue = production × oil price.
            Net cash flow = revenue − monthly LOE; D&C cost applied at month 0.
            NPV and IRR use the resulting monthly cash flow stream. Not official EIA analysis —
            for strategic planning purposes only.
          </p>
        </div>
      </div>
    </div>
  );
}
