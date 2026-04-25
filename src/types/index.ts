// ─── UI / filter types ────────────────────────────────────────────────────────

export type Basin =
  | 'Permian'
  | 'Bakken'
  | 'Eagle Ford'
  | 'Marcellus'
  | 'Haynesville'
  | 'DJ Basin'
  | 'Appalachia';

export type ProductionType = 'oil' | 'gas' | 'both';

export interface FilterState {
  yearRange: [number, number];
  basin: Basin | 'all';
  states: string[];
  productionType: ProductionType | 'all';
}

export interface KPIData {
  id: string;
  label: string;
  value: string;
  unit?: string;
  change: string;
  changePositive: boolean;
  icon: string;
  badge?: string;
  description?: string;
}

// ─── EIA dataset types ────────────────────────────────────────────────────────

/** One row from data/processed/production_yearly.json */
export interface ProductionRecord {
  year: number;
  region: string;
  production_type: 'oil' | 'gas';
  /** Annual total in the unit below */
  value: number;
  /** "Thousand Barrels (annual total)" | "Million Cubic Feet (annual total)" */
  unit: string;
  months_reported: number;
  source: string;
}

/** Computed summary metrics derived from a filtered ProductionRecord slice */
export interface KPIResult {
  activeStates: number;
  topOilState: string;
  topOilSharePct: number;
  latestYear: number;
  totalOilLatestKbbl: number;
  yoyOilGrowthPct: number | null;
}

/** One bar in the production chart */
export interface ForecastBar {
  year: number;
  value: number;
  forecast: boolean;
}

/** Per-state summary for the compare panel */
export interface StateStats {
  latestYear: number;
  oilKbbl: number;
  gasMMcf: number;
  oilYoYPct: number | null;
  gasYoYPct: number | null;
}
