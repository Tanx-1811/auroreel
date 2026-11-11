#!/usr/bin/env node
// Regenerates Reelskin's brand kit into brand/ (npm run brand). Fully offline:
// the mark is rendered with resvg; compositions (lockups, promo tiles, social
// images) with Playwright's Chromium and the brand fonts embedded from
// @fontsource. Theme previews use the real theme data from src/core.
//
//   node scripts/brand/render.mjs            # everything
//   node scripts/brand/render.mjs --only promo-small
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { chromium } from '@playwright/test';
import { Resvg } from '@resvg/resvg-js';
import { COPY, fan, lockupHtml, MARK_SVG, nightBackground, page, PALETTE, ROOT } from './shared.mjs';

const BRAND = join(ROOT, 'brand');
const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const written = [];

async function write(path, data) {
  const file = join(BRAND, path);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, data);
  written.push({ file, expect: null });
  return file;
}

function pngSize(buffer) {
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

const svgPng = (svg, width) => new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng();

/** The mark with transparent padding: 96 px of art centred in 128 px, as the Web Store asks. */
function paddedMark(size, art) {
  const pad = ((size - art) / 2) * (64 / art);
  const box = 64 + pad * 2;
  return MARK_SVG.replace(
    /width="\d+" height="\d+" viewBox="[^"]+"/,
    `width="${size}" height="${size}" viewBox="${-pad} ${-pad} ${box} ${box}"`,
  );
}

// ——— Compositions ———

const TEMPLATES = {
  'promo-small': {
    width: 440,
    height: 280,
    outputs: { en: 'store/promo-small-440x280.png', vi: 'store/promo-small-440x280-vi.png' },
    html: (lang) =>
      page({
        width: 440,
        height: 280,
        lang,
        css: `.l{position:absolute;left:26px;top:24px}
.h{position:absolute;left:26px;top:74px;width:230px;margin:0;font-size:${lang === 'vi' ? 25 : 27}px;line-height:1.12}`,
        body: `<div class="l">${lockupHtml({ size: 30 })}</div>
<h1 class="h display">${COPY[lang].headline.replace(/(cinema|rạp phim)/, '<span class="grad">$1</span>')}</h1>
${fan(
  [
    ['aurora', 236, 128, 190, -14, 1],
    ['crimson-theatre', 262, 96, 190, -4, 2],
    ['midnight-velvet', 290, 70, 190, 7, 3],
  ],
  lang,
).replace(/<figcaption>.*?<\/figcaption>/g, '')}`,
      }),
  },
  'promo-marquee': {
    width: 1400,
    height: 560,
    outputs: { en: 'store/promo-marquee-1400x560.png', vi: 'store/promo-marquee-1400x560-vi.png' },
    html: (lang) =>
      page({
        width: 1400,
        height: 560,
        lang,
        css: `.left{position:absolute;left:92px;top:86px;width:600px}
.h{margin:44px 0 18px;font-size:${lang === 'vi' ? 58 : 62}px;line-height:1.06}
.sub{margin:0 0 28px;font-size:21px;line-height:1.5;color:${PALETTE.muted};max-width:540px}`,
        body: `<div class="left">${lockupHtml({ size: 54 })}
<h1 class="h display">${COPY[lang].headline.replace(/(cinema|rạp phim)/, '<span class="grad">$1</span>')}</h1>
<p class="sub">${COPY[lang].subtitle}</p>
<div class="chips">${COPY[lang].chips.map((c) => `<span>${c}</span>`).join('')}</div></div>
${fan(
  [
    ['paper', 700, 214, 300, -13, 1],
    ['aurora', 806, 142, 320, -6, 2],
    ['midnight-velvet', 948, 92, 340, 2, 4],
    ['crimson-theatre', 1070, 160, 290, 10, 3],
  ],
  lang,
)}`,
      }),
  },
  'github-social': {
    width: 1280,
    height: 640,
    outputs: { en: 'social/github-social-1280x640.png' },
    html: (lang) =>
      page({
        width: 1280,
        height: 640,
        lang,
        css: `.left{position:absolute;left:80px;top:96px;width:520px}
.h{margin:48px 0 18px;font-size:58px;line-height:1.06}
.sub{margin:0 0 28px;font-size:20px;line-height:1.5;color:${PALETTE.muted};max-width:470px}`,
        body: `<div class="left">${lockupHtml({ size: 56 })}
<h1 class="h display">${COPY[lang].headline.replace(/(cinema)/, '<span class="grad">$1</span>')}</h1>
<p class="sub">${COPY[lang].subtitle}</p>
<div class="chips">${COPY[lang].chips.map((c) => `<span>${c}</span>`).join('')}</div></div>
${fan(
  [
    ['mint-breeze', 660, 300, 270, -12, 1],
    ['neon-drive', 750, 206, 290, -5, 2],
    ['midnight-velvet', 870, 140, 320, 3, 4],
    ['ember', 1010, 236, 270, 11, 3],
  ],
  lang,
)}`,
      }),
  },
  'readme-banner': {
    width: 1600,
    height: 500,
    outputs: { en: 'social/readme-banner-1600x500.png' },
    html: (lang) =>
      page({
        width: 1600,
        height: 500,
        lang,
        css: `.left{position:absolute;left:96px;top:92px;width:580px}
.h{margin:38px 0 16px;font-size:58px;line-height:1.06}
.sub{margin:0;font-size:21px;line-height:1.5;color:${PALETTE.muted}}`,
        body: `<div class="left">${lockupHtml({ size: 52 })}
<h1 class="h display">${COPY[lang].headline.replace(/(cinema)/, '<span class="grad">$1</span>')}</h1>
<p class="sub">${COPY[lang].subtitle}</p></div>
${fan(
  [
    ['lilac', 800, 190, 280, -10, 1],
    ['aurora', 930, 120, 300, -4, 2],
    ['midnight-velvet', 1080, 80, 320, 3, 4],
    ['sakura-night', 1250, 140, 290, 9, 3],
  ],
  lang,
)}`,
      }),
  },
};

const LOCKUPS = [
  { out: 'logo/lockup-light.png', color: PALETTE.text, background: 'transparent' },
  { out: 'logo/lockup-dark.png', color: PALETTE.ink, background: 'transparent' },
  { out: 'logo/lockup-on-night.png', color: PALETTE.text, background: nightBackground(1.2), padded: true },
];

async function main() {
  const browser = await chromium.launch({ channel: 'chromium', headless: true });
  const checks = [];
  const expectSize = (file, width, height) => checks.push({ file, width, height });

  if (!only || only === 'logo') {
    await mkdir(join(BRAND, 'logo'), { recursive: true });
    await copyFile(join(ROOT, 'assets/icon.svg'), join(BRAND, 'logo/mark.svg'));
    written.push({ file: join(BRAND, 'logo/mark.svg') });
    for (const size of [512, 1024]) {
      expectSize(await write(`logo/mark-${size}.png`, svgPng(MARK_SVG, size)), size, size);
    }
    expectSize(await write('store/store-icon-128.png', svgPng(paddedMark(128, 96), 128)), 128, 128);

    const ctx = await browser.newContext({ deviceScaleFactor: 2 });
    const p = await ctx.newPage();
    for (const l of LOCKUPS) {
      const w = 600;
      const h = l.padded ? 240 : 120;
      await p.setViewportSize({ width: w, height: h });
      await p.setContent(
        page({
          width: w,
          height: h,
          background: l.background,
          css: `body{display:flex;align-items:center;justify-content:${l.padded ? 'center' : 'flex-start'}}#x{display:inline-flex;padding:${
            l.padded ? '0' : '4px'
          }}`,
          body: `<span id="x">${lockupHtml({ size: 72, color: l.color })}</span>`,
        }),
      );
      await p.evaluate(() => document.fonts.ready);
      const target = l.padded ? p : p.locator('#x');
      const png = await target.screenshot({ omitBackground: !l.padded, type: 'png' });
      const file = await write(l.out, png);
      if (l.padded) expectSize(file, w * 2, h * 2);
    }
    await ctx.close();
  }

  for (const [name, tpl] of Object.entries(TEMPLATES)) {
    if (only && only !== name) continue;
    const ctx = await browser.newContext({ viewport: { width: tpl.width, height: tpl.height }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    for (const [lang, out] of Object.entries(tpl.outputs)) {
      await p.setContent(tpl.html(lang));
      await p.evaluate(() => document.fonts.ready);
      const png = await p.screenshot({ type: 'png' });
      expectSize(await write(out, png), tpl.width, tpl.height);
    }
    await ctx.close();
  }
  await browser.close();

  // Every PNG must have the size the Web Store / GitHub expects.
  const { readFile } = await import('node:fs/promises');
  let bad = 0;
  for (const c of checks) {
    const size = pngSize(await readFile(c.file));
    const ok = size.width === c.width && size.height === c.height;
    if (!ok) bad++;
    console.log(
      `${ok ? '✓' : '✗'} ${relative(ROOT, c.file)}  ${size.width}×${size.height}${ok ? '' : `  (expected ${c.width}×${c.height})`}`,
    );
  }
  for (const w of written) {
    if (!checks.some((c) => c.file === w.file)) {
      const isPng = w.file.endsWith('.png');
      const size = isPng ? pngSize(await readFile(w.file)) : null;
      console.log(`· ${relative(ROOT, w.file)}${size ? `  ${size.width}×${size.height}` : ''}`);
    }
  }
  if (bad) {
    console.error(`${bad} image(s) have the wrong size.`);
    process.exit(1);
  }
}

await main();
