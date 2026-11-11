import { describe, expect, it } from 'vitest';
import { contrast, parseColor, rgbToOklab, toOklch } from '../../src/core/color';
import {
  collectUsage,
  createRemapper,
  isRootLikeSelector,
  overridesCss,
  roleOf,
  themeableNames,
} from '../../src/core/remap';
import { BUILT_IN_THEMES, resolvePalette } from '../../src/core/themes';

const theme = BUILT_IN_THEMES.find((t) => t.id === 'midnight-velvet')!;
const palette = resolvePalette(theme);
const youtubeDark = { bg: parseColor('#0f0f0f')!, text: parseColor('#f1f1f1')!, muted: parseColor('#aaaaaa')! };
const youtubeLight = { bg: parseColor('#ffffff')!, text: parseColor('#0f0f0f')!, muted: parseColor('#606060')! };
const brand = [{ color: '#ff0033', tolerance: 24 }];
const link = [{ color: '#065fd4', tolerance: 26 }];

describe('createRemapper', () => {
  it('maps the site background and text onto the theme', () => {
    for (const anchors of [youtubeDark, youtubeLight]) {
      const remap = createRemapper({ palette, anchors, brand, link, glass: null });
      expect(remap(anchors === youtubeDark ? '#0f0f0f' : '#ffffff')).toBe('#0d0b1e');
      const text = parseColor(remap(anchors === youtubeDark ? '#f1f1f1' : '#0f0f0f')!)!;
      expect(contrast(text, palette.bg)).toBeGreaterThan(7);
    }
  });

  it('keeps greys in order on the theme scale', () => {
    const remap = createRemapper({ palette, anchors: youtubeDark, glass: null });
    const L = (v: string) => rgbToOklab(parseColor(remap(v)!)!).L;
    expect(L('#0f0f0f')).toBeLessThan(L('#272727'));
    expect(L('#272727')).toBeLessThan(L('#aaaaaa'));
    expect(L('#aaaaaa')).toBeLessThan(L('#f1f1f1'));
  });

  it('keeps alpha on overlays', () => {
    const remap = createRemapper({ palette, anchors: youtubeDark, glass: null });
    expect(parseColor(remap('rgba(255,255,255,0.1)')!)!.a).toBeCloseTo(0.1, 2);
  });

  it('turns the brand family into the accent and links into the link colour', () => {
    const remap = createRemapper({ palette, anchors: youtubeDark, brand, link, glass: null });
    expect(remap('#ff0033')).toBe('#8b5cf6');
    expect(toOklch(parseColor(remap('#cc0000')!)!).H).toBeCloseTo(toOklch(palette.accent).H, 0);
    expect(remap('#065fd4')).toBe(remap('#3ea6ff'));
  });

  it('leaves other colours alone', () => {
    const remap = createRemapper({ palette, anchors: youtubeDark, brand, link, glass: null });
    expect(remap('#2ba640')).toBeNull(); // success green
    expect(remap('#fbc02d')).toBeNull(); // warning yellow
    expect(remap('var(--x)')).toBeNull();
    expect(remap('transparent')).toBeNull();
  });

  it('only makes background-only colours see-through over a backdrop', () => {
    const remap = createRemapper({ palette, anchors: youtubeDark, glass: 40 });
    expect(remap('#0f0f0f', 'bg')).toBe('transparent');
    expect(remap('#0f0f0f', 'fg')).toBe('#0d0b1e');
    expect(parseColor(remap('#272727', 'bg')!)!.a).toBeLessThan(1);
    expect(parseColor(remap('#272727', 'fg')!)!.a).toBe(1);
  });
});

describe('themeable properties', () => {
  it('recognises palette scopes', () => {
    for (const s of [
      'html',
      ':root',
      '[dark]',
      'html[dark]',
      '.tw-root--theme-dark',
      '[darker-dark-theme] [light]',
      'html, [dark]',
    ]) {
      expect(isRootLikeSelector(s)).toBe(true);
    }
    for (const s of ['ytd-app', 'div', 'html body ytd-app', '.a > .b', 'a:hover', '[dark] .x .y']) {
      expect(isRootLikeSelector(s)).toBe(false);
    }
  });

  it('keeps properties that change between modes and skips static ones', () => {
    const names = themeableNames(
      [
        {
          selector: 'html',
          decls: [
            ['--bg', '#fff'],
            ['--static', '#fff'],
            ['--ad', '#fbc02d'],
          ],
        },
        {
          selector: 'html[dark]',
          decls: [
            ['--bg', '#0f0f0f'],
            ['--static', '#FFF'],
            ['--ad', '#fbc02d'],
          ],
        },
        { selector: 'ytd-app', decls: [['--local', '#123456']] },
        { selector: '.x', decls: [['--local', '#654321']] },
      ],
      () => true,
    );
    expect([...names]).toEqual(['--bg']);
  });

  it('learns how each property is used', () => {
    const fg = new Set<string>();
    const bg = new Set<string>();
    const style = (map: Record<string, string>) => ({ getPropertyValue: (p: string) => map[p] ?? '' });
    collectUsage(style({ 'background-color': 'var(--page)' }), fg, bg);
    collectUsage(style({ color: 'var(--text, var(--page))' }), fg, bg);
    collectUsage(style({ background: 'linear-gradient(var(--a), var(--b))' }), fg, bg);
    expect(roleOf('--a', fg, bg)).toBe('bg');
    expect(roleOf('--text', fg, bg)).toBe('fg');
    expect(roleOf('--page', fg, bg)).toBe('fg'); // also used as text: stays solid
    expect(roleOf('--nope', fg, bg)).toBe('unknown');
  });

  it('writes one important rule', () => {
    expect(overridesCss(['html', '[dark]'], new Map([['--a', '#fff']]))).toBe('html,[dark]{--a:#fff!important}');
    expect(overridesCss(['html'], new Map())).toBe('');
  });
});
