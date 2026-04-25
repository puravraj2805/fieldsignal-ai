export interface WellInputs {
  initialRateBblDay: number;
  annualDeclineRate: number;    // fraction, e.g. 0.35 = 35%
  wellLifeYears: number;
  oilPriceDollarsPerBbl: number;
  capexDollars: number;
  monthlyLOEDollars: number;
  discountRate: number;         // fraction, e.g. 0.10 = 10%
}

export interface StatePreset {
  label: string;
  basin: string;
  initialRateBblDay: number;
  annualDeclineRate: number;    // fraction
  capexDollars: number;
  monthlyLOEDollars: number;
}

export const DEFAULT_INPUTS: WellInputs = {
  initialRateBblDay: 300,
  annualDeclineRate: 0.35,
  wellLifeYears: 10,
  oilPriceDollarsPerBbl: 70,
  capexDollars: 8_000_000,
  monthlyLOEDollars: 15_000,
  discountRate: 0.10,
};

export const STATE_PRESETS: Record<string, StatePreset> = {
  'Texas': {
    label: 'Texas', basin: 'Permian Basin',
    initialRateBblDay: 500, annualDeclineRate: 0.35,
    capexDollars: 9_000_000, monthlyLOEDollars: 18_000,
  },
  'North Dakota': {
    label: 'North Dakota', basin: 'Bakken',
    initialRateBblDay: 350, annualDeclineRate: 0.40,
    capexDollars: 8_500_000, monthlyLOEDollars: 16_000,
  },
  'New Mexico': {
    label: 'New Mexico', basin: 'Permian / Delaware',
    initialRateBblDay: 450, annualDeclineRate: 0.33,
    capexDollars: 9_000_000, monthlyLOEDollars: 17_000,
  },
  'Colorado': {
    label: 'Colorado', basin: 'DJ Basin',
    initialRateBblDay: 200, annualDeclineRate: 0.28,
    capexDollars: 7_000_000, monthlyLOEDollars: 12_000,
  },
  'Wyoming': {
    label: 'Wyoming', basin: 'Powder River',
    initialRateBblDay: 150, annualDeclineRate: 0.25,
    capexDollars: 6_000_000, monthlyLOEDollars: 10_000,
  },
  'Oklahoma': {
    label: 'Oklahoma', basin: 'STACK / SCOOP',
    initialRateBblDay: 150, annualDeclineRate: 0.28,
    capexDollars: 6_500_000, monthlyLOEDollars: 12_000,
  },
  'California': {
    label: 'California', basin: 'San Joaquin',
    initialRateBblDay: 100, annualDeclineRate: 0.18,
    capexDollars: 5_000_000, monthlyLOEDollars: 18_000,
  },
  'Pennsylvania': {
    label: 'Pennsylvania', basin: 'Marcellus',
    initialRateBblDay: 80, annualDeclineRate: 0.22,
    capexDollars: 5_000_000, monthlyLOEDollars: 8_000,
  },
  'West Virginia': {
    label: 'West Virginia', basin: 'Appalachia',
    initialRateBblDay: 80, annualDeclineRate: 0.22,
    capexDollars: 4_500_000, monthlyLOEDollars: 8_000,
  },
  'Ohio': {
    label: 'Ohio', basin: 'Utica',
    initialRateBblDay: 80, annualDeclineRate: 0.22,
    capexDollars: 4_500_000, monthlyLOEDollars: 8_000,
  },
};

export interface AnnualPoint {
  year: number;
  productionKbbl: number;
  revenue: number;
  ncf: number;
  cumulative: number;   // cumulative NCF including capex at t=0
}

export interface WellEconomicsResult {
  eurKbbl: number;
  npvDollars: number;
  irrPct: number | null;          // null when no real IRR solution
  paybackMonths: number | null;   // null when project never breaks even
  breakEvenPriceDollars: number;
  annual: AnnualPoint[];
  profitable: boolean;
}

const DAYS_PER_MONTH = 365.25 / 12; // 30.4375

function npvAtRate(cashFlows: number[], annualRate: number): number {
  return cashFlows.reduce((acc, cf, month) => {
    return acc + cf / Math.pow(1 + annualRate, month / 12);
  }, 0);
}

// Bisection method to find IRR. Returns null when no real solution exists.
function bisectIRR(cashFlows: number[]): number | null {
  let hasNeg = false;
  let hasPos = false;
  for (const cf of cashFlows) {
    if (cf < 0) hasNeg = true;
    if (cf > 0) hasPos = true;
  }
  if (!hasNeg || !hasPos) return null;

  const f = (r: number) => npvAtRate(cashFlows, r);
  const lo = -0.9999;
  const hi = 9.0;
  if (f(lo) * f(hi) > 0) return null;

  let low = lo;
  let high = hi;
  for (let i = 0; i < 120; i++) {
    const mid = (low + high) / 2;
    if (Math.abs(high - low) < 1e-8) return mid;
    if (f(low) * f(mid) <= 0) high = mid;
    else low = mid;
  }
  return (low + high) / 2;
}

export function computeWellEconomics(inputs: WellInputs): WellEconomicsResult {
  const {
    initialRateBblDay,
    annualDeclineRate,
    wellLifeYears,
    oilPriceDollarsPerBbl,
    capexDollars,
    monthlyLOEDollars,
    discountRate,
  } = inputs;

  const totalMonths = Math.round(wellLifeYears * 12);

  // cashFlows[0] = -capex at month 0; cashFlows[m] = net cash flow at month m
  const cashFlows: number[] = [-capexDollars];

  let totalProductionBbl = 0;
  let discountedProdSum = 0; // Σ prod_m / (1+r)^(m/12)
  let discountedDfSum = 0;   // Σ 1 / (1+r)^(m/12)  — used for breakeven price

  const annualMap = new Map<number, AnnualPoint>();
  for (let yr = 1; yr <= wellLifeYears; yr++) {
    annualMap.set(yr, { year: yr, productionKbbl: 0, revenue: 0, ncf: 0, cumulative: 0 });
  }

  for (let m = 1; m <= totalMonths; m++) {
    // Midpoint-of-month convention for decline evaluation
    const t = (m - 0.5) / 12;
    const dailyRate = initialRateBblDay * Math.exp(-annualDeclineRate * t);
    const monthlyProdBbl = dailyRate * DAYS_PER_MONTH;

    const revenue = monthlyProdBbl * oilPriceDollarsPerBbl;
    const ncf = revenue - monthlyLOEDollars;

    cashFlows.push(ncf);
    totalProductionBbl += monthlyProdBbl;

    const dfInv = 1 / Math.pow(1 + discountRate, m / 12);
    discountedProdSum += monthlyProdBbl * dfInv;
    discountedDfSum += dfInv;

    const yr = Math.ceil(m / 12);
    if (yr <= wellLifeYears) {
      const pt = annualMap.get(yr)!;
      pt.productionKbbl += monthlyProdBbl / 1000;
      pt.revenue += revenue;
      pt.ncf += ncf;
    }
  }

  // Cumulative NCF includes the upfront capex at year 0
  let cumulative = -capexDollars;
  const annual = Array.from(annualMap.values()).sort((a, b) => a.year - b.year);
  for (const pt of annual) {
    cumulative += pt.ncf;
    pt.cumulative = cumulative;
  }

  const npvDollars = npvAtRate(cashFlows, discountRate);

  const irrFraction = bisectIRR(cashFlows);
  // Only surface positive IRR — negative IRR is not meaningful for capital investment decisions
  const irrPct = irrFraction !== null && irrFraction > 0 ? irrFraction * 100 : null;

  let cum = -capexDollars;
  let paybackMonths: number | null = null;
  for (let m = 1; m < cashFlows.length; m++) {
    cum += cashFlows[m];
    if (cum >= 0) {
      paybackMonths = m;
      break;
    }
  }

  // Closed-form breakeven price: NPV=0 ⟹ price = (capex + LOE·Σdfᵢ) / Σ(prodₘ·dfᵢ)
  const breakEvenPriceDollars = discountedProdSum > 0
    ? (capexDollars + monthlyLOEDollars * discountedDfSum) / discountedProdSum
    : 0;

  return {
    eurKbbl: totalProductionBbl / 1000,
    npvDollars,
    irrPct,
    paybackMonths,
    breakEvenPriceDollars,
    annual,
    profitable: npvDollars > 0,
  };
}
