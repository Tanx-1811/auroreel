/** Compact progress-bar settings for the popup's Layout tab (sites whose bar can be decorated). */
import { ArrowRight } from 'lucide-react';
import { formatColor } from '../core/color.ts';
import { KNOB_MOTIONS, type ProgressSettings, type Settings } from '../core/settings.ts';
import { activeThemeId } from '../core/schedule.ts';
import { findTheme, resolvePalette, type Theme } from '../core/themes.ts';
import type { PlatformId } from '../core/platforms.ts';
import type { MessageKey } from '../shared/i18n.ts';
import { Field, Select, Switch } from './controls.tsx';
import { useT } from './i18n.tsx';
import { KnobGallery } from './Knob.tsx';

export function ProgressQuick({
  settings,
  themes,
  platform,
  update,
  onMore,
}: {
  settings: Settings;
  themes: Theme[];
  platform: PlatformId;
  update: (fn: (s: Settings) => Settings) => unknown;
  /** Opens the studio's Decorations page (more options, and where a picture is chosen). */
  onMore: () => void;
}) {
  const t = useT();
  const p = settings.progress;
  const theme = findTheme(
    activeThemeId(settings, platform, new Date(), matchMedia('(prefers-color-scheme: dark)').matches),
    themes,
  );
  const accent = theme ? formatColor(resolvePalette(theme).accent) : null;
  const set = (patch: Partial<ProgressSettings>) => update((s) => ({ ...s, progress: { ...s.progress, ...patch } }));
  return (
    <>
      <KnobGallery
        compact
        progress={p}
        accent={accent}
        onPick={(id) => (id === 'image' && !p.image ? onMore() : set({ knob: id }))}
      />
      <Field label={t('decor.motion')}>
        <Select
          value={p.motion}
          label={t('decor.motion')}
          options={KNOB_MOTIONS.map((m) => ({ value: m, label: t(`decor.motion.${m}` as MessageKey) }))}
          onChange={(v) => set({ motion: v })}
        />
      </Field>
      <Field label={t('decor.mini')}>
        <Switch checked={p.mini} label={t('decor.mini')} onChange={(v) => set({ mini: v })} />
      </Field>
      <button type="button" className="btn ghost sm" onClick={onMore}>
        {t('popup.decorMore')}
        <ArrowRight size={14} />
      </button>
    </>
  );
}
