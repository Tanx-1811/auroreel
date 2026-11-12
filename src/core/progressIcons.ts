/**
 * Knob drawings for the video progress bar: flat, solid colours, 32×32, the
 * moving ones face right (the way the bar fills). Original artwork.
 */

export interface ProgressIcon {
  id: string;
  /** Main colour: the played part of the bar when it follows the icon. */
  color: string;
  svg: string;
}

const svg = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${body}</svg>`;
const EYE = '#2b2d42';

export const PROGRESS_ICONS: ProgressIcon[] = [
  {
    id: 'heart',
    color: '#ff4d6d',
    svg: svg(
      '<path d="M16 28.5S4 21.4 4 13.4C4 8.9 7.3 5.5 11.4 5.5c2.1 0 3.7 1 4.6 2.4.9-1.4 2.5-2.4 4.6-2.4C24.7 5.5 28 8.9 28 13.4c0 8-12 15.1-12 15.1Z" fill="#ff4d6d"/>' +
        '<path d="M16 28.5S4 21.4 4 13.4c0-1 .2-2 .5-2.8C6 18 16 24 16 24s10-6 11.5-13.4c.3.9.5 1.8.5 2.8 0 8-12 15.1-12 15.1Z" fill="#e63958"/>',
    ),
  },
  {
    id: 'star',
    color: '#ffc83d',
    svg: svg(
      '<path d="M16 2.8 19.4 11.3l9.1.6-7 5.8 2.3 8.9L16 21.7l-7.8 4.9 2.3-8.9-7-5.8 9.1-.6Z" fill="#ffc83d" stroke="#f0a500" stroke-width="1.6" stroke-linejoin="round"/>' +
        `<circle cx="13.4" cy="15.6" r="1.3" fill="${EYE}"/><circle cx="18.6" cy="15.6" r="1.3" fill="${EYE}"/>` +
        `<path d="M14.6 18.4c.8.8 2 .8 2.8 0" fill="none" stroke="${EYE}" stroke-width="1.2" stroke-linecap="round"/>`,
    ),
  },
  {
    id: 'flame',
    color: '#ff7a1a',
    svg: svg(
      '<path d="M16 2.5c1.4 5.5 8.5 8.6 8.5 16.4a8.5 8.5 0 0 1-17 0c0-3.6 1.6-6 3.4-7.6.3 2.2 1.3 3.7 2.8 4.3C12.9 10.6 14 6.6 16 2.5Z" fill="#ff7a1a"/>' +
        '<path d="M16 13.5c.8 3 4.3 4.7 4.3 8.6a4.3 4.3 0 0 1-8.6 0c0-2.3 1.1-3.7 2.3-4.6.3 1.1.9 1.8 1.6 2-.4-2.2 0-4.1.4-6Z" fill="#ffd23f"/>',
    ),
  },
  {
    id: 'rocket',
    color: '#ff4d6d',
    svg: svg(
      '<path d="M7.5 12.5 3 15.2v1.6l4.5 2.7Z" fill="#ffb703"/>' +
        '<path d="M10 9.5 6.5 3.5h4.2l5.5 6Zm0 13-3.5 6h4.2l5.5-6Z" fill="#ff4d6d"/>' +
        '<path d="M7 16c0-4.3 5.6-7.5 13-7.5 4.4 0 7.7 3.4 9.5 7.5-1.8 4.1-5.1 7.5-9.5 7.5C12.6 23.5 7 20.3 7 16Z" fill="#eef2ff"/>' +
        '<path d="M24.4 9.6c2.3 1.4 4 3.7 5.1 6.4-1.1 2.7-2.8 5-5.1 6.4 1-1.9 1.6-4.1 1.6-6.4s-.6-4.5-1.6-6.4Z" fill="#ff4d6d"/>' +
        '<circle cx="18.5" cy="16" r="3" fill="#4cc9f0" stroke="#3a7bd5" stroke-width="1.5"/>',
    ),
  },
  {
    id: 'cat',
    color: '#ff9f43',
    svg: svg(
      '<path d="M5 15 6.5 3.5 14 9.5ZM27 15 25.5 3.5 18 9.5Z" fill="#ff9f43"/>' +
        '<path d="M7.3 11 8 6.3l3.3 2.9ZM24.7 11 24 6.3l-3.3 2.9Z" fill="#ffc9d6"/>' +
        '<ellipse cx="16" cy="18" rx="12" ry="10" fill="#ff9f43"/>' +
        `<ellipse cx="11.5" cy="17" rx="1.7" ry="2.3" fill="${EYE}"/><ellipse cx="20.5" cy="17" rx="1.7" ry="2.3" fill="${EYE}"/>` +
        '<path d="M14.8 20.6h2.4L16 22Z" fill="#ff6b8b"/>' +
        `<path d="M16 22c-.6 1.2-2 1.4-2.8.6M16 22c.6 1.2 2 1.4 2.8.6" fill="none" stroke="${EYE}" stroke-width="1.1" stroke-linecap="round"/>` +
        '<path d="M4.5 19.5 9 20.2M4.8 22.6l4.4-1.2M27.5 19.5 23 20.2M27.2 22.6l-4.4-1.2" stroke="#b86a20" stroke-width="1" stroke-linecap="round"/>',
    ),
  },
  {
    id: 'duck',
    color: '#ffd43b',
    svg: svg(
      '<ellipse cx="14" cy="21.5" rx="11.5" ry="7" fill="#ffd43b"/>' +
        '<circle cx="20.5" cy="11.5" r="6.5" fill="#ffd43b"/>' +
        '<path d="M26 10.2 31 12l-5 1.9Z" fill="#ff922b"/>' +
        `<circle cx="22" cy="10" r="1.3" fill="${EYE}"/>` +
        '<path d="M6.5 19.5c3.4-1.6 7.6-1.2 10 1.6-2.6 2.6-7.4 2.6-10-1.6Z" fill="#fab005"/>',
    ),
  },
  {
    id: 'ghost',
    color: '#c5c8ff',
    svg: svg(
      '<path d="M5.5 28.5V14.5a10.5 10.5 0 0 1 21 0v14l-3.5-2.6-3.5 2.6-3.5-2.6-3.5 2.6-3.5-2.6Z" fill="#f8f9ff" stroke="#c5c8ff" stroke-width="1.4" stroke-linejoin="round"/>' +
        `<ellipse cx="12.5" cy="14.5" rx="1.9" ry="2.5" fill="${EYE}"/><ellipse cx="19.5" cy="14.5" rx="1.9" ry="2.5" fill="${EYE}"/>` +
        '<ellipse cx="10" cy="19" rx="1.8" ry="1.1" fill="#ffc9d6"/><ellipse cx="22" cy="19" rx="1.8" ry="1.1" fill="#ffc9d6"/>',
    ),
  },
  {
    id: 'fish',
    color: '#4dabf7',
    svg: svg(
      '<path d="M8 16 1.5 9.5v13Z" fill="#339af0"/>' +
        '<path d="M6 16c3.2-5.8 9-9 15-9 5 0 8.2 4 9.5 9-1.3 5-4.5 9-9.5 9-6 0-11.8-3.2-15-9Z" fill="#4dabf7"/>' +
        '<path d="M14.5 8.6c2-2.9 5.3-4 8.3-3-2 1-3.1 2.2-3.4 3.4Z" fill="#339af0"/>' +
        '<path d="M13 12.5c1.2 2.2 1.2 4.8 0 7" fill="none" stroke="#a5d8ff" stroke-width="1.4" stroke-linecap="round"/>' +
        `<circle cx="23.5" cy="14" r="2.4" fill="#fff"/><circle cx="24" cy="14" r="1.2" fill="${EYE}"/>`,
    ),
  },
  {
    id: 'popcorn',
    color: '#ef4444',
    svg: svg(
      '<circle cx="10" cy="12.5" r="3.6" fill="#fff4cc"/><circle cx="22" cy="12.5" r="3.6" fill="#fff4cc"/>' +
        '<circle cx="13" cy="8" r="3.4" fill="#ffe8a3"/><circle cx="19" cy="8" r="3.4" fill="#fff4cc"/><circle cx="16" cy="11" r="4" fill="#ffe8a3"/>' +
        '<path d="M7 14h18l-2.3 15H9.3Z" fill="#fff"/>' +
        '<path d="M10 14h3.2l-.4 15H10.8ZM18.8 14H22l-1.6 15h-2Z" fill="#ef4444"/>' +
        '<path d="M7 14h18" stroke="#ef4444" stroke-width="1.6"/>',
    ),
  },
  {
    id: 'reel',
    color: '#8b5cf6',
    svg: svg(
      '<circle cx="16" cy="16" r="13.5" fill="#8b5cf6"/>' +
        '<g fill="#efe9ff"><circle cx="16" cy="8.6" r="3"/><circle cx="23" cy="13.7" r="3"/><circle cx="20.3" cy="22" r="3"/><circle cx="11.7" cy="22" r="3"/><circle cx="9" cy="13.7" r="3"/></g>' +
        '<circle cx="16" cy="16" r="1.8" fill="#5b2fc9"/>',
    ),
  },
  {
    id: 'note',
    color: '#845ef7',
    svg: svg(
      '<path d="M11 8.2 26 4.5v4.2L11 12.4Z" fill="#845ef7"/>' +
        '<path d="M11 9v14.5M26 5.2v12.6" stroke="#845ef7" stroke-width="2.4" stroke-linecap="round"/>' +
        '<ellipse cx="7.6" cy="24" rx="4" ry="3" transform="rotate(-20 7.6 24)" fill="#845ef7"/>' +
        '<ellipse cx="22.6" cy="18.6" rx="4" ry="3" transform="rotate(-20 22.6 18.6)" fill="#845ef7"/>',
    ),
  },
  {
    id: 'moon',
    color: '#ffe066',
    svg: svg(
      '<path d="M20.5 3.6A12.6 12.6 0 1 0 28.4 21 10.4 10.4 0 0 1 20.5 3.6Z" fill="#ffe066"/>' +
        `<path d="M10.5 15.5c.7.8 1.9.8 2.6 0M16.5 18.5c.7.8 1.9.8 2.6 0" fill="none" stroke="${EYE}" stroke-width="1.2" stroke-linecap="round"/>` +
        '<ellipse cx="11" cy="19.6" rx="1.6" ry="1" fill="#ffb3c1"/>',
    ),
  },
  {
    id: 'planet',
    color: '#74c0fc',
    svg: svg(
      '<ellipse cx="16" cy="16" rx="14.5" ry="4.6" transform="rotate(-20 16 16)" fill="none" stroke="#ffd43b" stroke-width="2.4"/>' +
        '<circle cx="16" cy="16" r="8.5" fill="#74c0fc"/>' +
        '<path d="M8.4 12.6c4.6 1.2 10.6 1 15.4-.6M7.8 17.6c4.8 1.4 11.4 1.2 16.4-.6" fill="none" stroke="#4dabf7" stroke-width="1.6" stroke-linecap="round"/>' +
        '<path d="M1.5 16a14.5 4.6 0 0 0 29 0" transform="rotate(-20 16 16)" fill="none" stroke="#ffd43b" stroke-width="2.4"/>',
    ),
  },
  {
    id: 'sakura',
    color: '#f783ac',
    svg: svg(
      '<g fill="#ffb3cf">' +
        [0, 72, 144, 216, 288]
          .map(
            (a) =>
              `<path d="M16 15.5c-3.6-2.2-5.5-5.4-4.4-8.6.6-1.8 2.4-2.7 3.6-1.8l.8.6.8-.6c1.2-.9 3 0 3.6 1.8 1.1 3.2-.8 6.4-4.4 8.6Z" transform="rotate(${a} 16 16)"/>`,
          )
          .join('') +
        '</g><circle cx="16" cy="16" r="3" fill="#f06595"/>' +
        '<g fill="#ffe066"><circle cx="16" cy="12.6" r=".9"/><circle cx="19.2" cy="15" r=".9"/><circle cx="18" cy="18.8" r=".9"/><circle cx="14" cy="18.8" r=".9"/><circle cx="12.8" cy="15" r=".9"/></g>',
    ),
  },
  {
    id: 'lotus',
    color: '#f06595',
    svg: svg(
      '<path d="M16 26c-6 .8-11.2-1.2-14-4.6 4.6-1.6 10-1 14 4.6Zm0 0c6 .8 11.2-1.2 14-4.6-4.6-1.6-10-1-14 4.6Z" fill="#40c057"/>' +
        '<path d="M16 25C10.4 24 6.2 19.6 5 13.8c5 .4 9.6 4.4 11 11.2Zm0 0c5.6-1 9.8-5.4 11-11.2-5 .4-9.6 4.4-11 11.2Z" fill="#faa2c1"/>' +
        '<path d="M16 5.5c3.6 4.4 4.4 10.4 0 19.5-4.4-9.1-3.6-15.1 0-19.5Z" fill="#f06595"/>',
    ),
  },
  {
    id: 'paw',
    color: '#ff8fab',
    svg: svg(
      '<g fill="#ff8fab"><path d="M16 15.5c3.8 0 8 4.6 8 8.4 0 2.7-2.4 3.6-4.3 3.1-1.4-.4-2.4-.9-3.7-.9s-2.3.5-3.7.9c-1.9.5-4.3-.4-4.3-3.1 0-3.8 4.2-8.4 8-8.4Z"/>' +
        '<ellipse cx="7.4" cy="13.6" rx="2.7" ry="3.4" transform="rotate(-24 7.4 13.6)"/><ellipse cx="12.4" cy="7.8" rx="2.8" ry="3.6" transform="rotate(-8 12.4 7.8)"/>' +
        '<ellipse cx="19.6" cy="7.8" rx="2.8" ry="3.6" transform="rotate(8 19.6 7.8)"/><ellipse cx="24.6" cy="13.6" rx="2.7" ry="3.4" transform="rotate(24 24.6 13.6)"/></g>',
    ),
  },
];

export const PROGRESS_ICON_IDS = PROGRESS_ICONS.map((i) => i.id);

export function progressIcon(id: string): ProgressIcon | undefined {
  return PROGRESS_ICONS.find((i) => i.id === id);
}

/** `data:image/svg+xml,…` (URL-encoded, for <img> and CSS). */
export function svgDataUrl(svgText: string): string {
  const data = svgText
    .replace(/"/g, "'")
    .replace(/[\r\n]+/g, ' ')
    .replace(/[%#<>?[\\\]^`{|}]/g, encodeURIComponent);
  return `data:image/svg+xml,${data}`;
}

/** `url("data:image/svg+xml,…")` for CSS. */
export const svgUrl = (svgText: string) => `url("${svgDataUrl(svgText)}")`;

/** An emoji drawn as an image (so it can sit on the bar like the drawings). */
export function emojiSvg(emoji: string): string {
  const safe = emoji.replace(/[<>&'"]/g, '');
  return svg(
    `<text x="16" y="17" font-size="26" text-anchor="middle" dominant-baseline="central" font-family="Apple Color Emoji,Segoe UI Emoji,Noto Color Emoji,sans-serif">${safe}</text>`,
  );
}

/** First grapheme of the text, if it contains an emoji (≤ 16 chars, so ZWJ sequences and flags fit). */
export function cleanEmoji(text: unknown): string | null {
  if (typeof text !== 'string') return null;
  const first = [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text.trim())][0]?.segment;
  if (!first || first.length > 16 || !/\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(first)) return null;
  return first;
}
