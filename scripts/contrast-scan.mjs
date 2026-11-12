// Dev tool: loads the e2e build with a theme, opens real pages and lists text that is hard to
// read (contrast below 3:1 against what is behind it), in dark themes leftover light boxes, and
// fixed bars trapped inside a filtered/transformed element (they slide out of place).
//   node scripts/contrast-scan.mjs <url>... [--theme=sakura-night] [--scheme=light|dark] [--scroll] [--shots=dir]
// Run it after a site redesign or a theme change, in both schemes (sites switch look with the system).
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const urls = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);
if (!urls.length) {
  console.log(
    'usage: node scripts/contrast-scan.mjs <url>... [--theme=id] [--scheme=light|dark] [--scroll] [--shots=dir]',
  );
  process.exit(1);
}
const ext = resolve(import.meta.dirname, '..', 'dist-e2e');
const context = await chromium.launchPersistentContext('', {
  channel: 'chromium',
  headless: true,
  viewport: { width: 1500, height: 900 },
  locale: arg('locale') ?? 'vi-VN',
  colorScheme: arg('scheme') ?? 'light',
  args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
});
let [worker] = context.serviceWorkers();
worker ??= await context.waitForEvent('serviceworker');
await new Promise((r) => setTimeout(r, 800));
for (const p of context.pages()) if (p.url().includes('welcome')) await p.close();
await worker.evaluate(
  async (themeId) => {
    const got = await chrome.storage.local.get('rs:settings');
    await chrome.storage.local.set({ 'rs:settings': { ...(got['rs:settings'] ?? {}), onboarded: true, themeId } });
  },
  arg('theme') ?? 'sakura-night',
);

/** Runs in the page. */
const PROBE = `// Runs in the page: lists visible text whose colour barely differs from the background behind it.
(() => {
  const parse = (c) => { const m = c.match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const blend = (top, bot) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 });
  const bgOf = (el) => {
    const layers = [];
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage !== 'none' && !cs.backgroundImage.startsWith('linear-gradient')) return null; // over a picture
      if (n.tagName === 'IMG' || n.tagName === 'VIDEO') return null;
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0.02) { layers.push(c); if (c.a >= 0.98) break; }
    }
    let base = { r: 0, g: 0, b: 0, a: 1 };
    const root = parse(getComputedStyle(document.documentElement).backgroundColor);
    if (root && root.a > 0.5) base = root;
    for (let i = layers.length - 1; i >= 0; i--) base = blend(layers[i], base);
    return base;
  };
  const out = [];
  const seen = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    const s = t.textContent.trim();
    if (s.length < 2) continue;
    const el = t.parentElement;
    if (!el || seen.has(el)) continue;
    seen.add(el);
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility !== 'visible' || Number(cs.opacity) < 0.3) continue;
    const fg = parse(cs.color); const bg = bgOf(el);
    if (!fg || !bg) continue;
    const f = blend(fg, bg);
    const L1 = lum(f), L2 = lum(bg);
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    if (ratio < 3) {
      const path = []; for (let n = el; n && path.length < 4; n = n.parentElement) path.push(n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + (n.classList.length ? '.' + [...n.classList].slice(0, 2).join('.') : ''));
      out.push(\`\${ratio.toFixed(2)} "\${s.slice(0, 40)}" fg=\${cs.color} bg=rgb(\${[bg.r, bg.g, bg.b].map(Math.round)}) \${path.join(' < ')}\`);
    }
  }
  // Bright boxes: in a dark theme, any sizeable light-coloured box is a leftover of the site's light look.
  const pageL = lum(bgOf(document.body) ?? { r: 0, g: 0, b: 0 });
  if (pageL < 0.2) {
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.width * r.height < 1500 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
      if (el.closest('auroreel-ui,[data-auroreel]')) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility !== 'visible' || cs.display === 'none') continue;
      let op = 1; for (let n = el; n; n = n.parentElement) op *= Number(getComputedStyle(n).opacity);
      if (op < 0.3) continue;
      if (/touch-feedback|TouchFeedback|yt-interaction|product-item-image|author-comment-badge/i.test(el.className + ' ' + el.tagName + ' ' + (el.parentElement?.className ?? ''))) continue;
      for (const pse of [null, '::before']) {
        const c = parse((pse ? getComputedStyle(el, pse) : cs).backgroundColor);
        if (!c || c.a < 0.5) continue;
        const L = lum(c);
        if (L > 0.35) {
          const path = []; for (let n = el; n && path.length < 4; n = n.parentElement) path.push(n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + (n.classList.length ? '.' + [...n.classList].slice(0, 2).join('.') : ''));
          out.push(\`BRIGHT L=\${L.toFixed(2)} \${Math.round(r.width)}x\${Math.round(r.height)}@\${Math.round(r.x)},\${Math.round(r.y)} bg=\${(pse ? getComputedStyle(el, pse) : cs).backgroundColor}\${pse ?? ''} \${path.join(' < ')}\`);
        }
      }
    }
  }
  return out.slice(0, 40).join('\\n') || 'no low-contrast text';
})()`;

/**
 * Runs in the page: a backdrop-filter, filter or transform makes an element the containing block of its
 * position:fixed descendants — a sticky bar inside it slides away from the viewport edge (YouTube's chip bar did).
 */
const TRAPPED_FIXED = `(() => {
  const out = [];
  for (const el of document.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (cs.backdropFilter === 'none' && cs.filter === 'none' && cs.transform === 'none') continue;
    if (el.closest('auroreel-ui')) continue;
    const fixed = [...el.querySelectorAll('*')].find((d) => getComputedStyle(d).position === 'fixed');
    if (fixed) out.push('TRAPPED fixed ' + fixed.tagName.toLowerCase() + (fixed.id ? '#' + fixed.id : '') + ' inside ' + el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + '.' + [...el.classList].slice(0, 2).join('.'));
  }
  return out;
})()`;

const page = await context.newPage();
let problems = 0;
const scan = async (label) => {
  let report = await page.evaluate(PROBE).catch((e) => `scan failed: ${e.message}`);
  const trapped = await page.evaluate(TRAPPED_FIXED).catch(() => []);
  if (trapped.length) report = (report === 'no low-contrast text' ? '' : report + '\n') + trapped.join('\n');
  if (report !== 'no low-contrast text') problems += report.split('\n').length;
  console.log(`=== ${label}\n${report}`);
  if (arg('shots')) await page.screenshot({ path: resolve(arg('shots'), `${label.replace(/\W+/g, '_')}.png`) });
};
for (const url of urls) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(Number(arg('wait') ?? 9000));
  await scan(url);
  if (process.argv.includes('--scroll')) {
    await page.mouse.wheel(0, 1000);
    await page.waitForTimeout(2500);
    await scan(`${url} (scrolled)`);
  }
}
await context.close();
console.log(
  problems
    ? `${problems} finding(s) — check each in a screenshot; pictures and hidden text can be false alarms.`
    : 'clean',
);
