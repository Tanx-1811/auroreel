// Dev tool: loads the e2e build into Chrome for Testing, applies settings,
// opens a real page and saves a screenshot. Network required.
//   node scripts/live-shot.mjs <url> <out.png> [--theme=id] [--set='{"player":{...}}'] [--wait=8000] [--eval=js] [--headed]
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const [url, out] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);
const ext = resolve(import.meta.dirname, '..', arg('ext') ?? 'dist-e2e');
const context = await chromium.launchPersistentContext('', {
  channel: 'chromium',
  headless: !process.argv.includes('--headed'),
  viewport: { width: Number(arg('w') ?? 1440), height: Number(arg('h') ?? 900) },
  locale: arg('locale') ?? 'en-US',
  colorScheme: arg('scheme') ?? 'dark',
  args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
});
let [worker] = context.serviceWorkers();
worker ??= await context.waitForEvent('serviceworker');
// Close the welcome tab.
await new Promise((r) => setTimeout(r, 800));
for (const p of context.pages()) if (p.url().includes('welcome')) await p.close();
const patch = JSON.parse(arg('set') ?? '{}');
if (arg('theme')) patch.themeId = arg('theme');
await worker.evaluate(async (patch) => {
  const got = await chrome.storage.local.get('rs:settings');
  const merge = (a, b) => {
    if (!b || typeof b !== 'object' || Array.isArray(b)) return b;
    const o = { ...(a ?? {}) };
    for (const [k, v] of Object.entries(b)) o[k] = merge(o[k], v);
    return o;
  };
  await chrome.storage.local.set({ 'rs:settings': merge(got['rs:settings'] ?? {}, { onboarded: true, ...patch }) });
}, patch);
if (process.argv.includes('--yt-dark')) {
  // YouTube's own dark theme for signed-out visitors.
  await context.addCookies([{ name: 'PREF', value: 'f6=400&hl=en', domain: '.youtube.com', path: '/' }]);
}
const page = await context.newPage();
page.on('console', (m) => {
  if (m.type() === 'error' && /auroreel|content\.js/i.test(m.text())) console.log('console:', m.text());
});
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
await page.waitForTimeout(Number(arg('wait') ?? 8000));
if (arg('eval')) console.log(await page.evaluate(arg('eval')));
await page.screenshot({ path: out });
console.log('saved', out);
await context.close();
