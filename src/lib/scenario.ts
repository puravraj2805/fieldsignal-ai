import type { ForecastPoint } from './forecast';

export type ScenarioType = 'Downside' | 'Base' | 'Upside';

export interface ScenarioParams {
  type: ScenarioType;
  /** Adjustment in basis points: −500 to +500 (= −5 pp to +5 pp) */
  cagrAdjBps: number;
}

export interface ScenarioResult {
  projected2028: number;
  deltaVsBase: number | null;
  deltaVsBasePct: number | null;
  topRisk: string;
  bestDiversification: string;
  confidence: 'High' | 'Medium' | 'Low';
  cagrUsed: number;
}

const SCENARIO_BASE_CAGR: Record<ScenarioType, number> = {
  Downside: -0.02,
  Base:      0.025,
  Upside:    0.055,
};

export function runScenario(
  historicalSeries: ForecastPoint[],
  params: ScenarioParams,
  topOilState: string,
  regions: string[],
  baseProjected2028: number | null,
): ScenarioResult {
  const historical = historicalSeries.filter((p) => !p.isForecast);

  if (historical.length === 0) {
    return {
      projected2028: 0,
      deltaVsBase: null,
      deltaVsBasePct: null,
      topRisk: 'Insufficient historical data — expand EIA coverage',
      bestDiversification: 'Expand data coverage first',
      confidence: 'Low',
      cagrUsed: 0,
    };
  }

  const rawCAGR = SCENARIO_BASE_CAGR[params.type] + params.cagrAdjBps / 10000;
  const cagrUsed = Math.max(-0.10, Math.min(0.25, rawCAGR));

  const lastPoint = historical[historical.length - 1];
  const yearsToProject = 2028 - lastPoint.year;
  const projected2028 =
    yearsToProject > 0
      ? Math.round(lastPoint.value * Math.pow(1 + cagrUsed, yearsToProject))
      : lastPoint.value;

  const deltaVsBase = baseProjected2028 !== null ? projected2028 - baseProjected2028 : null;
  const deltaVsBasePct =
    baseProjected2028 !== null && baseProjected2028 > 0
      ? Math.round(((projected2028 - baseProjected2028) / baseProjected2028) * 1000) / 10
      : null;

  let topRisk: string;
  if (params.type === 'Downside') {
    topRisk = `Concentrated ${topOilState} exposure amplifies downside under declining CAGR (${(cagrUsed * 100).toFixed(1)}%/yr)`;
  } else if (cagrUsed > 0.08) {
    topRisk = `Elevated CAGR assumption (${(cagrUsed * 100).toFixed(1)}%/yr) is historically atypical — high sensitivity to single-state disruptions`;
  } else {
    topRisk = `Small CAGR shifts materially affect 2028 projections — validate against EIA Annual Energy Outlook`;
  }

  const nonTop = regions.filter((r) => r !== topOilState);
  const bestDiversification =
    nonTop.length > 0 ? nonTop[Math.floor(nonTop.length * 0.3)] : topOilState;

  let confidence: 'High' | 'Medium' | 'Low';
  if (params.type === 'Base' && Math.abs(params.cagrAdjBps) < 100) {
    confidence = 'High';
  } else if (params.type === 'Upside' || cagrUsed > 0.07) {
    confidence = 'Low';
  } else {
    confidence = 'Medium';
  }

  return { projected2028, deltaVsBase, deltaVsBasePct, topRisk, bestDiversification, confidence, cagrUsed };
}
