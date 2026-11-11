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
    .poll(() => page.evaluate(() => document.getElementById('reelskin-engine')?.textContent?.length ?? 0), {
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
    .poll(() => page.evaluate(() => document.getElementById('reelskin-engine')?.textContent?.length ?? 0), {
      timeout: 30_000,
    })
    .toBeGreaterThan(2000);
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.body).color), { timeout: 20_000 })
    .not.toBe('rgb(239, 239, 241)');
});
