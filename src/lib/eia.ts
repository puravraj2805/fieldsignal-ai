/**
 * Server-only EIA data loader.
 * Uses Node.js `fs` — import ONLY from Server Components or Route Handlers.
 * All pure data-transformation helpers live in src/lib/production.ts.
 */

import fs from 'fs';
import path from 'path';
import type { ProductionRecord } from '@/types';

const DATA_PATH = path.join(
  process.cwd(),
  'data',
  'processed',
  'production_yearly.json'
);

/**
 * Read the pre-processed EIA yearly production data from disk.
 * Returns [] if the file does not exist (run scripts/fetch_eia.py first).
 */
export function loadProductionData(): ProductionRecord[] {
  if (!fs.existsSync(DATA_PATH)) return [];
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8')) as ProductionRecord[];
}
