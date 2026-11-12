import { describe, expect, it } from 'vitest';
import { contrast, formatColor, parseColor, toOklch } from '../../src/core/color';
import { CSS_HOSTS, isCssHost } from '../../src/core/platforms';
import { createRemapper, isRewritable, rewriteCss, rewriteValue, roleFromName } from '../../src/core/remap';
import { adaptPalette, BUILT_IN_THEMES, resolvePalette } from '../../src/core/themes';

const palette = resolvePalette(BUILT_IN_THEMES.find((t) => t.id === 'midnight-velvet')!);
const netflix = { bg: parseColor('#141414')!, text: parseColor('#ffffff')!, muted: parseColor('#808080')! };
const remap = createRemapper({ palette, anchors: netflix, brand: [{ color: '#e50914', tolerance: 20 }], glass: null });

describe('CSS Color 4 parsing', () => {
  it('reads oklch() and oklab() as Tailwind v4 writes them', () => {
    expect(formatColor(parseColor('oklch(100% 0 0)')!)).toBe('#ffffff');
    expect(formatColor(parseColor('oklch(0 0 none)')!)).toBe('#000000');
    const orange = toOklch(parseColor('oklch(64.6% 0.222 41.116)')!);
    expect(orange.L).toBeCloseTo(0.646, 2);
    expect(orange.H).toBeCloseTo(41, 0);
    expect(parseColor('oklch(50% 0.1 200 / 0.5)')!.a).toBeCloseTo(0.5);
    expect(parseColor('oklab(0.5 0.1 -0.1)')).not.toBeNull();
    expect(parseColor('oklch(1 2)')).toBeNull();
  });
});

describe('rewriting literal colours', () => {
  it('replaces every colour in a value and keeps the rest', () => {
    expect(rewriteValue('#141414', remap, 'bg')).toBe('#0d0b1e');
    expect(rewriteValue('linear-gradient(180deg, rgba(20,20,20,0) 0%, #141414 100%)', remap, 'bg')).toBe(
      'linear-gradient(180deg, rgba(20,20,20,0) 0%, #0d0b1e 100%)',
    );
    expect(rewriteValue('color-mix(in srgb, rgb(255, 255, 255) 4%, transparent 96%)', remap, 'bg')).toMatch(
      /^color-mix\(in srgb, #[0-9a-f]{6} 4%, transparent 96%\)$/,
    );
    expect(rewriteValue('#e50914', remap, 'bg')).toBe('#8b5cf6');
    expect(rewriteValue('url(#a) #fff', remap, 'bg')).toBeNull();
    expect(rewriteValue('inherit', remap, 'fg')).toBeNull();
  });

  it('guesses roles from design-token names', () => {
    expect(roleFromName('--hcw--local-design--Button-Surface')).toBe('bg');
    expect(roleFromName('--hcw--local-design--Input-Foreground')).toBe('fg');
    expect(roleFromName('--color-background-base')).toBe('bg');
    expect(roleFromName('--divider-border')).toBe('fg');
    expect(roleFromName('--color-orange-600')).toBe('unknown');
  });

  it('keeps only declarations with colours', () => {
    expect(isRewritable('background-color', 'rgb(20, 20, 20)')).toBe(true);
    expect(isRewritable('--token', 'oklch(50% 0.1 20)')).toBe(true);
    expect(isRewritable('margin', '#fff')).toBe(false);
    expect(isRewritable('color', 'var(--x)')).toBe(false);
    expect(isRewritable('color', 'var(--rs-text)')).toBe(false);
  });

  it('writes non-important copies inside the same conditions', () => {
    const css = rewriteCss(
      [
        { wrap: [], selector: '.page', decls: [['background-color', '#141414']] },
        { wrap: ['@media (min-width: 800px)'], selector: '.btn', decls: [['color', '#e50914', true]] },
        { wrap: [], selector: '.x', decls: [['color', 'transparent']] },
      ],
      remap,
    );
    expect(css).toBe('.page{background-color:#0d0b1e}@media (min-width: 800px){.btn{color:#8b5cf6!important}}');
  });
});

describe('adaptPalette', () => {
  it('turns a light theme into its dark counterpart that still reads well', () => {
    for (const t of BUILT_IN_THEMES.filter((x) => x.mode === 'light')) {
      const p = adaptPalette(resolvePalette(t), 'dark');
      expect(p.mode).toBe('dark');
      expect(contrast(p.text, p.bg), t.id).toBeGreaterThanOrEqual(7);
      expect(contrast(p.muted, p.bg), t.id).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.accent, p.bg), t.id).toBeGreaterThanOrEqual(3);
      expect(contrast(p.link, p.bg), t.id).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('leaves a palette alone when the mode already matches', () => {
    expect(adaptPalette(palette, 'dark')).toBe(palette);
  });
});

describe('stylesheet hosts', () => {
  it('lets the worker fetch only the listed CDNs', () => {
    expect(CSS_HOSTS).toContain('https://*.vieon.vn/*');
    expect(isCssHost('https://static2.vieon.vn/a/b.css')).toBe(true);
    expect(isCssHost('http://static2.vieon.vn/a/b.css')).toBe(false);
    expect(isCssHost('https://evilvieon.vn/x.css')).toBe(false);
    expect(isCssHost('https://example.com/x.css')).toBe(false);
    expect(isCssHost('not a url')).toBe(false);
  });
});

describe('white text on a recoloured brand colour', () => {
  const palette = resolvePalette(BUILT_IN_THEMES.find((t) => t.id === 'sakura-night')!);
  const remap = createRemapper({
    palette,
    anchors: { bg: parseColor('#141414')!, text: parseColor('#ffffff')! },
    brand: [{ color: '#e50914', tolerance: 24 }],
    glass: null,
  });
  const onAccent = formatColor(palette.accentText);

  it("takes the accent's own text colour, so it reads on a light accent", () => {
    const css = rewriteCss(
      [
        {
          wrap: [],
          selector: '.join',
          decls: [
            ['background-color', '#e50914'],
            ['color', '#fff'],
          ],
        },
      ],
      remap,
      onAccent,
    );
    expect(css).toContain(`color:${onAccent}`);
    const bg = parseColor(css.match(/background-color:([^;}]+)/)![1]!)!;
    expect(contrast(palette.accentText, bg)).toBeGreaterThan(4.5);
  });

  it('pairs component tokens: a brand surface gives its foreground the accent text colour', () => {
    const css = rewriteCss(
      [
        {
          wrap: [],
          selector: '.btn',
          decls: [
            ['--hcw--local-design--Button-Surface', '#e50914'],
            ['--hcw--local-design--Button-Foreground', '#ffffff'],
            ['--hcw--local-design--Card-Foreground', '#ffffff'],
          ],
        },
      ],
      remap,
      onAccent,
    );
    expect(css).toContain(`--hcw--local-design--Button-Foreground:${onAccent}`);
    expect(css).not.toContain(`--hcw--local-design--Card-Foreground:${onAccent}`);
  });

  it('leaves white text on grey backgrounds to the normal mapping', () => {
    const css = rewriteCss(
      [
        {
          wrap: [],
          selector: '.card',
          decls: [
            ['background-color', '#181818'],
            ['color', '#fff'],
          ],
        },
      ],
      remap,
      onAccent,
    );
    expect(css).not.toContain(`color:${onAccent}`);
  });
});
