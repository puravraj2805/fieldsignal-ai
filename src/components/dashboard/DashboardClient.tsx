'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  getRegions,
  getYears,
  filterByYear,
  computeKPIs,
} from '@/lib/production';
import { buildHistoricalSeries, extendWithForecast } from '@/lib/forecast';
import { generateInsights } from '@/lib/insights';
import { runScenario, type ScenarioType } from '@/lib/scenario';
import { SidebarFilters } from '@/components/layout/SidebarFilters';
import { KPIGrid } from '@/components/dashboard/KPIGrid';
import { MapPanel } from '@/components/dashboard/MapPanel';
import { ForecastPanel } from '@/components/dashboard/ForecastPanel';
import { AnalystPanel } from '@/components/dashboard/AnalystPanel';
import { ComparePanel } from '@/components/dashboard/ComparePanel';
import { ActionCenter } from '@/components/dashboard/ActionCenter';
import { ScenarioSimulator } from '@/components/dashboard/ScenarioSimulator';
import { ConfidenceStrip } from '@/components/dashboard/ConfidenceStrip';
import { WellEconomicsCalculator } from '@/components/dashboard/WellEconomicsCalculator';
import { BoardBriefModal } from '@/components/dashboard/BoardBriefModal';
import type { ProductionRecord } from '@/types';
import type { AnalystContext } from '@/app/api/analyst/route';

interface Props {
  data: ProductionRecord[];
}

export function DashboardClient({ data }: Props) {
  const years = useMemo(() => getYears(data), [data]);
  const regions = useMemo(() => getRegions(data), [data]);

  const [yearMin, setYearMin] = useState(() => years[0] ?? 2015);
  const [yearMax, setYearMax] = useState(() => years[years.length - 1] ?? 2024);
  const [regionA, setRegionA] = useState(() => regions[0] ?? 'Texas');
  const [regionB, setRegionB] = useState(() => regions[1] ?? 'North Dakota');
  const [showForecast, setShowForecast] = useState(false);
  const [focusedState, setFocusedState] = useState<string | null>(null);

  // Executive features state
  const [showBoardBrief, setShowBoardBrief] = useState(false);
  const [scenarioType, setScenarioType] = useState<ScenarioType>('Base');
  const [cagrAdjBps, setCagrAdjBps] = useState(0);

  const handleYearMin = (y: number) => setYearMin(Math.min(y, yearMax));
  const handleYearMax = (y: number) => setYearMax(Math.max(y, yearMin));

  useEffect(() => {
    if (focusedState && regions.includes(focusedState)) {
      setRegionA(focusedState);
    }
  }, [focusedState, regions]);

  const filteredData = useMemo(
    () => filterByYear(data, yearMin, yearMax),
    [data, yearMin, yearMax],
  );

  const kpiMetrics = useMemo(() => computeKPIs(filteredData), [filteredData]);

  const historicalSeries = useMemo(
    () => buildHistoricalSeries(filteredData, 'oil'),
    [filteredData],
  );

  const forecastResult = useMemo(
    () => extendWithForecast(historicalSeries),
    [historicalSeries],
  );

  const displayedSeries = showForecast ? forecastResult.series : historicalSeries;

  const projected2028 =
    forecastResult.series.find((p) => p.year === 2028)?.value ?? null;

  const analystContext = useMemo<AnalystContext>(
    () => ({
      yearRange: { min: yearMin, max: yearMax },
      topOilState: kpiMetrics.topOilState,
      totalOilLatest: kpiMetrics.totalOilLatestKbbl,
      yoyOilGrowth: kpiMetrics.yoyOilGrowthPct,
      projected2028Oil: projected2028,
      statesTracked: kpiMetrics.activeStates,
      focusedState,
    }),
    [yearMin, yearMax, kpiMetrics, projected2028, focusedState],
  );

  const insights = useMemo(
    () => generateInsights(filteredData, kpiMetrics, focusedState, forecastResult.quality),
    [filteredData, kpiMetrics, focusedState, forecastResult.quality],
  );

  const scenarioResult = useMemo(
    () =>
      runScenario(
        historicalSeries,
        { type: scenarioType, cagrAdjBps },
        kpiMetrics.topOilState,
        regions,
        projected2028,
      ),
    [historicalSeries, scenarioType, cagrAdjBps, kpiMetrics.topOilState, regions, projected2028],
  );

  if (data.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-4 opacity-30">📂</div>
          <p className="text-slate-300 font-semibold text-sm">No production data found</p>
          <p className="text-slate-500 text-xs mt-2 leading-relaxed">
            Run the ingestion script to load EIA data:
          </p>
          <pre className="text-amber-400 text-xs mt-3 bg-slate-800 rounded px-3 py-2 border border-slate-700 text-left">
            python scripts/fetch_eia.py
          </pre>
        </div>
      </div>
    );
  }

  return (
    <>
      <SidebarFilters
        years={years}
        yearMin={yearMin}
        yearMax={yearMax}
        onYearMinChange={handleYearMin}
        onYearMaxChange={handleYearMax}
        regions={regions}
        focusedState={focusedState}
        onFocusedStateChange={setFocusedState}
      />

      <main className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Page action bar */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-200 leading-none">
              Production Intelligence
            </p>
            <p className="text-[10px] text-slate-600 mt-1">
              Based on EIA data · {yearMin}–{yearMax}
              {focusedState && (
                <> · <span className="text-teal-400/70">{focusedState}</span></>
              )}
            </p>
          </div>
          <button
            onClick={() => setShowBoardBrief(true)}
            className="flex items-center gap-1.5 text-xs text-teal-400 hover:text-teal-300 rounded-lg px-3.5 py-1.5 transition-colors"
            style={{
              border: '1px solid rgba(20,184,166,0.35)',
              background: 'rgba(20,184,166,0.05)',
            }}
          >
            <span className="text-[10px]">↗</span>
            Board Brief
          </button>
        </div>

        {/* Row 1 — KPI summary band */}
        <section
          className="rounded-xl overflow-hidden"
          style={{
            background: 'var(--fs-surface)',
            border: '1px solid var(--fs-border)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.35)',
          }}
        >
          <KPIGrid metrics={kpiMetrics} projected2028={projected2028} />
        </section>

        {/* Row 2 — Choropleth map + State comparison */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <MapPanel
              data={filteredData}
              latestYear={kpiMetrics.latestYear}
              focusedState={focusedState}
              onFocusedStateChange={setFocusedState}
            />
          </div>
          <ComparePanel
            data={filteredData}
            regions={regions}
            regionA={regionA}
            regionB={regionB}
            onRegionAChange={setRegionA}
            onRegionBChange={setRegionB}
            focusedState={focusedState}
          />
        </div>

        {/* Row 3 — Production trend (full width) */}
        <ForecastPanel
          series={displayedSeries}
          fullSeries={forecastResult.series}
          quality={forecastResult.quality}
          yearMin={yearMin}
          yearMax={yearMax}
          showForecast={showForecast}
          onToggleForecast={() => setShowForecast((v) => !v)}
        />

        {/* Row 4 — Intelligence zone: Action Center + AI Analyst */}
        <div>
          <p className="text-[10px] font-semibold text-slate-700 uppercase tracking-[0.14em] mb-3 px-0.5">
            Strategic Intelligence
          </p>
          <div className="grid grid-cols-2 gap-4">
            <ActionCenter
              data={filteredData}
              kpis={kpiMetrics}
              focusedState={focusedState}
              forecastQuality={forecastResult.quality}
            />
            <AnalystPanel context={analystContext} />
          </div>
        </div>

        {/* Row 5 — Scenario Simulator */}
        <div>
          <p className="text-[10px] font-semibold text-slate-700 uppercase tracking-[0.14em] mb-3 px-0.5">
            Scenario Planning
          </p>
          <ScenarioSimulator
            scenarioType={scenarioType}
            cagrAdjBps={cagrAdjBps}
            onScenarioTypeChange={setScenarioType}
            onCagrAdjChange={setCagrAdjBps}
            result={scenarioResult}
          />
        </div>

        {/* Row 6 — Well Economics Calculator */}
        <div>
          <p className="text-[10px] font-semibold text-slate-700 uppercase tracking-[0.14em] mb-3 px-0.5">
            Well Economics
          </p>
          <WellEconomicsCalculator focusedState={focusedState} />
        </div>

        {/* Row 7 — Confidence & methodology strip */}
        <ConfidenceStrip
          forecastQuality={forecastResult.quality}
          latestYear={kpiMetrics.latestYear}
          statesTracked={kpiMetrics.activeStates}
        />
      </main>

      {/* Board Brief modal */}
      <BoardBriefModal
        open={showBoardBrief}
        onClose={() => setShowBoardBrief(false)}
        kpis={kpiMetrics}
        yearMin={yearMin}
        yearMax={yearMax}
        focusedState={focusedState}
        forecastQuality={forecastResult.quality}
        projected2028={projected2028}
        insights={insights}
        scenarioType={scenarioType}
        scenarioResult={scenarioResult}
      />
    </>
  );
}
