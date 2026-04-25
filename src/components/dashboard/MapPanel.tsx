import dynamic from 'next/dynamic';
import type { ProductionRecord } from '@/types';

// mapbox-gl uses browser APIs (window, WebGL) — disable SSR
const MapPanelClient = dynamic(
  () => import('./MapPanelClient').then((m) => m.MapPanelClient),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center min-h-72">
        <p className="text-slate-500 text-xs">Loading map…</p>
      </div>
    ),
  }
);

interface MapPanelProps {
  data: ProductionRecord[];
  latestYear: number;
  focusedState: string | null;
  onFocusedStateChange: (s: string) => void;
}

export function MapPanel({ data, latestYear, focusedState, onFocusedStateChange }: MapPanelProps) {
  return (
    <div
      className="rounded-xl flex flex-col overflow-hidden"
      style={{
        background: 'var(--fs-surface-hi)',
        border: '1px solid rgba(29,58,82,0.5)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
      }}
    >
      {/* Panel header */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: '1px solid rgba(29,58,82,0.4)' }}
      >
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold text-slate-300 tracking-wide uppercase">
            U.S. Production Map
          </h2>
          <span className="text-[10px] text-slate-600 tabular-nums">Oil {latestYear} · choropleth</span>
        </div>
        <span className="text-[10px] text-slate-600">Click a state to drill down</span>
      </div>

      {/* Map canvas */}
      <div className="h-80 relative">
        <MapPanelClient
          data={data}
          latestYear={latestYear}
          focusedState={focusedState}
          onFocusedStateChange={onFocusedStateChange}
        />
        {/* Legend chip — bottom-left overlay */}
        <div className="absolute bottom-2 left-2 z-10 pointer-events-none bg-slate-900/75 backdrop-blur-sm border border-slate-700/60 rounded px-2.5 py-1.5 flex items-center gap-2">
          <span
            className="w-12 h-2 rounded-sm shrink-0"
            style={{ background: 'linear-gradient(to right, rgba(251,191,36,0.12), rgba(251,191,36,0.9))' }}
          />
          <span className="text-[10px] text-slate-400 whitespace-nowrap">
            Higher oil output → stronger amber
          </span>
        </div>
      </div>
    </div>
  );
}
