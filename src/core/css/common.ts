/**
 * CSS shared by every site: the theme's tokens (--rs-*), the backdrop, fonts,
 * scrollbars and selection. Builders return plain strings; the content script
 * puts them in one <style> element.
 */
import { formatColor, hex, withAlpha } from '../color.ts';
import type { FontId, Palette, Theme } from '../themes.ts';

export interface CssContext {
  theme: Theme;
  palette: Palette;
  /** Absolute URL of a file packaged with the extension (fonts). */
  assetUrl: (path: string) => string;
}

export const hasBackdrop = (theme: Theme) => theme.backdrop.kind !== 'none';

const c = formatColor;

/** Percentage of the background colour behind see-through bars (100 = solid). */
export function glassOpacity(theme: Theme): number {
  return hasBackdrop(theme) ? Math.round(100 - theme.glass * 0.6) : 100;
}

export function tokens({ theme, palette: p }: CssContext): string {
  const glass = glassOpacity(theme);
  return `:root{--rs-bg:${c(p.bg)};--rs-surface:${c(p.surface)};--rs-surface-2:${c(p.surface2)};--rs-text:${c(
    p.text,
  )};--rs-muted:${c(p.muted)};--rs-accent:${c(p.accent)};--rs-accent-text:${c(p.accentText)};--rs-link:${c(
    p.link,
  )};--rs-border:${c(p.border)};--rs-radius:${theme.radius}px;--rs-glass-bg:color-mix(in oklab,var(--rs-bg) ${glass}%,transparent);--rs-glass-surface:color-mix(in oklab,var(--rs-surface) ${Math.min(
    100,
    glass + 15,
  )}%,transparent);--rs-page:${hasBackdrop(theme) ? 'transparent' : 'var(--rs-bg)'};color-scheme:${p.mode}}`;
}

export interface BackdropLayers {
  /** CSS background of the backdrop layer (over the theme background). */
  background: string | null;
  /** Blur applied to the backdrop layer, px. */
  blur: number;
  /** Veil of the theme background over the backdrop, % (0 = none). */
  veil: number;
  position?: string;
}

/** The backdrop as CSS backgrounds, shared by the page stylesheet and the previews. */
export function backdropLayers(theme: Theme, palette: Palette): BackdropLayers {
  const b = theme.backdrop;
  switch (b.kind) {
    case 'none':
      return { background: null, blur: 0, veil: 0 };
    case 'aurora': {
      const k = (b.intensity / 100) * (palette.mode === 'dark' ? 0.62 : 0.75);
      const spots = ['70% 60% at 8% 0%', '60% 55% at 100% 8%', '80% 60% at 50% 110%', '45% 40% at 0% 85%'];
      const background = spots
        .map((shape, i) => {
          const col = b.colors[i % b.colors.length]!;
          return `radial-gradient(${shape},${c(withAlpha(hex(col), i === 3 ? k * 0.6 : k))},transparent 70%)`;
        })
        .join(',');
      return { background, blur: 0, veil: 0 };
    }
    case 'gradient':
      return { background: `linear-gradient(${b.angle}deg,${b.stops.join(',')})`, blur: 0, veil: b.veil };
    case 'image':
      return {
        background: `url("${b.image}") ${b.position}/cover no-repeat`,
        blur: b.blur,
        veil: b.veil,
        position: b.position,
      };
  }
}

/** Layers of the backdrop, painted on fixed pseudo-elements of <html> behind the page. */
/** `html` with a specificity no site rule beats (sites style html[dark] with !important). */
export const ROOT = 'html:not(#rs-root)';

/** Layers of the backdrop, painted on fixed pseudo-elements of <html> behind the page. */
export function backdropCss(theme: Theme, palette: Palette): string {
  const l = backdropLayers(theme, palette);
  if (!l.background) return `${ROOT},${ROOT} body{background-color:var(--rs-bg)!important}`;
  const grow = l.blur * 2;
  return (
    `${ROOT}{background:var(--rs-bg)!important}${ROOT} body{background:transparent!important}` +
    `${ROOT}::before{content:"";position:fixed;inset:-${grow}px;z-index:-1;pointer-events:none;background:${l.background};${
      l.blur ? `filter:blur(${l.blur}px) saturate(1.1)` : ''
    }}` +
    (l.veil
      ? `${ROOT}::after{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;background:color-mix(in oklab,var(--rs-bg) ${l.veil}%,transparent)}`
      : '')
  );
}

const FONT_FILES: Record<Exclude<FontId, 'site' | 'system'>, { family: string; file: string }> = {
  'be-vietnam-pro': { family: 'RS Be Vietnam Pro', file: 'be-vietnam-pro' },
  lexend: { family: 'RS Lexend', file: 'lexend' },
  nunito: { family: 'RS Nunito', file: 'nunito' },
};

const RANGES = {
  latin:
    'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
  vietnamese:
    'U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB',
};

/** Font files the build copies into dist/fonts. */
export const FONT_ASSETS = Object.values(FONT_FILES).flatMap(({ file }) =>
  (['latin', 'vietnamese'] as const).flatMap((subset) =>
    [400, 500, 700].map((w) => `${file}-${subset}-${w}-normal.woff2`),
  ),
);

/** Font-family stack for a theme font, null to keep the site's. */
export function fontStack(font: FontId): string | null {
  if (font === 'site') return null;
  if (font === 'system') return `system-ui,-apple-system,"Segoe UI",Roboto,sans-serif`;
  return `"${FONT_FILES[font].family}",system-ui,sans-serif`;
}

export function fontCss(font: FontId, assetUrl: (p: string) => string, exclude: string[] = []): string {
  const stack = fontStack(font);
  if (!stack) return '';
  let faces = '';
  if (font !== 'system' && font !== 'site') {
    const { family, file } = FONT_FILES[font];
    for (const subset of ['latin', 'vietnamese'] as const) {
      for (const w of [400, 500, 700]) {
        faces += `@font-face{font-family:"${family}";font-style:normal;font-weight:${w};font-display:swap;src:url("${assetUrl(
          `fonts/${file}-${subset}-${w}-normal.woff2`,
        )}") format("woff2");unicode-range:${RANGES[subset]}}`;
      }
    }
  }
  const skip = ['svg', 'svg *', 'code', 'pre', 'kbd', 'samp', ...exclude].join(',');
  return `${faces}html body,html body :not(${skip}){font-family:${stack}!important}`;
}

/** Scrollbars, text selection, native controls. */
export function chromeCss(): string {
  return (
    `html{scrollbar-color:color-mix(in oklab,var(--rs-text) 28%,transparent) transparent;accent-color:var(--rs-accent)}` +
    `::selection{background:color-mix(in oklab,var(--rs-accent) 38%,transparent);color:inherit}`
  );
}

/** Thin wrapper so site builders can write `rule('a,b', 'color:red')`. */
export const rule = (selectors: string | string[], body: string) =>
  `${Array.isArray(selectors) ? selectors.join(',') : selectors}{${body}}`;

/** Hides elements (layout options). */
export const hide = (selectors: string[]) => (selectors.length ? rule(selectors, 'display:none!important') : '');
