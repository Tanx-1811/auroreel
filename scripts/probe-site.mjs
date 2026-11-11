// Maintenance tool: opens a real site in Chrome for Testing and prints the CSS
// custom properties its root defines plus a census of the elements that the
// adapters in src/content/platforms/ target. Use it when a site changes.
//   node scripts/probe-site.mjs https://www.youtube.com [--prefix=--yt-spec] [--sel=css,...] [--shot=file.png]
import { chromium } from '@playwright/test';

const url = process.argv[2] ?? 'https://www.youtube.com';
const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const prefix = arg('prefix') ?? '--';
const selectors = (arg('sel') ?? '').split(',').filter(Boolean);
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'en-US', colorScheme: 'dark' });
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
await page.waitForTimeout(Number(arg('wait') ?? 6000));
const out = await page.evaluate(
  ({ prefix, selectors }) => {
    const vars = {};
    for (const sheet of document.styleSheets) {
      let rules;
      try {
        rules = sheet.cssRules;
      } catch {
        continue;
      }
      const walk = (list) => {
        for (const r of list) {
          if (r.cssRules) walk(r.cssRules);
          if (!r.style) continue;
          for (const p of r.style) if (p.startsWith(prefix)) (vars[p] ??= new Set()).add(r.selectorText);
        }
      };
      walk(rules);
    }
    const cs = getComputedStyle(document.documentElement);
    const computed = Object.fromEntries(Object.keys(vars).map((k) => [k, cs.getPropertyValue(k).trim()]));
    const census = Object.fromEntries(selectors.map((s) => [s, document.querySelectorAll(s).length]));
    return {
      htmlAttrs: [...document.documentElement.attributes].map((a) => `${a.name}=${a.value.slice(0, 60)}`),
      bodyClass: document.body.className.slice(0, 200),
      computed,
      census,
    };
  },
  { prefix, selectors },
);
console.log(JSON.stringify(out, null, 1));
if (arg('shot')) await page.screenshot({ path: arg('shot') });
await browser.close();
