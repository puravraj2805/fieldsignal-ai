/** Static app-level constants — basin names, state codes, display labels. */

export const APP_NAME = 'FieldSignal AI';
export const APP_TAGLINE = 'U.S. Energy Intelligence Platform';

export const BASINS = [
  'Permian',
  'Bakken',
  'Eagle Ford',
  'Marcellus',
  'Haynesville',
  'DJ Basin',
  'Appalachia',
] as const;

export const US_STATES = [
  'TX', 'ND', 'WY', 'CO', 'NM', 'PA', 'WV', 'OH', 'OK', 'KS', 'MT', 'UT',
] as const;
