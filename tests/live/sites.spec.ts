/**
 * Checks against the real sites (network). Run by hand with `npm run test:live`
 * after a site redesign, never in CI. Signed out; YouTube's dark theme is
 * forced with its PREF cookie.
 */
import { expect, test } from '../e2e/fixtures';

const bg = (sel: string) => `getComputedStyle(document.querySelector('${sel}')).backgroundColor`;

test.describe.configure({ timeout: 90_000 });

test('YouTube search: theme, engine, logo and search box', async ({ context, setSettings }) => {
  await setSettings({ themeId: 'midnight-velvet', onboarded: true });
  const page = await context.newPage();
  await page.goto('https://www.youtube.com/results?search_query=lofi', { waitUntil: 'domcontentloaded' });
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor), { timeout: 20_000 })
    .toBe('rgb(13, 11, 30)');
  await expect
    .poll(() => page.evaluate(() => document.getElementById('auroreel-engine')?.textContent?.length ?? 0), {
      timeout: 20_000,
    })
    .toBeGreaterThan(2000);
  const logoFill = () =>
    page.evaluate(() => {
      const path = document.querySelector('#logo-icon path[fill="#FF0033"], #logo-icon path[fill="#FF0000"]');
      return path ? getComputedStyle(path).fill : 'missing';
    });
  await expect.poll(logoFill, { timeout: 20_000 }).toBe('rgb(139, 92, 246)');
  expect(await page.evaluate(bg('.ytSearchboxComponentSearchButton'))).not.toBe('rgb(248, 248, 248)');
});

test('YouTube watch page in its dark mode: readable buttons, no black ambient canvas', async ({
  context,
  setSettings,
}) => {
  await setSettings({ themeId: 'aurora', onboarded: true });
  await context.addCookies([{ name: 'PREF', value: 'f6=400&hl=en', domain: '.youtube.com', path: '/' }]);
  const page = await context.newPage();
  await page.goto('https://www.youtube.com/watch?v=dQw4w9WgXcQ', { waitUntil: 'domcontentloaded' });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.hasAttribute('dark')), { timeout: 20_000 })
    .toBe(true);
  const subscribe = page.locator('#subscribe-button button').first();
  await subscribe.waitFor({ timeout: 30_000 });
  await expect.poll(() => subscribe.evaluate((el) => getComputedStyle(el).color)).not.toBe('rgba(0, 0, 0, 0)');
  const cinematics = await page.evaluate(() => {
    const el = document.querySelector('#cinematics');
    return el ? getComputedStyle(el).display : 'none';
  });
  expect(cinematics).toBe('none');
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.querySelector('.ytp-play-progress')!).backgroundColor))
    .toBe('rgb(45, 212, 191)');
});

test('Twitch: palette tokens follow the theme', async ({ context, setSettings }) => {
  await setSettings({ themeId: 'latte', onboarded: true });
  const page = await context.newPage();
  await page.goto('https://www.twitch.tv/directory', { waitUntil: 'domcontentloaded' });
  await expect
    .poll(() => page.evaluate(() => document.getElementById('auroreel-engine')?.textContent?.length ?? 0), {
      timeout: 30_000,
    })
    .toBeGreaterThan(2000);
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.body).color), { timeout: 20_000 })
    .not.toBe('rgb(239, 239, 241)');
});

test('YouTube: default quality', async ({ context, setSettings }) => {
  await setSettings({ onboarded: true, sites: { youtube: { layout: { quality: '480' } } } });
  const page = await context.newPage();
  await page.goto('https://www.youtube.com/watch?v=dQw4w9WgXcQ', { waitUntil: 'domcontentloaded' });
  await page.locator('video').waitFor({ timeout: 30_000 });
  await page.evaluate(async () => {
    const v = document.querySelector('video')!;
    v.muted = true;
    await v.play().catch(() => undefined);
  });
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          (
            document.getElementById('movie_player') as unknown as { getPlaybackQuality?: () => string }
          )?.getPlaybackQuality?.(),
        ),
      { timeout: 20_000 },
    )
    .toBe('large');
});

test('YouTube: progress-bar knob, played colour and the always-on mini bar', async ({ context, setSettings }) => {
  await setSettings({
    onboarded: true,
    progress: { knob: 'rocket', motion: 'bounce', fill: 'custom', color: '#00ff00', mini: true },
  });
  const page = await context.newPage();
  await page.goto('https://www.youtube.com/watch?v=aqz-KE-bpKQ', { waitUntil: 'domcontentloaded' });
  await page.locator('video').waitFor({ timeout: 30_000 });
  await page.evaluate(async () => {
    const v = document.querySelector('video')!;
    v.muted = true;
    await v.play().catch(() => undefined);
  });
  const knob = () =>
    page.evaluate(() => {
      const k = document.querySelector('.html5-video-player .ytp-scrubber-button');
      return k ? getComputedStyle(k, '::before').backgroundImage : 'missing';
    });
  await expect.poll(knob, { timeout: 20_000 }).toMatch(/^url\("data:image\/svg\+xml,/);
  expect(
    await page.evaluate(() => getComputedStyle(document.querySelector('.ytp-play-progress')!).backgroundColor),
  ).toBe('rgb(0, 255, 0)');
  // YouTube hides its controls a few seconds after the pointer leaves; the mini bar takes over.
  await page.mouse.move(2, 2);
  await expect
    .poll(() => page.locator('auroreel-ui').locator('.mini').getAttribute('class'), { timeout: 20_000 })
    .toContain('show');
});

const STREAMING = [
  { name: 'Netflix (public title page)', url: 'https://www.netflix.com/title/80057281', min: 20_000 },
  { name: 'FPT Play', url: 'https://fptplay.vn/', min: 5_000 },
  // VieON keeps one stylesheet on a CDN without CORS: read through the service worker.
  { name: 'VieON', url: 'https://vieon.vn/', min: 20_000 },
  // Prime Video's stylesheets live on a CORS-enabled CDN.
  { name: 'Prime Video', url: 'https://www.primevideo.com/', min: 5_000 },
];

for (const site of STREAMING) {
  test(`${site.name}: hard-coded colours follow the theme`, async ({ context, setSettings }) => {
    await setSettings({ themeId: 'midnight-velvet', onboarded: true });
    const page = await context.newPage();
    await page.goto(site.url, { waitUntil: 'domcontentloaded' });
    await expect
      .poll(() => page.evaluate(() => document.getElementById('auroreel-engine')?.textContent?.length ?? 0), {
        timeout: 30_000,
      })
      .toBeGreaterThan(site.min);
    await expect
      .poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor), { timeout: 15_000 })
      .toBe('rgb(13, 11, 30)');
  });
}
