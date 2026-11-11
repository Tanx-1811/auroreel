import type { CssContext } from '../css/common.ts';
import type { PlatformId } from '../platforms.ts';
import type { HueFamily } from '../remap.ts';
import type { ThemeMode } from '../themes.ts';

/** How the recolouring engine treats a site's custom properties. */
export interface EngineConfig {
  /** Custom properties the engine may recolour. */
  accept: RegExp;
  /** Never recolour these (colours over video, ads, status colours). */
  exclude?: RegExp;
  /**
   * Properties to recolour even when they aren't detected as switching between
   * light and dark (sites that only load the active palette, or whose
   * stylesheets can't be read).
   */
  semantic?: RegExp;
  /** Selectors the overrides are written for (where the site defines its palette). */
  rootSelectors: string[];
  brand: HueFamily[];
  link?: HueFamily[];
  /** Custom properties holding the site's background, text, surface and secondary text. */
  anchors: { bg?: string; text?: string; surface?: string; muted?: string };
  /**
   * The site's own background/text/surface/secondary-text colours, for sites
   * without token anchors (used when `anchors` don't resolve).
   */
  anchorColors?: { bg: string; text: string; surface?: string; muted?: string };
  /**
   * Also rewrite literal colours in every rule (and custom properties declared
   * on any selector) — for sites that hard-code colours or keep design tokens on
   * component classes (Netflix, FPT Play, VieON…).
   */
  rewrite?: boolean;
  /** Fetch cross-origin stylesheets the page can't expose (CORS, or via the service worker). */
  fetchCss?: boolean;
}

export interface LayoutStrings {
  /** Shown where the home feed was hidden. */
  homeHidden: string;
}

export interface SiteAdapter {
  id: PlatformId;
  engine?: EngineConfig;
  /** Draw the theme backdrop behind the site (needs see-through page containers). */
  backdrop: boolean;
  /**
   * The site's design is fixed in this mode (no light/dark switch): themes of the
   * other mode are shown as their counterpart in this mode (`adaptPalette`).
   */
  siteMode?: ThemeMode;
  /** Theme CSS beyond the shared tokens/backdrop/fonts. */
  themeCss?: (ctx: CssContext) => string;
  /** CSS for the layout options; applies with or without a theme. */
  layoutCss?: (layout: Record<string, boolean | string>, strings: LayoutStrings) => string;
  /** Elements whose font must not change (captions, icon fonts). */
  fontExclude?: string[];
}
