import { fmt } from '@/lib/production';
import type { ForecastPoint } from '@/lib/forecast';

interface ForecastPanelProps {
  series: ForecastPoint[];
  fullSeries: ForecastPoint[];
  quality: number;
  yearMin: number;
  yearMax: number;
  showForecast: boolean;
  onToggleForecast: () => void;
}

function exportCSV(fullSeries: ForecastPoint[]) {
  const header = 'year,total_oil_historical_kbbl,total_oil_forecast_kbbl';
  const rows = fullSeries.map((p) =>
    p.isForecast
      ? `${p.year},,${Math.round(p.value)}`
      : `${p.year},${Math.round(p.value)},`
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'fieldsignal_oil_export.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function ForecastPanel({
  series,
  fullSeries,
  quality,
  yearMin,
  yearMax,
  showForecast,
  onToggleForecast,
}: ForecastPanelProps) {
  const maxValue = series.length > 0 ? Math.max(...series.map((b) => b.value)) : 1;
  const hasData = series.length > 0;

  return (
    <div
      className="rounded-xl flex flex-col overflow-hidden"
      style={{
        background: 'var(--fs-surface)',
        border: '1px solid var(--fs-border)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.35)',
      }}
    >
      {/* Panel header */}
      <div className="flex items-center justify-between px-5 py-3 gap-3 flex-wrap" style={{ borderBottom: '1px solid var(--fs-border)' }}>
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold text-slate-300 tracking-wide uppercase">
            Total Oil Production
          </h2>
          <span className="text-[10px] text-slate-600 tabular-nums">
            {yearMin}–{yearMax} · all states
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showForecast}
              onChange={onToggleForecast}
              className="accent-teal-500"
            />
            <span className="text-slate-400">Show forecast to 2030</span>
          </label>
          {/* Legend */}
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded-sm bg-amber-500/75 inline-block" />
            Historical · EIA
          </span>
          <span className={`flex items-center gap-1.5 transition-opacity ${showForecast ? 'opacity-100' : 'opacity-30'}`}>
            <span className="w-3 h-2 rounded-sm bg-amber-400/20 border border-dashed border-amber-400/40 inline-block" />
            Forecast · CAGR
          </span>
          <button
            onClick={() => exportCSV(fullSeries)}
            disabled={fullSeries.length === 0}
            className="text-xs text-slate-400 hover:text-teal-300 border border-slate-600 hover:border-teal-500/50 rounded px-2 py-0.5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Bar chart */}
      <div className="flex-1 px-6 pt-5 pb-4 flex flex-col">
        {!hasData ? (
          <div className="flex-1 flex items-center justify-center min-h-36">
            <p className="text-slate-500 text-xs text-center">
              No data for selected range.
              <br />
              Run{' '}
              <span className="text-amber-400 font-mono">
                python scripts/fetch_eia.py
              </span>{' '}
              to ingest EIA data.
            </p>
          </div>
        ) : (
          <div className="flex-1 flex items-end gap-2" style={{ minHeight: '140px' }}>
            {series.map((b) => (
              <div
                key={b.year}
                className="flex-1 flex flex-col items-center gap-1.5 group"
              >
                {/* Hover tooltip */}
                <span className="text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity tabular-nums whitespace-nowrap">
                  {fmt(b.value)} Kbbl
                </span>
                <div
                  className={`w-full rounded-t-sm transition-all cursor-default ${
                    b.isForecast
                      ? 'bg-amber-400/15 border border-dashed border-amber-400/30'
                      : 'bg-amber-500/75 hover:bg-amber-500/90'
                  }`}
                  style={{ height: `${(b.value / maxValue) * 120}px` }}
                  title={`${b.year}: ${fmt(b.value)} Kbbl${b.isForecast ? ' (projected)' : ''}`}
                />
                <span
                  className={`text-xs tabular-nums ${
                    b.isForecast ? 'text-amber-500/60' : 'text-slate-500'
                  }`}
                >
                  {b.year}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="text-center text-xs text-slate-600 mt-3 space-y-0.5">
          <p>Unit: Thousand Barrels (Kbbl) · Sum of 10 tracked states · EIA v2</p>
          {showForecast && quality > 0 && (
            <p>
              Forecast quality:{' '}
              <span className="text-slate-500">{quality.toFixed(2)}</span>/1.00 —
              based on history length and growth stability
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
