import type { CssContext } from '../css/common.ts';
import type { PlatformId } from '../platforms.ts';
import type { HueFamily } from '../remap.ts';

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
  /** Theme CSS beyond the shared tokens/backdrop/fonts. */
  themeCss?: (ctx: CssContext) => string;
  /** CSS for the layout options; applies with or without a theme. */
  layoutCss?: (layout: Record<string, boolean | string>, strings: LayoutStrings) => string;
  /** Elements whose font must not change (captions, icon fonts). */
  fontExclude?: string[];
}
