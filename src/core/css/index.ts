import type { SiteAdapter, LayoutStrings } from '../sites/index.ts';
import { adaptPalette, resolvePalette, type Palette, type Theme } from '../themes.ts';
import { backdropCss, chromeCss, fontCss, ROOT, tokens } from './common.ts';

export interface PageCssInput {
  adapter: SiteAdapter;
  /** null keeps the site's colours (layout options still apply). */
  theme: Theme | null;
  layout: Record<string, boolean | string>;
  assetUrl: (path: string) => string;
  strings: LayoutStrings;
}

/** The palette a site shows: the theme's, or its counterpart in the site's fixed mode. */
export function sitePalette(adapter: SiteAdapter, theme: Theme): Palette {
  const palette = resolvePalette(theme);
  return adapter.siteMode ? adaptPalette(palette, adapter.siteMode) : palette;
}

/** The whole static stylesheet for a page (the engine's overrides come separately). */
export function buildPageCss({ adapter, theme, layout, assetUrl, strings }: PageCssInput): string {
  let css = '';
  if (theme) {
    const palette = sitePalette(adapter, theme);
    const ctx = { theme, palette, assetUrl };
    css += tokens(ctx);
    css += adapter.backdrop
      ? backdropCss(theme, palette)
      : `${ROOT},${ROOT} body{background-color:var(--rs-bg)!important}`;
    css += chromeCss();
    css += fontCss(theme.font, assetUrl, adapter.fontExclude);
    css += adapter.themeCss?.(ctx) ?? '';
  }
  css += adapter.layoutCss?.(layout, strings) ?? '';
  return css;
}
