'use client';

import { useMemo } from 'react';
import {
  generateInsights,
  HEURISTIC_COUNT,
  type ActionInsight,
  type InsightSeverity,
  type InsightConfidence,
} from '@/lib/insights';
import type { ProductionRecord, KPIResult } from '@/types';

interface ActionCenterProps {
  data: ProductionRecord[];
  kpis: KPIResult;
  focusedState: string | null;
  forecastQuality: number;
}

function severityTokens(s: InsightSeverity) {
  if (s === 'High')
    return {
      dot: 'bg-rose-400',
      pill: 'text-rose-300 bg-rose-400/10 border-rose-400/25',
      bg: 'rgba(251,113,133,0.05)',
      border: 'rgba(251,113,133,0.18)',
    };
  if (s === 'Medium')
    return {
      dot: 'bg-amber-400',
      pill: 'text-amber-300 bg-amber-400/10 border-amber-400/25',
      bg: 'rgba(251,191,36,0.05)',
      border: 'rgba(251,191,36,0.16)',
    };
  // Opportunity (and fallback)
  return {
    dot: 'bg-teal-400',
    pill: 'text-teal-300 bg-teal-400/10 border-teal-400/25',
    bg: 'rgba(20,184,166,0.05)',
    border: 'rgba(20,184,166,0.18)',
  };
}

function confidenceClass(c: InsightConfidence) {
  if (c === 'High') return 'text-teal-400/80 bg-teal-400/8 border-teal-400/20';
  if (c === 'Medium') return 'text-slate-400 bg-slate-400/8 border-slate-400/20';
  return 'text-rose-300/70 bg-rose-400/8 border-rose-400/15';
}

/* ─── Real alert card ───────────────────────────────────────────── */
function InsightCard({ insight, rank }: { insight: ActionInsight; rank: number }) {
  const t = severityTokens(insight.severity);
  return (
    <div
      className="rounded-lg px-3.5 py-2.5 flex flex-col gap-1.5"
      style={{ background: t.bg, border: `1px solid ${t.border}` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[9px] tabular-nums text-slate-700 shrink-0 font-medium w-3">{rank}.</span>
          <span className={`w-[5px] h-[5px] rounded-full shrink-0 mt-[3px] ${t.dot}`} />
          <span className="text-[11px] font-semibold text-slate-100 leading-tight">{insight.title}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className={`text-[9px] font-semibold rounded-full px-1.5 py-0.5 border ${t.pill}`}>
            {insight.severity}
          </span>
          <span className={`text-[9px] font-medium rounded-full px-1.5 py-0.5 border ${confidenceClass(insight.confidence)}`}>
            {insight.confidence}
          </span>
        </div>
      </div>
      <p className="text-[10px] text-slate-400 leading-snug pl-[22px]">{insight.explanation}</p>
      <div className="flex items-start gap-1.5 pl-[22px]">
        <span className="text-teal-500/40 text-[11px] shrink-0 leading-none mt-px">→</span>
        <p className="text-[10px] text-slate-500 leading-snug">{insight.action}</p>
      </div>
    </div>
  );
}

/* ─── Monitoring / system-status row ───────────────────────────── */
function MonitoringRow({ insight }: { insight: ActionInsight }) {
  return (
    <div
      className="rounded-lg px-3.5 py-2 flex flex-col gap-0.5"
      style={{
        background: 'rgba(255,255,255,0.013)',
        border: '1px solid rgba(29,58,82,0.22)',
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-[4px] h-[4px] rounded-full shrink-0 bg-slate-700"
          />
          <span className="text-[10px] font-medium text-slate-500 leading-snug">{insight.title}</span>
        </div>
        <span
          className="text-[8px] font-medium text-slate-700 uppercase tracking-widest shrink-0 rounded-full px-1.5 py-0.5"
          style={{ border: '1px solid rgba(29,58,82,0.3)' }}
        >
          Monitoring
        </span>
      </div>
      <p className="text-[9px] text-slate-600 leading-snug pl-[13px]">{insight.explanation}</p>
    </div>
  );
}

/* ─── Panel ─────────────────────────────────────────────────────── */
export function ActionCenter({ data, kpis, focusedState, forecastQuality }: ActionCenterProps) {
  const insights = useMemo(
    () => generateInsights(data, kpis, focusedState, forecastQuality),
    [data, kpis, focusedState, forecastQuality],
  );

  const realAlerts = insights.filter((i) => i.severity !== 'Monitoring');
  const monitoringItems = insights.filter((i) => i.severity === 'Monitoring');
  const activeCount = realAlerts.length;

  let realRank = 0;

  return (
    <div
      className="rounded-xl flex flex-col overflow-hidden"
      style={{
        background: 'var(--fs-surface-hi)',
        border: '1px solid rgba(29,58,82,0.5)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5 shrink-0"
        style={{ borderBottom: '1px solid rgba(29,58,82,0.4)' }}
      >
        <div className="flex items-center gap-2">
          <h2 className="text-[10px] font-semibold text-slate-300 tracking-widest uppercase">
            Action Center
          </h2>
          <span className="text-[9px] text-slate-600">
            {activeCount > 0
              ? `${activeCount} active signal${activeCount !== 1 ? 's' : ''}`
              : 'No active alerts'
            } · {HEURISTIC_COUNT} heuristics evaluated
          </span>
        </div>
        <span
          className="text-[9px] text-slate-600 rounded-full px-2 py-0.5"
          style={{ border: '1px solid rgba(29,58,82,0.6)' }}
        >
          FieldSignal heuristic
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 px-3.5 py-3 flex flex-col gap-2 overflow-y-auto">
        {/* Real alert cards — ranked */}
        {realAlerts.map((insight) => {
          realRank += 1;
          return <InsightCard key={insight.id} insight={insight} rank={realRank} />;
        })}

        {/* Visual separator between alerts and monitoring items */}
        {realAlerts.length > 0 && monitoringItems.length > 0 && (
          <div className="flex items-center gap-2 pt-0.5">
            <div className="flex-1 h-px" style={{ background: 'rgba(29,58,82,0.25)' }} />
            <span className="text-[8px] text-slate-700 uppercase tracking-widest">System Status</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(29,58,82,0.25)' }} />
          </div>
        )}

        {/* Monitoring / status rows */}
        {monitoringItems.map((insight) => (
          <MonitoringRow key={insight.id} insight={insight} />
        ))}
      </div>

      {/* Footer */}
      <div
        className="px-4 py-2 shrink-0 flex items-center justify-between gap-3"
        style={{ borderTop: '1px solid rgba(29,58,82,0.3)' }}
      >
        <p className="text-[9px] text-slate-700 tabular-nums">
          Monitoring {kpis.activeStates} state{kpis.activeStates !== 1 ? 's' : ''} · {HEURISTIC_COUNT} heuristics evaluated · EIA dataset
        </p>
        <p className="text-[9px] text-slate-700 shrink-0">Not official EIA analysis</p>
      </div>
    </div>
  );
}
