// Dev tool: screenshots of the extension's own pages (popup, studio).
//   node scripts/ui-shot.mjs <path e.g. options/options.html#/themes> <out.png> [--w=1440 --h=900] [--scheme=dark|light] [--lang=vi]
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const [path, out] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);
const ext = resolve(import.meta.dirname, '..', arg('ext') ?? 'dist-e2e');
const context = await chromium.launchPersistentContext('', {
  channel: 'chromium',
  headless: true,
  viewport: { width: Number(arg('w') ?? 1440), height: Number(arg('h') ?? 900) },
  colorScheme: arg('scheme') ?? 'dark',
  args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
});
let [worker] = context.serviceWorkers();
worker ??= await context.waitForEvent('serviceworker');
const id = new URL(worker.url()).host;
await new Promise((r) => setTimeout(r, 600));
await worker.evaluate(
  async (lang) => {
    const got = await chrome.storage.local.get('rs:settings');
    await chrome.storage.local.set({
      'rs:settings': { ...(got['rs:settings'] ?? {}), onboarded: true, language: lang },
    });
  },
  arg('lang') ?? 'vi',
);
const page = await context.newPage();
page.on('pageerror', (e) => console.log('pageerror:', e.message));
page.on('console', (m) => m.type() === 'error' && console.log('console:', m.text()));
await page.goto(`chrome-extension://${id}/${path}`);
await page.waitForTimeout(Number(arg('wait') ?? 1200));
await page.screenshot({ path: out, fullPage: process.argv.includes('--full') });
console.log('saved', out);
await context.close();
