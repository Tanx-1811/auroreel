/**
 * Decorations that don't depend on a theme: the progress bar's knob and played
 * part (sites whose adapter describes their bar) and page scrollbars.
 */
import { emojiSvg, progressIcon, svgUrl } from '../progressIcons.ts';
import type { ProgressSettings, Settings } from '../settings.ts';
import type { ProgressBarConfig } from '../sites/types.ts';
import { ROOT } from './common.ts';

/** Flat bands for the "rainbow" fill. */
export const RAINBOW = ['#ff5d73', '#ff9f43', '#ffd43b', '#51cf66', '#4dabf7', '#9775fa'];

/** Knob motions, also used by the studio's preview. */
export const KNOB_KEYFRAMES =
  '@keyframes rs-knob-bounce{from{transform:translateY(0)}to{transform:translateY(-24%)}}' +
  '@keyframes rs-knob-spin{to{transform:rotate(360deg)}}' +
  '@keyframes rs-knob-pulse{from{transform:scale(1)}to{transform:scale(1.22)}}' +
  '@keyframes rs-knob-wiggle{from{transform:rotate(-14deg)}to{transform:rotate(14deg)}}';

export function knobAnimation(motion: ProgressSettings['motion']): string | null {
  switch (motion) {
    case 'bounce':
      return 'rs-knob-bounce .42s ease-in-out infinite alternate';
    case 'spin':
      return 'rs-knob-spin 1.6s linear infinite';
    case 'pulse':
      return 'rs-knob-pulse .7s ease-in-out infinite alternate';
    case 'wiggle':
      return 'rs-knob-wiggle .5s ease-in-out infinite alternate';
    default:
      return null;
  }
}

/** CSS image for the knob, or null when it is the site's own knob or a plain dot. */
export function knobImage(p: ProgressSettings): string | null {
  if (p.knob === 'emoji') return svgUrl(emojiSvg(p.emoji));
  if (p.knob === 'image') return p.image ? `url("${p.image}")` : null;
  const icon = progressIcon(p.knob);
  return icon ? svgUrl(icon.svg) : null;
}

/** CSS background of the played part; null keeps the colour the page already has. */
export function playedFill(p: ProgressSettings, accent: string | null): string | null {
  switch (p.fill) {
    case 'theme':
      return accent;
    case 'icon':
      return progressIcon(p.knob)?.color ?? accent;
    case 'custom':
      return p.color;
    case 'rainbow': {
      const step = 100 / RAINBOW.length;
      const bands = RAINBOW.map((c, i) => `${c} ${+(i * step).toFixed(2)}% ${+((i + 1) * step).toFixed(2)}%`);
      return `linear-gradient(90deg,${bands.join(',')})`;
    }
  }
}

/** Track height, px, for the 'thick' and 'bold' bars. */
export const BAR_PX = { thick: 6, bold: 9 } as const;

/**
 * Progress bar decorations for a site.
 * @param accent the theme's accent, or null without a theme.
 */
export function progressCss(bar: ProgressBarConfig, p: ProgressSettings, accent: string | null): string {
  const at = (sel: string) => `${bar.root} ${sel}`;
  let css = '';
  const fill = playedFill(p, accent);
  if (fill && p.fill !== 'theme') css += `${at(bar.played)}{background:${fill}!important}`;
  if (p.height !== 'site') {
    const h = BAR_PX[p.height];
    css += `${at(bar.track)}{height:${h}px!important;transform:none!important;border-radius:${h / 2}px!important}`;
  }
  if (p.knob === 'site') return css;
  css += (bar.extras ?? []).map((e) => `${at(e)}{display:none!important}`).join('');
  const knob = at(bar.knob);
  if (p.knob === 'dot') {
    const d = Math.round(p.size * 0.55);
    return (
      css +
      `${knob}{width:${d}px!important;height:${d}px!important;border-radius:50%!important;` +
      `background:${fill && !fill.includes('gradient') ? fill : (accent ?? '#ffffff')}!important;` +
      `box-shadow:0 0 0 3px #fff,0 1px 6px rgba(0,0,0,.45)!important;margin:${-(d - 12) / 2}px 0 0 ${-(d - 12) / 2}px!important}`
    );
  }
  const img = knobImage(p);
  if (!img) return css;
  const s = p.size;
  css +=
    `${knob}{position:relative;background:transparent!important;box-shadow:none!important;border-radius:0!important;overflow:visible!important}` +
    `${knob}::before{content:""!important;position:absolute;left:50%;top:50%;width:${s}px;height:${s}px;` +
    `margin:${-s / 2}px 0 0 ${-s / 2}px;background:${img} center/contain no-repeat;` +
    'filter:drop-shadow(0 1px 2px rgba(0,0,0,.5));pointer-events:none;transform-origin:50% 50%}';
  const anim = knobAnimation(p.motion);
  if (anim) {
    css += `@media (prefers-reduced-motion:no-preference){${KNOB_KEYFRAMES}${bar.root}${bar.playing} ${bar.knob}::before{animation:${anim}}}`;
  }
  return css;
}

/** Page scrollbars. `themed`: a theme is on (its accent is available as --rs-accent). */
export function scrollbarCss(mode: Settings['scrollbar'], themed: boolean): string {
  const all = `${ROOT},${ROOT} *`;
  const color = themed
    ? `${all}{scrollbar-color:color-mix(in oklab,var(--rs-accent) 55%,var(--rs-surface)) transparent!important}`
    : '';
  switch (mode) {
    case 'hidden':
      return `${all}{scrollbar-width:none!important}`;
    case 'thin':
      return `${all}{scrollbar-width:thin!important}${color}`;
    case 'theme':
      return color;
    default:
      return '';
  }
}
