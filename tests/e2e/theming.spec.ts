import { expect, test } from './fixtures';

const cssVar = (name: string) => `getComputedStyle(document.documentElement).getPropertyValue('${name}').trim()`;

test('recolours a site’s palette with the active theme', async ({ openSite }) => {
  const page = await openSite('tube.html', 'youtube');
  await expect.poll(() => page.evaluate(cssVar('--rs-bg'))).toBe('#0d0b1e');
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor))
    .toBe('rgb(13, 11, 30)');
  // Fixed overrides and the engine: the page background lets the backdrop through,
  // a hashed token used as a chip background and another used as its text are recoloured.
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.querySelector('ytd-app')!).backgroundColor))
    .toBe('rgba(0, 0, 0, 0)');
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.getElementById('chip')!).backgroundColor))
    .not.toBe('rgb(39, 39, 39)');
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.getElementById('chip')!).color))
    .not.toBe('rgb(241, 241, 241)');
  const backdrop = await page.evaluate(() => getComputedStyle(document.documentElement, '::before').backgroundImage);
  expect(backdrop).toContain('radial-gradient');
});

test('follows setting changes live in open tabs', async ({ openSite, setSettings }) => {
  const page = await openSite('tube.html', 'youtube');
  await expect.poll(() => page.evaluate(cssVar('--rs-bg'))).toBe('#0d0b1e');
  await setSettings({ themeId: 'paper' });
  await expect.poll(() => page.evaluate(cssVar('--rs-bg'))).toBe('#f7f4ee');
  await setSettings({ themeId: 'none' });
  await expect.poll(() => page.evaluate(cssVar('--rs-bg'))).toBe('');
  // Site colours are back.
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.getElementById('chip')!).backgroundColor))
    .toBe('rgb(39, 39, 39)');
});

test('a site can be switched off, and Alt+T pauses one tab', async ({ openSite, setSettings }) => {
  const page = await openSite('tube.html', 'youtube');
  await expect.poll(() => page.evaluate(cssVar('--rs-bg'))).toBe('#0d0b1e');
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('Alt+KeyT');
  await expect.poll(() => page.evaluate(cssVar('--rs-bg'))).toBe('');
  await page.keyboard.press('Alt+KeyT');
  await expect.poll(() => page.evaluate(cssVar('--rs-bg'))).toBe('#0d0b1e');
  await setSettings({ sites: { youtube: { enabled: false } } });
  await expect.poll(() => page.evaluate(() => document.getElementById('reelskin-main')?.textContent ?? '')).toBe('');
  await expect.poll(() => page.evaluate(() => document.getElementById('reelskin-engine')?.textContent ?? '')).toBe('');
});

test('layout options hide parts of the page, with or without a theme', async ({ openSite, setSettings }) => {
  await setSettings({ themeId: 'none', sites: { youtube: { layout: { hideComments: true } } } });
  const page = await openSite('tube.html', 'youtube');
  await expect(page.locator('#comments')).toBeHidden();
  await setSettings({ sites: { youtube: { layout: { hideComments: false } } } });
  await expect(page.locator('#comments')).toBeVisible();
});

test('a site’s own theme wins over the global one', async ({ openSite, setSettings }) => {
  await setSettings({ themeId: 'paper', sites: { youtube: { themeId: 'ember' } } });
  const page = await openSite('tube.html', 'youtube');
  await expect.poll(() => page.evaluate(cssVar('--rs-bg'))).toBe('#140d0a');
});

test('basic sites get the background but no backdrop', async ({ openSite }) => {
  const page = await openSite('tube.html', 'netflix');
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor))
    .toBe('rgb(13, 11, 30)');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement, '::before').content)).toBe('none');
});

test('other sites are left alone (player tools only)', async ({ openSite }) => {
  const page = await openSite('plain.html');
  await page.waitForTimeout(500);
  expect(await page.evaluate(cssVar('--rs-bg'))).toBe('');
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(250, 250, 250)');
});
