# FieldSignal AI

An executive-grade energy intelligence dashboard built on real U.S. EIA production data. FieldSignal combines 10 years of state-level oil and gas output with an AI decision layer — scenario planning, risk heuristics, and board-ready briefs — to help analysts and executives understand where U.S. production is headed and why it matters.

**Stack:** Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Mapbox GL · Claude API (Anthropic)

---

## Submission Links

| | |
|---|---|
| **Live URL** | _[https://fieldsignal-ai.vercel.app/] |
| **Walkthrough Video** | _[To be added after recording]_ |
| **Planning Doc** | [planning/PLANNING.md](planning/PLANNING.md) |
| **Architecture** | [docs/architecture.md](docs/architecture.md) |
| **KPI Definitions** | [docs/kpi_definitions.md](docs/kpi_definitions.md) |
| **Demo Walkthrough** | [docs/walkthrough.md](docs/walkthrough.md) |
| **Reflection** | [docs/reflection.md](docs/reflection.md) |

---

## Screenshots

> Screenshots will be added after the live deployment is captured. See [docs/walkthrough.md](docs/walkthrough.md) for the demo video link placeholder.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Data Pipeline](#data-pipeline)
- [Intelligence Engine](#intelligence-engine)
- [Design System](#design-system)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Dashboard Walkthrough](#dashboard-walkthrough)
- [Assumptions & Limitations](#assumptions--limitations)
- [Milestones](#milestones)
- [Attribution](#attribution)
- [License](#license)

---

## Overview

FieldSignal AI loads a decade of crude oil and natural gas production data (2015–2024) across the 10 major U.S. producing states, computes KPIs, builds a CAGR-based forecast to 2030, detects anomalies using six production heuristics, and provides an AI chat interface powered by Claude for contextual Q&A.

The dashboard is designed for quick decisions: a 60-second skim surfaces the top producing state, year-over-year trend, forecast trajectory, and any active production risks — no SQL, no spreadsheets.

---

## Features

### Dashboard Zones

| Zone | Description |
|---|---|
| **KPI Band** | Active states, top producer, total output, YoY growth %, and 2028 projection |
| **Choropleth Map** | Interactive Mapbox GL map — click any state to focus it across all panels |
| **Compare States** | Side-by-side oil and gas production and YoY metrics for any two states |
| **Production Trend** | Bar chart of historical production with an optional CAGR forecast overlay to 2030 |
| **Action Center** | Six heuristic alerts ranked by severity, padded with monitoring rows when signals are quiet |
| **AI Analyst** | Claude-assisted chat pre-loaded with the current dashboard context |
| **Scenario Simulator** | Downside / Base / Upside 2028 projections with a CAGR adjustment slider |
| **Well Economics Calculator** | Single-well financial model — decline curve, EUR, NPV, IRR, payback, and breakeven price with basin-level presets |
| **Confidence Strip** | Forecast quality indicator and methodology summary |

### Board Brief

The **↗ Board Brief** button generates a structured executive summary modal — headline, key findings, strategic risks, recommended actions, scenario analysis, and methodology. A one-click copy button exports plain text for slides or email.

### Sidebar Filters

- Year range selector (2015–2024)
- State focus — syncs the map, compare panel, KPIs, and AI analyst context simultaneously

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.4 — App Router, React Server Components |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS 4 (CSS-first configuration, no config file required) |
| Map | Mapbox GL JS 3 + react-map-gl 7 |
| Charts | Recharts |
| AI | Anthropic Claude API (`@anthropic-ai/sdk`) — server-sent streaming |
| Data | U.S. EIA Open Data API v2 (ingested via Python script) |
| Fonts | Geist Sans + Geist Mono (via `next/font/google`) |

---

## Project Structure

```
fieldsignal-ai/
├── src/
│   ├── app/
│   │   ├── api/analyst/route.ts     Claude streaming API endpoint
│   │   ├── globals.css              CSS theme tokens + Tailwind import
│   │   ├── layout.tsx               Root HTML layout (fonts, metadata)
│   │   └── page.tsx                 Server component — loads data, renders dashboard
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx         Full-height frame: header + sidebar + main
│   │   │   ├── Header.tsx           Top navigation bar
│   │   │   └── SidebarFilters.tsx   Year range + state filter sidebar
│   │   └── dashboard/
│   │       ├── DashboardClient.tsx  Root client component — all state lives here
│   │       ├── KPIGrid.tsx          KPI summary band
│   │       ├── MapPanel.tsx         Server wrapper for the map
│   │       ├── MapPanelClient.tsx   Mapbox GL interactive U.S. map
│   │       ├── ComparePanel.tsx     State A vs. State B comparison
│   │       ├── ForecastPanel.tsx    Production trend chart + forecast toggle
│   │       ├── ActionCenter.tsx     Heuristic alert display
│   │       ├── AnalystPanel.tsx     Claude AI chat interface
│   │       ├── ScenarioSimulator.tsx  Downside / Base / Upside simulator
│   │       ├── ConfidenceStrip.tsx  Forecast quality strip
│   │       └── BoardBriefModal.tsx  Executive summary modal
│   ├── lib/
│   │   ├── constants.ts    App metadata, basin list, U.S. state names
│   │   ├── eia.ts          Server-only data loader
│   │   ├── production.ts   Pure data transforms: KPIs, aggregations, formatting
│   │   ├── forecast.ts     CAGR-based forecast builder with quality scoring
│   │   ├── insights.ts     Six heuristic alert engine + monitoring fallback
│   │   └── scenario.ts     Downside / Base / Upside projections and risk analysis
│   └── types/
│       └── index.ts        Shared TypeScript interfaces
├── scripts/
│   └── fetch_eia.py        Python ETL — fetches and cleans EIA production data
├── data/
│   ├── processed/
│   │   ├── production_yearly.csv   Cleaned yearly production (CSV)
│   │   └── production_yearly.json  Same data as JSON — loaded at runtime
│   └── raw/                        Raw API response cache (git-ignored)
├── docs/                           Architecture notes
├── .env.example                    Environment variable template
└── CLAUDE.md / AGENTS.md           Agent configuration
```

---

## Data Pipeline

### Source

All production numbers come from the **U.S. Energy Information Administration (EIA) Open Data API v2** — the authoritative source for U.S. energy statistics.

### Datasets

| Dataset | EIA Endpoint | Unit |
|---|---|---|
| Crude Oil Field Production | `petroleum/crd/crpdn/data/` | Thousand Barrels / year (Kbbl) |
| Natural Gas Gross Withdrawals | `natural-gas/prod/sum/data/` | Million Cubic Feet / year (MMCF) |

### States Covered

Texas · North Dakota · New Mexico · Colorado · Wyoming · Oklahoma · California · Pennsylvania · West Virginia · Ohio

These 10 states represent the dominant share of U.S. oil and gas output.

### Output Schema

| Column | Type | Example |
|---|---|---|
| `year` | int | `2023` |
| `region` | string | `"Texas"` |
| `production_type` | `"oil"` \| `"gas"` | `"oil"` |
| `value` | float | `2001888.0` |
| `unit` | string | `"Thousand Barrels (annual total)"` |
| `months_reported` | int | `12` |
| `source` | string | `"EIA v2 petroleum/crd/crpdn"` |

**200+ rows total** — 10 states × 10 years (2015–2024) × 2 production types.

### Fetching Fresh Data

```bash
# Requires Python 3.9+ — no third-party packages (stdlib only)
python scripts/fetch_eia.py
# → writes data/processed/production_yearly.csv
# → writes data/processed/production_yearly.json
```

---

## Intelligence Engine

### KPI Computation

Computed from the year-filtered dataset on every render:

- **Top oil state** — state with the highest oil output in the latest year
- **Total oil (latest year)** — national sum across tracked states
- **YoY oil growth %** — change from the prior year
- **Active states** — states with non-zero data in the selected range
- **2028 projection** — derived from the forecast model

### Forecast Model

The forecast model (`src/lib/forecast.ts`) fits a CAGR to the last 5 non-zero historical data points and projects forward to 2030. CAGR is clamped to [−5%, +20%] to prevent implausible extrapolation. The 2028 value from the series is surfaced as the headline KPI.

Forecast quality is a 0–1 composite score:

- **High** (≥ 0.70) — 10 years of data with low year-to-year volatility
- **Medium** (0.40–0.69) — shorter history or moderate growth variance
- **Low** (< 0.40) — sparse data or high annual variance; triggers an Action Center alert

### Scenario Simulator

Three fixed growth scenarios applied to the last historical data point:

| Scenario | Base CAGR |
|---|---|
| Downside | −2.0%/yr |
| Base | +2.5%/yr |
| Upside | +5.5%/yr |

A manual CAGR slider (±5 percentage points) further shifts the selected scenario; the combined CAGR is clamped to [−10%, +25%]. Output shows the 2028 projected volume, delta vs. base case, top risk narrative, and diversification candidate.

### Action Center Heuristics

Six independent checks run against the filtered dataset on every render:

| # | Heuristic | Triggers when |
|---|---|---|
| 1 | Concentration risk | Top state > 50% of tracked production (High if > 65%) |
| 2 | YoY decline | National YoY growth < −5% |
| 3 | Coverage warning | Fewer than 8 states with non-zero data |
| 4 | Forecast fragility | Forecast quality score < 0.50 |
| 5 | State outperformance | Focused state YoY growth > national average + 5 pp |
| 6 | Strong national growth | National YoY oil growth > 8% |

When fewer than 3 heuristics fire, the panel fills to a minimum of 3 with **Monitoring** rows — contextual system-status entries derived from real data. A monitoring row only appears when the corresponding heuristic did *not* trigger, confirming that metric is within normal range. No fabricated alerts.

### AI Analyst

The Claude streaming endpoint (`src/app/api/analyst/route.ts`) receives the user's question alongside the current dashboard context — year range, top state, YoY growth, 2028 projection, and focused state — and returns a streamed response displayed token-by-token in the chat panel.

If `ANTHROPIC_API_KEY` is not configured, the panel displays an "unavailable" notice and the rest of the dashboard continues to work normally.

---

## Design System

FieldSignal uses a custom dark theme built on CSS custom properties in `src/app/globals.css`.

### Color Tokens

| Token | Value | Usage |
|---|---|---|
| `--background` | `#060f1a` | App shell background |
| `--fs-surface` | `#0c1824` | Standard panels |
| `--fs-surface-hi` | `#0e1f31` | Elevated panels (Analyst, Scenario Simulator) |
| `--fs-border` | `#142030` | Hairline separators |
| `--fs-accent` | `#14b8a6` | Interactive chrome (buttons, links, focus rings) |
| `--fs-oil` | `#d97706` | Oil volume data values |
| `--fs-oil-bright` | `#f59e0b` | Chart bars |
| `--fs-positive` | `#2dd4bf` | Growth / positive trends |
| `--fs-negative` | `#fb7185` | Decline / risk signals |

### Color Semantics

- **Teal** — all interactive chrome, positive trends, KPI accents
- **Amber** — oil-volume data values only; never used for status or confidence indicators
- **Rose** — negative trends, risk alerts, low-confidence states
- **Slate** — secondary text, labels, comparison values, monitoring rows

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.9+ (for data ingestion only)
- EIA API key (free — [eia.gov/opendata](https://www.eia.gov/opendata/))
- Anthropic API key (for AI Analyst — [console.anthropic.com](https://console.anthropic.com/))
- Mapbox public token (for the map — [account.mapbox.com](https://account.mapbox.com/access-tokens/))

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# 3. Fetch production data (one-time, or to refresh)
python scripts/fetch_eia.py

# 4. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production Build

```bash
npm run build
npm run start
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `EIA_API_KEY` | For data fetch | [EIA Open Data](https://www.eia.gov/opendata/) — free registration |
| `ANTHROPIC_API_KEY` | For AI Analyst | [Anthropic Console](https://console.anthropic.com/) |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | For the map | [Mapbox access tokens](https://account.mapbox.com/access-tokens/) |

The app runs without `ANTHROPIC_API_KEY` — the AI Analyst panel shows an unavailable notice. The map requires `NEXT_PUBLIC_MAPBOX_TOKEN` to render.

---

## Dashboard Walkthrough

```
┌─ Header ─────────────────────────────────────────────────────────────────┐
│  ⚡ FieldSignal AI     Dashboard   Basins   Wells   Reports   [EIA·2024] │
├─ Sidebar ──┬─ Main Content ──────────────────────────────────────────────┤
│            │  Production Intelligence               [↗ Board Brief]      │
│  Year      │  ┌────────────────────────────────────────────────────────┐ │
│  Range     │  │  KPI Band: Active States · Top Producer · YoY · 2028   │ │
│            │  └────────────────────────────────────────────────────────┘ │
│  Focus     │  ┌──────────────────────────┐  ┌────────────────────────┐  │
│  State     │  │  U.S. Choropleth Map      │  │  Compare States        │  │
│            │  │  Click a state to focus   │  │  State A  vs  State B  │  │
│            │  └──────────────────────────┘  └────────────────────────┘  │
│            │  ┌────────────────────────────────────────────────────────┐ │
│            │  │  Production Trend Chart            [Toggle Forecast]   │ │
│            │  └────────────────────────────────────────────────────────┘ │
│            │  Strategic Intelligence                                      │
│            │  ┌──────────────────────────┐  ┌────────────────────────┐  │
│            │  │  Action Center            │  │  AI Analyst (Claude)   │  │
│            │  │  6 heuristic alerts       │  │  Chat about the data   │  │
│            │  └──────────────────────────┘  └────────────────────────┘  │
│            │  Scenario Planning                                           │
│            │  ┌────────────────────────────────────────────────────────┐ │
│            │  │  Scenario Simulator                                     │ │
│            │  │  [Downside]  [Base]  [Upside]   CAGR slider   2028 Kbbl│ │
│            │  └────────────────────────────────────────────────────────┘ │
│            │  Well Economics                                              │
│            │  ┌────────────────────────────────────────────────────────┐ │
│            │  │  Well Economics Calculator                              │ │
│            │  │  Inputs · EUR · NPV · IRR · Payback · Breakeven        │ │
│            │  └────────────────────────────────────────────────────────┘ │
│            │  ┌────────────────────────────────────────────────────────┐ │
│            │  │  Confidence & Methodology Strip                         │ │
│            │  └────────────────────────────────────────────────────────┘ │
└────────────┴─────────────────────────────────────────────────────────────┘
```

---

## Assumptions & Limitations

- **Forecast model** — projections are CAGR-based model estimates derived from historical EIA data. They are not official EIA forecasts and should not be treated as such.
- **Action Center heuristics** — alerts are generated by deterministic rules applied to the filtered dataset. Outputs are analytical guidance, not guarantees of future production behavior.
- **State coverage** — the dashboard tracks 10 major producing states. States outside this set are not represented in any KPI, heuristic, or forecast.
- **Scenario Simulator** — designed for strategic planning and sensitivity analysis. It is not financial or investment advice.
- **Data freshness** — production data reflects the most recent run of `fetch_eia.py`. EIA data for the latest year may be incomplete (fewer than 12 months reported); the `months_reported` field in the dataset indicates coverage.
- **AI Analyst** — responses are generated by a language model using dashboard context as a prompt. They may contain errors and should be verified against primary sources before being used in formal reports.

---

## Milestones

| # | Goal | Status |
|---|---|---|
| 1 | Project scaffold + dashboard shell | ✅ Done |
| 2 | EIA data ingestion — state-level oil and gas production 2015–2024 | ✅ Done |
| 3 | Production trend chart + KPI cards wired to real data | ✅ Done |
| 4 | Mapbox GL interactive U.S. state map | ✅ Done |
| 5 | Claude API AI Analyst + state comparison panel | ✅ Done |
| 6 | Scenario Simulator + Action Center + Board Brief + Confidence Strip | ✅ Done |
| 7 | Well economics calculator | ✅ Done |

---

## Attribution

- **Production data** — [U.S. Energy Information Administration (EIA)](https://www.eia.gov/opendata/), Open Data API v2. Crude oil: `petroleum/crd/crpdn`; natural gas: `natural-gas/prod/sum`.
- **AI Analyst** — powered by [Anthropic Claude API](https://www.anthropic.com/).
- **Map** — rendered with [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/) and [react-map-gl](https://visgl.github.io/react-map-gl/).

---

## License

License: TBD — no license file is currently present in this repository.
