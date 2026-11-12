/**
 * The sites Auroreel knows. "full" sites get the whole treatment (deep
 * recolouring, backdrop, layout options); "basic" sites get the background,
 * accent, scrollbars and every player tool. Any other site can get the player
 * tools once the user allows it (optional host permission).
 */

export type PlatformId =
  | 'youtube'
  | 'ytmusic'
  | 'twitch'
  | 'netflix'
  | 'primevideo'
  | 'disneyplus'
  | 'vimeo'
  | 'fptplay'
  | 'vieon'
  | 'generic';

export type Tier = 'full' | 'recolor' | 'basic' | 'player';

export interface ToggleOption {
  id: string;
  kind: 'toggle';
  default: boolean;
}
export interface SelectOption {
  id: string;
  kind: 'select';
  default: string;
  choices: string[];
}
export type LayoutOption = ToggleOption | SelectOption;

export interface Platform {
  id: PlatformId;
  name: string;
  /** Host names (and their subdomains) that belong to the platform. */
  hosts: string[];
  /** Match patterns for the manifest's content script and host permissions. */
  matches: string[];
  tier: Tier;
  /** The site's own brand colour (chips in the UI). */
  brand: string;
  /**
   * Hosts of the site's stylesheets that don't allow cross-origin reads; the
   * service worker fetches them (host permission) so the engine can read the colours.
   */
  cssHosts?: string[];
  layout: LayoutOption[];
}

const toggle = (id: string, def = false): ToggleOption => ({ id, kind: 'toggle', default: def });
const select = (id: string, choices: string[], def: string): SelectOption => ({
  id,
  kind: 'select',
  default: def,
  choices,
});

export const PLATFORMS: Platform[] = [
  {
    id: 'youtube',
    name: 'YouTube',
    hosts: ['www.youtube.com', 'youtube.com'],
    matches: ['https://www.youtube.com/*'],
    tier: 'full',
    brand: '#ff0033',
    layout: [
      toggle('logoAccent', true),
      toggle('progressGlow', true),
      select('gridColumns', ['auto', '3', '4', '5', '6'], 'auto'),
      select('thumbStyle', ['normal', 'blur', 'grayscale'], 'normal'),
      toggle('dimWatched'),
      toggle('hideShorts'),
      toggle('hideHomeFeed'),
      toggle('hideRelated'),
      toggle('hideComments'),
      toggle('hideEndCards'),
      toggle('hideChips'),
      toggle('hideMerch'),
      toggle('hideExplore'),
    ],
  },
  {
    id: 'twitch',
    name: 'Twitch',
    hosts: ['www.twitch.tv', 'twitch.tv'],
    matches: ['https://www.twitch.tv/*'],
    tier: 'full',
    brand: '#9147ff',
    layout: [toggle('hideRecommended'), toggle('hideCarousel'), toggle('hideLeaderboard')],
  },
  {
    id: 'ytmusic',
    name: 'YouTube Music',
    hosts: ['music.youtube.com'],
    matches: ['https://music.youtube.com/*'],
    tier: 'recolor',
    brand: '#ff0033',
    layout: [],
  },
  {
    id: 'netflix',
    name: 'Netflix',
    hosts: ['www.netflix.com', 'netflix.com'],
    matches: ['https://www.netflix.com/*'],
    tier: 'recolor',
    brand: '#e50914',
    layout: [],
  },
  {
    id: 'primevideo',
    name: 'Prime Video',
    hosts: ['www.primevideo.com', 'primevideo.com'],
    matches: ['https://www.primevideo.com/*'],
    tier: 'recolor',
    brand: '#1a98ff',
    layout: [],
  },
  {
    id: 'disneyplus',
    name: 'Disney+',
    hosts: ['www.disneyplus.com', 'disneyplus.com'],
    matches: ['https://www.disneyplus.com/*'],
    tier: 'recolor',
    brand: '#0063e5',
    layout: [],
  },
  {
    id: 'vimeo',
    name: 'Vimeo',
    hosts: ['vimeo.com', 'www.vimeo.com'],
    matches: ['https://vimeo.com/*'],
    tier: 'basic',
    brand: '#17d5ff',
    layout: [],
  },
  {
    id: 'fptplay',
    name: 'FPT Play',
    hosts: ['fptplay.vn', 'www.fptplay.vn'],
    matches: ['https://fptplay.vn/*'],
    tier: 'recolor',
    brand: '#fe592a',
    layout: [],
  },
  {
    id: 'vieon',
    name: 'VieON',
    hosts: ['vieon.vn', 'www.vieon.vn'],
    matches: ['https://vieon.vn/*'],
    cssHosts: ['https://*.vieon.vn/*'],
    tier: 'recolor',
    brand: '#3ac882',
    layout: [],
  },
];

/** Every other site (player tools only, after the user allows all sites). */
export const GENERIC: Platform = {
  id: 'generic',
  name: 'Other sites',
  hosts: [],
  matches: [],
  tier: 'player',
  brand: '#8b5cf6',
  layout: [],
};

export const PLATFORM_IDS = [...PLATFORMS.map((p) => p.id), GENERIC.id] as PlatformId[];

export function platformById(id: PlatformId): Platform {
  return PLATFORMS.find((p) => p.id === id) ?? GENERIC;
}

/** The platform a page belongs to, or null for unknown sites. */
export function platformForHost(hostname: string): Platform | null {
  const host = hostname.toLowerCase();
  return PLATFORMS.find((p) => p.hosts.some((h) => host === h)) ?? null;
}

export function platformForUrl(url: string | undefined): Platform | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    return platformForHost(u.hostname);
  } catch {
    return null;
  }
}

export function isWebUrl(url: string | undefined): boolean {
  return !!url && /^https?:\/\//.test(url);
}

export function layoutDefaults(platform: Platform): Record<string, boolean | string> {
  return Object.fromEntries(platform.layout.map((o) => [o.id, o.default]));
}

export const ALL_MATCHES = PLATFORMS.flatMap((p) => p.matches);

/** Stylesheet hosts the service worker may fetch for the engine (also host permissions). */
export const CSS_HOSTS = PLATFORMS.flatMap((p) => p.cssHosts ?? []);

/** Whether `url` is a stylesheet host the service worker may fetch. */
export function isCssHost(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return false;
    return CSS_HOSTS.some((pattern) => {
      const host = pattern.replace(/^https:\/\//, '').replace(/\/\*$/, '');
      return host.startsWith('*.') ? u.hostname.endsWith(host.slice(1)) : u.hostname === host;
    });
  } catch {
    return false;
  }
}
