import { ExternalLink, ImagePlus } from 'lucide-react';
import { useRef, useState } from 'react';
import { formatColor } from '../../core/color.ts';
import { cleanEmoji } from '../../core/progressIcons.ts';
import {
  BAR_FILLS,
  BAR_HEIGHTS,
  KNOB_MOTIONS,
  MAX_KNOB_IMAGE_CHARS,
  SCROLLBARS,
  type ProgressSettings,
} from '../../core/settings.ts';
import { activeThemeId } from '../../core/schedule.ts';
import { findTheme, resolvePalette } from '../../core/themes.ts';
import type { MessageKey } from '../../shared/i18n.ts';
import { ColorField, Field, Segmented, Slider, Switch } from '../../ui/controls.tsx';
import { useT } from '../../ui/i18n.tsx';
import { KnobGallery, ProgressPreview } from '../../ui/Knob.tsx';
import { loadKnobPicture } from '../files.ts';
import { Card, PageHead } from '../PageHead.tsx';
import type { PageProps } from '../types.ts';

const EMOJI_IDEAS = ['🐱', '🐶', '🦄', '🐧', '🍿', '🎬', '⚡', '🌸', '🍀', '👾', '🦖', '🛸'];

export function DecorPage({ settings, themes, update }: PageProps) {
  const t = useT();
  const p = settings.progress;
  // The theme YouTube shows right now (its own theme, the schedule…), which the preview should match.
  const theme = findTheme(
    activeThemeId(settings, 'youtube', new Date(), matchMedia('(prefers-color-scheme: dark)').matches),
    themes,
  );
  const accent = theme ? formatColor(resolvePalette(theme).accent) : null;
  const set = (patch: Partial<ProgressSettings>) => update((s) => ({ ...s, progress: { ...s.progress, ...patch } }));
  const file = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [emojiDraft, setEmojiDraft] = useState(p.emoji);
  const [emojiSeen, setEmojiSeen] = useState(p.emoji);
  if (p.emoji !== emojiSeen) {
    // Changed elsewhere (popup, another tab, sync): show it, unless it is what is being typed.
    setEmojiSeen(p.emoji);
    if (cleanEmoji(emojiDraft) !== p.emoji) setEmojiDraft(p.emoji);
  }

  const pick = (id: string) => {
    if (id === 'image' && !p.image) file.current?.click();
    else set({ knob: id });
  };
  const choosePicture = async (f: File | undefined) => {
    if (!f) return;
    try {
      set({ image: await loadKnobPicture(f, MAX_KNOB_IMAGE_CHARS), knob: 'image' });
      setError('');
    } catch {
      setError(t('decor.imageError'));
    }
  };
  const typeEmoji = (text: string) => {
    setEmojiDraft(text);
    const e = cleanEmoji(text);
    if (e) set({ emoji: e, knob: 'emoji' });
  };

  return (
    <>
      <PageHead
        title={t('nav.decor')}
        subtitle={t('decor.subtitle')}
        actions={
          <a className="btn" href="https://www.youtube.com/" target="_blank" rel="noreferrer">
            <ExternalLink size={16} />
            {t('decor.openYoutube')}
          </a>
        }
      />
      <div className="stack-16">
        <div className="decor-top">
          <Card title={t('decor.preview')} hint={t('decor.progressHint')}>
            <ProgressPreview progress={p} accent={accent} />
          </Card>
          <Card title={t('decor.progress')}>
            <Field label={t('decor.size')} stack>
              <Slider
                value={p.size}
                min={16}
                max={44}
                label={t('decor.size')}
                format={(v) => `${v} px`}
                onChange={(v) => set({ size: v })}
              />
            </Field>
            <Field label={t('decor.motion')} stack>
              <Segmented
                full
                value={p.motion}
                label={t('decor.motion')}
                options={KNOB_MOTIONS.map((m) => ({ value: m, label: t(`decor.motion.${m}` as MessageKey) }))}
                onChange={(v) => set({ motion: v })}
              />
            </Field>
            <Field label={t('decor.fill')} stack>
              <Segmented
                full
                value={p.fill}
                label={t('decor.fill')}
                options={BAR_FILLS.map((f) => ({ value: f, label: t(`decor.fill.${f}` as MessageKey) }))}
                onChange={(v) => set({ fill: v })}
              />
            </Field>
            {p.fill === 'custom' ? (
              <ColorField label={t('decor.color')} value={p.color} onChange={(v) => set({ color: v })} />
            ) : null}
            <Field label={t('decor.height')}>
              <Segmented
                value={p.height}
                label={t('decor.height')}
                options={BAR_HEIGHTS.map((h) => ({ value: h, label: t(`decor.height.${h}` as MessageKey) }))}
                onChange={(v) => set({ height: v })}
              />
            </Field>
            <Field label={t('decor.mini')} hint={t('decor.miniHint')}>
              <Switch checked={p.mini} label={t('decor.mini')} onChange={(v) => set({ mini: v })} />
            </Field>
          </Card>
        </div>

        <Card title={t('decor.knob')}>
          <KnobGallery progress={p} accent={accent} onPick={pick} />
          {p.knob === 'emoji' ? (
            <div className="kn-extra">
              <Field label={t('decor.emojiLabel')} hint={t('decor.emojiHint')}>
                <input
                  className="input emoji-input"
                  value={emojiDraft}
                  aria-label={t('decor.emojiLabel')}
                  onChange={(e) => typeEmoji(e.target.value)}
                />
              </Field>
              <div className="chips emoji-ideas">
                {EMOJI_IDEAS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    className="chip"
                    aria-pressed={p.emoji === e}
                    onClick={() => typeEmoji(e)}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {p.knob === 'image' ? (
            <div className="kn-extra row-actions">
              <button type="button" className="btn sm" onClick={() => file.current?.click()}>
                <ImagePlus size={15} />
                {t(p.image ? 'decor.imageChange' : 'decor.imagePick')}
              </button>
              <span className="muted small">{t('decor.imageLocal')}</span>
            </div>
          ) : null}
          {error ? (
            <p className="kn-error small" role="alert">
              {error}
            </p>
          ) : null}
          <input
            ref={file}
            type="file"
            hidden
            accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
            onChange={(e) => {
              void choosePicture(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </Card>

        <Card title={t('decor.scrollbar')} hint={t('decor.scrollbarHint')}>
          <div className="sb-grid" role="group" aria-label={t('decor.scrollbar')}>
            {SCROLLBARS.map((m) => (
              <button
                key={m}
                type="button"
                className="kn-tile"
                aria-pressed={settings.scrollbar === m}
                onClick={() => update((s) => ({ ...s, scrollbar: m }))}
              >
                <span className={`sb-art ${m}`} aria-hidden="true">
                  <i />
                  <i />
                  <i />
                  <b />
                </span>
                <span className="kn-name">{t(`decor.scrollbar.${m}` as MessageKey)}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
