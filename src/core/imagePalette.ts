/**
 * Picks theme colours from a picture: k-means in OKLab over a downscaled copy
 * of its pixels, then chooses a background, an accent and a second colour.
 */
import { hueDistance, oklabToOklch, oklabToRgb, rgbToOklab, toHex, type Oklab } from './color.ts';
import type { ThemeMode } from './themes.ts';

export interface ImagePalette {
  mode: ThemeMode;
  bg: string;
  accent: string;
  secondary: string;
  /** All cluster colours, most common first (shown as swatches). */
  swatches: string[];
}

interface Cluster {
  c: Oklab;
  n: number;
}

/** Deterministic k-means (initial centres spread through the samples by lightness). */
export function kmeans(points: Oklab[], k: number, rounds = 12): Cluster[] {
  if (!points.length) return [];
  const sorted = [...points].sort((a, b) => a.L - b.L);
  let centres = Array.from({ length: Math.min(k, points.length) }, (_, i) => {
    const p = sorted[Math.floor(((i + 0.5) / k) * sorted.length)]!;
    return { ...p };
  });
  let counts: number[] = [];
  for (let r = 0; r < rounds; r++) {
    const sums = centres.map(() => ({ L: 0, a: 0, b: 0, n: 0 }));
    for (const p of points) {
      let best = 0;
      let bestD = Infinity;
      for (let i = 0; i < centres.length; i++) {
        const c = centres[i]!;
        const d = (p.L - c.L) ** 2 + (p.a - c.a) ** 2 + (p.b - c.b) ** 2;
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      const s = sums[best]!;
      s.L += p.L;
      s.a += p.a;
      s.b += p.b;
      s.n++;
    }
    counts = sums.map((s) => s.n);
    centres = sums.map((s, i) => (s.n ? { L: s.L / s.n, a: s.a / s.n, b: s.b / s.n, alpha: 1 } : centres[i]!));
  }
  return centres
    .map((c, i) => ({ c, n: counts[i] ?? 0 }))
    .filter((c) => c.n > 0)
    .sort((a, b) => b.n - a.n);
}

/** `pixels` is RGBA bytes (ImageData.data) of a small copy of the picture. */
export function paletteFromPixels(pixels: Uint8ClampedArray, k = 7): ImagePalette | null {
  const points: Oklab[] = [];
  for (let i = 0; i + 3 < pixels.length; i += 4) {
    if (pixels[i + 3]! < 128) continue;
    points.push(rgbToOklab({ r: pixels[i]!, g: pixels[i + 1]!, b: pixels[i + 2]!, a: 1 }));
  }
  const clusters = kmeans(points, k);
  if (!clusters.length) return null;
  const total = clusters.reduce((s, c) => s + c.n, 0);
  const avgL = clusters.reduce((s, c) => s + c.c.L * c.n, 0) / total;
  const mode: ThemeMode = avgL < 0.62 ? 'dark' : 'light';
  const lch = clusters.map((c) => ({ ...c, lch: oklabToOklch(c.c) }));
  // Accent: vivid and reasonably common.
  const scored = lch
    .map((c) => ({ ...c, score: c.lch.C * Math.sqrt(c.n / total) * (c.lch.L > 0.25 && c.lch.L < 0.92 ? 1 : 0.3) }))
    .sort((a, b) => b.score - a.score);
  const accent = scored[0]!;
  const second =
    scored.find((c) => c !== accent && hueDistance(c.lch.H, accent.lch.H) > 35 && c.lch.C > 0.04) ??
    scored.find((c) => c !== accent) ??
    accent;
  // Background: the darkest (dark mode) or lightest (light mode) common colour, toned down.
  const base =
    [...lch]
      .filter((c) => c.n / total > 0.04)
      .sort((a, b) => (mode === 'dark' ? a.lch.L - b.lch.L : b.lch.L - a.lch.L))[0] ?? lch[0]!;
  const bgL = mode === 'dark' ? Math.min(base.lch.L, 0.2) : Math.max(base.lch.L, 0.96);
  const bg = oklabToRgb({ L: bgL, a: base.c.a * 0.35, b: base.c.b * 0.35, alpha: 1 });
  const boost = (c: Oklab) => {
    const l = oklabToOklch(c);
    const L = mode === 'dark' ? Math.max(l.L, 0.62) : Math.min(Math.max(l.L, 0.45), 0.6);
    const C = Math.max(l.C, 0.12);
    const rad = (l.H * Math.PI) / 180;
    return toHex(oklabToRgb({ L, a: C * Math.cos(rad), b: C * Math.sin(rad), alpha: 1 }));
  };
  return {
    mode,
    bg: toHex(bg),
    accent: boost(accent.c),
    secondary: boost(second.c),
    swatches: clusters.map((c) => toHex(oklabToRgb(c.c))),
  };
}
