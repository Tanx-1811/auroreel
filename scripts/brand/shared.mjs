// Shared pieces of Auroreel's brand images: fonts, colours, copy, the mark and
// the theme preview cards (the same drawing as the extension's .tp previews).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatColor } from '../../src/core/color.ts';
import { backdropLayers, glassOpacity } from '../../src/core/css/common.ts';
import { BUILT_IN_THEMES, resolvePalette } from '../../src/core/themes.ts';

export const ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const NAME = 'Auroreel';

/** Brand colours (the UI tokens in src/styles/ui.css). */
export const PALETTE = {
  night: '#0b0a12',
  night2: '#110f1b',
  panel: '#151320',
  text: '#f4f2ff',
  muted: '#aaa5c2',
  ink: '#18142b',
  violet: '#8b5cf6',
  magenta: '#d946ef',
  orange: '#f97316',
  pink: '#ec4899',
};

export const COPY = {
  en: {
    headline: 'Make every screen your cinema.',
    subtitle: 'Themes, ambient light and cinema mode for YouTube, Twitch and streaming sites.',
    chips: ['24 themes', 'Theme from a photo', 'Ambient light', 'Cinema mode'],
  },
  vi: {
    headline: 'Biến mọi màn hình thành rạp phim.',
    subtitle: 'Chủ đề, ánh sáng nền và chế độ rạp cho YouTube, Twitch và các web xem phim.',
    chips: ['24 chủ đề', 'Chủ đề từ ảnh', 'Ánh sáng nền', 'Chế độ rạp'],
  },
};

const fontFile = (pkg, file) =>
  readFileSync(join(ROOT, 'node_modules/@fontsource', pkg, 'files', file)).toString('base64');

const RANGES = {
  latin:
    'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
  vietnamese:
    'U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB',
};

let fontCache = '';
/** @font-face rules with the brand fonts embedded (works offline). */
export function fontFaces() {
  if (fontCache) return fontCache;
  let css = '';
  for (const subset of ['latin', 'vietnamese']) {
    css += `@font-face{font-family:"Fraunces";font-style:italic;font-weight:600;src:url(data:font/woff2;base64,${fontFile(
      'fraunces',
      `fraunces-${subset}-600-italic.woff2`,
    )}) format("woff2");unicode-range:${RANGES[subset]}}`;
    for (const w of [400, 500, 600, 700]) {
      css += `@font-face{font-family:"Be Vietnam Pro";font-style:normal;font-weight:${w};src:url(data:font/woff2;base64,${fontFile(
        'be-vietnam-pro',
        `be-vietnam-pro-${subset}-${w}-normal.woff2`,
      )}) format("woff2");unicode-range:${RANGES[subset]}}`;
    }
  }
  fontCache = css;
  return css;
}

export const MARK_SVG = readFileSync(join(ROOT, 'assets/icon.svg'), 'utf8');
export const svgDataUri = (svg) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

/** The .tp* preview rules, taken straight from the extension's stylesheet. */
export function previewCss() {
  const ui = readFileSync(join(ROOT, 'src/styles/ui.css'), 'utf8');
  const start = ui.indexOf('/* ——— Theme preview');
  const end = ui.indexOf('/* ——— Toast');
  if (start < 0 || end < 0) throw new Error('Theme preview CSS not found in src/styles/ui.css');
  return ui.slice(start, end);
}

/** Stand-ins for thumbnails, as in src/ui/ThemePreview.tsx. */
export const SCENES = [
  'radial-gradient(120% 90% at 20% 110%,#ffb36b 0%,#ff6f61 35%,#6b3fa0 70%,#1d1b4b 100%)',
  'linear-gradient(160deg,#0f4c75 0%,#3282b8 45%,#bbe1fa 100%)',
  'radial-gradient(90% 90% at 70% 30%,#c4f1be 0%,#4caf50 40%,#1b4332 100%)',
  'linear-gradient(135deg,#232526 0%,#414345 50%,#e0c3fc 100%)',
  'radial-gradient(100% 80% at 30% 20%,#fddb92 0%,#d1913c 45%,#4a2c2a 100%)',
  'linear-gradient(200deg,#ff9a9e 0%,#fad0c4 40%,#a18cd1 100%)',
];

export const theme = (id) => {
  const t = BUILT_IN_THEMES.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown theme ${id}`);
  return t;
};

/** CSS variables of a theme for the preview drawing (same as previewStyle()). */
export function previewVars(t) {
  const p = resolvePalette(t);
  const layers = backdropLayers(t, p);
  const glass = glassOpacity(t);
  return [
    `--p-bg:${formatColor(p.bg)}`,
    `--p-surface:${formatColor(p.surface)}`,
    `--p-text:${formatColor(p.text)}`,
    `--p-muted:${formatColor(p.muted)}`,
    `--p-accent:${formatColor(p.accent)}`,
    `--p-accent-text:${formatColor(p.accentText)}`,
    `--p-link:${formatColor(p.link)}`,
    `--p-border:${formatColor(p.border)}`,
    `--p-radius:${t.radius}px`,
    `--p-radius-sm:${Math.max(2, Math.round(t.radius * 0.6))}px`,
    `--p-glass:${glass}%`,
    `--p-glass-surface:${Math.min(100, glass + 15)}%`,
    `--p-backdrop:${layers.background ?? 'none'}`,
    `--p-blur:${Math.round(layers.blur / 3)}px`,
    `--p-veil:${layers.veil}%`,
  ].join(';');
}

/** A mini theme preview (MiniPreview), framed as a floating card with the theme's name. */
export function previewCard(id, { lang = 'en', label = true } = {}) {
  const t = theme(id);
  const name = lang === 'vi' && t.nameVi ? t.nameVi : t.name;
  const cards = SCENES.map(
    (scene, i) =>
      `<div class="tp-card"><div class="tp-thumb" style="--thumb:${scene}">${
        i % 2 === 0 ? `<b style="--w:${30 + i * 10}%"></b>` : ''
      }</div><div class="tp-line"></div><div class="tp-line short"></div></div>`,
  ).join('');
  return `<figure class="card"><div class="tp" style="${previewVars(t)}"><div class="tp-backdrop"></div><div class="tp-veil"></div>
<div class="tp-top"><span class="tp-logo"></span><span class="tp-search"></span><span class="tp-avatar"></span></div>
<div class="tp-body"><div class="tp-side"><i></i><i></i><i></i><i></i></div><div class="tp-grid">${cards}</div></div></div>${
    label ? `<figcaption><span class="dot" style="background:${t.colors.accent}"></span>${name}</figcaption>` : ''
  }</figure>`;
}

/** The mark next to the wordmark. `size` is the mark's height in px. */
export function lockupHtml({ size = 48, color = PALETTE.text } = {}) {
  return `<span class="lockup" style="--s:${size}px;color:${color}"><img src="${svgDataUri(MARK_SVG)}" alt=""><span class="word">${NAME}</span></span>`;
}

/** Night background with the brand's gradient glows. */
export const nightBackground = (strength = 1) =>
  `radial-gradient(60% 80% at 0% 0%,rgba(139,92,246,${0.42 * strength}),transparent 70%),` +
  `radial-gradient(55% 75% at 78% 18%,rgba(217,70,239,${0.3 * strength}),transparent 70%),` +
  `radial-gradient(60% 70% at 100% 100%,rgba(249,115,22,${0.28 * strength}),transparent 70%),${PALETTE.night}`;

/** A complete HTML document of the given size. */
export function page({ width, height, css = '', body, lang = 'en', background = nightBackground() }) {
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><style>
${fontFaces()}
*{box-sizing:border-box}
html,body{margin:0;width:${width}px;height:${height}px;overflow:hidden}
body{position:relative;background:${background};color:${PALETTE.text};font:400 16px/1.4 "Be Vietnam Pro",system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.display{font-family:"Fraunces",Georgia,serif;font-style:italic;font-weight:600;letter-spacing:-0.015em}
.lockup{display:inline-flex;align-items:center;gap:calc(var(--s)*0.3);height:var(--s)}
.lockup img{width:var(--s);height:var(--s);display:block}
.lockup .word{font-family:"Fraunces",Georgia,serif;font-style:italic;font-weight:600;font-size:calc(var(--s)*0.74);line-height:1;letter-spacing:-0.01em;padding-right:calc(var(--s)*0.08)}
.grad{background:linear-gradient(120deg,${PALETTE.violet},${PALETTE.magenta} 55%,${PALETTE.orange});-webkit-background-clip:text;background-clip:text;color:transparent}
.card{position:absolute;margin:0;transform-origin:50% 100%}
.card .tp{border-radius:14px;box-shadow:0 0 0 1px rgba(255,255,255,.14),0 24px 60px rgba(0,0,0,.55),0 6px 18px rgba(0,0,0,.4)}
.card figcaption{display:flex;align-items:center;gap:8px;margin-top:10px;font-weight:600;font-size:15px;color:${PALETTE.text};text-shadow:0 2px 8px rgba(0,0,0,.5)}
.card .dot{width:9px;height:9px;border-radius:50%;box-shadow:0 0 10px currentColor}
.chips{display:flex;flex-wrap:wrap;gap:10px}
.chips span{display:inline-flex;align-items:center;height:36px;padding:0 16px;border-radius:999px;background:rgba(255,255,255,.07);box-shadow:inset 0 0 0 1px rgba(255,255,255,.14);font-weight:600;font-size:15px;color:${PALETTE.text}}
${previewCss()}
${css}
</style></head><body>${body}</body></html>`;
}

/** A fan of preview cards. `items`: [themeId, x, y, width, rotateDeg, z]. */
export function fan(items, lang) {
  return items
    .map(([id, x, y, w, rot, z = 1]) =>
      previewCard(id, { lang }).replace(
        '<figure class="card">',
        `<figure class="card" style="left:${x}px;top:${y}px;width:${w}px;transform:rotate(${rot}deg);z-index:${z}">`,
      ),
    )
    .join('');
}
