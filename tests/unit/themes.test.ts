import { describe, expect, it } from 'vitest';
import { contrast, isHexColor } from '../../src/core/color';
import {
  BUILT_IN_THEMES,
  DEFAULT_LIGHT_THEME_ID,
  DEFAULT_THEME_ID,
  duplicateTheme,
  findTheme,
  NO_THEME,
  parseTheme,
  resolvePalette,
  themeFromSeed,
  themeName,
} from '../../src/core/themes';

describe('built-in themes', () => {
  it('are valid, unique and named in both languages', () => {
    const ids = new Set<string>();
    for (const t of BUILT_IN_THEMES) {
      expect(ids.has(t.id)).toBe(false);
      ids.add(t.id);
      expect(parseTheme(t)).toMatchObject({ id: t.id, colors: t.colors, backdrop: t.backdrop });
      expect(t.nameVi).toBeTruthy();
    }
    expect(BUILT_IN_THEMES.length).toBe(24);
    expect(ids.has(DEFAULT_THEME_ID) && ids.has(DEFAULT_LIGHT_THEME_ID)).toBe(true);
  });

  it('all read well', () => {
    for (const t of BUILT_IN_THEMES) {
      const p = resolvePalette(t);
      expect(contrast(p.text, p.bg), t.id).toBeGreaterThanOrEqual(7);
      expect(contrast(p.muted, p.bg), t.id).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.link, p.bg), t.id).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.accentText, p.accent), t.id).toBeGreaterThanOrEqual(3);
    }
  });

  it('have a mode that matches their background', () => {
    for (const t of BUILT_IN_THEMES) {
      const p = resolvePalette(t);
      const darkBg = contrast(p.bg, { r: 0, g: 0, b: 0, a: 1 }) < contrast(p.bg, { r: 255, g: 255, b: 255, a: 1 });
      expect(darkBg, t.id).toBe(t.mode === 'dark');
    }
  });
});

describe('parseTheme', () => {
  const base = BUILT_IN_THEMES[0]!;

  it('rejects broken data', () => {
    expect(parseTheme(null)).toBeNull();
    expect(parseTheme({ ...base, id: 'bad id!' })).toBeNull();
    expect(parseTheme({ ...base, id: NO_THEME })).toBeNull();
    expect(parseTheme({ ...base, colors: { ...base.colors, bg: 'red' } })).toBeNull();
  });

  it('clamps numbers and drops unsafe backdrops', () => {
    const t = parseTheme({
      ...base,
      glass: 900,
      radius: -4,
      font: 'comic-sans',
      backdrop: { kind: 'image', image: 'javascript:alert(1)', blur: 3, veil: 3 },
    })!;
    expect(t.glass).toBe(100);
    expect(t.radius).toBe(0);
    expect(t.font).toBe('site');
    expect(t.backdrop).toEqual({ kind: 'none' });
    const img = parseTheme({
      ...base,
      backdrop: { kind: 'image', image: 'data:image/webp;base64,AAAA', blur: 99, veil: -1 },
    })!;
    expect(img.backdrop).toEqual({
      kind: 'image',
      image: 'data:image/webp;base64,AAAA',
      blur: 40,
      veil: 0,
      position: 'center',
    });
    expect(
      parseTheme({ ...base, backdrop: { kind: 'image', image: 'data:image/svg+xml;base64,AAAA' } })!.backdrop.kind,
    ).toBe('none');
  });

  it('keeps optional colours only when valid', () => {
    const t = parseTheme({ ...base, colors: { ...base.colors, muted: 'nope', link: '#123456' } })!;
    expect(t.colors.muted).toBeUndefined();
    expect(t.colors.link).toBe('#123456');
  });
});

describe('theme helpers', () => {
  it('builds a readable theme from one colour', () => {
    for (const mode of ['dark', 'light'] as const) {
      const t = themeFromSeed({ id: 'x', name: 'X', mode, accent: '#e11d48' });
      expect(Object.values(t.colors).every(isHexColor)).toBe(true);
      const p = resolvePalette(t);
      expect(contrast(p.text, p.bg)).toBeGreaterThanOrEqual(7);
    }
  });

  it('duplicates built-ins as editable copies', () => {
    const copy = duplicateTheme(BUILT_IN_THEMES[0]!, 'Mine');
    expect(copy.id).not.toBe(BUILT_IN_THEMES[0]!.id);
    expect(copy.builtIn).toBeUndefined();
    expect(copy.nameVi).toBeUndefined();
    expect(copy.name).toBe('Mine');
  });

  it('finds themes and names them per language', () => {
    expect(findTheme(NO_THEME, [])).toBeNull();
    expect(findTheme('aurora', [])?.id).toBe('aurora');
    const t = findTheme('aurora', [])!;
    expect(themeName(t, 'vi')).toBe('Cực quang');
    expect(themeName(t, 'en')).toBe('Aurora');
  });
});
