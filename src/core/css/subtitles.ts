/**
 * Caption restyling. Sites size their captions with inline styles, so the
 * size is applied by scaling the caption box; colour, weight and the box
 * behind the text are set directly. Native WebVTT tracks use ::cue.
 */
import { formatColor, hex, withAlpha } from '../color.ts';
import type { SubtitleSettings } from '../settings.ts';

/** Caption text and the boxes that hold it, per site. */
const TEXT = [
  '.ytp-caption-segment',
  '.player-timedtext-text-container span',
  '.atvwebplayersdk-captions-text',
  '.dss-subtitle-renderer-cue',
];
const BOXES = [
  '.ytp-caption-window-container .caption-window',
  '.player-timedtext-text-container',
  '.atvwebplayersdk-captions-overlay',
  '.dss-subtitle-renderer-cue-window',
];

export function subtitleCss(s: SubtitleSettings): string {
  if (!s.on) return '';
  const scale = s.size / 100;
  const box = formatColor(withAlpha(hex('#000000'), s.background / 100));
  const weight = s.bold ? 'font-weight:700!important;' : '';
  return (
    `${TEXT.join(',')}{color:${s.color}!important;background:${box}!important;${weight}text-shadow:0 1px 3px rgba(0,0,0,.6)!important}` +
    `${BOXES.join(',')}{transform:scale(${scale})!important;transform-origin:50% 100%!important}` +
    `video::cue{color:${s.color};background:${box};font-size:${s.size}%;${weight.replace(/!important/g, '')}}`
  );
}
