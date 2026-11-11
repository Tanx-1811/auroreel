/** Video picture filters (CSS filter functions on the <video> element; work on protected video too). */

export interface FilterValues {
  /** Percent, 100 = unchanged. */
  brightness: number;
  contrast: number;
  saturate: number;
  /** Degrees. */
  hue: number;
  /** Percent, 0 = unchanged. */
  sepia: number;
  grayscale: number;
}

export const DEFAULT_FILTERS: FilterValues = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  hue: 0,
  sepia: 0,
  grayscale: 0,
};

export const FILTER_LIMITS: Record<keyof FilterValues, { min: number; max: number; step: number; unit: string }> = {
  brightness: { min: 30, max: 180, step: 1, unit: '%' },
  contrast: { min: 30, max: 180, step: 1, unit: '%' },
  saturate: { min: 0, max: 250, step: 1, unit: '%' },
  hue: { min: -180, max: 180, step: 1, unit: '°' },
  sepia: { min: 0, max: 100, step: 1, unit: '%' },
  grayscale: { min: 0, max: 100, step: 1, unit: '%' },
};

export const FILTER_KEYS = Object.keys(DEFAULT_FILTERS) as (keyof FilterValues)[];

export type FilterPresetId = 'natural' | 'vivid' | 'cinema' | 'warm' | 'cool' | 'night' | 'mono' | 'retro';

export const FILTER_PRESETS: Record<FilterPresetId, FilterValues> = {
  natural: { ...DEFAULT_FILTERS },
  vivid: { brightness: 104, contrast: 112, saturate: 135, hue: 0, sepia: 0, grayscale: 0 },
  cinema: { brightness: 96, contrast: 118, saturate: 88, hue: 0, sepia: 12, grayscale: 0 },
  warm: { brightness: 102, contrast: 104, saturate: 110, hue: -6, sepia: 22, grayscale: 0 },
  cool: { brightness: 102, contrast: 106, saturate: 105, hue: 10, sepia: 0, grayscale: 0 },
  night: { brightness: 82, contrast: 96, saturate: 90, hue: -4, sepia: 30, grayscale: 0 },
  mono: { brightness: 104, contrast: 118, saturate: 100, hue: 0, sepia: 0, grayscale: 100 },
  retro: { brightness: 98, contrast: 92, saturate: 80, hue: -8, sepia: 45, grayscale: 0 },
};

export const FILTER_PRESET_IDS = Object.keys(FILTER_PRESETS) as FilterPresetId[];

const clamp = (v: unknown, k: keyof FilterValues) => {
  const { min, max } = FILTER_LIMITS[k];
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : DEFAULT_FILTERS[k];
};

export function parseFilters(raw: unknown): FilterValues {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return Object.fromEntries(FILTER_KEYS.map((k) => [k, clamp(r[k], k)])) as unknown as FilterValues;
}

export function isNeutral(f: FilterValues): boolean {
  return FILTER_KEYS.every((k) => f[k] === DEFAULT_FILTERS[k]);
}

/** CSS `filter` value; empty string when nothing changes. */
export function filterCss(f: FilterValues): string {
  const parts: string[] = [];
  if (f.brightness !== 100) parts.push(`brightness(${f.brightness}%)`);
  if (f.contrast !== 100) parts.push(`contrast(${f.contrast}%)`);
  if (f.saturate !== 100) parts.push(`saturate(${f.saturate}%)`);
  if (f.hue !== 0) parts.push(`hue-rotate(${f.hue}deg)`);
  if (f.sepia !== 0) parts.push(`sepia(${f.sepia}%)`);
  if (f.grayscale !== 0) parts.push(`grayscale(${f.grayscale}%)`);
  return parts.join(' ');
}

export function matchPreset(f: FilterValues): FilterPresetId | null {
  return FILTER_PRESET_IDS.find((id) => FILTER_KEYS.every((k) => FILTER_PRESETS[id][k] === f[k])) ?? null;
}
