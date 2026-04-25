'use client';

import { fmt } from '@/lib/production';
import type { ScenarioType, ScenarioResult } from '@/lib/scenario';

interface ScenarioSimulatorProps {
  scenarioType: ScenarioType;
  cagrAdjBps: number;
  onScenarioTypeChange: (t: ScenarioType) => void;
  onCagrAdjChange: (bps: number) => void;
  result: ScenarioResult;
}

const SCENARIO_TYPES: ScenarioType[] = ['Downside', 'Base', 'Upside'];

function scenarioPillClass(t: ScenarioType, active: boolean) {
  if (!active) return 'text-slate-600 hover:text-slate-400 border border-transparent transition-colors';
  if (t === 'Downside') return 'bg-rose-400/10 text-rose-300 border border-rose-400/30';
  if (t === 'Upside') return 'bg-teal-400/10 text-teal-300 border border-teal-400/30';
  return 'bg-slate-400/10 text-slate-200 border border-slate-400/30';
}

function confidenceChipClass(level: 'High' | 'Medium' | 'Low') {
  if (level === 'High') return 'text-teal-400 bg-teal-400/10 border-teal-400/25';
  if (level === 'Medium') return 'text-slate-400 bg-slate-400/10 border-slate-400/25';
  return 'text-rose-300/80 bg-rose-400/8 border-rose-400/20';
}

export function ScenarioSimulator({
  scenarioType,
  cagrAdjBps,
  onScenarioTypeChange,
  onCagrAdjChange,
  result,
}: ScenarioSimulatorProps) {
  const deltaPositive = result.deltaVsBase !== null && result.deltaVsBase >= 0;
  const isBase = scenarioType === 'Base' && cagrAdjBps === 0;

  // Applied CAGR label: "Base" / "Downside + 1.5 pp" / "Upside − 2.0 pp"
  const adjPP = Math.abs(cagrAdjBps / 100).toFixed(1);
  const adjSign = cagrAdjBps > 0 ? '+' : '−';
  const appliedLabel = cagrAdjBps === 0
    ? scenarioType
    : `${scenarioType} ${adjSign} ${adjPP} pp`;
  const appliedPct = (result.cagrUsed * 100).toFixed(1);

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
            Scenario Simulator
          </h2>
          <span className="text-[9px] text-slate-600">EIA baseline · FieldSignal model</span>
        </div>
        <span className={`text-[9px] font-semibold rounded-full px-1.5 py-0.5 border ${confidenceChipClass(result.confidence)}`}>
          {result.confidence} confidence · Scenario estimate
        </span>
      </div>

      {/* Two-panel body */}
      <div className="flex">
        {/* Left: Inputs */}
        <div
          className="w-64 shrink-0 px-5 py-5 flex flex-col gap-5"
          style={{
            borderRight: '1px solid var(--fs-border)',
            background: 'rgba(4,10,18,0.45)',
          }}
        >
          <p className="text-[9px] font-semibold text-slate-600 uppercase tracking-[0.14em]">Inputs</p>

          {/* Scenario type */}
          <div className="flex flex-col gap-2">
            <label className="text-[9px] font-medium text-slate-600 uppercase tracking-widest">
              Scenario
            </label>
            <div className="flex gap-1.5">
              {SCENARIO_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => onScenarioTypeChange(t)}
                  className={`flex-1 text-[11px] py-1.5 rounded-lg font-medium ${scenarioPillClass(t, scenarioType === t)}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* CAGR slider */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-[9px] font-medium text-slate-500 uppercase tracking-widest">
                Adjust CAGR assumption
              </label>
              <span className="text-[11px] text-slate-200 tabular-nums font-semibold">
                {cagrAdjBps > 0 ? '+' : ''}{(cagrAdjBps / 100).toFixed(1)} pp
              </span>
            </div>
            <input
              type="range"
              min={-500}
              max={500}
              step={25}
              value={cagrAdjBps}
              onChange={(e) => onCagrAdjChange(Number(e.target.value))}
              className="w-full accent-teal-500 cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-slate-700 tabular-nums">
              <span>−5 pp</span>
              <span>0</span>
              <span>+5 pp</span>
            </div>
            <p className="text-[9px] text-slate-700 leading-relaxed mt-0.5">
              Shift the long-run growth rate up or down (percentage points per year).
            </p>
          </div>

          {/* Footer note */}
          <div
            className="mt-auto pt-3"
            style={{ borderTop: '1px solid rgba(29,58,82,0.4)' }}
          >
            <p className="text-[9px] text-slate-700 leading-relaxed">
              Additive shift on scenario base CAGR. Clamped −10% / +25%.
            </p>
          </div>
        </div>

        {/* Right: Outputs */}
        <div className="flex-1 px-6 py-5 flex flex-col gap-4">
          <p className="text-[9px] font-semibold text-slate-600 uppercase tracking-[0.14em]">2028 Outlook</p>

          {/* Hero number */}
          <div className="flex items-end gap-5">
            <div>
              <p className="text-[10px] text-slate-600 mb-1.5">Oil Projection</p>
              <div className="flex items-baseline gap-2">
                <span className="text-[40px] font-bold text-white tabular-nums tracking-tight leading-none">
                  {result.projected2028 > 0 ? fmt(result.projected2028) : '—'}
                </span>
                <span className="text-sm text-slate-600 mb-0.5">Kbbl</span>
              </div>
            </div>

            {result.deltaVsBasePct !== null && !isBase && (
              <div className="mb-0.5">
                <p className="text-[10px] text-slate-600 mb-1.5">vs. base case</p>
                <span
                  className={`text-xl font-bold tabular-nums rounded-lg px-2.5 py-1 ${
                    deltaPositive
                      ? 'text-teal-300 bg-teal-400/10'
                      : 'text-rose-300 bg-rose-400/10'
                  }`}
                >
                  {deltaPositive ? '+' : ''}{result.deltaVsBasePct.toFixed(1)}%
                </span>
              </div>
            )}
          </div>

          {/* Applied CAGR line */}
          <p className="text-[10px] text-slate-600 tabular-nums -mt-2">
            Applied CAGR:{' '}
            <span className="text-slate-400 font-medium">{appliedPct}%/yr</span>
            <span className="text-slate-700"> · {appliedLabel}</span>
          </p>

          {/* Strategic interpretation */}
          <div
            className="rounded-lg px-4 py-3.5 flex flex-col gap-3 flex-1"
            style={{ background: 'rgba(4,10,18,0.55)', border: '1px solid rgba(18,32,50,0.9)' }}
          >
            <p className="text-[9px] font-semibold text-slate-600 uppercase tracking-[0.14em]">
              Strategic Interpretation
            </p>
            <div>
              <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-1.5">Top Risk</p>
              <p className="text-[11px] text-slate-300 leading-relaxed">{result.topRisk}</p>
            </div>
            <div style={{ borderTop: '1px solid rgba(29,58,82,0.4)' }} className="pt-3">
              <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-1.5">
                Diversification Candidate
              </p>
              <p className="text-xs font-semibold text-teal-400/80">{result.bestDiversification}</p>
            </div>
          </div>

          <p className="text-[9px] text-slate-700">
            Scenario outputs are FieldSignal model estimates — not official EIA forecasts.
          </p>
        </div>
      </div>
    </div>
  );
}
