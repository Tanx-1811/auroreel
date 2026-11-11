import { Check, Download, ImagePlus, Minus, Plus, Shuffle, Trash2, Wand2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { makeThemeFile } from '../../core/backup.ts';
import { formatColor, fromOklch } from '../../core/color.ts';
import { paletteFromPixels } from '../../core/imagePalette.ts';
import {
  BUILT_IN_THEMES,
  duplicateTheme,
  FONT_IDS,
  findTheme,
  newThemeId,
  resolvePalette,
  textContrast,
  themeFromSeed,
  themeName,
  type Backdrop,
  type BackdropKind,
  type FontId,
  type Theme,
  type ThemeColors,
  type ThemeMode,
} from '../../core/themes.ts';
import type { MessageKey } from '../../shared/i18n.ts';
import { ColorField, Segmented, Select, Slider } from '../../ui/controls.tsx';
import { useLang, useT } from '../../ui/i18n.tsx';
import { LargePreview } from '../../ui/ThemePreview.tsx';
import { useToast } from '../../ui/toast.tsx';
import { downloadJson, loadPicture } from '../files.ts';
import { Card, PageHead } from '../PageHead.tsx';
import { go } from '../router.ts';
import type { PageProps } from '../types.ts';

const COLOR_KEYS: (keyof ThemeColors)[] = ['bg', 'surface', 'text', 'muted', 'accent', 'link'];
const OPTIONAL = new Set<keyof ThemeColors>(['muted', 'link']);

function starter(name: string): Theme {
  return {
    ...themeFromSeed({ id: newThemeId(), name, mode: 'dark', accent: '#8b5cf6', secondary: '#ec4899' }),
    createdAt: Date.now(),
  };
}

function randomTheme(base: Theme): Theme {
  const hue = Math.floor(Math.random() * 360);
  const accent = formatColor(fromOklch({ L: 0.7, C: 0.17, H: hue, alpha: 1 }));
  const second = formatColor(fromOklch({ L: 0.68, C: 0.15, H: (hue + 40 + Math.random() * 120) % 360, alpha: 1 }));
  const seeded = themeFromSeed({ id: base.id, name: base.name, mode: base.mode, accent, secondary: second });
  return { ...base, colors: seeded.colors, backdrop: base.backdrop.kind === 'image' ? base.backdrop : seeded.backdrop };
}

export function EditorPage({ id, settings, themes, update, saveTheme, removeTheme }: PageProps & { id?: string }) {
  const t = useT();
  const lang = useLang();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const existing = id ? themes.find((x) => x.id === id) : undefined;
  const builtIn = id ? BUILT_IN_THEMES.find((x) => x.id === id) : undefined;
  const [draft, setDraft] = useState<Theme>(() => {
    if (existing) return structuredClone(existing);
    if (builtIn) return duplicateTheme(builtIn, t('editor.copyOf', { name: themeName(builtIn, lang) }));
    return starter(t('editor.untitled'));
  });
  const [saved, setSaved] = useState<string>(() => (existing ? JSON.stringify(existing) : ''));
  const [seedAccent, setSeedAccent] = useState('#8b5cf6');
  const [busy, setBusy] = useState(false);
  const [swatches, setSwatches] = useState<string[]>([]);
  const dirty = JSON.stringify(draft) !== saved;
  const isSaved = themes.some((x) => x.id === draft.id);

  useEffect(() => {
    if (id === 'from-image') fileRef.current?.click();
  }, [id]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const palette = useMemo(() => resolvePalette(draft), [draft]);
  const ratio = textContrast(draft);

  const set = (patch: Partial<Theme>) => setDraft((d) => ({ ...d, ...patch }));
  const setColor = (k: keyof ThemeColors, v: string | undefined) =>
    setDraft((d) => {
      const colors = { ...d.colors };
      if (v === undefined) delete colors[k];
      else colors[k] = v;
      return { ...d, colors };
    });
  const setBackdrop = (b: Backdrop) => set({ backdrop: b });

  const switchBackdrop = (kind: BackdropKind) => {
    const c = draft.colors;
    switch (kind) {
      case 'none':
        return setBackdrop({ kind: 'none' });
      case 'aurora':
        return setBackdrop({ kind: 'aurora', colors: [c.accent, c.link ?? c.accent], intensity: 55 });
      case 'gradient':
        return setBackdrop({ kind: 'gradient', angle: 160, stops: [c.bg, c.surface, c.accent], veil: 55 });
      case 'image':
        if (draft.backdrop.kind !== 'image') fileRef.current?.click();
        return;
    }
  };

  const onPicture = async (file: File) => {
    setBusy(true);
    try {
      const pic = await loadPicture(file);
      const pal = paletteFromPixels(pic.pixels);
      if (!pal) throw new Error('empty');
      setSwatches(pal.swatches);
      const seeded = themeFromSeed({
        id: draft.id,
        name: draft.name,
        mode: pal.mode,
        bg: pal.bg,
        accent: pal.accent,
        secondary: pal.secondary,
      });
      setDraft((d) => ({
        ...d,
        mode: pal.mode,
        colors: seeded.colors,
        backdrop: {
          kind: 'image',
          image: pic.dataUrl,
          blur: 14,
          veil: pal.mode === 'dark' ? 58 : 50,
          position: 'center',
        },
        glass: Math.max(d.glass, 40),
      }));
      toast(t('editor.pictureReady'));
    } catch {
      toast(t('editor.pictureBad'));
    } finally {
      setBusy(false);
    }
  };

  const save = async (andUse: boolean) => {
    const theme = { ...draft, name: draft.name.trim() || t('editor.untitled') };
    await saveTheme(theme);
    setSaved(JSON.stringify(theme));
    setDraft(theme);
    if (andUse) await update((s) => ({ ...s, themeId: theme.id }));
    toast(andUse ? t('editor.savedUsed') : t('editor.saved'));
    if (id !== theme.id) history.replaceState(null, '', `#/editor/${theme.id}`);
  };

  const remove = async () => {
    if (!confirm(t('themes.deleteConfirm', { name: draft.name }))) return;
    await removeTheme(draft.id);
    if (settings.themeId === draft.id) await update((s) => ({ ...s, themeId: 'midnight-velvet' }));
    go('themes');
  };

  const b = draft.backdrop;
  const previewText = {
    search: t('preview.search'),
    title: t('preview.title'),
    channel: t('preview.channel'),
    meta: t('preview.meta'),
    subscribe: t('preview.subscribe'),
    share: t('preview.share'),
    chips: [t('preview.chip1'), t('preview.chip2'), t('preview.chip3'), t('preview.chip4')],
    description: t('preview.description'),
    link: t('preview.link'),
    related: [
      { title: t('preview.rel1'), meta: t('preview.relMeta1') },
      { title: t('preview.rel2'), meta: t('preview.relMeta2') },
      { title: t('preview.rel3'), meta: t('preview.relMeta3') },
      { title: t('preview.rel4'), meta: t('preview.relMeta4') },
    ],
  };

  return (
    <>
      <PageHead
        title={isSaved ? t('editor.editTitle') : t('editor.newTitle')}
        subtitle={builtIn && !isSaved ? t('editor.builtInNote') : t('editor.subtitle')}
      />
      <div className="editor">
        <div className="editor-controls">
          <Card>
            <div className="name-row">
              <label className="grow">
                <span className="label-sm">{t('editor.name')}</span>
                <input
                  className="input"
                  value={draft.name}
                  maxLength={40}
                  onChange={(e) => set({ name: e.target.value })}
                />
              </label>
              <label>
                <span className="label-sm">{t('editor.mode')}</span>
                <Segmented<ThemeMode>
                  value={draft.mode}
                  label={t('editor.mode')}
                  onChange={(mode) => set({ mode })}
                  options={[
                    { value: 'dark', label: t('themes.dark') },
                    { value: 'light', label: t('themes.light') },
                  ]}
                />
              </label>
            </div>
          </Card>

          <Card title={t('editor.quick')} hint={t('editor.quickHint')}>
            <div className="quick-start">
              <div className="quick-tile">
                <ColorField label={t('editor.seedColor')} value={seedAccent} onChange={setSeedAccent} />
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => {
                    const seeded = themeFromSeed({
                      id: draft.id,
                      name: draft.name,
                      mode: draft.mode,
                      accent: seedAccent,
                    });
                    setDraft((d) => ({
                      ...d,
                      colors: seeded.colors,
                      backdrop: d.backdrop.kind === 'image' ? d.backdrop : seeded.backdrop,
                    }));
                  }}
                >
                  <Wand2 size={14} />
                  {t('editor.generate')}
                </button>
              </div>
              <button
                type="button"
                className="quick-tile picture"
                onClick={() => fileRef.current?.click()}
                disabled={busy}
              >
                <ImagePlus size={20} />
                <strong>{busy ? t('editor.reading') : t('editor.fromPicture')}</strong>
                <span className="muted small">{t('editor.fromPictureHint')}</span>
              </button>
              <button type="button" className="quick-tile" onClick={() => setDraft((d) => randomTheme(d))}>
                <Shuffle size={20} />
                <strong>{t('editor.surprise')}</strong>
                <span className="muted small">{t('editor.surpriseHint')}</span>
              </button>
            </div>
            {swatches.length ? (
              <div className="swatches" aria-label={t('editor.pictureColors')}>
                {swatches.map((s) => (
                  <button
                    key={s}
                    type="button"
                    style={{ background: s }}
                    title={t('editor.useAsAccent', { color: s })}
                    aria-label={t('editor.useAsAccent', { color: s })}
                    onClick={() => setColor('accent', s)}
                  />
                ))}
              </div>
            ) : null}
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) void onPicture(f);
              }}
            />
          </Card>

          <Card
            title={t('editor.colors')}
            actions={
              <span
                className={`badge ${ratio >= 7 ? 'ok' : ratio >= 4.5 ? '' : 'warn'}`}
                title={t('editor.contrastHint')}
              >
                {ratio >= 7 ? <Check size={12} /> : null}
                {t('editor.contrast', { ratio: ratio.toFixed(1) })}
              </span>
            }
          >
            <div className="color-grid">
              {COLOR_KEYS.map((k) => (
                <div key={k} className="color-cell">
                  <ColorField
                    label={t(`color.${k}` as MessageKey)}
                    value={draft.colors[k] ?? ''}
                    placeholder={
                      OPTIONAL.has(k) ? formatColor(k === 'muted' ? palette.muted : palette.link) : undefined
                    }
                    onChange={(v) => setColor(k, v)}
                  />
                  {OPTIONAL.has(k) && draft.colors[k] ? (
                    <button type="button" className="auto-btn" onClick={() => setColor(k, undefined)}>
                      {t('editor.auto')}
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
            {ratio < 4.5 ? <p className="notice small">{t('editor.contrastLow')}</p> : null}
          </Card>

          <Card title={t('editor.backdrop')} hint={t('editor.backdropHint')}>
            <Segmented<BackdropKind>
              full
              value={b.kind}
              label={t('editor.backdrop')}
              onChange={switchBackdrop}
              options={[
                { value: 'none', label: t('backdrop.none') },
                { value: 'aurora', label: t('backdrop.aurora') },
                { value: 'gradient', label: t('backdrop.gradient') },
                { value: 'image', label: t('backdrop.image') },
              ]}
            />
            <div className="backdrop-body">
              {b.kind === 'aurora' ? (
                <>
                  <div className="color-grid">
                    {b.colors.map((c, i) => (
                      <ColorField
                        key={i}
                        label={t('editor.glowN', { n: i + 1 })}
                        value={c}
                        onChange={(v) => setBackdrop({ ...b, colors: b.colors.map((x, j) => (j === i ? v : x)) })}
                      />
                    ))}
                  </div>
                  <div className="row-btns">
                    {b.colors.length < 4 ? (
                      <button
                        type="button"
                        className="btn sm"
                        onClick={() => setBackdrop({ ...b, colors: [...b.colors, draft.colors.surface] })}
                      >
                        <Plus size={14} />
                        {t('editor.addColor')}
                      </button>
                    ) : null}
                    {b.colors.length > 1 ? (
                      <button
                        type="button"
                        className="btn sm ghost"
                        onClick={() => setBackdrop({ ...b, colors: b.colors.slice(0, -1) })}
                      >
                        <Minus size={14} />
                        {t('editor.removeColor')}
                      </button>
                    ) : null}
                  </div>
                  <Labeled label={t('editor.glow')}>
                    <Slider
                      value={b.intensity}
                      min={0}
                      max={100}
                      label={t('editor.glow')}
                      onChange={(v) => setBackdrop({ ...b, intensity: v })}
                      format={(v) => `${v}%`}
                      delay={30}
                    />
                  </Labeled>
                </>
              ) : null}
              {b.kind === 'gradient' ? (
                <>
                  <div className="color-grid">
                    {b.stops.map((c, i) => (
                      <ColorField
                        key={i}
                        label={t('editor.stopN', { n: i + 1 })}
                        value={c}
                        onChange={(v) => setBackdrop({ ...b, stops: b.stops.map((x, j) => (j === i ? v : x)) })}
                      />
                    ))}
                  </div>
                  <div className="row-btns">
                    {b.stops.length < 4 ? (
                      <button
                        type="button"
                        className="btn sm"
                        onClick={() => setBackdrop({ ...b, stops: [...b.stops, draft.colors.accent] })}
                      >
                        <Plus size={14} />
                        {t('editor.addColor')}
                      </button>
                    ) : null}
                    {b.stops.length > 2 ? (
                      <button
                        type="button"
                        className="btn sm ghost"
                        onClick={() => setBackdrop({ ...b, stops: b.stops.slice(0, -1) })}
                      >
                        <Minus size={14} />
                        {t('editor.removeColor')}
                      </button>
                    ) : null}
                  </div>
                  <Labeled label={t('editor.angle')}>
                    <Slider
                      value={b.angle}
                      min={0}
                      max={360}
                      label={t('editor.angle')}
                      onChange={(v) => setBackdrop({ ...b, angle: v })}
                      format={(v) => `${v}°`}
                      delay={30}
                    />
                  </Labeled>
                  <Labeled label={t('editor.veil')}>
                    <Slider
                      value={b.veil}
                      min={0}
                      max={95}
                      label={t('editor.veil')}
                      onChange={(v) => setBackdrop({ ...b, veil: v })}
                      format={(v) => `${v}%`}
                      delay={30}
                    />
                  </Labeled>
                </>
              ) : null}
              {b.kind === 'image' ? (
                <>
                  <div className="picture-row">
                    <img src={b.image} alt="" />
                    <button type="button" className="btn sm" onClick={() => fileRef.current?.click()}>
                      <ImagePlus size={14} />
                      {t('editor.replacePicture')}
                    </button>
                  </div>
                  <Labeled label={t('editor.blur')}>
                    <Slider
                      value={b.blur}
                      min={0}
                      max={40}
                      label={t('editor.blur')}
                      onChange={(v) => setBackdrop({ ...b, blur: v })}
                      format={(v) => `${v}px`}
                      delay={30}
                    />
                  </Labeled>
                  <Labeled label={t('editor.veil')}>
                    <Slider
                      value={b.veil}
                      min={0}
                      max={95}
                      label={t('editor.veil')}
                      onChange={(v) => setBackdrop({ ...b, veil: v })}
                      format={(v) => `${v}%`}
                      delay={30}
                    />
                  </Labeled>
                  <Labeled label={t('editor.position')}>
                    <Segmented
                      value={b.position}
                      label={t('editor.position')}
                      onChange={(position) => setBackdrop({ ...b, position })}
                      options={[
                        { value: 'top', label: t('editor.posTop') },
                        { value: 'center', label: t('editor.posCenter') },
                        { value: 'bottom', label: t('editor.posBottom') },
                      ]}
                    />
                  </Labeled>
                </>
              ) : null}
              {b.kind === 'none' ? <p className="muted small">{t('editor.flatHint')}</p> : null}
            </div>
          </Card>

          <Card title={t('editor.finish')}>
            {b.kind !== 'none' ? (
              <Labeled label={t('editor.glass')} hint={t('editor.glassHint')}>
                <Slider
                  value={draft.glass}
                  min={0}
                  max={100}
                  label={t('editor.glass')}
                  onChange={(glass) => set({ glass })}
                  format={(v) => `${v}%`}
                  delay={30}
                />
              </Labeled>
            ) : null}
            <Labeled label={t('editor.radius')}>
              <Slider
                value={draft.radius}
                min={0}
                max={28}
                label={t('editor.radius')}
                onChange={(radius) => set({ radius })}
                format={(v) => `${v}px`}
                delay={30}
              />
            </Labeled>
            <Labeled label={t('editor.font')} hint={t('editor.fontHint')}>
              <Select<FontId>
                value={draft.font}
                label={t('editor.font')}
                onChange={(font) => set({ font })}
                options={FONT_IDS.map((f) => ({ value: f, label: t(`font.${f}` as MessageKey) }))}
              />
            </Labeled>
          </Card>
        </div>

        <div className="editor-preview">
          <div className="preview-sticky">
            <LargePreview theme={draft} text={previewText} />
            <p className="muted small preview-note">{t('editor.previewNote')}</p>
          </div>
        </div>
      </div>

      <div className="save-bar">
        <span className={`muted small ${dirty ? 'dirty' : ''}`}>
          {dirty ? t('editor.unsaved') : isSaved ? t('editor.allSaved') : ''}
        </span>
        <div className="save-actions">
          {isSaved ? (
            <>
              <button type="button" className="btn ghost danger" onClick={() => void remove()}>
                <Trash2 size={15} />
                {t('common.delete')}
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={() => downloadJson(makeThemeFile(draft), `${draft.name}.reelskin-theme.json`)}
              >
                <Download size={15} />
                {t('common.export')}
              </button>
            </>
          ) : null}
          <button type="button" className="btn" disabled={!dirty && isSaved} onClick={() => void save(false)}>
            {t('common.save')}
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={!dirty && isSaved && settings.themeId === draft.id && !!findTheme(draft.id, themes)}
            onClick={() => void save(true)}
          >
            <Check size={15} />
            {t('editor.saveUse')}
          </button>
        </div>
      </div>
    </>
  );
}

function Labeled({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="labeled">
      <div>
        <div className="label">{label}</div>
        {hint ? <div className="hint">{hint}</div> : null}
      </div>
      {children}
    </div>
  );
}
