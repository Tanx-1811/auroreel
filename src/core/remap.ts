/**
 * The recolouring engine's pure half. Sites keep their colours in CSS custom
 * properties; the content script reads the ones that change between the
 * site's light and dark modes (the themeable ones) and asks `createRemapper`
 * for a replacement:
 *
 * - greys are placed on the site's own scale (background → surface →
 *   secondary text → text) and moved to the same spot on the theme's scale;
 * - the site's brand colour family (YouTube red, Twitch purple) turns into the
 *   theme accent, keeping each shade's relative lightness;
 * - link blues turn into the theme's link colour;
 * - every other colour (warnings, success greens) is left alone.
 */
import { formatColor, fromOklch, hueDistance, mix, parseColor, rgbToOklab, toOklch, type Rgba } from './color.ts';
import type { Palette } from './themes.ts';

export interface SiteAnchors {
  bg: Rgba;
  text: Rgba;
  surface?: Rgba;
  muted?: Rgba;
}

export interface HueFamily {
  /** A representative colour of the family (the site's brand red, link blue). */
  color: string;
  /** Hue distance (degrees) still counted as the family. */
  tolerance: number;
}

export interface RemapOptions {
  palette: Palette;
  anchors: SiteAnchors;
  brand?: HueFamily[];
  link?: HueFamily[];
  /**
   * A backdrop (aurora, gradient, picture) is showing: the page background
   * becomes transparent and surfaces see-through by `glass` percent.
   * null when the theme has a flat background.
   */
  glass: number | null;
}

/** Chroma below which a colour counts as grey. */
const NEUTRAL_CHROMA = 0.045;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Position of a lightness on the site's bg → text scale (0 = background, 1 = text). */
function scalePos(L: number, Lb: number, Lt: number): number {
  return (L - Lb) / (Lt - Lb);
}

/**
 * How a custom property is used by the site's rules: only as a background
 * ('bg'), as text/icon colour ('fg', possibly also as a background), or unknown.
 * Only background-only colours become see-through over a backdrop.
 */
export type ColorRole = 'bg' | 'fg' | 'unknown';

export function createRemapper(opts: RemapOptions): (value: string, role?: ColorRole) => string | null {
  const { palette, anchors, glass } = opts;
  const Lb = rgbToOklab(anchors.bg).L;
  const Lt = rgbToOklab(anchors.text).L;
  const span = Lt - Lb;
  let tS = anchors.surface ? scalePos(rgbToOklab(anchors.surface).L, Lb, Lt) : 0.1;
  let tM = anchors.muted ? scalePos(rgbToOklab(anchors.muted).L, Lb, Lt) : 0.65;
  if (!(tS > 0.01 && tS < 0.45)) tS = 0.1;
  if (!(tM > tS + 0.1 && tM < 0.95)) tM = 0.65;
  const accent = toOklch(palette.accent);
  const brand = (opts.brand ?? []).flatMap((f) => {
    const c = parseColor(f.color);
    return c ? [{ lch: toOklch(c), tolerance: f.tolerance }] : [];
  });
  const link = (opts.link ?? []).flatMap((f) => {
    const c = parseColor(f.color);
    return c ? [{ lch: toOklch(c), tolerance: f.tolerance }] : [];
  });

  function neutral(c: Rgba, L: number, role: ColorRole): string | null {
    if (Math.abs(span) < 0.15) return null;
    const t = clamp(scalePos(L, Lb, Lt), 0, 1);
    let out: Rgba;
    if (t <= tS) out = mix(palette.bg, palette.surface, t / tS);
    else if (t <= tM) out = mix(palette.surface, palette.muted, (t - tS) / (tM - tS));
    else out = mix(palette.muted, palette.text, (t - tM) / (1 - tM));
    let alpha = c.a;
    if (glass !== null && role === 'bg') {
      // Page-level background: let the backdrop through.
      if (t <= 0.025 && c.a > 0.5) return 'transparent';
      // Surfaces: see-through glass.
      if (t < tM * 0.6) alpha *= 1 - (glass / 100) * 0.6;
    }
    return formatColor({ ...out, a: alpha });
  }

  return (value: string, role: ColorRole = 'unknown') => {
    const c = parseColor(value);
    if (!c || c.a === 0) return null;
    const lch = toOklch(c);
    if (lch.C < NEUTRAL_CHROMA) return neutral(c, lch.L, role);
    for (const f of brand) {
      if (lch.C < 0.06 || hueDistance(lch.H, f.lch.H) > f.tolerance) continue;
      const L = clamp(lch.L + (accent.L - f.lch.L), 0.03, 0.98);
      const C = accent.C < 0.02 ? accent.C : Math.min(0.37, lch.C * (accent.C / Math.max(f.lch.C, 0.02)));
      return formatColor(fromOklch({ L, C, H: accent.H, alpha: c.a }));
    }
    for (const f of link) {
      if (lch.C < 0.06 || hueDistance(lch.H, f.lch.H) > f.tolerance) continue;
      return formatColor({ ...palette.link, a: c.a });
    }
    return null;
  };
}

// ——— Choosing which custom properties to recolour ———

/**
 * A selector that only targets the document root or theme-scoped attribute
 * containers: `html`, `:root`, `[dark]`, `html[dark]`, `.tw-root--theme-dark`,
 * `[darker-dark-theme] [light]`. These are where sites define their palettes.
 */
export function isRootLikeSelector(selector: string): boolean {
  const compound = /^(html|:root|body)?((\[[^\]]+\])|(\.[\w-]+))*$/;
  return selector
    .split(',')
    .map((s) => s.trim())
    .every((part) => {
      if (!part) return false;
      const steps = part.split(/\s+/);
      return steps.length <= 2 && steps.every((s) => s !== '' && compound.test(s));
    });
}

export interface DeclaredRule {
  selector: string;
  decls: [name: string, value: string][];
}

/**
 * Custom properties declared with at least two different values in root-like
 * rules — the ones that switch between the site's light and dark modes.
 * Properties with a single value (static white text on video, ad yellow)
 * are left alone.
 */
export function themeableNames(rules: DeclaredRule[], accept: (name: string) => boolean): Set<string> {
  const values = new Map<string, Set<string>>();
  for (const rule of rules) {
    if (!isRootLikeSelector(rule.selector)) continue;
    for (const [name, raw] of rule.decls) {
      if (!accept(name)) continue;
      const value = raw.trim().toLowerCase().replace(/\s+/g, ' ');
      if (!value || value === 'initial' || value === 'inherit' || value === 'unset') continue;
      const c = parseColor(value);
      const key = c ? formatColor(c) : value;
      let set = values.get(name);
      if (!set) values.set(name, (set = new Set()));
      set.add(key);
    }
  }
  const out = new Set<string>();
  for (const [name, set] of values) if (set.size >= 2) out.add(name);
  return out;
}

const VAR_REF = /var\(\s*(--[\w-]+)/g;
const FG_PROPS = ['color', 'fill', 'stroke', 'caret-color', '-webkit-text-fill-color'];
const BG_PROPS = ['background-color', 'background'];

/** Records which custom properties a rule uses for text/icons and which for backgrounds. */
export function collectUsage(style: Pick<CSSStyleDeclaration, 'getPropertyValue'>, fg: Set<string>, bg: Set<string>) {
  for (const prop of FG_PROPS) {
    const v = style.getPropertyValue(prop);
    if (v && v.includes('var(')) for (const m of v.matchAll(VAR_REF)) fg.add(m[1]!);
  }
  for (const prop of BG_PROPS) {
    const v = style.getPropertyValue(prop);
    if (v && v.includes('var(')) for (const m of v.matchAll(VAR_REF)) bg.add(m[1]!);
  }
}

export function roleOf(name: string, fg: Set<string> | null, bg: Set<string> | null): ColorRole {
  if (!fg || !bg) return 'unknown';
  if (fg.has(name)) return 'fg';
  if (bg.has(name)) return 'bg';
  return 'unknown';
}

/** Serialises overrides into one rule for the given selectors. */
export function overridesCss(selectors: string[], overrides: Map<string, string>): string {
  if (!overrides.size) return '';
  const body = [...overrides].map(([k, v]) => `${k}:${v}!important`).join(';');
  return `${selectors.join(',')}{${body}}`;
}

// ——— Rewriting literal colours (sites without a token palette) ———

/** Colour literals inside a CSS value (gradients, color-mix(), shadows…). */
const COLOR_TOKEN = /#[0-9a-f]{3,8}\b|(?:rgba?|hsla?|oklch|oklab)\([^()]*\)|\b(?:white|black)\b/gi;

/** Longhand properties whose literal colours are rewritten, and how each is used. */
export const REWRITE_PROPS: Record<string, ColorRole> = {
  color: 'fg',
  'background-color': 'bg',
  'background-image': 'bg',
  'border-top-color': 'fg',
  'border-right-color': 'fg',
  'border-bottom-color': 'fg',
  'border-left-color': 'fg',
  'outline-color': 'fg',
  'text-decoration-color': 'fg',
  'caret-color': 'fg',
  '-webkit-text-fill-color': 'fg',
  fill: 'fg',
  stroke: 'fg',
};

/** Guesses how a custom property is used from its name (design tokens are named semantically). */
export function roleFromName(name: string): ColorRole {
  const n = name.toLowerCase();
  if (/surface|background|(^|[-_])bg([-_]|$)|backdrop|fill-?bg|overlay/.test(n)) return 'bg';
  if (/foreground|text|font|label|icon|link|border|divider|outline|stroke|(^|[-_])fg([-_]|$)/.test(n)) return 'fg';
  return 'unknown';
}

/** Replaces every colour literal in a value; null when nothing changed. */
export function rewriteValue(
  value: string,
  remap: (v: string, role?: ColorRole) => string | null,
  role: ColorRole,
): string | null {
  if (!value || value.includes('url(')) return null;
  let changed = false;
  const out = value.replace(COLOR_TOKEN, (token) => {
    const mapped = remap(token, role);
    if (!mapped || mapped === token) return token;
    changed = true;
    return mapped;
  });
  return changed ? out : null;
}

export interface RewriteRule {
  /** Enclosing at-rule preludes, outermost first ("@media (min-width: 800px)"). */
  wrap: string[];
  selector: string;
  /**
   * Declarations with a literal colour; the third item marks `!important`
   * ones, the fourth copies the value unchanged (a later rule for the same
   * selector that must keep winning over our rewritten copy of an earlier one).
   */
  decls: [name: string, value: string, important?: boolean, keep?: boolean][];
  /** An earlier rule for the same selector was rewritten: write this one even if unchanged. */
  follows?: boolean;
}

/** Properties a rewritten rule can set (colour longhands and custom properties). */
export function isColorProperty(name: string): boolean {
  return name.startsWith('--') || name in REWRITE_PROPS;
}

/** Whether a declaration is worth keeping for rewriting. */
export function isRewritable(name: string, value: string): boolean {
  if (!value || value.includes('var(--rs-')) return false;
  if (!(name.startsWith('--') || name in REWRITE_PROPS)) return false;
  COLOR_TOKEN.lastIndex = 0;
  return COLOR_TOKEN.test(value);
}

/**
 * Builds override rules for literal colours: same selectors, remapped values,
 * wrapped in the same @media/@supports/@container conditions. They are not
 * made `!important` (unless the original was): a copy only wins over its
 * original by coming later, so a declaration that lost in the site's cascade
 * still loses — the stylesheet must stay last in the document.
 */
export function rewriteCss(rules: RewriteRule[], remap: (v: string, role?: ColorRole) => string | null): string {
  let css = '';
  for (const rule of rules) {
    const body: string[] = [];
    for (const [name, value, important, keep] of rule.decls) {
      const role = name.startsWith('--') ? roleFromName(name) : (REWRITE_PROPS[name] ?? 'unknown');
      // Unchanged colours are copied too, so the copies keep the site's rule order.
      const mapped = keep ? value : (rewriteValue(value, remap, role) ?? value);
      if (mapped) body.push(`${name}:${mapped}${important ? '!important' : ''}`);
    }
    if (!body.length) continue;
    if (
      rule.decls.every(([, , , keep]) => keep) ||
      body.every((d, i) => d === `${rule.decls[i]![0]}:${rule.decls[i]![1]}`)
    ) {
      // Nothing recoloured in this rule: only worth writing to keep the order after an earlier copy.
      if (!rule.decls.some(([, , , keep]) => keep) && !rule.follows) continue;
    }
    let block = `${rule.selector}{${body.join(';')}}`;
    for (let i = rule.wrap.length - 1; i >= 0; i--) block = `${rule.wrap[i]}{${block}}`;
    css += block;
  }
  return css;
}
