#!/usr/bin/env python3
"""
FieldSignal AI — EIA Data Ingestion  (Milestone 2)
===================================================
Fetches U.S. state-level oil and gas production from the EIA Open Data API v2,
cleans the data, aggregates to yearly totals, and writes:

  data/processed/production_yearly.csv
  data/processed/production_yearly.json

Datasets fetched
  Primary   : Crude oil field production  (petroleum/crd/crpdn)
              Units: MBBL  (thousand barrels / month, summed to annual)
  Secondary : Natural gas gross withdrawals (natural-gas/prod/sum)
              Units: MMCF  (million cubic feet / month, summed to annual)
              [optional — skipped gracefully if endpoint returns no data]

Usage
  python scripts/fetch_eia.py

  The script auto-loads EIA_API_KEY from .env.local or .env.example if the
  environment variable is not already set.
"""

from __future__ import annotations

import csv
import json
import os
import sys
import time
from collections import defaultdict
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import urlopen

# ─── Paths ────────────────────────────────────────────────────────────────────

ROOT    = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "data" / "processed"
OUT_DIR.mkdir(parents=True, exist_ok=True)

# ─── Constants ────────────────────────────────────────────────────────────────

EIA_BASE = "https://api.eia.gov/v2"
PAGE     = 5000          # max rows per EIA page
START    = "2015-01"     # inclusive
END      = "2024-12"     # inclusive

# duoarea codes → state names  (EIA uses these for both oil and gas endpoints)
STATES: dict[str, str] = {
    "STX": "Texas",
    "SND": "North Dakota",
    "SNM": "New Mexico",
    "SCO": "Colorado",
    "SWY": "Wyoming",
    "SOK": "Oklahoma",
    "SCA": "California",
    "SPA": "Pennsylvania",
    "SWV": "West Virginia",
    "SOH": "Ohio",
}

# ─── .env loader (stdlib only, no python-dotenv needed) ───────────────────────

def _load_dotenv() -> None:
    """
    If EIA_API_KEY is not already in the environment, try to read it from
    .env.local, .env.example, or .env in the project root.
    """
    if os.environ.get("EIA_API_KEY"):
        return
    for fname in (".env.local", ".env.example", ".env"):
        fp = ROOT / fname
        if not fp.exists():
            continue
        for raw in fp.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, _, v = line.partition("=")
            k, v = k.strip(), v.strip()
            if k and v and k not in os.environ:
                os.environ[k] = v
        return  # stop at first file found

# ─── HTTP helpers ─────────────────────────────────────────────────────────────

def _get_json(url: str) -> dict:
    """Fetch a URL and return parsed JSON. Raises RuntimeError on HTTP/net errors."""
    try:
        with urlopen(url, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except HTTPError as exc:
        raise RuntimeError(f"HTTP {exc.code} {exc.reason}") from exc
    except URLError as exc:
        raise RuntimeError(f"Network error: {exc.reason}") from exc


def _build_url(path: str, params: dict, facets: dict[str, list[str]]) -> str:
    """
    Build an EIA v2 URL.

    Facet parameters must keep literal brackets, e.g.:
        facets[duoarea][]=STX&facets[duoarea][]=SND
    Standard params are value-encoded but keys are kept as-is.
    """
    parts: list[str] = [f"api_key={os.environ['EIA_API_KEY']}"]

    for k, v in params.items():
        if isinstance(v, list):
            for item in v:
                parts.append(f"{k}={quote(str(item), safe='')}")
        else:
            parts.append(f"{k}={quote(str(v), safe='')}")

    for facet_name, values in facets.items():
        for val in values:
            parts.append(f"facets[{facet_name}][]={quote(str(val), safe='')}")

    return f"{EIA_BASE}/{path}?{'&'.join(parts)}"


def _fetch_all_pages(
    path: str,
    params: dict,
    facets: dict[str, list[str]],
) -> list[dict]:
    """Paginate through all results for an EIA v2 /data/ endpoint."""
    rows: list[dict] = []
    offset = 0

    while True:
        url = _build_url(path, {**params, "offset": offset, "length": PAGE}, facets)
        body = _get_json(url)
        chunk: list[dict] = body["response"]["data"]
        rows.extend(chunk)

        # EIA returns total as a string, not an int
        total = int(body["response"].get("total", "0"))
        offset += PAGE
        if offset >= total or not chunk:
            break

        time.sleep(0.25)   # be polite to the public API

    return rows

# ─── Dataset definitions ──────────────────────────────────────────────────────

DATASETS: list[dict] = [
    {
        "label":           "Crude Oil Field Production",
        "path":            "petroleum/crd/crpdn/data/",
        "production_type": "oil",
        "unit_keep":       "MBBL",      # thousand barrels / month
        "unit_label":      "Thousand Barrels (annual total)",
        "source":          "EIA v2 petroleum/crd/crpdn",
        "params": {
            "frequency":          "monthly",
            "data[0]":            "value",
            "start":              START,
            "end":                END,
            "sort[0][column]":    "period",
            "sort[0][direction]": "asc",
        },
        "facets": {
            "duoarea": list(STATES.keys()),
            "product": ["EPC0"],   # crude oil
            "process": ["FPF"],    # field production (confirmed via API probe)
        },
        "optional": False,
    },
    {
        "label":           "Natural Gas Gross Withdrawals",
        "path":            "natural-gas/prod/sum/data/",
        "production_type": "gas",
        "unit_keep":       "MMCF",      # million cubic feet / month
        "unit_label":      "Million Cubic Feet (annual total)",
        "source":          "EIA v2 natural-gas/prod/sum",
        "params": {
            "frequency":          "monthly",
            "data[0]":            "value",
            "start":              START,
            "end":                END,
            "sort[0][column]":    "period",
            "sort[0][direction]": "asc",
        },
        "facets": {
            "duoarea": list(STATES.keys()),
            "product": ["EPG0"],   # natural gas
            "process": ["FGW"],    # gross withdrawals (all well types combined)
        },
        "optional": True,   # skip gracefully if endpoint returns no usable data
    },
]

# ─── Ingest ───────────────────────────────────────────────────────────────────

def _parse_record(
    row: dict,
    production_type: str,
    unit_keep: str,
    unit_label: str,
    source: str,
) -> dict | None:
    """
    Validate and normalise one raw API row.
    Returns None for rows that should be dropped (null value, wrong units, bad period).
    """
    # value is a STRING in the EIA API — always cast explicitly
    raw_val = row.get("value")
    if raw_val is None or raw_val == "":
        return None
    try:
        value = float(raw_val)
    except (ValueError, TypeError):
        return None

    # Only keep rows whose unit matches what we expect for this dataset
    # (the same endpoint can return different unit series — e.g. MBBL vs MBBL/D)
    unit = row.get("units", "")
    if unit != unit_keep:
        return None

    # Parse period — format is "YYYY-MM" for monthly
    period: str = row.get("period", "")
    if len(period) < 4:
        return None
    try:
        year = int(period[:4])
    except ValueError:
        return None

    duoarea: str = row.get("duoarea", "")

    # Prefer our curated state name; fall back to API's area-name (note: hyphen, not underscore)
    region = STATES.get(duoarea) or row.get("area-name", duoarea)

    return {
        "period":          period,
        "year":            year,
        "duoarea":         duoarea,
        "region":          region,
        "production_type": production_type,
        "monthly_value":   value,
        "unit":            unit_label,
        "source":          source,
    }


def ingest_dataset(ds: dict) -> list[dict]:
    print(f"  [{ds['label']}]")
    print(f"    endpoint : {ds['path']}")

    try:
        raw = _fetch_all_pages(ds["path"], ds["params"], ds["facets"])
    except RuntimeError as exc:
        if ds["optional"]:
            print(f"    SKIPPED (optional): {exc}")
            return []
        raise

    print(f"    raw rows : {len(raw)}")

    records: list[dict] = []
    for row in raw:
        rec = _parse_record(
            row,
            ds["production_type"],
            ds["unit_keep"],
            ds["unit_label"],
            ds["source"],
        )
        if rec is not None:
            records.append(rec)

    dropped = len(raw) - len(records)
    print(f"    kept     : {len(records)}  (dropped {dropped} null/wrong-unit rows)")
    return records

# ─── Aggregate monthly → yearly ───────────────────────────────────────────────

def aggregate_yearly(monthly: list[dict]) -> list[dict]:
    """
    Sum monthly production values to annual totals.
    Key: (year, region, production_type)
    """
    totals: dict = defaultdict(lambda: {"sum": 0.0, "months": 0})
    meta:   dict = {}

    for r in monthly:
        key = (r["year"], r["region"], r["production_type"])
        totals[key]["sum"]    += r["monthly_value"]
        totals[key]["months"] += 1
        meta[key] = (r["unit"], r["source"])

    rows: list[dict] = []
    for (year, region, ptype), v in sorted(totals.items()):
        unit, source = meta[(year, region, ptype)]
        rows.append({
            "year":             year,
            "region":           region,
            "production_type":  ptype,
            "value":            round(v["sum"], 2),
            "unit":             unit,
            "months_reported":  v["months"],
            "source":           source,
        })

    return rows

# ─── Output writers ───────────────────────────────────────────────────────────

def _write_csv(rows: list[dict], path: Path) -> None:
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    print(f"  OK  {path.relative_to(ROOT)}  ({len(rows)} rows)")


def _write_json(rows: list[dict], path: Path) -> None:
    with path.open("w", encoding="utf-8") as f:
        json.dump(rows, f, indent=2)
    print(f"  OK  {path.relative_to(ROOT)}  ({len(rows)} records)")

# ─── Main ─────────────────────────────────────────────────────────────────────

def main() -> None:
    _load_dotenv()

    api_key = os.environ.get("EIA_API_KEY", "").strip()
    if not api_key:
        sys.exit(
            "ERROR: EIA_API_KEY is not set.\n"
            "  Set it in the environment:  export EIA_API_KEY=your_key\n"
            "  Or add it to .env.local in the project root."
        )

    print()
    print("FieldSignal AI — EIA Ingestion Pipeline")
    print("=" * 45)
    print(f"  API key  : {api_key[:8]}...")
    print(f"  Period   : {START} -> {END}")
    print(f"  States   : {', '.join(STATES.values())}")
    print(f"  Output   : {OUT_DIR.relative_to(ROOT)}/")
    print()

    all_monthly: list[dict] = []
    for ds in DATASETS:
        all_monthly.extend(ingest_dataset(ds))
        print()

    if not all_monthly:
        sys.exit("ERROR: No records fetched — check your API key and network connection.")

    print(f"Total monthly records : {len(all_monthly)}")
    yearly = aggregate_yearly(all_monthly)
    print(f"Yearly aggregates     : {len(yearly)}")
    print()

    print("Writing output files...")
    _write_csv(yearly,  OUT_DIR / "production_yearly.csv")
    _write_json(yearly, OUT_DIR / "production_yearly.json")

    print()
    print("Sample output (first 10 rows):")
    print(f"  {'year':<6} {'region':<20} {'type':<5} {'value':>12} {'unit':<35} {'mo':>3}")
    print(f"  {'-'*5} {'-'*19} {'-'*4} {'-'*12} {'-'*34} {'-'*3}")
    for row in yearly[:10]:
        print(
            f"  {row['year']:<6} {row['region']:<20} {row['production_type']:<5} "
            f"{row['value']:>12,.0f}  {row['unit']:<33} {row['months_reported']:>3}"
        )

    print()
    print("Done. Ingestion complete.")


if __name__ == "__main__":
    main()
