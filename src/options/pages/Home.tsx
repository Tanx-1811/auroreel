import { ArrowRight, Cloud, MoonStar, Palette, PenTool, Sparkles, SunMoon } from 'lucide-react';
import { PLATFORMS } from '../../core/platforms.ts';
import { patchSite } from '../../core/settings.ts';
import { formatShortcut } from '../../core/shortcuts.ts';
import { allThemes, duplicateTheme, findTheme, themeName } from '../../core/themes.ts';
import type { MessageKey } from '../../shared/i18n.ts';
import { Switch } from '../../ui/controls.tsx';
import { useLang, useT } from '../../ui/i18n.tsx';
import { KnobArt } from '../../ui/Knob.tsx';
import { LargePreview } from '../../ui/ThemePreview.tsx';
import { filterThemes, ThemeGrid } from '../../ui/ThemeGrid.tsx';
import { go } from '../router.ts';
import type { PageProps } from '../types.ts';
import { usePreviewText } from '../usePreviewText.ts';

const IS_MAC = /Mac/.test(navigator.platform);
const DECOR_SAMPLE = ['heart', 'star', 'rocket', 'cat', 'duck', 'popcorn', 'planet', 'lotus'];

export function HomePage({ settings, themes, update, saveTheme }: PageProps) {
  const t = useT();
  const lang = useLang();
  const previewText = usePreviewText();
  const theme = findTheme(settings.themeId, themes);
  const favorites = filterThemes(allThemes(themes), 'fav', settings.favorites).slice(0, 4);
  const suggestions = favorites.length
    ? favorites
    : ['aurora', 'neon-drive', 'crimson-theatre', 'latte'].map((id) => findTheme(id, [])!).filter(Boolean);
  const p = settings.player;

  const quick: { key: MessageKey; hint: MessageKey; icon: typeof Sparkles; on: boolean; set: (v: boolean) => void }[] =
    [
      {
        key: 'player.ambient',
        hint: 'home.ambientHint',
        icon: Sparkles,
        on: p.ambient.enabled,
        set: (v) => update((s) => ({ ...s, player: { ...s.player, ambient: { ...s.player.ambient, enabled: v } } })),
      },
      {
        key: 'player.cinemaAuto',
        hint: 'home.cinemaHint',
        icon: MoonStar,
        on: p.cinema.auto,
        set: (v) => update((s) => ({ ...s, player: { ...s.player, cinema: { ...s.player.cinema, auto: v } } })),
      },
      {
        key: 'home.autoSwitch',
        hint: 'home.autoSwitchHint',
        icon: SunMoon,
        on: settings.schedule.mode !== 'off',
        set: (v) => update((s) => ({ ...s, schedule: { ...s.schedule, mode: v ? 'system' : 'off' } })),
      },
      {
        key: 'backup.syncSwitch',
        hint: 'home.syncHint',
        icon: Cloud,
        on: settings.sync,
        set: (v) => update((s) => ({ ...s, sync: v })),
      },
    ];

  const tips: [string | null, MessageKey][] = [
    [settings.shortcuts.speedUp, 'action.speedUp'],
    [settings.shortcuts.cinema, 'action.cinema'],
    [settings.shortcuts.abStart, 'action.abStart'],
    [settings.shortcuts.themeFromVideo, 'action.themeFromVideo'],
    [settings.shortcuts.toggleSkin, 'action.toggleSkin'],
    [settings.shortcuts.screenshot, 'action.screenshot'],
  ];

  return (
    <div className="home">
      <section className="home-hero">
        <div className="home-preview">
          {theme ? (
            <LargePreview theme={theme} text={previewText} progress={settings.progress} />
          ) : (
            <div className="tp original large">
              <div className="tp-original-inner">
                <span>{t('themes.original')}</span>
              </div>
            </div>
          )}
        </div>
        <div className="home-side">
          <span className="eyebrow">{t('home.current')}</span>
          <h1 className="display">{theme ? themeName(theme, lang) : t('themes.original')}</h1>
          <p className="muted">{t('home.subtitle')}</p>
          <div className="home-actions">
            <button type="button" className="btn primary" onClick={() => go('themes')}>
              <Palette size={16} />
              {t('home.change')}
            </button>
            {theme ? (
              <button
                type="button"
                className="btn"
                onClick={() => {
                  if (!theme.builtIn) return go(`editor/${theme.id}`);
                  const copy = duplicateTheme(theme, t('editor.copyOf', { name: themeName(theme, lang) }));
                  void saveTheme(copy).then(() => go(`editor/${copy.id}`));
                }}
              >
                <PenTool size={16} />
                {t('home.customize')}
              </button>
            ) : null}
          </div>
          <div className="quick-grid">
            {quick.map(({ key, hint, icon: Icon, on, set }) => (
              <label key={key} className={`quick-card${on ? ' on' : ''}`}>
                <span className="quick-icon">
                  <Icon size={18} />
                </span>
                <span className="grow">
                  <strong>{t(key)}</strong>
                  <span className="muted small">{t(hint)}</span>
                </span>
                <Switch checked={on} label={t(key)} onChange={set} />
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section">
        <div className="section-head">
          <h2>{favorites.length ? t('home.favorites') : t('home.try')}</h2>
          <button type="button" className="btn ghost sm" onClick={() => go('themes')}>
            {t('home.allThemes')}
            <ArrowRight size={14} />
          </button>
        </div>
        <ThemeGrid
          themes={suggestions}
          activeId={settings.themeId}
          showOriginal={false}
          onPick={(id) => update((s) => ({ ...s, themeId: id }))}
        />
      </section>

      <section className="home-section">
        <div className="home-decor">
          <div className="kn-strip" aria-hidden="true">
            {DECOR_SAMPLE.map((id) => (
              <KnobArt key={id} id={id} progress={settings.progress} accent={null} size={30} />
            ))}
          </div>
          <div className="grow">
            <h2>{t('home.decorTitle')}</h2>
            <p className="muted small">{t('home.decorHint')}</p>
          </div>
          <button type="button" className="btn" onClick={() => go('decor')}>
            {t('nav.decor')}
            <ArrowRight size={14} />
          </button>
        </div>
      </section>

      <section className="home-section">
        <div className="section-head">
          <h2>{t('home.sites')}</h2>
          <button type="button" className="btn ghost sm" onClick={() => go('sites')}>
            {t('home.manageSites')}
            <ArrowRight size={14} />
          </button>
        </div>
        <div className="site-tiles">
          {PLATFORMS.map((pl) => {
            const site = settings.sites[pl.id];
            const own = site.themeId ? findTheme(site.themeId, themes) : null;
            return (
              <div key={pl.id} className={`site-tile${site.enabled ? '' : ' off'}`}>
                <span className="site-dot" style={{ background: pl.brand }} aria-hidden="true" />
                <span className="grow">
                  <strong>{pl.name}</strong>
                  <span className="muted small">
                    {t(`tier.${pl.tier}` as MessageKey)}
                    {own ? ` · ${themeName(own, lang)}` : ''}
                  </span>
                </span>
                <Switch
                  checked={site.enabled}
                  label={t('sites.enable', { site: pl.name })}
                  onChange={(v) => update((s) => patchSite(s, pl.id, { enabled: v }))}
                />
              </div>
            );
          })}
        </div>
      </section>

      <section className="home-section">
        <div className="section-head">
          <h2>{t('home.tips')}</h2>
          <button type="button" className="btn ghost sm" onClick={() => go('shortcuts')}>
            {t('nav.shortcuts')}
            <ArrowRight size={14} />
          </button>
        </div>
        <div className="tip-grid">
          {tips
            .filter(([key]) => key)
            .map(([key, label]) => (
              <div key={label} className="tip-card">
                <kbd>{formatShortcut(key, IS_MAC)}</kbd>
                <span>{t(label)}</span>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}
