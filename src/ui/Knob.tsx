/** Progress-bar knob: gallery, live preview and the small picker used by the popup. */
import { ImagePlus, Pause, Play } from 'lucide-react';
import { useState, type CSSProperties } from 'react';
import { BAR_PX, knobAnimation, KNOB_KEYFRAMES, playedFill } from '../core/css/decor.ts';
import { emojiSvg, PROGRESS_ICONS, progressIcon, svgDataUrl } from '../core/progressIcons.ts';
import type { ProgressSettings } from '../core/settings.ts';
import type { MessageKey } from '../shared/i18n.ts';
import { useT } from './i18n.tsx';

/** Every knob choice in gallery order. */
export const KNOB_CHOICES = ['site', 'dot', ...PROGRESS_ICONS.map((i) => i.id), 'emoji', 'image'];

/** YouTube's own colour, for previews without a theme. */
const SITE_RED = '#ff0033';

export function knobName(id: string, t: (k: MessageKey) => string): string {
  return progressIcon(id) ? t(`decor.icon.${id}` as MessageKey) : t(`decor.knob.${id}` as MessageKey);
}

/** Picture of a knob choice (the drawing, the emoji, the picture or a stand-in). */
export function KnobArt({
  id,
  progress,
  accent,
  size = 30,
}: {
  id: string;
  progress: ProgressSettings;
  accent: string | null;
  size?: number;
}) {
  const icon = progressIcon(id);
  if (icon) return <img className="kn-img" src={svgDataUrl(icon.svg)} width={size} height={size} alt="" />;
  if (id === 'emoji')
    return <img className="kn-img" src={svgDataUrl(emojiSvg(progress.emoji))} width={size} height={size} alt="" />;
  if (id === 'image') {
    return progress.image ? (
      <img className="kn-img" src={progress.image} width={size} height={size} alt="" />
    ) : (
      <ImagePlus size={Math.round(size * 0.7)} className="kn-placeholder" aria-hidden="true" />
    );
  }
  // 'site' and 'dot': a short bar with the knob on it.
  const color = accent ?? SITE_RED;
  return (
    <span className={`kn-mini-bar ${id}`} style={{ ['--kn-c' as string]: color, width: size + 6 }} aria-hidden="true">
      <i />
    </span>
  );
}

export function KnobGallery({
  progress,
  accent,
  onPick,
  compact,
}: {
  progress: ProgressSettings;
  accent: string | null;
  onPick: (id: string) => void;
  compact?: boolean;
}) {
  const t = useT();
  return (
    <div className={compact ? 'kn-row' : 'kn-grid'} role="group" aria-label={t('decor.knob')}>
      {KNOB_CHOICES.map((id) => {
        const name = knobName(id, t);
        return (
          <button
            key={id}
            type="button"
            className="kn-tile"
            aria-pressed={progress.knob === id}
            aria-label={compact ? name : undefined}
            title={compact ? name : undefined}
            data-knob={id}
            onClick={() => onPick(id)}
          >
            <span className="kn-art">
              <KnobArt id={id} progress={progress} accent={accent} size={compact ? 24 : 36} />
            </span>
            {compact ? null : <span className="kn-name">{name}</span>}
          </button>
        );
      })}
    </div>
  );
}

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A flat stand-in for a video with the bar drawn the way the page will draw it. */
export function ProgressPreview({ progress, accent }: { progress: ProgressSettings; accent: string | null }) {
  const t = useT();
  const [playing, setPlaying] = useState(true);
  const still = reducedMotion();
  const fill = playedFill(progress, accent) ?? SITE_RED;
  const h = progress.height === 'site' ? 4 : BAR_PX[progress.height];
  const anim = knobAnimation(progress.motion);
  const icon = progress.knob !== 'site' && progress.knob !== 'dot';
  const style = {
    '--kn-fill': fill,
    '--kn-h': `${h}px`,
    '--kn-size': `${progress.size}px`,
    '--kn-dot': `${Math.round(progress.size * 0.55)}px`,
    '--kn-c': fill.includes('gradient') ? (accent ?? SITE_RED) : fill,
    '--kn-anim': playing && !still && anim ? anim : 'none',
  } as CSSProperties;
  return (
    <div className={`kn-preview${playing && !still ? ' playing' : ''}`} style={style}>
      <style>{KNOB_KEYFRAMES}</style>
      <div className="kn-scene" aria-hidden="true">
        <span className="kn-moon" />
        <span className="kn-hill back" />
        <span className="kn-hill front" />
      </div>
      <div className="kn-controls">
        <div className="kn-track">
          <div className="kn-played">
            <span className={`kn-knob ${icon ? 'art' : progress.knob}`}>
              {icon ? <KnobArt id={progress.knob} progress={progress} accent={accent} size={progress.size} /> : null}
            </span>
          </div>
        </div>
        <div className="kn-buttons">
          <button
            type="button"
            className="kn-play"
            aria-label={t(playing ? 'decor.previewPause' : 'decor.previewPlay')}
            onClick={() => setPlaying(!playing)}
            disabled={still}
          >
            {playing && !still ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <span className="kn-time">1:24 / 3:30</span>
        </div>
      </div>
      {still ? <p className="kn-note">{t('decor.reducedMotion')}</p> : null}
    </div>
  );
}
