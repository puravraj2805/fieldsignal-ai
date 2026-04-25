import { fmt } from '@/lib/production';
import type { KPIData, KPIResult } from '@/types';

interface KPIGridProps {
  metrics: KPIResult;
  projected2028?: number | null;
}

function buildKPIs(m: KPIResult, projected2028?: number | null): KPIData[] {
  const prevYear = m.latestYear - 1;
  const yoyLabel =
    m.yoyOilGrowthPct !== null
      ? `${m.yoyOilGrowthPct >= 0 ? '+' : ''}${m.yoyOilGrowthPct}% vs ${prevYear}`
      : 'insufficient data';

  const cards: KPIData[] = [
    {
      id: 'total-oil',
      label: `Total Oil ${m.latestYear || '—'}`,
      value: m.totalOilLatestKbbl ? fmt(m.totalOilLatestKbbl) : '—',
      unit: 'Kbbl',
      change: yoyLabel,
      changePositive: (m.yoyOilGrowthPct ?? 0) >= 0,
      icon: '🛢️',
    },
    {
      id: 'top-state',
      label: 'Top Oil State',
      value: m.topOilState,
      change:
        m.topOilSharePct > 0 ? `${m.topOilSharePct}% of tracked total` : '—',
      changePositive: true,
      icon: '📍',
    },
    {
      id: 'states',
      label: 'States Tracked',
      value: m.activeStates > 0 ? String(m.activeStates) : '—',
      unit: 'states',
      change: 'EIA dataset',
      changePositive: true,
      icon: '🗺️',
    },
    {
      id: 'yoy',
      label: 'YoY Oil Growth',
      value:
        m.yoyOilGrowthPct !== null
          ? `${m.yoyOilGrowthPct >= 0 ? '+' : ''}${m.yoyOilGrowthPct}%`
          : '—',
      change:
        m.latestYear > 0 ? `${prevYear} → ${m.latestYear}` : 'no data',
      changePositive: (m.yoyOilGrowthPct ?? 0) >= 0,
      icon: '📈',
    },
  ];

  if (projected2028 != null && projected2028 > 0) {
    cards.push({
      id: 'proj-2028',
      label: 'Projected 2028 Oil',
      value: fmt(projected2028),
      unit: 'Kbbl',
      change: 'CAGR model · Forecast',
      changePositive: true,
      icon: '🔮',
      badge: 'FORECAST',
      description: 'CAGR-based forecast from EIA history (5-year window, clamped).',
    });
  }

  return cards;
}

export function KPIGrid({ metrics, projected2028 }: KPIGridProps) {
  const kpis = buildKPIs(metrics, projected2028);
  const colClass =
    kpis.length === 5
      ? 'grid grid-cols-2 sm:grid-cols-5'
      : 'grid grid-cols-2 sm:grid-cols-4';

  return (
    <div className={`${colClass} divide-x divide-[#142030]/80`}>
      {kpis.map((kpi) => (
        <KPICard key={kpi.id} kpi={kpi} />
      ))}
    </div>
  );
}

function KPICard({ kpi }: { kpi: KPIData }) {
  return (
    <div className="px-5 py-4 hover:bg-white/[0.02] transition-colors">
      {/* Label row */}
      <div className="flex items-start justify-between mb-3">
        <span className="text-[10px] font-medium text-slate-500 uppercase tracking-widest leading-tight pr-2">
          {kpi.label}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {kpi.badge && (
            <span className="text-[9px] font-bold text-teal-400 bg-teal-400/10 border border-teal-400/25 rounded-full px-1.5 py-0.5 leading-none">
              {kpi.badge}
            </span>
          )}
          <span className="text-sm leading-none opacity-30">{kpi.icon}</span>
        </div>
      </div>

      {/* Value */}
      <div className="mb-2">
        <span className="text-xl font-bold text-white tabular-nums tracking-tight">
          {kpi.value}
        </span>
        {kpi.unit && (
          <span className="text-[10px] text-slate-600 ml-1.5">{kpi.unit}</span>
        )}
      </div>

      {/* Change indicator */}
      <div
        className={`text-[10px] font-medium flex items-center gap-1 ${
          kpi.changePositive ? 'text-teal-400' : 'text-rose-400'
        }`}
      >
        <span>{kpi.changePositive ? '▲' : '▼'}</span>
        <span>{kpi.change}</span>
      </div>

      {kpi.description && (
        <p className="text-[10px] text-slate-700 mt-1.5 leading-tight">
          {kpi.description}
        </p>
      )}
    </div>
  );
}
