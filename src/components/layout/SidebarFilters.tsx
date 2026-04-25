'use client';

interface SidebarFiltersProps {
  years: number[];
  yearMin: number;
  yearMax: number;
  onYearMinChange: (y: number) => void;
  onYearMaxChange: (y: number) => void;
  regions: string[];
  focusedState: string | null;
  onFocusedStateChange: (s: string | null) => void;
}

const selectBase =
  'w-full rounded-lg text-xs text-slate-200 px-2.5 py-1.5 focus:outline-none transition-colors';

const selectStyle = {
  background: 'rgba(12,24,36,0.8)',
  border: '1px solid #1d3a52',
};

export function SidebarFilters({
  years,
  yearMin,
  yearMax,
  onYearMinChange,
  onYearMaxChange,
  regions,
  focusedState,
  onFocusedStateChange,
}: SidebarFiltersProps) {
  const firstYear = years[0] ?? yearMin;
  const lastYear = years[years.length - 1] ?? yearMax;

  return (
    <aside
      className="flex-none w-52 flex flex-col overflow-y-auto shrink-0"
      style={{
        background: '#060f1a',
        borderRight: '1px solid #142030',
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3"
        style={{ borderBottom: '1px solid #142030' }}
      >
        <h2 className="text-[10px] font-medium text-slate-600 uppercase tracking-widest">
          Filters
        </h2>
      </div>

      <div className="flex-1 px-4 py-5 flex flex-col gap-5">
        {/* Year Range */}
        <FilterSection label="Year Range">
          <div className="flex gap-2 items-center">
            <select
              value={yearMin}
              onChange={(e) => onYearMinChange(Number(e.target.value))}
              className={selectBase}
              style={selectStyle}
            >
              {years.map((y) => (
                <option key={y} value={y} disabled={y > yearMax}>{y}</option>
              ))}
            </select>
            <span className="text-slate-700 text-xs shrink-0">–</span>
            <select
              value={yearMax}
              onChange={(e) => onYearMaxChange(Number(e.target.value))}
              className={selectBase}
              style={selectStyle}
            >
              {years.map((y) => (
                <option key={y} value={y} disabled={y < yearMin}>{y}</option>
              ))}
            </select>
          </div>
          <p className="text-[10px] text-slate-700 mt-1.5 tabular-nums">
            {yearMin === yearMax
              ? `${yearMin} only`
              : `${yearMin}–${yearMax} · ${yearMax - yearMin + 1} yrs`}
          </p>
        </FilterSection>

        {/* State — drives map + compare + analyst */}
        <FilterSection label="State">
          <select
            value={focusedState ?? ''}
            onChange={(e) => onFocusedStateChange(e.target.value || null)}
            className={selectBase}
            style={selectStyle}
          >
            <option value="">All States</option>
            {regions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <p className="text-[10px] text-slate-700 mt-1.5 leading-relaxed">
            Focuses the map, comparison, and analyst.
          </p>
        </FilterSection>

        {/* Roadmap sections — visually compressed */}
        <div className="flex flex-col gap-3 opacity-35">
          <FilterSection label="Basin" roadmap>
            <select
              disabled
              className="w-full rounded text-xs text-slate-700 px-2 py-1.5 cursor-not-allowed"
              style={{ background: 'transparent', border: '1px solid #142030' }}
            >
              <option>All Basins</option>
            </select>
          </FilterSection>

          <FilterSection label="Prod. Type" roadmap>
            <div className="flex gap-3">
              {['All', 'Oil', 'Gas'].map((type) => (
                <label key={type} className="flex items-center gap-1.5 cursor-not-allowed">
                  <input
                    type="radio"
                    name="prodType"
                    defaultChecked={type === 'All'}
                    disabled
                    className="opacity-40"
                  />
                  <span className="text-[10px] text-slate-700">{type}</span>
                </label>
              ))}
            </div>
          </FilterSection>

          <FilterSection label="Operator" roadmap>
            <input
              type="text"
              placeholder="Search…"
              disabled
              className="w-full rounded text-xs text-slate-700 px-2 py-1.5 cursor-not-allowed placeholder-slate-800"
              style={{ background: 'transparent', border: '1px solid #142030' }}
            />
          </FilterSection>
        </div>
      </div>

      {/* Footer */}
      <div
        className="px-4 pt-3 pb-4 flex flex-col gap-2"
        style={{ borderTop: '1px solid #142030' }}
      >
        <button
          onClick={() => {
            onYearMinChange(firstYear);
            onYearMaxChange(lastYear);
            onFocusedStateChange(null);
          }}
          className="w-full text-slate-600 hover:text-teal-400 text-[10px] py-1 transition-colors text-left"
        >
          Reset filters
        </button>
        <p className="text-[9px] text-slate-800 leading-relaxed">
          Basin · operator · prod. type filters are roadmap.
        </p>
      </div>
    </aside>
  );
}

function FilterSection({
  label,
  children,
  roadmap = false,
}: {
  label: string;
  children: React.ReactNode;
  roadmap?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <label
          className={`text-[10px] font-medium uppercase tracking-widest ${
            roadmap ? 'text-slate-700' : 'text-slate-500'
          }`}
        >
          {label}
        </label>
        {roadmap && (
          <span
            className="text-[8px] text-slate-700 rounded px-1 py-0.5 leading-none"
            style={{ border: '1px solid #142030' }}
          >
            ROADMAP
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
