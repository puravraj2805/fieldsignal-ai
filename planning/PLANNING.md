# FieldSignal AI — Project Planning

*CDF Energy AI Hackathon · 2026*

---

## 1. Problem Understanding

U.S. oil and gas production data is public and freely available via the EIA Open Data API, but it is not actionable in its raw form. Analysts and executives who need to assess production trends, forecast trajectories, and identify concentration risks currently rely on spreadsheets, EIA's own web tools, or expensive commercial platforms.

The core problem: **there is no lightweight, explainable dashboard that combines historical EIA production data with a structured AI decision layer and ships in one week.**

---

## 2. User Personas

### Primary — Energy Analyst
- Works at an E&P company, private equity firm, or consultancy
- Needs to quickly brief leadership on national production trends
- Wants numbers they can cite (EIA-backed) alongside model outputs they can caveat
- Values auditability — wants to see *why* an alert fired, not just that it did

### Secondary — Executive / Portfolio Manager
- Needs a 60-second situational read: top producer, trend direction, key risks
- Wants something they can export and put in a slide deck
- Does not want to run SQL or maintain a Python environment

---

## 3. Core Jobs-to-Be-Done

1. **Situational awareness** — "Where is U.S. oil production right now, and is it growing or declining?"
2. **Risk identification** — "Are we over-reliant on a single state? Is there a coverage gap in the data?"
3. **Forward planning** — "What does 2028 look like under base / downside / upside assumptions?"
4. **State-level research** — "How does Texas compare to North Dakota this year?"
5. **Investment scoping** — "What does the economics of a new horizontal well look like in this basin?"
6. **Briefing support** — "Give me an executive summary I can share right now."

---

## 4. Initial Scope (Day 1 Plan)

| Feature | Status |
|---|---|
| EIA data ingestion (10 states × 10 years) | Required |
| KPI band (total oil, top state, YoY, active states) | Required |
| Production trend bar chart | Required |
| Interactive U.S. choropleth map | Required |
| Year range filter in sidebar | Required |
| State focus filter | Required |
| Claude AI analyst chat | Required |
| State comparison panel | Required |

---

## 5. Updated Scope (After Hackathon Expansion)

After completing the initial scope, three additional features were added:

| Feature | Rationale |
|---|---|
| Scenario Simulator (Downside / Base / Upside) | Addresses forward-planning job; common in strategic energy analysis |
| Action Center (6 heuristic alerts) | Replaces vague "insights" with ranked, explainable signals |
| Board Brief Modal | Addresses executive briefing job without requiring any manual formatting |
| Confidence Strip | Fulfills audit/explainability requirement — users can see how the model works |
| Well Economics Calculator | Stretch feature: single-well financial model grounded in basin-level IP/decline data |

---

## 6. Tier 1 Required Features Checklist

- [x] Real EIA production data loaded and displayed
- [x] At least two years of historical data
- [x] At least one chart or visualization
- [x] Claude API integration (AI analyst)
- [x] User-controlled filter or parameter input
- [x] Explainable outputs — not just numbers, but context

---

## 7. Tier 2 Stretch Goal Checklist

- [x] Interactive map with state-level drill-down
- [x] Multi-state comparison panel
- [x] CAGR-based forecast extended to 2030
- [x] Scenario simulator with user-adjustable CAGR slider
- [x] Heuristic alert engine (6 independent checks)
- [x] Executive Board Brief export (plain-text copy / .txt download)
- [x] Well economics calculator with decline curve model and IRR/NPV/breakeven outputs
- [x] Forecast confidence scoring (history-weighted + stability-weighted)
- [ ] Gas production forecasting (data ingested but not separately charted)
- [ ] Operator-level data (out of scope for EIA state-level dataset)

---

## 8. Technical Plan

### Stack Decision

| Concern | Choice | Reason |
|---|---|---|
| Framework | Next.js 16 App Router | Server Components enable data loading without an API layer; well-supported |
| Language | TypeScript strict | Catches data shape mismatches early, especially for EIA record types |
| Styling | Tailwind CSS 4 | CSS-first config; dark theme via custom properties; no config file required |
| Map | Mapbox GL + react-map-gl | Best-in-class vector tile performance; well-documented choropleth pattern |
| AI | Anthropic Claude API (streaming) | Task requires structured grounded Q&A, not generation; streaming improves UX |
| Charts | Pure HTML/CSS flex bars | Avoids Recharts bundle overhead; gives full styling control |
| Data ingest | Python stdlib only | No third-party packages; reproducible in any Python 3.9+ environment |

### Server / Client Split

- **Server**: data loading (`loadProductionData`), JSON serialization, route metadata
- **Client**: all state (year range, focused state, scenario), all chart rendering, AI streaming
- **Edge Route**: `/api/analyst` — streaming Claude call with structured context injection

---

## 9. Data Sources Plan

| Dataset | Source | Access |
|---|---|---|
| Crude Oil Field Production | EIA Open Data API v2 (`petroleum/crd/crpdn`) | Free API key |
| Natural Gas Gross Withdrawals | EIA Open Data API v2 (`natural-gas/prod/sum`) | Same key |

**Coverage**: 10 states (TX, ND, NM, CO, WY, OK, CA, PA, WV, OH), 2015–2024, annual totals.

**Ingestion**: `scripts/fetch_eia.py` — Python stdlib only, writes `data/processed/production_yearly.json`. Run once to populate; re-run to refresh.

**State presets for well economics**: Representative IP rates, decline rates, D&C costs, and LOE sourced from public EIA well productivity reports and publicly available basin analogues.

---

## 10. Risks and Tradeoffs

| Risk | Mitigation |
|---|---|
| EIA API rate limits | 0.25s polite delay between requests; page size 5000 to minimize calls |
| Mapbox token exposure | Uses `NEXT_PUBLIC_` prefix (client-safe read-only token) |
| Forecast model oversimplification | CAGR clamped to [−5%, +20%]; quality score surfaced in UI; explicit disclaimer in Confidence Strip |
| Claude API latency | Server-sent streaming — user sees tokens immediately; 512-token cap keeps it fast |
| Missing ANTHROPIC_API_KEY | Graceful degradation — analyst panel shows unavailable notice; rest of dashboard unaffected |
| SVG hydration mismatch | SVG `<title>` elements removed from chart rects; all chart data is deterministic |
| Well economics model scope | Single well, oil only, exponential decline — clearly labeled "Illustrative model" in UI |

---

## 11. Build Milestones

| # | Milestone | Scope |
|---|---|---|
| 1 | Project scaffold | Next.js 16 + Tailwind 4 + App Router + dark shell |
| 2 | EIA data pipeline | Python ingestion script, JSON output, TypeScript types |
| 3 | Core dashboard | KPI band + production chart wired to real data |
| 4 | Mapbox map | Choropleth + state click → focused state sync |
| 5 | AI Analyst + Compare | Claude streaming endpoint + state comparison panel |
| 6 | Intelligence layer | Action Center + Scenario Simulator + Board Brief + Confidence Strip |
| 7 | Well Economics | Decline curve model, NPV/IRR/payback, state preset integration |
