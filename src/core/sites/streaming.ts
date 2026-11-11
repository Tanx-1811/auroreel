/**
 * Streaming sites with a fixed dark design (Netflix, Prime Video, Disney+,
 * FPT Play, VieON, YouTube Music): every colour follows the theme — the
 * engine rewrites literal colours and component-level design tokens — in the
 * site's own dark style (`siteMode`), plus fonts and every player tool. No
 * backdrop or layout options. Anchors measured on the public pages (2026-11,
 * scripts/probe-site.mjs).
 */
import { platformById, type PlatformId } from '../platforms.ts';
import type { HueFamily } from '../remap.ts';
import type { EngineConfig, SiteAdapter } from './types.ts';

interface StreamingSite {
  brand: string[];
  link?: string[];
  anchorColors: NonNullable<EngineConfig['anchorColors']>;
  /** Stylesheets on another host (CDN) that must be fetched to be read. */
  fetchCss?: boolean;
}

const SITES: Partial<Record<PlatformId, StreamingSite>> = {
  netflix: {
    brand: ['#e50914', '#e00000'],
    anchorColors: { bg: '#141414', text: '#ffffff', surface: '#181818', muted: '#808080' },
  },
  primevideo: {
    brand: ['#1399de', '#0f79af'],
    anchorColors: { bg: '#00050d', text: '#ffffff', surface: '#0f171e', muted: '#8197a4' },
    fetchCss: true,
  },
  disneyplus: {
    brand: ['#0063e5'],
    anchorColors: { bg: '#040714', text: '#f9f9f9', surface: '#1a1d29', muted: '#cacaca' },
    fetchCss: true,
  },
  fptplay: {
    brand: ['#ff6500', '#fe592a'],
    anchorColors: { bg: '#0d0d0c', text: '#f5f5f4', surface: '#1b1a19', muted: '#959595' },
  },
  vieon: {
    brand: ['#3ac882'],
    link: ['#3ea6ff'],
    anchorColors: { bg: '#111111', text: '#ffffff', surface: '#222222', muted: '#9b9b9b' },
    fetchCss: true,
  },
  ytmusic: {
    brand: ['#ff0033', '#ff0000'],
    anchorColors: { bg: '#030303', text: '#ffffff', surface: '#212121', muted: '#aaaaaa' },
  },
};

const family = (colors: string[] | undefined, tolerance: number): HueFamily[] =>
  (colors ?? []).map((color) => ({ color, tolerance }));

const FONT_EXCLUDE = ['[class*="caption"] *', '[class*="subtitle"] *', '[class*="timedtext"] *', '.player-timedtext *'];

export function streamingAdapter(id: PlatformId): SiteAdapter {
  const site = SITES[id];
  if (!site) {
    // Recolours only the light/dark tokens the engine can detect (Vimeo).
    return {
      id,
      backdrop: false,
      engine: {
        accept: /^--/,
        exclude: /overlay|static|shadow|scrim|error|success|warning/,
        rootSelectors: [':root', 'html', 'body'],
        brand: family([platformById(id).brand], 22),
        anchors: {},
      },
      fontExclude: FONT_EXCLUDE,
    };
  }
  return {
    id,
    backdrop: false,
    siteMode: 'dark',
    engine: {
      accept: /^--/,
      // Shadows, status colours and Tailwind's internal helpers stay as they are.
      exclude: /shadow|error|success|warning|danger|^--tw-(ring|shadow|drop)/i,
      rootSelectors: [':root', 'html', 'body'],
      brand: family(site.brand, 20),
      link: family(site.link, 24),
      anchors: {},
      anchorColors: site.anchorColors,
      rewrite: true,
      fetchCss: site.fetchCss,
    },
    fontExclude: FONT_EXCLUDE,
  };
}

/** Other sites: player tools only. */
export const generic: SiteAdapter = { id: 'generic', backdrop: false };
