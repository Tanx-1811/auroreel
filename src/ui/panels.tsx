/** Settings panels shared by the popup and the studio. */
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
import { patchLayout, type PlayerSettings, type Settings } from '../core/settings.ts';
import type { MessageKey } from '../shared/i18n.ts';
import { Field, Segmented, Select, Slider, Switch } from './controls.tsx';
import { useT } from './i18n.tsx';

type Update = (fn: (s: Settings) => Settings) => unknown;

const patchPlayer = (update: Update, fn: (p: PlayerSettings) => PlayerSettings) =>
  update((s) => ({ ...s, player: fn(s.player) }));

const SPEEDS = ['0.75', '1', '1.25', '1.5', '1.75', '2'];

export function AmbientPanel({ settings, update, compact }: { settings: Settings; update: Update; compact?: boolean }) {
  const t = useT();
  const a = settings.player.ambient;
  const set = (patch: Partial<PlayerSettings['ambient']>) =>
    patchPlayer(update, (p) => ({ ...p, ambient: { ...p.ambient, ...patch } }));
  return (
    <>
      <Field label={t('player.ambient')} hint={compact ? undefined : t('player.ambientHint')}>
        <Switch checked={a.enabled} onChange={(v) => set({ enabled: v })} label={t('player.ambient')} />
      </Field>
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
      {open
        ? FILTER_KEYS.map((k) => {
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
                  onChange={(v) =>
                    patchPlayer(update, (pl) => ({ ...pl, filtersOn: true, filters: { ...pl.filters, [k]: v } }))
                  }
                />
              </Field>
            );
          })
        : null}
      {open ? (
        <div style={{ paddingTop: 6 }}>
          <button
            type="button"
            className="btn sm"
            onClick={() => patchPlayer(update, (pl) => ({ ...pl, filters: { ...DEFAULT_FILTERS } }))}
          >
            {t('common.reset')}
          </button>
        </div>
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

/** Which layout options count as "look" (the rest hide things: "focus"). */
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
    { title: t('layout.groupLook'), items: platform.layout.filter((o) => LOOK.has(o.id)) },
    { title: t('layout.groupFocus'), items: platform.layout.filter((o) => !LOOK.has(o.id)) },
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
                      label: /^\d+$/.test(c) ? c : t(`choice.${c}` as MessageKey),
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
