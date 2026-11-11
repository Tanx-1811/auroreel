import type { CSSProperties } from 'react';
import { formatColor } from '../core/color.ts';
import { backdropLayers, fontStack, glassOpacity } from '../core/css/common.ts';
import { resolvePalette, type Theme } from '../core/themes.ts';

/** Stand-ins for video thumbnails: colourful scenes, the same in every theme (like real videos). */
export const SCENES = [
  'radial-gradient(120% 90% at 20% 110%,#ffb36b 0%,#ff6f61 35%,#6b3fa0 70%,#1d1b4b 100%)',
  'linear-gradient(160deg,#0f4c75 0%,#3282b8 45%,#bbe1fa 100%)',
  'radial-gradient(90% 90% at 70% 30%,#c4f1be 0%,#4caf50 40%,#1b4332 100%)',
  'linear-gradient(135deg,#232526 0%,#414345 50%,#e0c3fc 100%)',
  'radial-gradient(100% 80% at 30% 20%,#fddb92 0%,#d1913c 45%,#4a2c2a 100%)',
  'linear-gradient(200deg,#ff9a9e 0%,#fad0c4 40%,#a18cd1 100%)',
];

/** CSS variables that draw a theme in the preview components. */
export function previewStyle(theme: Theme): CSSProperties {
  const p = resolvePalette(theme);
  const layers = backdropLayers(theme, p);
  const glass = glassOpacity(theme);
  const font = fontStack(theme.font);
  const vars: Record<string, string> = {
    '--p-bg': formatColor(p.bg),
    '--p-surface': formatColor(p.surface),
    '--p-text': formatColor(p.text),
    '--p-muted': formatColor(p.muted),
    '--p-accent': formatColor(p.accent),
    '--p-accent-text': formatColor(p.accentText),
    '--p-link': formatColor(p.link),
    '--p-border': formatColor(p.border),
    '--p-radius': `${theme.radius}px`,
    '--p-radius-sm': `${Math.max(2, Math.round(theme.radius * 0.6))}px`,
    '--p-glass': `${glass}%`,
    '--p-glass-surface': `${Math.min(100, glass + 15)}%`,
    '--p-backdrop': layers.background ?? 'none',
    '--p-blur': `${Math.round(layers.blur / 3)}px`,
    '--p-veil': `${layers.veil}%`,
  };
  if (font) vars['--p-font'] = font;
  return vars as CSSProperties;
}

/** A small drawing of a video site in the theme (theme cards). */
export function MiniPreview({ theme }: { theme: Theme }) {
  return (
    <div className="tp" style={previewStyle(theme)} aria-hidden="true">
      <div className="tp-backdrop" />
      <div className="tp-veil" />
      <div className="tp-top">
        <span className="tp-logo" />
        <span className="tp-search" />
        <span className="tp-avatar" />
      </div>
      <div className="tp-body">
        <div className="tp-side">
          <i />
          <i />
          <i />
          <i />
        </div>
        <div className="tp-grid">
          {SCENES.map((scene, i) => (
            <div className="tp-card" key={i}>
              <div className="tp-thumb" style={{ ['--thumb' as string]: scene }}>
                {i % 2 === 0 ? <b style={{ ['--w' as string]: `${30 + i * 10}%` }} /> : null}
              </div>
              <div className="tp-line" />
              <div className="tp-line short" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export interface LargePreviewText {
  search: string;
  title: string;
  channel: string;
  meta: string;
  subscribe: string;
  share: string;
  chips: string[];
  description: string;
  link: string;
  related: { title: string; meta: string }[];
}

/** A watch page in the theme (theme maker). */
export function LargePreview({ theme, text }: { theme: Theme; text: LargePreviewText }) {
  return (
    <div className="tp large" style={previewStyle(theme)}>
      <div className="tp-backdrop" />
      <div className="tp-veil" />
      <div className="tp-top">
        <span className="tp-logo" />
        <span className="tp-search">{text.search}</span>
        <span className="tp-avatar" />
      </div>
      <div className="tp-body">
        <div className="tp-watch">
          <div className="tp-player" style={{ ['--thumb' as string]: SCENES[0] }}>
            <div className="glow" />
            <div className="screen" />
            <div className="controls">
              <div className="tp-progress">
                <b />
              </div>
              <div className="row">
                <i />
                <i />
                <i />
              </div>
            </div>
          </div>
          <div className="tp-title">{text.title}</div>
          <div className="tp-meta">
            <span className="ch" />
            <span className="who">
              <b>{text.channel}</b>
              {text.meta}
            </span>
            <span className="tp-btn">{text.subscribe}</span>
            <span className="tp-btn soft">{text.share}</span>
          </div>
          <div className="tp-chipbar">
            {text.chips.map((c) => (
              <span key={c}>{c}</span>
            ))}
          </div>
          <div className="tp-desc">
            {text.description} <a>{text.link}</a>
          </div>
        </div>
        <div className="tp-related">
          {text.related.map((r, i) => (
            <div className="tp-rel" key={r.title}>
              <div className="tp-thumb" style={{ ['--thumb' as string]: SCENES[(i + 1) % SCENES.length] }}>
                {i === 1 ? <b style={{ ['--w' as string]: '60%' }} /> : null}
              </div>
              <div>
                <b>{r.title}</b>
                <span>{r.meta}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
