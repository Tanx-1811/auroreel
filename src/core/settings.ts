/**
 * User settings: shape, defaults and validation. Settings live in
 * chrome.storage.local under `rs:settings`; anything read from storage or a
 * backup goes through parseSettings, which fills gaps with defaults and
 * clamps every value.
 */
import { DEFAULT_LIGHT_THEME_ID, DEFAULT_THEME_ID } from './themes.ts';
import { GENERIC, PLATFORMS, layoutDefaults, platformById, type PlatformId } from './platforms.ts';
import { DEFAULT_FILTERS, parseFilters, type FilterValues } from './filters.ts';
import { DEFAULT_SHORTCUTS, parseShortcut, type ActionId, ACTION_IDS } from './shortcuts.ts';
import { PROGRESS_ICON_IDS, cleanEmoji } from './progressIcons.ts';

export interface SiteSettings {
  enabled: boolean;
  /** Theme for this site only; null follows the global theme. */
  themeId: string | null;
  /** Floating player toolbar, shortcuts, ambient light and cinema mode on this site. */
  player: boolean;
  layout: Record<string, boolean | string>;
}

/** Buttons the floating toolbar can show, in toolbar order ('speed' is the −, 1×, + group). */
export const TOOLBAR_BUTTONS = [
  'speed',
  'filters',
  'ambient',
  'cinema',
  'loop',
  'ab',
  'screenshot',
  'pip',
  'palette',
] as const;
export type ToolbarButton = (typeof TOOLBAR_BUTTONS)[number];

export interface PlayerSettings {
  toolbar: boolean;
  toolbarSide: 'left' | 'right';
  /** Shown buttons, a subset of TOOLBAR_BUTTONS (kept in toolbar order). */
  toolbarButtons: ToolbarButton[];
  toolbarSize: 'sm' | 'md' | 'lg';
  speed: {
    /** Speed every new video starts at. */
    default: number;
    /** Keep the last chosen speed per site instead of the default. */
    remember: boolean;
    step: number;
  };
  filtersOn: boolean;
  filters: FilterValues;
  ambient: {
    enabled: boolean;
    /** 0–100: glow strength. */
    intensity: number;
    /** Glow softness, px. */
    blur: number;
    /** How far the glow reaches beyond the video, % of its size. */
    spread: number;
  };
  cinema: {
    /** 0–100: how dark the page around the video gets. */
    dim: number;
    /** Turn on by itself when a video starts playing. */
    auto: boolean;
  };
  screenshotFormat: 'png' | 'jpeg';
  /** Volume boost, % (100 = off, up to 300). Web Audio; same-origin and stream (blob) video only. */
  boost: number;
  /** Scroll over the video to change its volume. */
  wheelVolume: boolean;
}

export interface SubtitleSettings {
  /** Restyle captions (YouTube, Netflix, Prime Video, Disney+ and native WebVTT tracks). */
  on: boolean;
  /** Size, % of the site's own. */
  size: number;
  color: string;
  /** Opacity of the dark box behind the text, %. */
  background: number;
  bold: boolean;
}

/** What sits on the progress bar's knob. */
export const KNOBS = ['site', 'dot', ...PROGRESS_ICON_IDS, 'emoji', 'image'] as const;
export const KNOB_MOTIONS = ['none', 'bounce', 'spin', 'pulse', 'wiggle'] as const;
export const BAR_FILLS = ['theme', 'icon', 'rainbow', 'custom'] as const;
export const BAR_HEIGHTS = ['site', 'thick', 'bold'] as const;
export const SCROLLBARS = ['site', 'theme', 'thin', 'hidden'] as const;
/** Largest knob picture kept (a data: URL, resized to 96 px by the studio). */
export const MAX_KNOB_IMAGE_CHARS = 120_000;

export interface ProgressSettings {
  /** 'site' keeps the site's own knob; otherwise a KNOBS id. */
  knob: string;
  /** Used when knob is 'emoji'. */
  emoji: string;
  /** Used when knob is 'image': data:image/… URL ('' when none). Stays on this computer (not synced). */
  image: string;
  /** Knob size, px. */
  size: number;
  /** How the knob moves while the video plays. */
  motion: (typeof KNOB_MOTIONS)[number];
  /** Colour of the played part. */
  fill: (typeof BAR_FILLS)[number];
  color: string;
  height: (typeof BAR_HEIGHTS)[number];
  /** A thin bar along the video while the site hides its controls. */
  mini: boolean;
}

export type ScheduleMode = 'off' | 'system' | 'time';

export interface Settings {
  v: 1;
  enabled: boolean;
  themeId: string;
  schedule: {
    mode: ScheduleMode;
    lightThemeId: string;
    darkThemeId: string;
    /** "HH:MM", local time. */
    dayStart: string;
    nightStart: string;
  };
  sites: Record<PlatformId, SiteSettings>;
  player: PlayerSettings;
  shortcutsOn: boolean;
  shortcuts: Record<ActionId, string | null>;
  /** Player tools on every other site (needs the optional all-sites permission). */
  anySite: boolean;
  language: 'auto' | 'en' | 'vi';
  onboarded: boolean;
  /** Keep settings and themes in step across computers through Chrome Sync. */
  sync: boolean;
  subtitles: SubtitleSettings;
  /** Favourite theme ids, shown first in the popup and the gallery. */
  favorites: string[];
  /** Look of Auroreel's own popup and studio. */
  appearance: 'auto' | 'dark' | 'light';
  /** Progress bar decorations (sites whose adapter describes their bar: YouTube). */
  progress: ProgressSettings;
  /** Page scrollbars on supported sites. */
  scrollbar: (typeof SCROLLBARS)[number];
}

export const SPEED_MIN = 0.1;
export const SPEED_MAX = 16;

function defaultSite(id: PlatformId): SiteSettings {
  return { enabled: true, themeId: null, player: true, layout: layoutDefaults(platformById(id)) };
}

export function defaultSettings(): Settings {
  const sites = Object.fromEntries([...PLATFORMS, GENERIC].map((p) => [p.id, defaultSite(p.id)])) as Record<
    PlatformId,
    SiteSettings
  >;
  return {
    v: 1,
    enabled: true,
    themeId: DEFAULT_THEME_ID,
    schedule: {
      mode: 'off',
      lightThemeId: DEFAULT_LIGHT_THEME_ID,
      darkThemeId: DEFAULT_THEME_ID,
      dayStart: '07:00',
      nightStart: '18:30',
    },
    sites,
    player: {
      toolbar: true,
      toolbarSide: 'right',
      toolbarButtons: TOOLBAR_BUTTONS.filter((b) => b !== 'ab'),
      toolbarSize: 'md',
      speed: { default: 1, remember: false, step: 0.25 },
      filtersOn: false,
      filters: { ...DEFAULT_FILTERS },
      ambient: { enabled: false, intensity: 70, blur: 70, spread: 12 },
      cinema: { dim: 88, auto: false },
      screenshotFormat: 'png',
      boost: 100,
      wheelVolume: false,
    },
    shortcutsOn: true,
    shortcuts: { ...DEFAULT_SHORTCUTS },
    anySite: false,
    language: 'auto',
    onboarded: false,
    sync: false,
    subtitles: { on: false, size: 120, color: '#ffffff', background: 55, bold: false },
    favorites: [],
    appearance: 'auto',
    progress: {
      knob: 'site',
      emoji: '🐱',
      image: '',
      size: 26,
      motion: 'bounce',
      fill: 'theme',
      color: '#ff4d6d',
      height: 'site',
      mini: false,
    },
    scrollbar: 'site',
  };
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
const numIn = (v: unknown, lo: number, hi: number, d: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d;
const themeRef = (v: unknown, d: string) => (typeof v === 'string' && /^[\w-]{1,64}$/.test(v) ? v : d);
const time = (v: unknown, d: string) => (typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : d);
const oneOf = <T extends string>(v: unknown, list: readonly T[], d: T): T => (list.includes(v as T) ? (v as T) : d);
const hexColor = (v: unknown, d: string) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : d);
const KNOB_IMAGE = /^data:image\/(png|jpeg|webp|gif|avif);base64,[A-Za-z0-9+/=]+$/;

function parseToolbarButtons(v: unknown, d: ToolbarButton[]): ToolbarButton[] {
  if (!Array.isArray(v)) return d;
  const set = new Set(v);
  return TOOLBAR_BUTTONS.filter((b) => set.has(b));
}

function parseProgress(raw: unknown, d: ProgressSettings): ProgressSettings {
  const p = isObj(raw) ? raw : {};
  const image =
    typeof p.image === 'string' && p.image.length <= MAX_KNOB_IMAGE_CHARS && KNOB_IMAGE.test(p.image) ? p.image : '';
  return {
    // 'image' stays chosen even without a picture here (it is chosen on another synced computer, or the
    // picture was refused): it then draws like the site's own knob (`progressCss`), and sync doesn't ping-pong.
    knob: oneOf(p.knob, KNOBS, d.knob),
    emoji: cleanEmoji(p.emoji) ?? d.emoji,
    image,
    size: Math.round(numIn(p.size, 16, 44, d.size)),
    motion: oneOf(p.motion, KNOB_MOTIONS, d.motion),
    fill: oneOf(p.fill, BAR_FILLS, d.fill),
    color: hexColor(p.color, d.color),
    height: oneOf(p.height, BAR_HEIGHTS, d.height),
    mini: bool(p.mini, d.mini),
  };
}

function parseSite(raw: unknown, id: PlatformId): SiteSettings {
  const d = defaultSite(id);
  if (!isObj(raw)) return d;
  const platform = platformById(id);
  const layoutRaw = isObj(raw.layout) ? raw.layout : {};
  const layout: Record<string, boolean | string> = {};
  for (const opt of platform.layout) {
    const v = layoutRaw[opt.id];
    layout[opt.id] =
      opt.kind === 'toggle' ? bool(v, opt.default) : opt.choices.includes(v as string) ? (v as string) : opt.default;
  }
  return {
    enabled: bool(raw.enabled, d.enabled),
    themeId: raw.themeId === null || raw.themeId === undefined ? null : themeRef(raw.themeId, '') || null,
    player: bool(raw.player, d.player),
    layout,
  };
}

/** Validates settings from storage or a backup, filling in defaults. */
export function parseSettings(raw: unknown): Settings {
  const d = defaultSettings();
  if (!isObj(raw)) return d;
  const sched = isObj(raw.schedule) ? raw.schedule : {};
  const sitesRaw = isObj(raw.sites) ? raw.sites : {};
  const p = isObj(raw.player) ? raw.player : {};
  const speed = isObj(p.speed) ? p.speed : {};
  const amb = isObj(p.ambient) ? p.ambient : {};
  const cin = isObj(p.cinema) ? p.cinema : {};
  const keys = isObj(raw.shortcuts) ? raw.shortcuts : {};
  const sub = isObj(raw.subtitles) ? raw.subtitles : {};
  const shortcuts = { ...d.shortcuts };
  for (const id of ACTION_IDS) {
    if (!(id in keys)) continue;
    const v = keys[id];
    shortcuts[id] =
      v === null ? null : typeof v === 'string' ? (parseShortcut(v) ? v : d.shortcuts[id]) : d.shortcuts[id];
  }
  const sites = Object.fromEntries(
    [...PLATFORMS, GENERIC].map((pl) => [pl.id, parseSite(sitesRaw[pl.id], pl.id)]),
  ) as Record<PlatformId, SiteSettings>;
  return {
    v: 1,
    enabled: bool(raw.enabled, d.enabled),
    themeId: themeRef(raw.themeId, d.themeId),
    schedule: {
      mode: oneOf(sched.mode, ['off', 'system', 'time'] as const, d.schedule.mode),
      lightThemeId: themeRef(sched.lightThemeId, d.schedule.lightThemeId),
      darkThemeId: themeRef(sched.darkThemeId, d.schedule.darkThemeId),
      dayStart: time(sched.dayStart, d.schedule.dayStart),
      nightStart: time(sched.nightStart, d.schedule.nightStart),
    },
    sites,
    player: {
      toolbar: bool(p.toolbar, d.player.toolbar),
      toolbarSide: oneOf(p.toolbarSide, ['left', 'right'] as const, d.player.toolbarSide),
      toolbarButtons: parseToolbarButtons(p.toolbarButtons, d.player.toolbarButtons),
      toolbarSize: oneOf(p.toolbarSize, ['sm', 'md', 'lg'] as const, d.player.toolbarSize),
      speed: {
        default: numIn(speed.default, SPEED_MIN, SPEED_MAX, d.player.speed.default),
        remember: bool(speed.remember, d.player.speed.remember),
        step: numIn(speed.step, 0.05, 1, d.player.speed.step),
      },
      filtersOn: bool(p.filtersOn, d.player.filtersOn),
      filters: parseFilters(p.filters),
      ambient: {
        enabled: bool(amb.enabled, d.player.ambient.enabled),
        intensity: numIn(amb.intensity, 0, 100, d.player.ambient.intensity),
        blur: numIn(amb.blur, 10, 140, d.player.ambient.blur),
        spread: numIn(amb.spread, 0, 40, d.player.ambient.spread),
      },
      cinema: {
        dim: numIn(cin.dim, 20, 100, d.player.cinema.dim),
        auto: bool(cin.auto, d.player.cinema.auto),
      },
      screenshotFormat: oneOf(p.screenshotFormat, ['png', 'jpeg'] as const, d.player.screenshotFormat),
      boost: Math.round(numIn(p.boost, 100, 300, d.player.boost)),
      wheelVolume: bool(p.wheelVolume, d.player.wheelVolume),
    },
    shortcutsOn: bool(raw.shortcutsOn, d.shortcutsOn),
    shortcuts,
    anySite: bool(raw.anySite, d.anySite),
    language: oneOf(raw.language, ['auto', 'en', 'vi'] as const, d.language),
    onboarded: bool(raw.onboarded, d.onboarded),
    sync: bool(raw.sync, d.sync),
    subtitles: {
      on: bool(sub.on, d.subtitles.on),
      size: Math.round(numIn(sub.size, 60, 250, d.subtitles.size)),
      color: hexColor(sub.color, d.subtitles.color),
      background: Math.round(numIn(sub.background, 0, 100, d.subtitles.background)),
      bold: bool(sub.bold, d.subtitles.bold),
    },
    favorites: Array.isArray(raw.favorites)
      ? [...new Set(raw.favorites.filter((x): x is string => typeof x === 'string' && /^[\w-]{1,64}$/.test(x)))].slice(
          0,
          100,
        )
      : [],
    appearance: oneOf(raw.appearance, ['auto', 'dark', 'light'] as const, d.appearance),
    progress: parseProgress(raw.progress, d.progress),
    scrollbar: oneOf(raw.scrollbar, SCROLLBARS, d.scrollbar),
  };
}

/** Theme id that applies to a site right now, before scheduling. */
export function siteThemeId(settings: Settings, platform: PlatformId): string {
  return settings.sites[platform]?.themeId ?? settings.themeId;
}

/** Deep-ish immutable update helper for nested settings. */
export function patchSite(settings: Settings, id: PlatformId, patch: Partial<SiteSettings>): Settings {
  return { ...settings, sites: { ...settings.sites, [id]: { ...settings.sites[id], ...patch } } };
}

export function patchLayout(settings: Settings, id: PlatformId, key: string, value: boolean | string): Settings {
  const site = settings.sites[id];
  return patchSite(settings, id, { layout: { ...site.layout, [key]: value } });
}
