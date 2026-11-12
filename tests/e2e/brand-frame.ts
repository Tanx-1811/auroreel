// HTML frames for the store screenshots: a caption band in the brand fonts above a
// browser-like window holding a real capture (base64 PNG), plus an optional overlay.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '../..');
const RANGES = {
  latin:
    'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
  vietnamese:
    'U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB',
};

const font = (pkg: string, file: string) =>
  readFileSync(join(ROOT, 'node_modules/@fontsource', pkg, 'files', file)).toString('base64');

let faces = '';
function fontFaces(): string {
  if (faces) return faces;
  for (const subset of ['latin', 'vietnamese'] as const) {
    faces += `@font-face{font-family:"Fraunces";font-style:italic;font-weight:600;src:url(data:font/woff2;base64,${font(
      'fraunces',
      `fraunces-${subset}-600-italic.woff2`,
    )}) format("woff2");unicode-range:${RANGES[subset]}}`;
    for (const w of [400, 600]) {
      faces += `@font-face{font-family:"Be Vietnam Pro";font-weight:${w};src:url(data:font/woff2;base64,${font(
        'be-vietnam-pro',
        `be-vietnam-pro-${subset}-${w}-normal.woff2`,
      )}) format("woff2");unicode-range:${RANGES[subset]}}`;
    }
  }
  return faces;
}

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

export interface FrameInput {
  lang: 'en' | 'vi';
  title: string;
  /** Words of the title drawn in the brand accent. */
  highlight?: string;
  subtitle: string;
  /** Text in the window's address pill. */
  address: string;
  /** Main capture, base64 PNG (1440 × 900). */
  shot: string;
  /** A second capture floating on the right (e.g. the popup), base64 PNG. */
  overlay?: { png: string; width: number; height: number };
}

export function frameHtml(f: FrameInput): string {
  let title = escape(f.title);
  if (f.highlight) title = title.replace(escape(f.highlight), `<span class="grad">${escape(f.highlight)}</span>`);
  return `<!doctype html><html lang="${f.lang}"><head><meta charset="utf-8"><style>
${fontFaces()}
*{box-sizing:border-box}
html,body{margin:0;width:1280px;height:800px;overflow:hidden}
body{position:relative;color:#f4f2ff;font:400 16px/1.4 "Be Vietnam Pro",system-ui,sans-serif;-webkit-font-smoothing:antialiased;
background:#0b0a12}
.cap{position:absolute;left:72px;top:40px;width:${f.overlay ? 720 : 1080}px}
h1{margin:0;font-family:"Fraunces",Georgia,serif;font-style:italic;font-weight:600;font-size:${f.overlay ? 40 : 44}px;line-height:1.1;letter-spacing:-.015em}
p{margin:10px 0 0;font-size:${f.overlay ? 17 : 18}px;line-height:1.45;color:#c9c4de}
.grad{color:#e879f9}
.win{position:absolute;left:72px;top:184px;width:1136px;border-radius:16px;overflow:hidden;background:#15131f;
box-shadow:0 0 0 1px rgba(255,255,255,.12),0 30px 80px rgba(0,0,0,.6)}
.bar{display:flex;align-items:center;gap:8px;height:36px;padding:0 14px;background:#1b1828;border-bottom:1px solid rgba(255,255,255,.06)}
.bar i{width:11px;height:11px;border-radius:50%;background:#ff5f57}.bar i:nth-child(2){background:#febc2e}.bar i:nth-child(3){background:#28c840}
.addr{margin-left:18px;flex:0 1 420px;height:22px;border-radius:7px;background:rgba(255,255,255,.07);color:#a9a4c0;font-size:12px;display:flex;align-items:center;padding:0 10px}
.win img{display:block;width:1136px}
.ov{position:absolute;right:56px;top:96px;border-radius:16px;overflow:hidden;box-shadow:0 0 0 1px rgba(255,255,255,.16),0 40px 90px rgba(0,0,0,.7),0 10px 30px rgba(0,0,0,.5)}
.ov img{display:block}
</style></head><body>
<div class="cap"><h1>${title}</h1><p>${escape(f.subtitle)}</p></div>
<div class="win"><div class="bar"><i></i><i></i><i></i><span class="addr">${escape(f.address)}</span></div><img src="data:image/png;base64,${f.shot}" alt=""></div>
${f.overlay ? `<div class="ov"><img src="data:image/png;base64,${f.overlay.png}" width="${f.overlay.width}" height="${f.overlay.height}" alt=""></div>` : ''}
</body></html>`;
}

/** A made-up landscape picture (for "theme from a picture"), as HTML. */
export const PICTURE_HTML = `<!doctype html><html><body style="margin:0;width:1600px;height:1000px;overflow:hidden;position:relative;
background:linear-gradient(180deg,#1e1b4b 0%,#6d28d9 28%,#db2777 52%,#fb923c 68%,#fde68a 74%)">
<div style="position:absolute;left:980px;top:520px;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle,#fff7d6 0 40%,#fde68a 60%,rgba(253,230,138,0) 72%)"></div>
<div style="position:absolute;inset:0;background:#2e1065;clip-path:polygon(0 72%,14% 52%,26% 66%,40% 44%,55% 64%,68% 50%,82% 66%,100% 48%,100% 100%,0 100%)"></div>
<div style="position:absolute;inset:0;background:#1e0b3a;clip-path:polygon(0 82%,18% 66%,34% 78%,50% 62%,66% 80%,84% 68%,100% 80%,100% 100%,0 100%)"></div>
<div style="position:absolute;left:0;right:0;top:84%;bottom:0;background:linear-gradient(180deg,#7c2d12,#0f0a1e)"></div>
<div style="position:absolute;left:1030px;top:86%;width:120px;height:6px;border-radius:3px;background:#fde68a;opacity:.7;box-shadow:0 18px 0 -1px rgba(253,230,138,.5),0 36px 0 -2px rgba(253,230,138,.3)"></div>
</body></html>`;
