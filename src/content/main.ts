/**
 * Content script (document_start on supported sites; registered at run time
 * for every other site when the user allows it). Builds the page's stylesheet
 * from the settings and the active theme, runs the recolouring engine and the
 * player tools, and follows storage changes live.
 */
import { formatColor } from '../core/color.ts';
import { buildPageCss, sitePalette } from '../core/css/index.ts';
import { hasBackdrop } from '../core/css/common.ts';
import { GENERIC, PLATFORMS, platformForHost, type Platform } from '../core/platforms.ts';
import { activeThemeId, msUntilNextSwitch } from '../core/schedule.ts';
import type { Settings } from '../core/settings.ts';
import { adapterFor } from '../core/sites/index.ts';
import { findTheme, type Theme } from '../core/themes.ts';
import { resolveLang, translate } from '../shared/i18n.ts';
import type { PageStatus, ToPage } from '../shared/messages.ts';
import { loadState, SETTINGS_KEY, THEMES_KEY } from '../shared/storage.ts';
import { Engine } from './engine.ts';
import { PlayerTools } from './player/index.ts';
import { Styles } from './styles.ts';

declare const __RS_E2E__: boolean;

declare global {
  interface Window {
    __auroreel?: boolean;
  }
}

/** The e2e build maps local test pages to a platform with ?rs-platform=… */
function detectPlatform(): Platform {
  if (__RS_E2E__ && (location.hostname === '127.0.0.1' || location.hostname === 'localhost')) {
    const id = new URLSearchParams(location.search).get('rs-platform');
    return PLATFORMS.find((p) => p.id === id) ?? GENERIC;
  }
  return platformForHost(location.hostname) ?? GENERIC;
}

function main() {
  // Registered scripts and the manifest's can both match after an update; run once.
  if (window.__auroreel) return;
  window.__auroreel = true;

  const platform = detectPlatform();
  const base = adapterFor(platform.id);
  // In a frame (YouTube's live chat): flat colours — the page around it already shows the backdrop.
  const adapter = window.top !== window && base.backdrop ? { ...base, backdrop: false } : base;
  const styles = new Styles();
  const player = new PlayerTools();
  const engine = adapter.engine ? new Engine(adapter.engine, styles, platform.id) : null;
  const darkQuery = matchMedia('(prefers-color-scheme: dark)');
  let settings: Settings | null = null;
  let themes: Theme[] = [];
  let skinPaused = false;
  let engineStarted = false;
  let scheduleTimer = 0;

  player.onToggleSkin = () => {
    skinPaused = !skinPaused;
    apply();
  };
  player.skinPaused = () => skinPaused;

  function currentTheme(s: Settings): Theme | null {
    if (platform.tier === 'player') return null;
    return findTheme(activeThemeId(s, platform.id, new Date(), darkQuery.matches), themes);
  }

  function apply() {
    const s = settings;
    if (!s) return;
    const site = s.sites[platform.id];
    const on = s.enabled && site.enabled;
    const lang = resolveLang(s.language);
    const theme = on && !skinPaused ? currentTheme(s) : null;
    const palette = theme ? sitePalette(adapter, theme) : null;

    if (on && !skinPaused && platform.tier !== 'player') {
      styles.setMain(
        buildPageCss({
          adapter,
          theme,
          layout: site.layout,
          assetUrl: (p) => chrome.runtime.getURL(p),
          strings: { homeHidden: translate(lang, 'page.homeHidden') },
        }),
      );
    } else styles.clear();

    if (engine) {
      if (theme && palette) {
        const engineTheme = { palette, glass: adapter.backdrop && hasBackdrop(theme) ? theme.glass : null };
        if (!engineStarted) {
          engineStarted = true;
          void engine.start(engineTheme);
        } else engine.setTheme(engineTheme);
      } else engine.setTheme(null);
    }

    player.configure({
      settings: s.player,
      shortcuts: s.shortcuts,
      shortcutsOn: s.shortcutsOn,
      on: s.enabled && site.enabled && site.player,
      accent: palette ? formatColor(palette.accent) : platform.tier === 'player' ? '#8b5cf6' : platform.brand,
      accentText: palette ? formatColor(palette.accentText) : '#ffffff',
      lang,
      platform: platform.id,
    });

    // Re-evaluate at the next day/night boundary.
    clearTimeout(scheduleTimer);
    if (on && s.schedule.mode === 'time' && !site.themeId) {
      scheduleTimer = window.setTimeout(
        apply,
        msUntilNextSwitch(s.schedule.dayStart, s.schedule.nightStart, new Date()),
      );
    }
  }

  void loadState().then((state) => {
    settings = state.settings;
    themes = state.themes;
    apply();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || (!changes[SETTINGS_KEY] && !changes[THEMES_KEY])) return;
    void loadState().then((state) => {
      settings = state.settings;
      themes = state.themes;
      apply();
    });
  });

  darkQuery.addEventListener('change', () => {
    if (settings?.schedule.mode === 'system') apply();
  });

  chrome.runtime.onMessage.addListener((msg: ToPage, _sender, reply) => {
    if (msg?.type === 'rs:status') {
      const status: PageStatus = { platform: platform.id, skinPaused, ...player.status() };
      reply(status);
    } else if (msg?.type === 'rs:action') {
      player.run(msg.action);
      reply({ platform: platform.id, skinPaused, ...player.status() } satisfies PageStatus);
    }
    return false;
  });
}

main();
