import { describe, expect, it } from 'vitest';
import { subtitleCss } from '../../src/core/css/subtitles';
import { filterThemes, toggleFavorite } from '../../src/ui/ThemeGrid';
import { BUILT_IN_THEMES } from '../../src/core/themes';

describe('subtitle CSS', () => {
  it('is empty when off and styles every known player when on', () => {
    expect(subtitleCss({ on: false, size: 120, color: '#ffffff', background: 50, bold: false })).toBe('');
    const css = subtitleCss({ on: true, size: 150, color: '#fde047', background: 40, bold: true });
    expect(css).toContain('.ytp-caption-segment');
    expect(css).toContain('.player-timedtext-text-container span');
    expect(css).toContain('color:#fde047!important');
    expect(css).toContain('transform:scale(1.5)!important');
    expect(css).toContain('video::cue{color:#fde047;background:rgb(0 0 0 / 0.4);font-size:150%;font-weight:700;}');
  });
});

describe('theme search and favourites', () => {
  it('finds themes by English or Vietnamese name, without accents, favourites first', () => {
    expect(filterThemes(BUILT_IN_THEMES, 'all', [], 'cuc quang').map((t) => t.id)).toEqual(['aurora']);
    expect(filterThemes(BUILT_IN_THEMES, 'all', [], 'Nhung Đỏ').map((t) => t.id)).toEqual(['crimson-theatre']);
    expect(filterThemes(BUILT_IN_THEMES, 'all', ['paper'])[0]!.id).toBe('paper');
    expect(
      filterThemes(BUILT_IN_THEMES, 'fav', ['paper', 'aurora'])
        .map((t) => t.id)
        .sort(),
    ).toEqual(['aurora', 'paper']);
    expect(toggleFavorite(['a'], 'b')).toEqual(['b', 'a']);
    expect(toggleFavorite(['a', 'b'], 'a')).toEqual(['b']);
  });
});
