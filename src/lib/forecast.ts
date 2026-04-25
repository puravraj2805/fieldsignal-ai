/**
 * Explainable forecasting module — FieldSignal AI Milestone 4.
 * Uses a clamped CAGR approach so the math can be described in plain language.
 */

import type { ProductionRecord } from '@/types';

export type ForecastPoint = {
  year: number;
  value: number;
  kind: 'oil' | 'gas' | 'total';
  isForecast: boolean;
};

/** Aggregate filtered records into one point per year, summed across all states. */
export function buildHistoricalSeries(
  records: ProductionRecord[],
  kind: 'oil' | 'gas' | 'total'
): ForecastPoint[] {
  const totals: Record<number, number> = {};
  for (const r of records) {
    if (kind !== 'total' && r.production_type !== kind) continue;
    totals[r.year] = (totals[r.year] ?? 0) + r.value;
  }
  return Object.entries(totals)
    .map(([year, value]) => ({ year: Number(year), value, kind, isForecast: false }))
    .sort((a, b) => a.year - b.year);
}

/**
 * Extend a historical series with a CAGR-based projection.
 *
 * Method:
 *   1. Take the last 5 non-zero data points as the growth window.
 *   2. Compute CAGR = (end / start) ^ (1/n) − 1 over that window.
 *   3. Clamp to [−5 %, +20 %] to prevent implausible extrapolation on short windows.
 *   4. Extrapolate year-by-year up to horizonYear using: value_t = value_(t-1) × (1 + CAGR).
 *
 * Quality score (0–1, higher = more reliable):
 *   yearsScore     = min(1, historicalCount / 10)   — more years → higher confidence
 *   stabilityScore = max(0, 1 − stdDev(yoyRates) / 0.30) — lower annual volatility → higher confidence
 *   quality        = (yearsScore + stabilityScore) / 2
 */
export function extendWithForecast(
  historical: ForecastPoint[],
  horizonYear = 2030
): { series: ForecastPoint[]; quality: number } {
  if (historical.length === 0) return { series: [], quality: 0 };

  const nonZero = historical.filter((p) => p.value > 0);
  const window = nonZero.slice(-5); // last 5 non-zero years

  if (window.length < 2) return { series: historical, quality: 0 };

  // CAGR over the window
  const n = window.length - 1;
  const rawCagr = Math.pow(window[n].value / window[0].value, 1 / n) - 1;
  const cagr = Math.max(-0.05, Math.min(0.20, rawCagr));

  // YoY growth rates for variance / stability calculation
  const yoyRates: number[] = [];
  for (let i = 1; i <= n; i++) {
    if (window[i - 1].value > 0) {
      yoyRates.push((window[i].value - window[i - 1].value) / window[i - 1].value);
    }
  }

  const mean = yoyRates.reduce((s, r) => s + r, 0) / yoyRates.length;
  const variance = yoyRates.reduce((s, r) => s + (r - mean) ** 2, 0) / yoyRates.length;
  const stdDev = Math.sqrt(variance);
  // 0.30 = 30 % std-dev threshold; above that stability falls to 0
  const stabilityScore = Math.max(0, 1 - stdDev / 0.3);
  const yearsScore = Math.min(1, historical.length / 10);
  const quality = Math.round(((yearsScore + stabilityScore) / 2) * 100) / 100;

  // Extrapolate from the last historical year
  const lastYear = Math.max(...historical.map((p) => p.year));
  const lastValue = historical.find((p) => p.year === lastYear)?.value ?? window[n].value;
  const kind = historical[0].kind;

  const forecasted: ForecastPoint[] = [];
  let prev = lastValue;
  for (let y = lastYear + 1; y <= horizonYear; y++) {
    prev = prev * (1 + cagr);
    forecasted.push({ year: y, value: Math.round(prev), kind, isForecast: true });
  }

  return { series: [...historical, ...forecasted], quality };
}
