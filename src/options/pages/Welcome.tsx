import { ArrowRight, Check, Play } from 'lucide-react';
import { useEffect } from 'react';
import { patchLayout } from '../../core/settings.ts';
import { BUILT_IN_THEMES } from '../../core/themes.ts';
import { Field, Switch } from '../../ui/controls.tsx';
import { useT } from '../../ui/i18n.tsx';
import { LogoMark } from '../../ui/Logo.tsx';
import { ThemeGrid } from '../../ui/ThemeGrid.tsx';
import { go } from '../router.ts';
import type { PageProps } from '../types.ts';

const FEATURED = [
  'midnight-velvet',
  'aurora',
  'neon-drive',
  'crimson-theatre',
  'deep-ocean',
  'oled-noir',
  'paper',
  'blossom',
];

export function WelcomePage({ settings, update }: PageProps) {
  const t = useT();
  const themes = FEATURED.map((id) => BUILT_IN_THEMES.find((x) => x.id === id)!);
  useEffect(() => {
    document.title = `${t('welcome.title')} · Reelskin`;
  }, [t]);
  const finish = (url?: string) => {
    void update((s) => ({ ...s, onboarded: true })).then(() => {
      if (url) location.href = url;
      else go('themes');
    });
  };
  const yt = settings.sites.youtube.layout;
  return (
    <div className="welcome">
      <header className="welcome-hero">
        <LogoMark size={72} />
        <h1 className="display">
          {t('welcome.title')} <span className="grad-text">Reelskin</span>
        </h1>
        <p className="muted">{t('welcome.subtitle')}</p>
      </header>

      <section className="welcome-step">
        <div className="step-head">
          <span className="step-n">1</span>
          <div>
            <h2>{t('welcome.step1')}</h2>
            <p className="muted small">{t('welcome.step1Hint')}</p>
          </div>
        </div>
        <ThemeGrid
          themes={themes}
          activeId={settings.themeId}
          onPick={(id) => update((s) => ({ ...s, themeId: id }))}
          showOriginal={false}
        />
      </section>

      <section className="welcome-step">
        <div className="step-head">
          <span className="step-n">2</span>
          <div>
            <h2>{t('welcome.step2')}</h2>
            <p className="muted small">{t('welcome.step2Hint')}</p>
          </div>
        </div>
        <div className="card">
          <Field label={t('player.ambient')} hint={t('player.ambientHint')}>
            <Switch
              checked={settings.player.ambient.enabled}
              label={t('player.ambient')}
              onChange={(v) =>
                update((s) => ({ ...s, player: { ...s.player, ambient: { ...s.player.ambient, enabled: v } } }))
              }
            />
          </Field>
          <Field label={t('player.toolbar')} hint={t('player.toolbarHint')}>
            <Switch
              checked={settings.player.toolbar}
              label={t('player.toolbar')}
              onChange={(v) => update((s) => ({ ...s, player: { ...s.player, toolbar: v } }))}
            />
          </Field>
          <Field label={t('layout.youtube.hideShorts')} hint={t('welcome.shortsHint')}>
            <Switch
              checked={!!yt.hideShorts}
              label={t('layout.youtube.hideShorts')}
              onChange={(v) => update((s) => patchLayout(s, 'youtube', 'hideShorts', v))}
            />
          </Field>
          <Field label={t('layout.youtube.dimWatched')} hint={t('welcome.dimHint')}>
            <Switch
              checked={!!yt.dimWatched}
              label={t('layout.youtube.dimWatched')}
              onChange={(v) => update((s) => patchLayout(s, 'youtube', 'dimWatched', v))}
            />
          </Field>
        </div>
      </section>

      <section className="welcome-step">
        <div className="step-head">
          <span className="step-n">
            <Check size={16} />
          </span>
          <div>
            <h2>{t('welcome.step3')}</h2>
            <p className="muted small">{t('welcome.step3Hint')}</p>
          </div>
        </div>
        <div className="welcome-actions">
          <button type="button" className="btn primary" onClick={() => finish('https://www.youtube.com/')}>
            <Play size={16} />
            {t('welcome.openYoutube')}
          </button>
          <button type="button" className="btn" onClick={() => finish()}>
            {t('welcome.openStudio')}
            <ArrowRight size={16} />
          </button>
        </div>
      </section>
    </div>
  );
}
