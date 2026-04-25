/**
 * Pure data-transformation helpers for EIA production records.
 * No Node.js imports — safe to use in both Server and Client Components.
 */

import type { ProductionRecord, KPIResult, ForecastBar, StateStats } from '@/types';

// ─── Basic accessors ──────────────────────────────────────────────────────────

export function getRegions(data: ProductionRecord[]): string[] {
  return [...new Set(data.map((r) => r.region))].sort();
}

export function getYears(data: ProductionRecord[]): number[] {
  return [...new Set(data.map((r) => r.year))].sort((a, b) => a - b);
}

export function filterByYear(
  data: ProductionRecord[],
  yearMin: number,
  yearMax: number
): ProductionRecord[] {
  return data.filter((r) => r.year >= yearMin && r.year <= yearMax);
}

// ─── Number formatter ─────────────────────────────────────────────────────────

/** Format large numbers with K / M suffixes. */
export function fmt(value: number, decimals = 1): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(decimals)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(decimals)}K`;
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

// ─── KPI computation ──────────────────────────────────────────────────────────

const EMPTY_KPI: KPIResult = {
  activeStates: 0,
  topOilState: '—',
  topOilSharePct: 0,
  latestYear: 0,
  totalOilLatestKbbl: 0,
  yoyOilGrowthPct: null,
};

export function computeKPIs(data: ProductionRecord[]): KPIResult {
  if (!data.length) return EMPTY_KPI;

  const latestYear = Math.max(...data.map((r) => r.year));
  const prevYear = latestYear - 1;

  const latestOil = data.filter(
    (r) => r.production_type === 'oil' && r.year === latestYear
  );
  const prevOil = data.filter(
    (r) => r.production_type === 'oil' && r.year === prevYear
  );

  const totalLatest = latestOil.reduce((s, r) => s + r.value, 0);
  const totalPrev = prevOil.reduce((s, r) => s + r.value, 0);

  const topRow = latestOil.reduce<{ region: string; value: number }>(
    (best, r) => (r.value > best.value ? r : best),
    { region: '—', value: 0 }
  );

  const topShare = totalLatest > 0 ? (topRow.value / totalLatest) * 100 : 0;
  const yoy =
    totalPrev > 0 ? ((totalLatest - totalPrev) / totalPrev) * 100 : null;

  return {
    activeStates: new Set(data.map((r) => r.region)).size,
    topOilState: topRow.region,
    topOilSharePct: Math.round(topShare * 10) / 10,
    latestYear,
    totalOilLatestKbbl: Math.round(totalLatest),
    yoyOilGrowthPct: yoy !== null ? Math.round(yoy * 10) / 10 : null,
  };
}

// ─── Chart data ───────────────────────────────────────────────────────────────

/**
 * Aggregate data to one bar per year (sum of all regions).
 * Milestone 4 will overlay a forecast projection here.
 */
export function buildForecastBars(
  data: ProductionRecord[],
  productionType: ProductionRecord['production_type'] = 'oil'
): ForecastBar[] {
  const totals: Record<number, number> = {};

  for (const r of data) {
    if (r.production_type !== productionType) continue;
    totals[r.year] = (totals[r.year] ?? 0) + r.value;
  }

  return Object.entries(totals)
    .map(([year, value]) => ({
      year: Number(year),
      value,
      forecast: false as const,
    }))
    .sort((a, b) => a.year - b.year);
}

// ─── State comparison ─────────────────────────────────────────────────────────

export function getStateStats(
  data: ProductionRecord[],
  region: string
): StateStats {
  const rows = data.filter((r) => r.region === region);
  if (!rows.length) {
    return { latestYear: 0, oilKbbl: 0, gasMMcf: 0, oilYoYPct: null, gasYoYPct: null };
  }

  const latestYear = Math.max(...rows.map((r) => r.year));
  const prevYear = latestYear - 1;

  const pick = (type: ProductionRecord['production_type'], year: number) =>
    rows.find((r) => r.production_type === type && r.year === year);

  const lo = pick('oil', latestYear);
  const po = pick('oil', prevYear);
  const lg = pick('gas', latestYear);
  const pg = pick('gas', prevYear);

  const pct = (curr?: ProductionRecord, prev?: ProductionRecord) =>
    curr && prev && prev.value > 0
      ? Math.round(((curr.value - prev.value) / prev.value) * 1000) / 10
      : null;

  return {
    latestYear,
    oilKbbl: lo?.value ?? 0,
    gasMMcf: lg?.value ?? 0,
    oilYoYPct: pct(lo, po),
    gasYoYPct: pct(lg, pg),
  };
}
