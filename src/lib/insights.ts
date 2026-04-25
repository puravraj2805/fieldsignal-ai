import type { ProductionRecord, KPIResult } from '@/types';
import { getStateStats } from './production';

export type InsightSeverity = 'High' | 'Medium' | 'Opportunity' | 'Monitoring';
export type InsightConfidence = 'High' | 'Medium' | 'Low';

export interface ActionInsight {
  id: string;
  severity: InsightSeverity;
  title: string;
  explanation: string;
  confidence: InsightConfidence;
  action: string;
}

export const HEURISTIC_COUNT = 6;

const SEVERITY_ORDER: Record<InsightSeverity, number> = {
  High: 0,
  Medium: 1,
  Opportunity: 2,
  Monitoring: 3,
};

/* ─── Real alert heuristics ────────────────────────────────────── */
export function generateInsights(
  data: ProductionRecord[],
  kpis: KPIResult,
  focusedState: string | null,
  forecastQuality: number,
): ActionInsight[] {
  const alerts: ActionInsight[] = [];

  // Concentration risk: top state > 50% of tracked production
  if (kpis.topOilState !== '—' && kpis.topOilSharePct > 50) {
    alerts.push({
      id: 'concentration-risk',
      severity: kpis.topOilSharePct > 65 ? 'High' : 'Medium',
      title: `Concentration risk: ${kpis.topOilState}`,
      explanation: `${kpis.topOilState} accounts for ${kpis.topOilSharePct.toFixed(0)}% of tracked oil output — a single-state disruption would materially impact aggregate production.`,
      confidence: 'High',
      action: `Evaluate exposure to ${kpis.topOilState} operational risk and review diversification across secondary producing states.`,
    });
  }

  // YoY production contraction
  if (kpis.yoyOilGrowthPct !== null && kpis.yoyOilGrowthPct < -5) {
    alerts.push({
      id: 'production-decline',
      severity: 'High',
      title: 'Year-over-year production contraction',
      explanation: `Tracked U.S. oil production fell ${Math.abs(kpis.yoyOilGrowthPct).toFixed(1)}% YoY — a contraction that may signal upstream headwinds or depletion pressure.`,
      confidence: 'High',
      action: 'Identify which states are driving the decline. Cross-reference rig count and permitting data to determine structural vs. cyclical cause.',
    });
  }

  // Limited data coverage
  if (kpis.activeStates < 8) {
    alerts.push({
      id: 'coverage-warning',
      severity: 'Medium',
      title: 'Limited EIA state coverage',
      explanation: `Only ${kpis.activeStates} producing states are in the current dataset. Portfolio-level diversification conclusions may be incomplete.`,
      confidence: 'Medium',
      action: 'Expand EIA data ingestion to additional producing states before finalizing national-level exposure assessments.',
    });
  }

  // Forecast fragility
  if (forecastQuality > 0 && forecastQuality < 0.5) {
    alerts.push({
      id: 'forecast-fragility',
      severity: 'Medium',
      title: 'Forecast carries elevated uncertainty',
      explanation: `The 2028 projection model scores ${forecastQuality.toFixed(2)}/1.00 — reflecting limited history or high growth volatility in the data window.`,
      confidence: 'Low',
      action: 'Treat 2028 projections as directional signals only. Supplement with EIA Annual Energy Outlook for capital planning decisions.',
    });
  }

  // Focused state outperformance / underperformance
  if (focusedState && kpis.yoyOilGrowthPct !== null) {
    const focusedStats = getStateStats(data, focusedState);
    const stateYoY = focusedStats?.oilYoYPct ?? null;
    const avg = kpis.yoyOilGrowthPct;
    if (stateYoY !== null && stateYoY > avg + 5) {
      alerts.push({
        id: 'state-outperform',
        severity: 'Opportunity',
        title: `${focusedState} outpacing national tracked average`,
        explanation: `${focusedState} grew oil production ${stateYoY.toFixed(1)}% YoY vs. the tracked average of ${avg.toFixed(1)}% — meaningful relative outperformance.`,
        confidence: 'High',
        action: `Investigate ${focusedState} basin activity and infrastructure buildout for potential strategic overweight in the planning cycle.`,
      });
    } else if (stateYoY !== null && stateYoY < avg - 5) {
      alerts.push({
        id: 'state-underperform',
        severity: 'Medium',
        title: `${focusedState} underperforming the tracked average`,
        explanation: `${focusedState} grew ${stateYoY.toFixed(1)}% YoY vs. the ${avg.toFixed(1)}% tracked average — below-trend performance warrants review.`,
        confidence: 'High',
        action: `Review production drivers in ${focusedState}. Determine whether underperformance is structural or a temporary cycle effect.`,
      });
    }
  }

  // Strong growth opportunity
  if (kpis.yoyOilGrowthPct !== null && kpis.yoyOilGrowthPct > 8) {
    alerts.push({
      id: 'strong-growth',
      severity: 'Opportunity',
      title: 'Above-trend production growth',
      explanation: `Tracked production grew ${kpis.yoyOilGrowthPct.toFixed(1)}% YoY — above historical norms. This may signal mid-cycle capacity expansion worth capturing.`,
      confidence: 'Medium',
      action: 'Verify whether growth is broad-based or concentrated in one state. Compare rig counts and permit data to assess durability.',
    });
  }

  const sorted = alerts
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
    .slice(0, 6);

  // Pad to minimum 3 total items with monitoring layer
  if (sorted.length < 3) {
    const firedIds = new Set(sorted.map((i) => i.id));
    const monitoring = buildMonitoringPool(kpis, focusedState, forecastQuality, firedIds);
    const needed = 3 - sorted.length;
    sorted.push(...monitoring.slice(0, needed));
  }

  return sorted;
}

/* ─── Monitoring layer — contextual "nothing happened" items ────── */
function buildMonitoringPool(
  kpis: KPIResult,
  focusedState: string | null,
  forecastQuality: number,
  firedIds: Set<string>,
): ActionInsight[] {
  const pool: ActionInsight[] = [];

  // Concentration within range (when concentration-risk did not fire)
  if (!firedIds.has('concentration-risk') && kpis.topOilState !== '—' && kpis.topOilSharePct > 0) {
    pool.push({
      id: 'mon-concentration',
      severity: 'Monitoring',
      title: 'Concentration within acceptable range',
      explanation: `${kpis.topOilState} at ${kpis.topOilSharePct.toFixed(0)}% of tracked output — below risk threshold. No single-state exposure concern.`,
      confidence: 'High',
      action: 'No action required. Continue monitoring state-level share trends.',
    });
  }

  // YoY within normal band (when neither decline nor strong-growth fired)
  if (
    !firedIds.has('production-decline') &&
    !firedIds.has('strong-growth') &&
    kpis.yoyOilGrowthPct !== null
  ) {
    const sign = kpis.yoyOilGrowthPct >= 0 ? '+' : '';
    pool.push({
      id: 'mon-yoy',
      severity: 'Monitoring',
      title: 'Production trend within normal band',
      explanation: `YoY movement of ${sign}${kpis.yoyOilGrowthPct.toFixed(1)}% — no anomaly thresholds triggered. Growth is tracking within expected range.`,
      confidence: 'High',
      action: 'No action required. Monitor for trend shifts in the next EIA data release.',
    });
  }

  // Coverage adequate (when coverage-warning did not fire)
  if (!firedIds.has('coverage-warning') && kpis.activeStates >= 8) {
    pool.push({
      id: 'mon-coverage',
      severity: 'Monitoring',
      title: `EIA coverage stable — ${kpis.activeStates} states tracked`,
      explanation: 'State coverage is sufficient for national-level portfolio analysis. No dataset gaps detected.',
      confidence: 'High',
      action: 'No action required.',
    });
  }

  // Forecast model stable (when forecast-fragility did not fire)
  if (!firedIds.has('forecast-fragility') && forecastQuality > 0 && forecastQuality >= 0.5) {
    pool.push({
      id: 'mon-forecast',
      severity: 'Monitoring',
      title: 'Forecast model within standard parameters',
      explanation: `Quality score ${forecastQuality.toFixed(2)}/1.00 — within the acceptable confidence range for directional planning.`,
      confidence: 'High',
      action: 'No action required. Review if the data window changes significantly.',
    });
  }

  // No focused-state anomaly (when neither outperform nor underperform fired)
  if (
    focusedState &&
    !firedIds.has('state-outperform') &&
    !firedIds.has('state-underperform')
  ) {
    pool.push({
      id: 'mon-state',
      severity: 'Monitoring',
      title: `${focusedState}: no material deviation detected`,
      explanation: `Production tracking within the expected range relative to the national tracked average. No focused-state anomaly triggered.`,
      confidence: 'High',
      action: 'Continue monitoring. No state-level action warranted at this time.',
    });
  }

  // Always-available fallback
  pool.push({
    id: 'mon-stable',
    severity: 'Monitoring',
    title: 'No additional high-priority signals detected',
    explanation: 'Remaining heuristics are operating within normal thresholds for the current data window.',
    confidence: 'High',
    action: 'No action required.',
  });

  return pool;
}
