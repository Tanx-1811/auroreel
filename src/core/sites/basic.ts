/**
 * Streaming sites without a deep integration (Netflix, Prime Video, Disney+,
 * Vimeo, FPT Play, VieON, YouTube Music): background colour, accent, fonts,
 * scrollbars and every player tool. Their palettes are only recoloured when
 * the site defines light/dark custom properties the engine can detect.
 */
import { platformById, type PlatformId } from '../platforms.ts';
import type { SiteAdapter } from './types.ts';

export function basicAdapter(id: PlatformId): SiteAdapter {
  const brand = platformById(id).brand;
  return {
    id,
    backdrop: false,
    engine: {
      accept: /^--/,
      exclude: /overlay|static|shadow|scrim|error|success|warning/,
      rootSelectors: [':root', 'html', 'body'],
      brand: [{ color: brand, tolerance: 22 }],
      anchors: {},
    },
    fontExclude: ['[class*="caption"] *', '[class*="subtitle"] *', '[class*="timedtext"] *', '.player-timedtext *'],
  };
}

/** Other sites: player tools only. */
export const generic: SiteAdapter = { id: 'generic', backdrop: false };
