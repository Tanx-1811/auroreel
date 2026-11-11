/**
 * Themes: the data model, the built-in collection and the palette every
 * theme resolves to. A theme is six colours plus a backdrop and a few
 * finishing touches; everything else (hover tones, borders, text on the
 * accent) is derived so that custom themes stay readable.
 */
import {
  contrast,
  ensureContrast,
  formatColor,
  fromOklch,
  hex,
  isHexColor,
  mix,
  onColor,
  toHex,
  toOklch,
  type Rgba,
} from './color.ts';

export type ThemeMode = 'dark' | 'light';
export type FontId = 'site' | 'be-vietnam-pro' | 'lexend' | 'nunito' | 'system';
export const FONT_IDS: FontId[] = ['site', 'be-vietnam-pro', 'lexend', 'nunito', 'system'];

export interface ThemeColors {
  /** Page background. */
  bg: string;
  /** Cards, menus, the search box, chips. */
  surface: string;
  /** Primary text. */
  text: string;
  /** Secondary text; derived from text and bg when absent. */
  muted?: string;
  /** Replaces the site's brand colour: progress bar, buttons, logo, toggles. */
  accent: string;
  /** Links and call-to-action text; derived from the accent when absent. */
  link?: string;
}

export type Backdrop =
  | { kind: 'none' }
  /** Soft colour glows over the background. */
  | { kind: 'aurora'; colors: string[]; intensity: number }
  | { kind: 'gradient'; angle: number; stops: string[]; veil: number }
  /** A picture of the user's (data: URL), blurred and veiled with the background colour. */
  | { kind: 'image'; image: string; blur: number; veil: number; position: 'center' | 'top' | 'bottom' };

export type BackdropKind = Backdrop['kind'];

export interface Theme {
  id: string;
  name: string;
  /** Vietnamese name of a built-in theme. */
  nameVi?: string;
  mode: ThemeMode;
  colors: ThemeColors;
  backdrop: Backdrop;
  /** 0–100: how see-through the top bar, side menu and cards are over the backdrop. */
  glass: number;
  /** Corner radius for thumbnails, cards and the player, px (0–28). */
  radius: number;
  font: FontId;
  builtIn?: boolean;
  createdAt?: number;
}

/** The special id that keeps the site's own colours (layout and player tools still apply). */
export const NO_THEME = 'none';

export interface Palette {
  mode: ThemeMode;
  bg: Rgba;
  surface: Rgba;
  /** Hover / pressed / second-level surface. */
  surface2: Rgba;
  text: Rgba;
  muted: Rgba;
  accent: Rgba;
  /** Text and icons on top of the accent. */
  accentText: Rgba;
  link: Rgba;
  border: Rgba;
}

const DEFAULTS = { glass: 35, radius: 14, font: 'site' as FontId };

type PresetInput = Omit<Theme, 'glass' | 'radius' | 'font' | 'builtIn'> &
  Partial<Pick<Theme, 'glass' | 'radius' | 'font'>>;
const preset = (t: PresetInput): Theme => ({ ...DEFAULTS, ...t, builtIn: true });
const aurora = (colors: string[], intensity = 55): Backdrop => ({ kind: 'aurora', colors, intensity });

export const BUILT_IN_THEMES: Theme[] = [
  // ——— Dark ———
  preset({
    id: 'midnight-velvet',
    name: 'Midnight Velvet',
    nameVi: 'Nhung nửa đêm',
    mode: 'dark',
    colors: { bg: '#0d0b1e', surface: '#18152f', text: '#ecebff', accent: '#8b5cf6', link: '#a5b4fc' },
    backdrop: aurora(['#6d28d9', '#db2777', '#2563eb'], 55),
  }),
  preset({
    id: 'aurora',
    name: 'Aurora',
    nameVi: 'Cực quang',
    mode: 'dark',
    colors: { bg: '#06141a', surface: '#0e232c', text: '#e3fbf6', accent: '#2dd4bf', link: '#7dd3fc' },
    backdrop: aurora(['#14b8a6', '#22c55e', '#6366f1'], 60),
  }),
  preset({
    id: 'neon-drive',
    name: 'Neon Drive',
    nameVi: 'Phố đêm neon',
    mode: 'dark',
    colors: { bg: '#12051f', surface: '#1e0c31', text: '#fbe8ff', accent: '#ff2fb3', link: '#22d3ee' },
    backdrop: aurora(['#ff2fb3', '#7c3aed', '#22d3ee'], 70),
    font: 'lexend',
  }),
  preset({
    id: 'crimson-theatre',
    name: 'Crimson Theatre',
    nameVi: 'Rạp nhung đỏ',
    mode: 'dark',
    colors: { bg: '#120607', surface: '#200d0f', text: '#fbe9e9', accent: '#f5a524', link: '#fcd34d' },
    backdrop: aurora(['#991b1b', '#7f1d1d', '#b45309'], 50),
  }),
  preset({
    id: 'deep-ocean',
    name: 'Deep Ocean',
    nameVi: 'Đại dương sâu',
    mode: 'dark',
    colors: { bg: '#050d1f', surface: '#0c1831', text: '#e2ecff', accent: '#38bdf8', link: '#93c5fd' },
    backdrop: aurora(['#0ea5e9', '#1d4ed8', '#0891b2'], 50),
  }),
  preset({
    id: 'sakura-night',
    name: 'Sakura Night',
    nameVi: 'Anh đào đêm',
    mode: 'dark',
    colors: { bg: '#1a0f17', surface: '#2a1926', text: '#fde7f3', accent: '#f472b6', link: '#f9a8d4' },
    backdrop: aurora(['#db2777', '#a855f7', '#f43f5e'], 50),
  }),
  preset({
    id: 'ember',
    name: 'Ember',
    nameVi: 'Than hồng',
    mode: 'dark',
    colors: { bg: '#140d0a', surface: '#231713', text: '#fbeee6', accent: '#f97316', link: '#fdba74' },
    backdrop: aurora(['#ea580c', '#b91c1c', '#f59e0b'], 40),
  }),
  preset({
    id: 'galaxy',
    name: 'Galaxy',
    nameVi: 'Thiên hà',
    mode: 'dark',
    colors: { bg: '#070611', surface: '#14122b', text: '#ecebff', accent: '#a78bfa', link: '#67e8f9' },
    backdrop: aurora(['#4c1d95', '#1e3a8a', '#831843'], 75),
  }),
  preset({
    id: 'forest-night',
    name: 'Forest Night',
    nameVi: 'Rừng đêm',
    mode: 'dark',
    colors: { bg: '#0a140f', surface: '#13231a', text: '#e6f4ea', accent: '#4ade80', link: '#86efac' },
    backdrop: aurora(['#15803d', '#65a30d', '#0f766e'], 35),
  }),
  preset({
    id: 'lavender-dusk',
    name: 'Lavender Dusk',
    nameVi: 'Hoàng hôn oải hương',
    mode: 'dark',
    colors: { bg: '#17142a', surface: '#24203e', text: '#eeeaff', accent: '#c4b5fd', link: '#a5b4fc' },
    backdrop: aurora(['#7c3aed', '#4f46e5', '#c026d3'], 40),
  }),
  preset({
    id: 'mocha',
    name: 'Mocha',
    nameVi: 'Cà phê sữa đá',
    mode: 'dark',
    colors: { bg: '#1c1512', surface: '#2a201b', text: '#f3e9e2', accent: '#d6a26b', link: '#e8c39e' },
    backdrop: aurora(['#92400e', '#78350f'], 30),
    font: 'nunito',
  }),
  preset({
    id: 'fjord',
    name: 'Fjord',
    nameVi: 'Vịnh băng',
    mode: 'dark',
    colors: { bg: '#1f2430', surface: '#2a303d', text: '#e5e9f0', accent: '#88c0d0', link: '#81a1c1' },
    backdrop: { kind: 'none' },
    glass: 0,
  }),
  preset({
    id: 'slate-sky',
    name: 'Slate Sky',
    nameVi: 'Trời đá phiến',
    mode: 'dark',
    colors: { bg: '#0f172a', surface: '#1e293b', text: '#e2e8f0', accent: '#60a5fa', link: '#93c5fd' },
    backdrop: { kind: 'none' },
    glass: 0,
  }),
  preset({
    id: 'cyber-lime',
    name: 'Cyber Lime',
    nameVi: 'Chanh điện tử',
    mode: 'dark',
    colors: { bg: '#0b0d08', surface: '#171b11', text: '#f0f7e4', accent: '#a3e635', link: '#d9f99d' },
    backdrop: { kind: 'gradient', angle: 160, stops: ['#0b0d08', '#1a2410', '#0b0d08'], veil: 0 },
    font: 'lexend',
  }),
  preset({
    id: 'oled-noir',
    name: 'OLED Noir',
    nameVi: 'Đen tuyền OLED',
    mode: 'dark',
    colors: { bg: '#000000', surface: '#111112', text: '#f5f5f5', accent: '#fafafa', link: '#d4d4d8' },
    backdrop: { kind: 'none' },
    glass: 0,
    radius: 10,
  }),
  // ——— Light ———
  preset({
    id: 'paper',
    name: 'Paper',
    nameVi: 'Giấy dó',
    mode: 'light',
    colors: { bg: '#f7f4ee', surface: '#ffffff', text: '#1f1d1a', accent: '#2f5bd3', link: '#2f5bd3' },
    backdrop: { kind: 'none' },
    glass: 0,
  }),
  preset({
    id: 'latte',
    name: 'Latte',
    nameVi: 'Bạc xỉu',
    mode: 'light',
    colors: { bg: '#f5ede4', surface: '#fffaf5', text: '#3b2a20', accent: '#b4652d', link: '#9a4d1c' },
    backdrop: aurora(['#f4c7a1', '#e9b384'], 50),
    font: 'nunito',
  }),
  preset({
    id: 'mint-breeze',
    name: 'Mint Breeze',
    nameVi: 'Gió bạc hà',
    mode: 'light',
    colors: { bg: '#eefaf5', surface: '#ffffff', text: '#10302a', accent: '#0d9488', link: '#0f766e' },
    backdrop: aurora(['#99f6e4', '#bae6fd'], 60),
  }),
  preset({
    id: 'peach',
    name: 'Peach',
    nameVi: 'Đào hồng',
    mode: 'light',
    colors: { bg: '#fff3ee', surface: '#ffffff', text: '#3a1f17', accent: '#f0603f', link: '#c2410c' },
    backdrop: aurora(['#fecdd3', '#fed7aa'], 70),
  }),
  preset({
    id: 'clear-sky',
    name: 'Clear Sky',
    nameVi: 'Trời trong',
    mode: 'light',
    colors: { bg: '#f0f6ff', surface: '#ffffff', text: '#0f2341', accent: '#2563eb', link: '#1d4ed8' },
    backdrop: aurora(['#bfdbfe', '#c7d2fe', '#a5f3fc'], 60),
  }),
  preset({
    id: 'blossom',
    name: 'Blossom',
    nameVi: 'Hoa đào',
    mode: 'light',
    colors: { bg: '#fff1f6', surface: '#ffffff', text: '#3d1028', accent: '#e11d74', link: '#be185d' },
    backdrop: aurora(['#fbcfe8', '#e9d5ff'], 70),
  }),
  preset({
    id: 'lilac',
    name: 'Lilac',
    nameVi: 'Tử đinh hương',
    mode: 'light',
    colors: { bg: '#f5f3ff', surface: '#ffffff', text: '#231942', accent: '#7c3aed', link: '#6d28d9' },
    backdrop: aurora(['#ddd6fe', '#fbcfe8'], 60),
    font: 'lexend',
  }),
  preset({
    id: 'sand-dune',
    name: 'Sand Dune',
    nameVi: 'Đồi cát',
    mode: 'light',
    colors: { bg: '#f6efe3', surface: '#fffaf1', text: '#2e2618', accent: '#c2410c', link: '#9a3412' },
    backdrop: { kind: 'none' },
    glass: 0,
  }),
  preset({
    id: 'mono-light',
    name: 'Mono',
    nameVi: 'Đơn sắc',
    mode: 'light',
    colors: { bg: '#ffffff', surface: '#f3f4f6', text: '#111318', accent: '#111318', link: '#111318' },
    backdrop: { kind: 'none' },
    glass: 0,
    radius: 8,
  }),
];

export const DEFAULT_THEME_ID = 'midnight-velvet';
export const DEFAULT_LIGHT_THEME_ID = 'paper';

/** Resolves a theme's colours into the full palette the CSS builders use. */
export function resolvePalette(theme: Theme): Palette {
  const c = theme.colors;
  const bg = hex(c.bg);
  const surface = hex(c.surface);
  const text = ensureContrast(hex(c.text), bg, 7);
  const dark = theme.mode === 'dark';
  const muted = c.muted ? ensureContrast(hex(c.muted), bg, 4.5) : ensureContrast(mix(text, bg, 0.38), bg, 4.5);
  const accent = hex(c.accent);
  const linkBase = c.link ? hex(c.link) : accent;
  const link = ensureContrast(linkBase, bg, 4.5);
  const surface2 = mix(surface, text, dark ? 0.08 : 0.06);
  const border = mix(bg, text, dark ? 0.16 : 0.13);
  return { mode: theme.mode, bg, surface, surface2, text, muted, accent, accentText: onColor(accent), link, border };
}

/**
 * The theme's counterpart in another mode: same hues and accent, lightness
 * flipped. Used on sites whose own design is fixed dark (or light) — their
 * hard-coded overlays (white icons over video, dark scrims) keep working, and
 * a light theme there shows as its dark sibling.
 */
export function adaptPalette(p: Palette, mode: ThemeMode): Palette {
  if (p.mode === mode) return p;
  const dark = mode === 'dark';
  const bgLch = toOklch(p.bg);
  const accentLch = toOklch(p.accent);
  const tinted = bgLch.C > 0.012;
  const H = tinted ? bgLch.H : accentLch.H;
  const C = tinted ? Math.min(bgLch.C * 1.4, 0.05) : Math.min(accentLch.C * 0.18, 0.03);
  const at = (L: number, chroma = C) => fromOklch({ L, C: chroma, H, alpha: 1 });
  const bg = at(dark ? 0.17 : 0.975);
  const surface = at(dark ? 0.22 : 0.995, C * (dark ? 1.1 : 0.4));
  const text = at(dark ? 0.95 : 0.2, Math.min(C, 0.012));
  const muted = ensureContrast(at(dark ? 0.74 : 0.48, Math.min(C, 0.02)), bg, 4.5);
  const accent = ensureContrast(p.accent, bg, 3);
  const linkLch = toOklch(p.link);
  const link = ensureContrast(fromOklch({ ...linkLch, L: dark ? 0.8 : 0.48 }), bg, 4.5);
  return {
    mode,
    bg,
    surface,
    surface2: mix(surface, text, dark ? 0.08 : 0.06),
    text,
    muted,
    accent,
    accentText: onColor(accent),
    link,
    border: mix(bg, text, dark ? 0.16 : 0.13),
  };
}

/** Builds a complete theme from a background, an accent and a mode (theme wizard, image palettes). */
export function themeFromSeed(seed: {
  id: string;
  name: string;
  mode: ThemeMode;
  bg?: string;
  accent: string;
  secondary?: string;
}): Theme {
  const accent = hex(seed.accent);
  const lch = toOklch(accent);
  const dark = seed.mode === 'dark';
  const bg = seed.bg
    ? hex(seed.bg)
    : fromOklch({ L: dark ? 0.16 : 0.975, C: Math.min(lch.C, 0.04) * (dark ? 0.9 : 0.5), H: lch.H, alpha: 1 });
  const surface = mix(
    bg,
    dark ? { r: 255, g: 255, b: 255, a: 1 } : { r: 255, g: 255, b: 255, a: 1 },
    dark ? 0.07 : 0.7,
  );
  const text = fromOklch({ L: dark ? 0.95 : 0.2, C: Math.min(lch.C, 0.03), H: lch.H, alpha: 1 });
  const second = seed.secondary ? hex(seed.secondary) : fromOklch({ ...lch, H: (lch.H + 40) % 360 });
  const link = ensureContrast(fromOklch({ ...toOklch(second), L: dark ? 0.8 : 0.48 }), bg, 4.5);
  return {
    id: seed.id,
    name: seed.name,
    mode: seed.mode,
    colors: { bg: toHex(bg), surface: toHex(surface), text: toHex(text), accent: toHex(accent), link: toHex(link) },
    backdrop: aurora([toHex(accent), toHex(second)], dark ? 55 : 60),
    glass: 35,
    radius: 14,
    font: 'site',
  };
}

/** Contrast of the primary text on the background (shown in the editor). */
export function textContrast(theme: Theme): number {
  return contrast(hex(theme.colors.text), hex(theme.colors.bg));
}

export const paletteCss = (p: Palette, key: keyof Omit<Palette, 'mode'>) => formatColor(p[key]);

// ——— Validation (custom themes come from storage and backup files) ———

const clampInt = (v: unknown, lo: number, hi: number, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.round(Math.min(hi, Math.max(lo, v))) : fallback;

const IMAGE_DATA_URL = /^data:image\/(png|jpeg|webp|gif|avif);base64,[a-z0-9+/=]+$/i;
/** Largest stored background picture (a resized WebP is typically 150–400 KB). */
export const MAX_IMAGE_CHARS = 3_000_000;

function cleanColors(list: unknown, min: number, max: number): string[] | null {
  if (!Array.isArray(list)) return null;
  const out = list.filter(isHexColor).slice(0, max);
  return out.length >= min ? out : null;
}

function parseBackdrop(raw: unknown): Backdrop {
  if (!raw || typeof raw !== 'object') return { kind: 'none' };
  const b = raw as Record<string, unknown>;
  switch (b.kind) {
    case 'aurora': {
      const colors = cleanColors(b.colors, 1, 4);
      return colors ? { kind: 'aurora', colors, intensity: clampInt(b.intensity, 0, 100, 55) } : { kind: 'none' };
    }
    case 'gradient': {
      const stops = cleanColors(b.stops, 2, 4);
      return stops
        ? { kind: 'gradient', stops, angle: clampInt(b.angle, 0, 360, 160), veil: clampInt(b.veil, 0, 95, 0) }
        : { kind: 'none' };
    }
    case 'image': {
      if (typeof b.image !== 'string' || b.image.length > MAX_IMAGE_CHARS || !IMAGE_DATA_URL.test(b.image)) {
        return { kind: 'none' };
      }
      const position = b.position === 'top' || b.position === 'bottom' ? b.position : 'center';
      return {
        kind: 'image',
        image: b.image,
        blur: clampInt(b.blur, 0, 40, 12),
        veil: clampInt(b.veil, 0, 95, 55),
        position,
      };
    }
    default:
      return { kind: 'none' };
  }
}

/** Validates a theme from storage or a backup file; null when unusable. */
export function parseTheme(raw: unknown): Theme | null {
  if (!raw || typeof raw !== 'object') return null;
  const t = raw as Record<string, unknown>;
  if (typeof t.id !== 'string' || !/^[\w-]{1,64}$/.test(t.id) || t.id === NO_THEME) return null;
  const colors = t.colors as Record<string, unknown> | undefined;
  if (!colors || typeof colors !== 'object') return null;
  const required = ['bg', 'surface', 'text', 'accent'] as const;
  if (!required.every((k) => isHexColor(colors[k]))) return null;
  const name = typeof t.name === 'string' && t.name.trim() ? t.name.trim().slice(0, 40) : 'Theme';
  return {
    id: t.id,
    name,
    mode: t.mode === 'light' ? 'light' : 'dark',
    colors: {
      bg: colors.bg as string,
      surface: colors.surface as string,
      text: colors.text as string,
      accent: colors.accent as string,
      ...(isHexColor(colors.muted) ? { muted: colors.muted } : {}),
      ...(isHexColor(colors.link) ? { link: colors.link } : {}),
    },
    backdrop: parseBackdrop(t.backdrop),
    glass: clampInt(t.glass, 0, 100, DEFAULTS.glass),
    radius: clampInt(t.radius, 0, 28, DEFAULTS.radius),
    font: FONT_IDS.includes(t.font as FontId) ? (t.font as FontId) : 'site',
    ...(typeof t.createdAt === 'number' ? { createdAt: t.createdAt } : {}),
  };
}

export function findTheme(id: string, custom: Theme[]): Theme | null {
  if (id === NO_THEME) return null;
  return custom.find((t) => t.id === id) ?? BUILT_IN_THEMES.find((t) => t.id === id) ?? null;
}

export function allThemes(custom: Theme[]): Theme[] {
  return [...custom, ...BUILT_IN_THEMES];
}

export function themeName(theme: Pick<Theme, 'name' | 'nameVi'>, lang: 'en' | 'vi'): string {
  return lang === 'vi' && theme.nameVi ? theme.nameVi : theme.name;
}

export function newThemeId(): string {
  return `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** A copy of any theme the user can edit. */
export function duplicateTheme(theme: Theme, name: string): Theme {
  const { builtIn: _b, nameVi: _v, ...rest } = theme;
  return { ...structuredClone(rest), id: newThemeId(), name: name.slice(0, 40), createdAt: Date.now() };
}
