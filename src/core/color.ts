/**
 * Colour maths used by the theme engine: parsing the colour strings sites put
 * in CSS custom properties, OKLab/OKLCH conversion (perceptual mixing and hue
 * shifts) and WCAG contrast. Pure, no DOM.
 */

/** sRGB channels 0–255, alpha 0–1. */
export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface Oklab {
  L: number;
  a: number;
  b: number;
  alpha: number;
}

export interface Oklch {
  L: number;
  C: number;
  /** Degrees 0–360. */
  H: number;
  alpha: number;
}

const NAMED: Record<string, string> = {
  black: '#000000',
  white: '#ffffff',
  red: '#ff0000',
  green: '#008000',
  blue: '#0000ff',
  yellow: '#ffff00',
  orange: '#ffa500',
  purple: '#800080',
  gray: '#808080',
  grey: '#808080',
  silver: '#c0c0c0',
  whitesmoke: '#f5f5f5',
  gainsboro: '#dcdcdc',
  lightgray: '#d3d3d3',
  lightgrey: '#d3d3d3',
  darkgray: '#a9a9a9',
  darkgrey: '#a9a9a9',
  dimgray: '#696969',
  dimgrey: '#696969',
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round = (v: number, digits = 3) => Math.round(v * 10 ** digits) / 10 ** digits;

function parseHex(hex: string): Rgba | null {
  const h = hex.slice(1);
  if (!/^[0-9a-f]+$/i.test(h)) return null;
  if (h.length === 3 || h.length === 4) {
    const [r, g, b, a] = [...h].map((c) => parseInt(c + c, 16));
    return { r: r!, g: g!, b: b!, a: h.length === 4 ? a! / 255 : 1 };
  }
  if (h.length === 6 || h.length === 8) {
    const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
    return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) / 255 : 1 };
  }
  return null;
}

/** Splits `rgb(1, 2, 3 / .5)`, `rgba(1,2,3,.5)` or `rgb(1 2 3)` arguments. */
function args(body: string): string[] {
  return body
    .replace(/\s*\/\s*/, ' / ')
    .split(/[\s,]+/)
    .filter((p) => p && p !== '/');
}

function num(token: string, scale: number): number {
  if (token === 'none') return 0;
  const v = parseFloat(token);
  if (!Number.isFinite(v)) return NaN;
  return token.endsWith('%') ? (v / 100) * scale : v;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

/**
 * Parses hex, rgb()/rgba(), hsl()/hsla(), `transparent` and a few named
 * colours. Anything else (var(), color-mix(), gradients, keywords) → null.
 */
export function parseColor(input: string): Rgba | null {
  const s = input.trim().toLowerCase();
  if (!s) return null;
  if (s === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
  if (s.startsWith('#')) return parseHex(s);
  if (NAMED[s]) return parseHex(NAMED[s]!);
  const m = /^(rgba?|hsla?)\(([^()]*)\)$/.exec(s);
  if (!m) return null;
  const parts = args(m[2]!);
  if (parts.length < 3 || parts.length > 4) return null;
  const alpha = parts[3] === undefined ? 1 : num(parts[3], 1);
  let rgb: [number, number, number];
  if (m[1]!.startsWith('rgb')) {
    rgb = [num(parts[0]!, 255), num(parts[1]!, 255), num(parts[2]!, 255)];
  } else {
    const h = parseFloat(parts[0]!);
    const sat = num(parts[1]!, 1);
    const light = num(parts[2]!, 1);
    if (![h, sat, light].every(Number.isFinite)) return null;
    rgb = hslToRgb(((h % 360) + 360) % 360, clamp(sat, 0, 1), clamp(light, 0, 1));
  }
  if (![...rgb, alpha].every(Number.isFinite)) return null;
  return { r: clamp(rgb[0], 0, 255), g: clamp(rgb[1], 0, 255), b: clamp(rgb[2], 0, 255), a: clamp(alpha, 0, 1) };
}

/** `#rrggbb` (alpha dropped). */
export function toHex(c: Rgba): string {
  const h = (v: number) =>
    Math.round(clamp(v, 0, 255))
      .toString(16)
      .padStart(2, '0');
  return `#${h(c.r)}${h(c.g)}${h(c.b)}`;
}

/** Shortest faithful CSS: hex when opaque, `rgb(r g b / a)` otherwise. */
export function formatColor(c: Rgba): string {
  if (c.a >= 0.999) return toHex(c);
  const i = (v: number) => Math.round(clamp(v, 0, 255));
  return `rgb(${i(c.r)} ${i(c.g)} ${i(c.b)} / ${round(c.a, 3)})`;
}

export function isHexColor(s: unknown): s is string {
  return typeof s === 'string' && /^#[0-9a-f]{6}$/i.test(s);
}

const toLinear = (v: number) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const fromLinear = (v: number) => {
  const c = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
  return c * 255;
};

export function rgbToOklab(c: Rgba): Oklab {
  const r = toLinear(c.r);
  const g = toLinear(c.g);
  const b = toLinear(c.b);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    alpha: c.a,
  };
}

function oklabToLinear(c: Oklab): [number, number, number] {
  const l = (c.L + 0.3963377774 * c.a + 0.2158037573 * c.b) ** 3;
  const m = (c.L - 0.1055613458 * c.a - 0.0638541728 * c.b) ** 3;
  const s = (c.L - 0.0894841775 * c.a - 1.291485548 * c.b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const inGamut = (rgb: [number, number, number]) => rgb.every((v) => v >= -1e-4 && v <= 1 + 1e-4);

export function oklabToRgb(c: Oklab): Rgba {
  let lin = oklabToLinear(c);
  if (!inGamut(lin)) {
    // Keep lightness and hue, reduce chroma until the colour fits sRGB.
    const lch = oklabToOklch(c);
    let lo = 0;
    let hi = lch.C;
    for (let i = 0; i < 18; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(oklabToLinear(oklchToOklab({ ...lch, C: mid })))) lo = mid;
      else hi = mid;
    }
    lin = oklabToLinear(oklchToOklab({ ...lch, C: lo }));
  }
  return {
    r: clamp(fromLinear(clamp(lin[0], 0, 1)), 0, 255),
    g: clamp(fromLinear(clamp(lin[1], 0, 1)), 0, 255),
    b: clamp(fromLinear(clamp(lin[2], 0, 1)), 0, 255),
    a: clamp(c.alpha, 0, 1),
  };
}

export function oklabToOklch(c: Oklab): Oklch {
  const C = Math.hypot(c.a, c.b);
  let H = (Math.atan2(c.b, c.a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { L: c.L, C, H: C < 1e-4 ? 0 : H, alpha: c.alpha };
}

export function oklchToOklab(c: Oklch): Oklab {
  const rad = (c.H * Math.PI) / 180;
  return { L: c.L, a: c.C * Math.cos(rad), b: c.C * Math.sin(rad), alpha: c.alpha };
}

export const toOklch = (c: Rgba): Oklch => oklabToOklch(rgbToOklab(c));
export const fromOklch = (c: Oklch): Rgba => oklabToRgb(oklchToOklab(c));

/** Perceptual mix in OKLab; t = 0 → a, t = 1 → b. Alpha is mixed linearly. */
export function mix(a: Rgba, b: Rgba, t: number): Rgba {
  const A = rgbToOklab(a);
  const B = rgbToOklab(b);
  const k = clamp(t, 0, 1);
  return oklabToRgb({
    L: A.L + (B.L - A.L) * k,
    a: A.a + (B.a - A.a) * k,
    b: A.b + (B.b - A.b) * k,
    alpha: A.alpha + (B.alpha - A.alpha) * k,
  });
}

export const withAlpha = (c: Rgba, a: number): Rgba => ({ ...c, a: clamp(a, 0, 1) });

/** Smallest angle between two hues, degrees. */
export function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** WCAG relative luminance. */
export function luminance(c: Rgba): number {
  return 0.2126 * toLinear(c.r) + 0.7152 * toLinear(c.g) + 0.0722 * toLinear(c.b);
}

export function contrast(a: Rgba, b: Rgba): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export const isDark = (c: Rgba) => rgbToOklab(c).L < 0.6;

/**
 * Moves `fg`'s lightness away from `bg` until the pair reaches `min` contrast
 * (or the end of the lightness range). Hue and chroma are kept where possible.
 */
export function ensureContrast(fg: Rgba, bg: Rgba, min: number): Rgba {
  if (contrast(fg, bg) >= min) return fg;
  const lch = toOklch(fg);
  const up = rgbToOklab(bg).L < 0.6;
  let out = fg;
  for (let i = 1; i <= 40; i++) {
    const L = clamp(lch.L + (up ? 1 : -1) * i * 0.025, 0, 1);
    out = fromOklch({ ...lch, L });
    if (contrast(out, bg) >= min || L === 0 || L === 1) break;
  }
  return out;
}

/** Readable text colour on top of `bg`: near-white or near-black. */
export function onColor(bg: Rgba): Rgba {
  const white = { r: 255, g: 255, b: 255, a: 1 };
  const black = { r: 15, g: 15, b: 20, a: 1 };
  return contrast(white, bg) >= contrast(black, bg) ? white : black;
}

/** Parses a colour that must be valid (theme data is validated before use). */
export function hex(s: string): Rgba {
  return parseColor(s) ?? { r: 0, g: 0, b: 0, a: 1 };
}
