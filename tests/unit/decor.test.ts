import { describe, expect, it } from 'vitest';
import { knobImage, playedFill, progressCss, RAINBOW, scrollbarCss } from '../../src/core/css/decor.ts';
import { cleanEmoji, emojiSvg, PROGRESS_ICONS, svgDataUrl } from '../../src/core/progressIcons.ts';
import { defaultSettings, parseSettings, TOOLBAR_BUTTONS, type ProgressSettings } from '../../src/core/settings.ts';
import { youtube } from '../../src/core/sites/youtube.ts';
import { applySynced, toSynced } from '../../src/core/sync.ts';
import { en } from '../../src/i18n/en.ts';

const base = defaultSettings().progress;
const withP = (p: Partial<ProgressSettings>): ProgressSettings => ({ ...base, ...p });
const bar = youtube.progressBar!;
const PNG = 'data:image/png;base64,iVBORw0KGgo=';

describe('progress icons', () => {
  it('has unique ids, a colour and a name in every language', () => {
    const ids = PROGRESS_ICONS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(16);
    for (const icon of PROGRESS_ICONS) {
      expect(icon.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(en).toHaveProperty(`decor.icon.${icon.id}`);
    }
  });

  it('parses as SVG without gradients (flat artwork)', () => {
    for (const icon of PROGRESS_ICONS) {
      const doc = new DOMParser().parseFromString(icon.svg, 'image/svg+xml');
      expect(doc.querySelector('parsererror'), icon.id).toBeNull();
      expect(doc.documentElement.getAttribute('viewBox')).toBe('0 0 32 32');
      expect(icon.svg).not.toMatch(/Gradient/);
    }
  });

  it('encodes data URLs safely for CSS and <img>', () => {
    const url = svgDataUrl(PROGRESS_ICONS[0]!.svg);
    expect(url.startsWith('data:image/svg+xml,')).toBe(true);
    expect(url).not.toMatch(/["#<>]/);
  });

  it('keeps one emoji grapheme and rejects plain text', () => {
    expect(cleanEmoji('🐱 cat')).toBe('🐱');
    expect(cleanEmoji('👩‍🚀')).toBe('👩‍🚀');
    expect(cleanEmoji('🇻🇳')).toBe('🇻🇳');
    expect(cleanEmoji('abc')).toBeNull();
    expect(cleanEmoji(42)).toBeNull();
    expect(emojiSvg('<x>&')).not.toMatch(/<x>/);
  });
});

describe('progress css', () => {
  it('leaves the site alone by default', () => {
    expect(progressCss(bar, base, '#8b5cf6')).toBe('');
  });

  it('draws an icon knob that moves only while playing, and not with reduced motion', () => {
    const css = progressCss(bar, withP({ knob: 'rocket', motion: 'spin', size: 30 }), null);
    expect(css).toContain('.html5-video-player .ytp-scrubber-button::before');
    expect(css).toContain('width:30px');
    expect(css).toContain('.ytp-decorated-scrubber-button{display:none!important}');
    expect(css).toMatch(
      /@media \(prefers-reduced-motion:no-preference\)\{.*\.html5-video-player\.playing-mode \.ytp-scrubber-button::before\{animation:rs-knob-spin/,
    );
    expect(progressCss(bar, withP({ knob: 'rocket', motion: 'none' }), null)).not.toContain('animation');
  });

  it('colours the played part', () => {
    expect(playedFill(withP({ fill: 'theme' }), null)).toBeNull();
    expect(playedFill(withP({ fill: 'theme' }), '#123456')).toBe('#123456');
    expect(playedFill(withP({ fill: 'icon', knob: 'heart' }), null)).toBe('#ff4d6d');
    expect(playedFill(withP({ fill: 'custom', color: '#00ff00' }), null)).toBe('#00ff00');
    const rainbow = playedFill(withP({ fill: 'rainbow' }), null)!;
    for (const c of RAINBOW) expect(rainbow).toContain(c);
    // Theme fill is the theme's own job (adapter CSS); the decor sheet doesn't repeat it.
    expect(progressCss(bar, withP({ fill: 'theme' }), '#123456')).toBe('');
    expect(progressCss(bar, withP({ fill: 'custom', color: '#00ff00' }), null)).toContain(
      '.html5-video-player .ytp-play-progress{background:#00ff00!important}',
    );
  });

  it('thickens the bar and draws a plain dot', () => {
    expect(progressCss(bar, withP({ height: 'bold' }), null)).toContain('height:9px!important');
    const dot = progressCss(bar, withP({ knob: 'dot', size: 30 }), '#8b5cf6');
    expect(dot).toContain('background:#8b5cf6!important');
    expect(dot).not.toContain('::before');
  });

  it('uses the picture or the emoji as the knob', () => {
    expect(knobImage(withP({ knob: 'image', image: PNG }))).toBe(`url("${PNG}")`);
    expect(knobImage(withP({ knob: 'image', image: '' }))).toBeNull();
    expect(knobImage(withP({ knob: 'emoji', emoji: '🐱' }))).toMatch(/^url\("data:image\/svg\+xml,/);
    expect(knobImage(withP({ knob: 'dot' }))).toBeNull();
  });
});

describe('scrollbar css', () => {
  it('follows the chosen style', () => {
    expect(scrollbarCss('site', true)).toBe('');
    expect(scrollbarCss('hidden', false)).toContain('scrollbar-width:none!important');
    expect(scrollbarCss('thin', false)).not.toContain('scrollbar-color');
    expect(scrollbarCss('thin', true)).toContain('scrollbar-color');
    expect(scrollbarCss('theme', false)).toBe('');
  });
});

describe('decoration settings', () => {
  it('validates progress settings', () => {
    const s = parseSettings({
      progress: {
        knob: 'nope',
        emoji: 'hello',
        size: 99,
        motion: 'fly',
        fill: 'x',
        color: 'red',
        height: 'huge',
        mini: 1,
      },
    });
    expect(s.progress).toEqual({ ...base, size: 44 });
    const ok = parseSettings({ progress: { knob: 'image', image: PNG, size: 20, mini: true } });
    expect(ok.progress).toMatchObject({ knob: 'image', image: PNG, size: 20, mini: true });
  });

  it('refuses pictures that are not small images', () => {
    for (const image of [
      'data:image/svg+xml;base64,PHN2Zz4=',
      'https://example.com/a.png',
      `${PNG}${'A'.repeat(130_000)}`,
    ]) {
      const s = parseSettings({ progress: { knob: 'image', image } });
      expect(s.progress.image).toBe('');
      // Still "my picture", drawn as the site's own knob until a picture is chosen here.
      expect(s.progress.knob).toBe('image');
      expect(progressCss(youtube.progressBar!, s.progress, '#8b5cf6')).not.toContain('::before');
    }
  });

  it('keeps toolbar buttons known and in toolbar order', () => {
    const s = parseSettings({ player: { toolbarButtons: ['pip', 'speed', 'bogus', 'ab'], toolbarSize: 'xl' } });
    expect(s.player.toolbarButtons).toEqual(['speed', 'ab', 'pip']);
    expect(s.player.toolbarSize).toBe('md');
    expect(defaultSettings().player.toolbarButtons).toEqual(TOOLBAR_BUTTONS.filter((b) => b !== 'ab'));
  });

  it('keeps the knob picture out of Chrome Sync but on this computer', () => {
    const local = parseSettings({ progress: { knob: 'image', image: PNG } });
    const pushed = toSynced(local, 'a', 1);
    expect(pushed.settings.progress.image).toBe('');
    expect(pushed.settings.progress.knob).toBe('image');
    const merged = applySynced(local, {
      ...pushed,
      settings: { ...pushed.settings, progress: { ...pushed.settings.progress, size: 40 } },
    });
    expect(merged.progress).toMatchObject({ knob: 'image', image: PNG, size: 40 });
    // Another computer without the picture keeps the choice (so it never syncs a different knob back)
    // and draws the site's own knob.
    const other = applySynced(defaultSettings(), pushed);
    expect(other.progress).toMatchObject({ knob: 'image', image: '' });
    expect(toSynced(other, 'b', 2).settings.progress).toEqual(pushed.settings.progress);
    expect(progressCss(youtube.progressBar!, other.progress, null)).not.toContain('::before');
  });

  it('keeps the progress settings when a device on an older version syncs without them', () => {
    const local = parseSettings({ progress: { knob: 'image', image: PNG, size: 34 } });
    const { progress: _p, ...older } = toSynced(local, 'old', 1).settings;
    const merged = applySynced(local, { from: 'old', at: 2, settings: older });
    expect(merged.progress).toEqual(local.progress);
  });
});
