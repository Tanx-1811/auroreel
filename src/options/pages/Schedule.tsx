import { Clock, Monitor, Moon, Sun, SunMoon } from 'lucide-react';
import type { ScheduleMode } from '../../core/settings.ts';
import { allThemes, findTheme, themeName, type Theme } from '../../core/themes.ts';
import { Field, Select } from '../../ui/controls.tsx';
import { useLang, useT } from '../../ui/i18n.tsx';
import { MiniPreview } from '../../ui/ThemePreview.tsx';
import { Card, PageHead } from '../PageHead.tsx';
import type { PageProps } from '../types.ts';

export function SchedulePage({ settings, themes, update }: PageProps) {
  const t = useT();
  const lang = useLang();
  const s = settings.schedule;
  const set = (patch: Partial<typeof s>) => update((x) => ({ ...x, schedule: { ...x.schedule, ...patch } }));
  const options = allThemes(themes).map((th) => ({ value: th.id, label: themeName(th, lang) }));
  const slot = (
    key: 'lightThemeId' | 'darkThemeId',
    title: string,
    Icon: typeof Sun,
    filter: (th: Theme) => boolean,
  ) => {
    const theme = findTheme(s[key], themes);
    return (
      <Card
        title={
          <span className="with-icon">
            <Icon size={16} /> {title}
          </span>
        }
      >
        <div className="slot">
          {theme ? <MiniPreview theme={theme} /> : <div className="tp original" />}
          <Select
            value={s[key]}
            label={title}
            onChange={(v) => set({ [key]: v })}
            options={[
              ...options.filter((o) => filter(findTheme(o.value, themes)!)),
              ...options.filter((o) => !filter(findTheme(o.value, themes)!)),
            ]}
          />
        </div>
      </Card>
    );
  };
  const modes: { value: ScheduleMode; icon: typeof Sun; title: string; hint: string }[] = [
    { value: 'off', icon: SunMoon, title: t('schedule.off'), hint: t('schedule.offHint') },
    { value: 'system', icon: Monitor, title: t('schedule.system'), hint: t('schedule.systemHint') },
    { value: 'time', icon: Clock, title: t('schedule.time'), hint: t('schedule.timeHint') },
  ];
  return (
    <>
      <PageHead title={t('schedule.title')} subtitle={t('schedule.subtitle')} />
      <Card title={t('schedule.mode')} hint={t('schedule.modeHint')}>
        <div className="mode-cards" role="radiogroup" aria-label={t('schedule.mode')}>
          {modes.map(({ value, icon: Icon, title, hint }) => (
            <button
              key={value}
              type="button"
              role="radio"
              className="mode-card"
              aria-checked={s.mode === value}
              onClick={() => set({ mode: value })}
            >
              <Icon size={18} aria-hidden="true" />
              <strong>{title}</strong>
              <span className="muted small">{hint}</span>
            </button>
          ))}
        </div>
        {s.mode === 'time' ? (
          <>
            <Field label={t('schedule.dayStart')}>
              <input
                className="input time"
                type="time"
                value={s.dayStart}
                onChange={(e) => e.target.value && set({ dayStart: e.target.value })}
              />
            </Field>
            <Field label={t('schedule.nightStart')}>
              <input
                className="input time"
                type="time"
                value={s.nightStart}
                onChange={(e) => e.target.value && set({ nightStart: e.target.value })}
              />
            </Field>
          </>
        ) : null}
      </Card>
      {s.mode === 'off' ? (
        <p className="muted small" style={{ margin: '16px 0 0' }}>
          {t('schedule.offNote')}
        </p>
      ) : null}
      <fieldset className="dep" disabled={s.mode === 'off'} style={{ marginTop: 16 }}>
        <div className="two-col">
          {slot('lightThemeId', t('schedule.day'), Sun, (th) => th.mode === 'light')}
          {slot('darkThemeId', t('schedule.night'), Moon, (th) => th.mode === 'dark')}
        </div>
      </fieldset>
      <p className="muted small" style={{ marginTop: 14 }}>
        {t('schedule.siteNote')}
      </p>
    </>
  );
}
