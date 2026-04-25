# FieldSignal AI — Demo Walkthrough

*CDF Energy AI Hackathon submission · 2026*

---

## Walkthrough Video

> **Video link:** _[To be added after recording]_

---

## 5-Minute Walkthrough Outline

| Timestamp | Segment | What to Show |
|---|---|---|
| 0:00 – 0:30 | Introduction | Project name, one-sentence pitch, open the live URL |
| 0:30 – 1:15 | KPI Band + Year Filter | Walk through the 5 KPI cards; change year range to 2018–2024; show how all panels update live |
| 1:15 – 2:00 | Map + State Focus | Click Texas → all panels sync; click North Dakota → compare panel updates; explain choropleth coloring (amber intensity = oil output) |
| 2:00 – 2:30 | Production Trend + Forecast | Enable "Show forecast to 2030"; point out historical (solid) vs forecast (dashed) bars; call out CAGR and quality score |
| 2:30 – 3:00 | AI Analyst | Type a question or click a suggested question; show streaming response; point out "Data-backed facts" vs "Model inference" framing |
| 3:00 – 3:30 | Scenario Simulator | Switch from Base → Downside; show 2028 projection drop; move CAGR slider; explain diversification candidate output |
| 3:30 – 4:00 | Action Center | Point out severity coloring (rose = High, amber = Medium, teal = Opportunity); explain one specific heuristic that fired |
| 4:00 – 4:30 | Well Economics Calculator | Focus a state (e.g. Texas) to auto-load Permian presets; change oil price; explain EUR, NPV, IRR, payback, breakeven cards; point to decline curve chart |
| 4:30 – 5:00 | Board Brief | Click "↗ Board Brief"; walk through headline, findings, risks, scenario analysis section; click Copy |

---

## Demo Checklist

### What the system does
- [ ] Loads 10 years of EIA crude oil and natural gas production data for 10 major U.S. states
- [ ] Computes KPIs, forecast, scenario projections, and 6 heuristic alerts on the client in real time
- [ ] Provides a streaming Claude AI analyst grounded in the current dashboard context
- [ ] Exports board-ready summaries and CSV data

### Map interaction
- [ ] Clicking any state on the choropleth focuses it across all panels
- [ ] Focused state updates the Compare panel (State A), AI analyst context, Action Center heuristics, and Well Economics presets
- [ ] Choropleth color intensity is proportional to oil production in the latest year of the selected range
- [ ] Popup on click shows oil Kbbl, gas MMCF, and YoY % for that state

### Forecasting logic and assumptions
- [ ] Forecast uses a CAGR model fitted to the last 5 non-zero historical data points
- [ ] CAGR is clamped to [−5%, +20%] to prevent implausible extrapolation
- [ ] Forecast quality score = average of history score (data points / 10) and stability score (based on YoY rate variance)
- [ ] Forecast bars are visually distinguished from historical bars (dashed border, lighter fill)
- [ ] **This is a FieldSignal model estimate — not an official EIA projection**

### KPI logic
- [ ] Total Oil = sum across all tracked states for the most recent year in the selected range
- [ ] Top Oil State = state with the highest oil output in that same latest year
- [ ] YoY Growth = `(latest year total − prior year total) / prior year total × 100`
- [ ] Active States = states with at least one non-zero oil record in the selected range
- [ ] 2028 Projection = CAGR model output; labeled with a "FORECAST" badge

### AI Analyst and what data it uses
- [ ] The Claude model receives a structured `AnalystContext` object with: year range, top oil state, total oil, YoY growth %, 2028 projection, states tracked, and focused state
- [ ] The system prompt instructs Claude to distinguish "Data-backed facts" (from context) from "Model inference"
- [ ] Responses are streamed token-by-token into the chat panel
- [ ] If `ANTHROPIC_API_KEY` is not configured, the panel degrades gracefully — the rest of the dashboard is unaffected
- [ ] **Claude does not have access to the raw data rows — only the pre-computed context object**

### Year selector in action
- [ ] Year range dropdown in the sidebar filters all data to the selected window
- [ ] Changing the range recomputes KPIs, forecast, insights, and scenario outputs immediately
- [ ] The year range is reflected in the page subtitle and passed to the AI analyst context

### Scenario Simulator
- [ ] Three base scenarios: Downside (−2% CAGR), Base (+2.5%), Upside (+5.5%)
- [ ] CAGR slider adds ±5 percentage points on top of the selected scenario
- [ ] Combined CAGR is clamped to [−10%, +25%]
- [ ] Output: 2028 projected volume in Kbbl, % delta vs base case, top risk narrative, diversification candidate
- [ ] Confidence chip: High (Base + small adjustment), Low (Upside or CAGR > 7%), Medium otherwise
- [ ] **Scenario outputs are FieldSignal model estimates — not official EIA forecasts**

### Well Economics Calculator
- [ ] Exponential decline model: `q(t) = q_i × e^(−D × t)`, midpoint-of-month convention
- [ ] 7 editable inputs: initial rate, annual decline, well life, oil price, D&C capex, monthly LOE, discount rate
- [ ] 5 output cards: EUR (Kbbl), NPV @ 10% ($M), IRR (%), Payback (months), Breakeven ($/bbl)
- [ ] Focusing a state on the map auto-loads basin-representative presets (IP rate, decline, capex, LOE)
- [ ] Oil price and discount rate are never overwritten by state presets — they stay analyst-controlled
- [ ] Production decline bar chart (amber) and cumulative cash flow chart (teal/rose) update live
- [ ] **Labeled "Illustrative model" — not investment advice; single well, oil only, no gas/NGL/royalties**

### Board Brief
- [ ] Opened via "↗ Board Brief" button in the page action bar
- [ ] Structured sections: Headline → Key Findings → Strategic Risks → Recommended Actions → Scenario Analysis → Methodology
- [ ] Content is generated deterministically from current dashboard state (no AI call)
- [ ] One-click "Copy" exports plain text for slides or email
- [ ] "Download" saves `fieldsignal_board_brief_YYYY-MM-DD.txt`

### Key insights / investment recommendations
- [ ] The Action Center surfaces the highest-severity heuristic first — lead with that
- [ ] Point out the diversification candidate from the Scenario Simulator
- [ ] If a state is focused, the AI analyst context includes it — use a targeted question
- [ ] The Board Brief's "Recommended Actions" section draws from the top two actionable insights

---

## Recording Notes

- **Target length**: Under 5 minutes. Practice the flow before recording.
- **Show live interactions**: Click the map, change the year range, adjust the CAGR slider — don't just describe them.
- **Be explicit about data provenance**:
  - Historical KPI numbers → EIA data (cite the year)
  - Forecast bars, scenario outputs, well economics → FieldSignal model estimates
  - AI analyst responses → Claude reasoning over the FieldSignal context object
- **If the AI call is slow**: Have a response pre-loaded from a previous session, or explain streaming in real time.
- **Resolution**: Record at 1920×1080 or higher. The dashboard is optimized for wide viewports.
- **Do not show API keys** in the terminal or `.env.local` during the recording.
