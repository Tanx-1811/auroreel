/** Settings panels shared by the popup and the studio. */
import { Check } from 'lucide-react';
import { useState } from 'react';
import {
  DEFAULT_FILTERS,
  FILTER_KEYS,
  FILTER_LIMITS,
  FILTER_PRESETS,
  FILTER_PRESET_IDS,
  matchPreset,
} from '../core/filters.ts';
import type { Platform } from '../core/platforms.ts';
import {
  patchLayout,
  TOOLBAR_BUTTONS,
  type PlayerSettings,
  type Settings,
  type ToolbarButton,
} from '../core/settings.ts';
import type { MessageKey } from '../shared/i18n.ts';
import { Field, Segmented, Select, Slider, Switch } from './controls.tsx';
import { useT } from './i18n.tsx';

type Update = (fn: (s: Settings) => Settings) => unknown;

const patchPlayer = (update: Update, fn: (p: PlayerSettings) => PlayerSettings) =>
  update((s) => ({ ...s, player: fn(s.player) }));

const SPEEDS = ['0.75', '1', '1.25', '1.5', '1.75', '2'];

const BUTTON_LABEL: Record<ToolbarButton, MessageKey> = {
  speed: 'tb.speed',
  filters: 'page.filters',
  ambient: 'page.ambient',
  cinema: 'page.cinema',
  loop: 'page.loop',
  ab: 'page.abLoop',
  screenshot: 'page.screenshot',
  pip: 'page.pip',
  palette: 'page.videoTheme',
};

export function AmbientPanel({ settings, update, compact }: { settings: Settings; update: Update; compact?: boolean }) {
  const t = useT();
  const a = settings.player.ambient;
  const set = (patch: Partial<PlayerSettings['ambient']>) =>
    patchPlayer(update, (p) => ({ ...p, ambient: { ...p.ambient, ...patch } }));
  return (
    <>
      <Field label={t('player.ambientOn')} hint={compact ? undefined : t('player.ambientHint')}>
        <Switch checked={a.enabled} onChange={(v) => set({ enabled: v })} label={t('player.ambientOn')} />
      </Field>
      <fieldset className="dep" disabled={!a.enabled}>
        <Field label={t('player.intensity')} stack>
          <Slider
            value={a.intensity}
            min={0}
            max={100}
            label={t('player.intensity')}
            onChange={(v) => set({ intensity: v })}
            format={(v) => `${v}%`}
          />
        </Field>
        {!compact ? (
          <>
            <Field label={t('player.blur')} stack>
              <Slider
                value={a.blur}
                min={10}
                max={140}
                label={t('player.blur')}
                onChange={(v) => set({ blur: v })}
                format={(v) => `${v}px`}
              />
            </Field>
            <Field label={t('player.spread')} stack>
              <Slider
                value={a.spread}
                min={0}
                max={40}
                label={t('player.spread')}
                onChange={(v) => set({ spread: v })}
                format={(v) => `${v}%`}
              />
            </Field>
          </>
        ) : null}
      </fieldset>
    </>
  );
}

export function CinemaPanel({ settings, update, compact }: { settings: Settings; update: Update; compact?: boolean }) {
  const t = useT();
  const c = settings.player.cinema;
  const set = (patch: Partial<PlayerSettings['cinema']>) =>
    patchPlayer(update, (p) => ({ ...p, cinema: { ...p.cinema, ...patch } }));
  return (
    <>
      <Field label={t('player.dim')} hint={compact ? undefined : t('player.cinemaHint')} stack>
        <Slider
          value={c.dim}
          min={20}
          max={100}
          label={t('player.dim')}
          onChange={(v) => set({ dim: v })}
          format={(v) => `${v}%`}
        />
      </Field>
      <Field label={t('player.cinemaAuto')}>
        <Switch checked={c.auto} onChange={(v) => set({ auto: v })} label={t('player.cinemaAuto')} />
      </Field>
    </>
  );
}

export function FiltersPanel({ settings, update, compact }: { settings: Settings; update: Update; compact?: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(!compact);
  const p = settings.player;
  const preset = matchPreset(p.filters);
  return (
    <>
      <Field label={t('player.filtersOn')} hint={compact ? undefined : t('player.filtersHint')}>
        <Switch
          checked={p.filtersOn}
          onChange={(v) => patchPlayer(update, (pl) => ({ ...pl, filtersOn: v }))}
          label={t('player.filtersOn')}
        />
      </Field>
      <div className="chips" style={{ padding: '4px 0 10px' }}>
        {FILTER_PRESET_IDS.map((id) => (
          <button
            key={id}
            type="button"
            className="chip"
            aria-pressed={p.filtersOn && preset === id}
            onClick={() =>
              patchPlayer(update, (pl) => ({ ...pl, filtersOn: true, filters: { ...FILTER_PRESETS[id] } }))
            }
          >
            {t(`preset.${id}` as MessageKey)}
          </button>
        ))}
      </div>
      {compact ? (
        <button type="button" className="btn ghost sm" onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? t('player.lessFilters') : t('player.moreFilters')}
        </button>
      ) : null}
      {open ? (
        <fieldset className="dep" disabled={!p.filtersOn}>
          {FILTER_KEYS.map((k) => {
            const lim = FILTER_LIMITS[k];
            return (
              <Field key={k} label={t(`filter.${k}` as MessageKey)} stack>
                <Slider
                  value={p.filters[k]}
                  min={lim.min}
                  max={lim.max}
                  step={lim.step}
                  label={t(`filter.${k}` as MessageKey)}
                  format={(v) => `${v}${lim.unit}`}
                  onChange={(v) => patchPlayer(update, (pl) => ({ ...pl, filters: { ...pl.filters, [k]: v } }))}
                />
              </Field>
            );
          })}
          <div style={{ paddingTop: 6 }}>
            <button
              type="button"
              className="btn sm"
              onClick={() => patchPlayer(update, (pl) => ({ ...pl, filters: { ...DEFAULT_FILTERS } }))}
            >
              {t('common.reset')}
            </button>
          </div>
        </fieldset>
      ) : null}
    </>
  );
}

export function SpeedPanel({ settings, update, compact }: { settings: Settings; update: Update; compact?: boolean }) {
  const t = useT();
  const sp = settings.player.speed;
  const set = (patch: Partial<PlayerSettings['speed']>) =>
    patchPlayer(update, (p) => ({ ...p, speed: { ...p.speed, ...patch } }));
  const current = String(sp.default);
  const options = (SPEEDS.includes(current) ? SPEEDS : [...SPEEDS, current]).map((v) => ({ value: v, label: `${v}×` }));
  return (
    <>
      <Field label={t('player.speedDefault')} hint={compact ? undefined : t('player.speedDefaultHint')} stack>
        <Segmented
          full
          value={current}
          options={options}
          label={t('player.speedDefault')}
          onChange={(v) => set({ default: Number(v) })}
        />
      </Field>
      <Field label={t('player.speedRemember')}>
        <Switch checked={sp.remember} onChange={(v) => set({ remember: v })} label={t('player.speedRemember')} />
      </Field>
      {!compact ? (
        <Field label={t('player.speedStep')}>
          <Select
            value={String(sp.step)}
            label={t('player.speedStep')}
            options={['0.05', '0.1', '0.25', '0.5'].map((v) => ({ value: v, label: `${v}×` }))}
            onChange={(v) => set({ step: Number(v) })}
          />
        </Field>
      ) : null}
    </>
  );
}

export function ToolbarPanel({ settings, update }: { settings: Settings; update: Update }) {
  const t = useT();
  const p = settings.player;
  return (
    <>
      <Field label={t('player.toolbar')} hint={t('player.toolbarHint')}>
        <Switch
          checked={p.toolbar}
          onChange={(v) => patchPlayer(update, (pl) => ({ ...pl, toolbar: v }))}
          label={t('player.toolbar')}
        />
      </Field>
      <fieldset className="dep" disabled={!p.toolbar}>
        <Field label={t('player.toolbarSide')}>
          <Segmented
            value={p.toolbarSide}
            label={t('player.toolbarSide')}
            options={[
              { value: 'left', label: t('common.left') },
              { value: 'right', label: t('common.right') },
            ]}
            onChange={(v) => patchPlayer(update, (pl) => ({ ...pl, toolbarSide: v }))}
          />
        </Field>
        <Field label={t('player.toolbarButtons')} hint={t('player.toolbarButtonsHint')} stack>
          <div className="chips" role="group" aria-label={t('player.toolbarButtons')}>
            {TOOLBAR_BUTTONS.map((b) => {
              const on = p.toolbarButtons.includes(b);
              return (
                <button
                  key={b}
                  type="button"
                  className="chip check"
                  aria-pressed={on}
                  onClick={() =>
                    patchPlayer(update, (pl) => ({
                      ...pl,
                      toolbarButtons: TOOLBAR_BUTTONS.filter((x) => (x === b ? !on : pl.toolbarButtons.includes(x))),
                    }))
                  }
                >
                  {on ? <Check size={13} strokeWidth={3} aria-hidden="true" /> : null}
                  {t(BUTTON_LABEL[b])}
                </button>
              );
            })}
          </div>
        </Field>
        <Field label={t('player.toolbarSize')}>
          <Segmented
            value={p.toolbarSize}
            label={t('player.toolbarSize')}
            options={(['sm', 'md', 'lg'] as const).map((v) => ({ value: v, label: t(`size.${v}`) }))}
            onChange={(v) => patchPlayer(update, (pl) => ({ ...pl, toolbarSize: v }))}
          />
        </Field>
      </fieldset>
      <Field label={t('player.screenshotFormat')}>
        <Segmented
          value={p.screenshotFormat}
          label={t('player.screenshotFormat')}
          options={[
            { value: 'png', label: 'PNG' },
            { value: 'jpeg', label: 'JPG' },
          ]}
          onChange={(v) => patchPlayer(update, (pl) => ({ ...pl, screenshotFormat: v }))}
        />
      </Field>
    </>
  );
}

/** Layout option groups: player, look; the rest hide things ("focus"). */
const PLAYER_OPTS = new Set(['quality']);
const LOOK = new Set(['logoAccent', 'progressGlow', 'gridColumns', 'thumbStyle', 'dimWatched']);

export function LayoutPanel({
  platform,
  settings,
  update,
}: {
  platform: Platform;
  settings: Settings;
  update: Update;
}) {
  const t = useT();
  const layout = settings.sites[platform.id].layout;
  if (!platform.layout.length) return <p className="muted small">{t('layout.none', { site: platform.name })}</p>;
  const groups = [
    { title: t('layout.groupPlayer'), items: platform.layout.filter((o) => PLAYER_OPTS.has(o.id)) },
    { title: t('layout.groupLook'), items: platform.layout.filter((o) => LOOK.has(o.id)) },
    { title: t('layout.groupFocus'), items: platform.layout.filter((o) => !LOOK.has(o.id) && !PLAYER_OPTS.has(o.id)) },
  ].filter((g) => g.items.length);
  return (
    <>
      {groups.map((g) => (
        <div key={g.title} className="layout-group">
          <div className="group-title">{g.title}</div>
          {g.items.map((o) => {
            const key = `layout.${platform.id}.${o.id}` as MessageKey;
            const value = layout[o.id];
            return (
              <Field key={o.id} label={t(key)}>
                {o.kind === 'toggle' ? (
                  <Switch
                    checked={!!value}
                    label={t(key)}
                    onChange={(v) => update((s) => patchLayout(s, platform.id, o.id, v))}
                  />
                ) : (
                  <Select
                    value={String(value)}
                    label={t(key)}
                    options={o.choices.map((c) => ({
                      value: c,
                      label: /^\d+$/.test(c)
                        ? o.id === 'quality'
                          ? `${c}p${c === '2160' ? ' (4K)' : c === '1440' ? ' (2K)' : ''}`
                          : c
                        : t(`choice.${c}` as MessageKey),
                    }))}
                    onChange={(v) => update((s) => patchLayout(s, platform.id, o.id, v))}
                  />
                )}
              </Field>
            );
          })}
        </div>
      ))}
    </>
  );
}

export function SoundPanel({ settings, update }: { settings: Settings; update: Update }) {
  const t = useT();
  const p = settings.player;
  return (
    <>
      <Field label={t('player.boost')} hint={t('player.boostHint')} stack>
        <Slider
          value={p.boost}
          min={100}
          max={300}
          step={10}
          label={t('player.boost')}
          format={(v) => `${v}%`}
          onChange={(v) => patchPlayer(update, (pl) => ({ ...pl, boost: v }))}
        />
      </Field>
      <Field label={t('player.wheelVolume')}>
        <Switch
          checked={p.wheelVolume}
          label={t('player.wheelVolume')}
          onChange={(v) => patchPlayer(update, (pl) => ({ ...pl, wheelVolume: v }))}
        />
      </Field>
    </>
  );
}

export function SubtitlesPanel({
  settings,
  update,
  compact,
}: {
  settings: Settings;
  update: Update;
  compact?: boolean;
}) {
  const t = useT();
  const sub = settings.subtitles;
  const set = (patch: Partial<Settings['subtitles']>) =>
    update((s) => ({ ...s, subtitles: { ...s.subtitles, ...patch } }));
  const box = `rgba(0, 0, 0, ${sub.background / 100})`;
  return (
    <>
      <Field label={t('subs.on')} hint={compact ? undefined : t('subs.hint')}>
        <Switch checked={sub.on} label={t('subs.on')} onChange={(v) => set({ on: v })} />
      </Field>
      <fieldset className="dep" disabled={!sub.on}>
        <div className="subs-sample" aria-hidden="true">
          <span
            style={{
              color: sub.color,
              background: box,
              fontSize: `${(15 * sub.size) / 100}px`,
              fontWeight: sub.bold ? 700 : 500,
            }}
          >
            {t('subs.sample')}
          </span>
        </div>
        <Field label={t('subs.size')} stack>
          <Slider
            value={sub.size}
            min={60}
            max={250}
            step={5}
            label={t('subs.size')}
            format={(v) => `${v}%`}
            onChange={(v) => set({ size: v })}
          />
        </Field>
        <Field label={t('subs.background')} stack>
          <Slider
            value={sub.background}
            min={0}
            max={100}
            label={t('subs.background')}
            format={(v) => `${v}%`}
            onChange={(v) => set({ background: v })}
          />
        </Field>
        <Field label={t('subs.color')}>
          <div className="swatch-row" role="radiogroup" aria-label={t('subs.color')}>
            {['#ffffff', '#fde047', '#7dd3fc', '#86efac', '#f9a8d4'].map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={sub.color === c}
                aria-label={c}
                className="swatch-dot"
                style={{ background: c }}
                onClick={() => set({ color: c })}
              />
            ))}
          </div>
        </Field>
        <Field label={t('subs.bold')}>
          <Switch checked={sub.bold} label={t('subs.bold')} onChange={(v) => set({ bold: v })} />
        </Field>
      </fieldset>
    </>
  );
}
