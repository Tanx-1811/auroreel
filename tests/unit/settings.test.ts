import { describe, expect, it } from 'vitest';
import { makeBackup, mergeThemes, parseImport, makeThemeFile } from '../../src/core/backup';
import { DEFAULT_FILTERS, filterCss, FILTER_PRESETS, matchPreset, parseFilters } from '../../src/core/filters';
import {
  layoutDefaults,
  platformById,
  platformForHost,
  platformForUrl,
  PLATFORMS,
  ALL_MATCHES,
} from '../../src/core/platforms';
import { activeThemeId, isDaytime, msUntilNextSwitch } from '../../src/core/schedule';
import { defaultSettings, parseSettings, patchLayout, patchSite } from '../../src/core/settings';
import {
  ACTION_GROUPS,
  ACTION_IDS,
  conflicts,
  DEFAULT_SHORTCUTS,
  formatShortcut,
  matches,
  parseShortcut,
  shortcutFromEvent,
  spaceChromeShortcut,
} from '../../src/core/shortcuts';
import { BUILT_IN_THEMES } from '../../src/core/themes';

const key = (code: string, mods: Partial<Record<'ctrlKey' | 'altKey' | 'shiftKey' | 'metaKey', boolean>> = {}) => ({
  code,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  metaKey: false,
  ...mods,
});

describe('settings', () => {
  it('fills defaults for missing or broken data', () => {
    expect(parseSettings(undefined)).toEqual(defaultSettings());
    expect(parseSettings('nope')).toEqual(defaultSettings());
    const s = parseSettings({
      enabled: false,
      themeId: 'aurora',
      player: { speed: { default: 99 } },
      sites: { youtube: { layout: { gridColumns: '9', hideShorts: true } } },
    });
    expect(s.enabled).toBe(false);
    expect(s.themeId).toBe('aurora');
    expect(s.player.speed.default).toBe(16);
    expect(s.sites.youtube.layout.gridColumns).toBe('auto');
    expect(s.sites.youtube.layout.hideShorts).toBe(true);
    expect(s.sites.twitch.enabled).toBe(true);
  });

  it('keeps cleared shortcuts and rejects invalid ones', () => {
    const s = parseSettings({ shortcuts: { cinema: null, pip: 'Hyper+Q', loop: 'Ctrl+Shift+KeyL' } });
    expect(s.shortcuts.cinema).toBeNull();
    expect(s.shortcuts.pip).toBe(DEFAULT_SHORTCUTS.pip);
    expect(s.shortcuts.loop).toBe('Ctrl+Shift+KeyL');
  });

  it('round-trips through JSON', () => {
    const s = patchLayout(
      patchSite(defaultSettings(), 'netflix', { themeId: 'ember' }),
      'youtube',
      'thumbStyle',
      'blur',
    );
    expect(parseSettings(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
});

describe('platforms', () => {
  it('recognises the supported sites only', () => {
    expect(platformForHost('www.youtube.com')?.id).toBe('youtube');
    expect(platformForHost('music.youtube.com')?.id).toBe('ytmusic');
    expect(platformForHost('www.twitch.tv')?.id).toBe('twitch');
    expect(platformForHost('evil-youtube.com')).toBeNull();
    expect(platformForUrl('chrome://extensions')).toBeNull();
    expect(platformForUrl('https://fptplay.vn/xem-video/abc')?.id).toBe('fptplay');
  });

  it('declares sane layout options and manifest matches', () => {
    for (const p of PLATFORMS) {
      const ids = p.layout.map((o) => o.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const o of p.layout) if (o.kind === 'select') expect(o.choices).toContain(o.default);
      expect(p.matches.every((m) => m.startsWith('https://'))).toBe(true);
    }
    expect(new Set(ALL_MATCHES).size).toBe(ALL_MATCHES.length);
    expect(layoutDefaults(platformById('youtube')).logoAccent).toBe(true);
  });
});

describe('schedule', () => {
  const at = (h: number, m = 0) => new Date(2026, 0, 1, h, m);

  it('handles day windows, including ones that wrap midnight', () => {
    expect(isDaytime('07:00', '18:30', at(12))).toBe(true);
    expect(isDaytime('07:00', '18:30', at(19))).toBe(false);
    expect(isDaytime('22:00', '06:00', at(23))).toBe(true);
    expect(isDaytime('22:00', '06:00', at(12))).toBe(false);
  });

  it('picks the theme a site shows', () => {
    const s = defaultSettings();
    expect(activeThemeId(s, 'youtube', at(12), true)).toBe(s.themeId);
    const timed = { ...s, schedule: { ...s.schedule, mode: 'time' as const } };
    expect(activeThemeId(timed, 'youtube', at(12), true)).toBe(s.schedule.lightThemeId);
    expect(activeThemeId(timed, 'youtube', at(22), true)).toBe(s.schedule.darkThemeId);
    const system = { ...s, schedule: { ...s.schedule, mode: 'system' as const } };
    expect(activeThemeId(system, 'youtube', at(12), false)).toBe(s.schedule.lightThemeId);
    const own = patchSite(timed, 'youtube', { themeId: 'ember' });
    expect(activeThemeId(own, 'youtube', at(22), true)).toBe('ember');
  });

  it('knows when to look again', () => {
    expect(msUntilNextSwitch('07:00', '18:30', at(18, 0))).toBe(30 * 60_000);
    expect(msUntilNextSwitch('07:00', '18:30', at(23, 0))).toBe(8 * 3600_000);
  });
});

describe('shortcuts', () => {
  it('lists every action in exactly one group', () => {
    const grouped = ACTION_GROUPS.flatMap((g) => g.actions);
    expect([...grouped].sort()).toEqual([...ACTION_IDS].sort());
    expect(new Set(grouped).size).toBe(grouped.length);
  });

  it('parses, matches and formats', () => {
    expect(parseShortcut('Alt+KeyC')).not.toBeNull();
    expect(parseShortcut('Alt+Alt+KeyC')).toBeNull();
    expect(parseShortcut('KeyCC')).toBeNull();
    expect(shortcutFromEvent(key('KeyC', { altKey: true }))).toBe('Alt+KeyC');
    expect(shortcutFromEvent(key('ShiftLeft', { shiftKey: true }))).toBeNull();
    expect(matches('Alt+KeyC', key('KeyC', { altKey: true }))).toBe(true);
    expect(matches('Alt+KeyC', key('KeyC', { altKey: true, shiftKey: true }))).toBe(false);
    expect(formatShortcut('Alt+Shift+KeyC')).toBe('Alt + Shift + C');
    expect(formatShortcut('Alt+BracketLeft', true)).toBe('⌥ [');
    expect(formatShortcut(null)).toBe('—');
    expect(spaceChromeShortcut('⌥⇧R')).toBe('⌥ ⇧ R');
    expect(spaceChromeShortcut('Alt+Shift+R')).toBe('Alt + Shift + R');
  });

  it('has no clashing defaults and finds clashes', () => {
    expect(conflicts(DEFAULT_SHORTCUTS).size).toBe(0);
    expect([...conflicts({ ...DEFAULT_SHORTCUTS, loop: 'KeyD' })].sort()).toEqual(['loop', 'speedUp']);
  });
});

describe('filters', () => {
  it('builds CSS only for changed values', () => {
    expect(filterCss(DEFAULT_FILTERS)).toBe('');
    expect(filterCss({ ...DEFAULT_FILTERS, brightness: 110, hue: -5 })).toBe('brightness(110%) hue-rotate(-5deg)');
  });

  it('clamps stored values and recognises presets', () => {
    expect(parseFilters({ brightness: 999, sepia: -1, hue: 'x' })).toEqual({
      ...DEFAULT_FILTERS,
      brightness: 180,
      sepia: 0,
    });
    expect(matchPreset(FILTER_PRESETS.cinema)).toBe('cinema');
    expect(matchPreset({ ...DEFAULT_FILTERS, contrast: 101 })).toBeNull();
  });
});

describe('backup', () => {
  const theme = { ...BUILT_IN_THEMES[0]!, id: 'custom-1', builtIn: undefined };

  it('round-trips settings and themes', () => {
    const backup = makeBackup(defaultSettings(), [theme], new Date('2026-01-01'));
    const parsed = parseImport(JSON.stringify(backup));
    expect(parsed.type).toBe('backup');
    if (parsed.type === 'backup') {
      expect(parsed.settings).toEqual(defaultSettings());
      expect(parsed.themes.map((t) => t.id)).toEqual(['custom-1']);
    }
  });

  it('reads single theme files and rejects anything else', () => {
    expect(parseImport(JSON.stringify(makeThemeFile(theme))).type).toBe('theme');
    expect(parseImport('{"kind":"other"}').type).toBe('invalid');
    expect(parseImport('not json').type).toBe('invalid');
  });

  it('merges by id', () => {
    const a = { ...theme, id: 'a', name: 'A' };
    const b = { ...theme, id: 'b', name: 'B' };
    expect(mergeThemes([a, b], [{ ...a, name: 'A2' }]).map((t) => t.name)).toEqual(['A2', 'B']);
  });
});

describe('new player, subtitle and studio settings', () => {
  it('clamps and validates them', () => {
    const s = parseSettings({
      player: { boost: 999, wheelVolume: 'yes' },
      subtitles: { on: true, size: 10, color: 'red', background: 140, bold: true },
      favorites: ['aurora', 'aurora', 'bad id!', 3],
      appearance: 'neon',
    });
    expect(s.player.boost).toBe(300);
    expect(s.player.wheelVolume).toBe(false);
    expect(s.subtitles).toEqual({ on: true, size: 60, color: '#ffffff', background: 100, bold: true });
    expect(s.favorites).toEqual(['aurora']);
    expect(s.appearance).toBe('auto');
    expect(parseSettings({ sites: { youtube: { layout: { quality: '1080' } } } }).sites.youtube.layout.quality).toBe(
      '1080',
    );
    expect(parseSettings({ sites: { youtube: { layout: { quality: '8k' } } } }).sites.youtube.layout.quality).toBe(
      'auto',
    );
  });
});
