import { describe, expect, it } from 'vitest';
import { backdropCss, backdropLayers, fontCss, FONT_ASSETS, ROOT, tokens } from '../../src/core/css/common';
import { buildPageCss } from '../../src/core/css/index';
import { paletteFromPixels } from '../../src/core/imagePalette';
import { layoutDefaults, platformById } from '../../src/core/platforms';
import { adapterFor } from '../../src/core/sites/index';
import { BUILT_IN_THEMES, resolvePalette, type Theme } from '../../src/core/themes';

const theme = (id: string) => BUILT_IN_THEMES.find((t) => t.id === id)!;
const assetUrl = (p: string) => `chrome-extension://abc/${p}`;
const strings = { homeHidden: 'Hidden "feed"' };

describe('page CSS', () => {
  it('writes the theme tokens', () => {
    const t = theme('midnight-velvet');
    const css = tokens({ theme: t, palette: resolvePalette(t), assetUrl });
    expect(css).toContain('--rs-bg:#0d0b1e');
    expect(css).toContain('--rs-accent:#8b5cf6');
    expect(css).toContain('--rs-page:transparent');
  });

  it('paints every backdrop kind behind the page with a strong root selector', () => {
    for (const t of BUILT_IN_THEMES) {
      const css = backdropCss(t, resolvePalette(t));
      expect(css).toContain(ROOT);
      if (t.backdrop.kind !== 'none') expect(css).toContain('::before');
    }
    const img: Theme = {
      ...theme('paper'),
      backdrop: { kind: 'image', image: 'data:image/webp;base64,AA', blur: 10, veil: 40, position: 'top' },
    };
    const layers = backdropLayers(img, resolvePalette(img));
    expect(layers.background).toContain('data:image/webp');
    expect(backdropCss(img, resolvePalette(img))).toContain('blur(10px)');
  });

  it('loads packaged fonts with Vietnamese coverage and keeps captions untouched', () => {
    const css = fontCss('lexend', assetUrl, ['.ytp-caption-segment']);
    expect(css).toContain('chrome-extension://abc/fonts/lexend-vietnamese-400-normal.woff2');
    expect(css).toContain('U+1EA0-1EF9');
    expect(css).toContain(':not(svg,svg *,code,pre,kbd,samp,.ytp-caption-segment)');
    expect(fontCss('site', assetUrl)).toBe('');
    expect(FONT_ASSETS).toHaveLength(18);
  });

  it('builds YouTube CSS with layout options and safe strings', () => {
    const yt = platformById('youtube');
    const layout = {
      ...layoutDefaults(yt),
      hideShorts: true,
      hideHomeFeed: true,
      gridColumns: '5',
      thumbStyle: 'blur',
    };
    const css = buildPageCss({ adapter: adapterFor('youtube'), theme: theme('aurora'), layout, assetUrl, strings });
    expect(css).toContain('--yt-sys-color-baseline--base-background:var(--rs-page)!important');
    expect(css).toContain('ytd-reel-shelf-renderer');
    expect(css).toContain('--ytd-rich-grid-items-per-row:5!important');
    expect(css).toContain('content:"Hidden \\"feed\\""');
    expect(css).toContain('#cinematics');
  });

  it('applies layout options without a theme', () => {
    const css = buildPageCss({
      adapter: adapterFor('youtube'),
      theme: null,
      layout: { ...layoutDefaults(platformById('youtube')), hideComments: true },
      assetUrl,
      strings,
    });
    expect(css).not.toContain('--rs-bg');
    expect(css).toContain('ytd-comments#comments');
  });

  it('gives basic sites a background but no backdrop', () => {
    const css = buildPageCss({ adapter: adapterFor('netflix'), theme: theme('aurora'), layout: {}, assetUrl, strings });
    expect(css).toContain(`${ROOT},${ROOT} body{background-color:var(--rs-bg)!important}`);
    expect(css).not.toContain('::before');
  });
});

describe('image palette', () => {
  it('finds a dark mode, a background and a vivid accent', () => {
    const px: number[] = [];
    for (let i = 0; i < 900; i++) px.push(12, 14, 30, 255); // night sky
    for (let i = 0; i < 200; i++) px.push(240, 60, 140, 255); // neon pink
    for (let i = 0; i < 120; i++) px.push(40, 200, 220, 255); // cyan
    const pal = paletteFromPixels(new Uint8ClampedArray(px))!;
    expect(pal.mode).toBe('dark');
    expect(pal.swatches.length).toBeGreaterThanOrEqual(3);
    expect(pal.accent).not.toBe(pal.bg);
    expect(pal.secondary).not.toBe(pal.accent);
  });

  it('chooses light mode for bright pictures', () => {
    const px: number[] = [];
    for (let i = 0; i < 1000; i++) px.push(245, 240, 230, 255);
    for (let i = 0; i < 100; i++) px.push(30, 120, 220, 255);
    expect(paletteFromPixels(new Uint8ClampedArray(px))!.mode).toBe('light');
  });
});
