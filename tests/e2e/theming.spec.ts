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
  await expect.poll(() => page.evaluate(() => document.getElementById('auroreel-main')?.textContent ?? '')).toBe('');
  await expect.poll(() => page.evaluate(() => document.getElementById('auroreel-engine')?.textContent ?? '')).toBe('');
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

test('streaming sites: literal colours, component tokens and oklch follow the theme', async ({ openSite }) => {
  const page = await openSite('stream.html', 'netflix');
  const style = (id: string, prop: 'backgroundColor' | 'color') =>
    page.evaluate(([id, prop]) => getComputedStyle(document.getElementById(id!)!)[prop as 'color'], [id, prop]);
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(13, 11, 30)');
  await expect.poll(() => style('cta', 'backgroundColor')).toBe('rgb(139, 92, 246)'); // brand red → accent
  await expect.poll(() => style('card', 'backgroundColor')).not.toBe('rgb(24, 24, 24)');
  await expect.poll(() => style('email', 'color')).toBe('rgb(236, 235, 255)'); // token on a component class
  await expect.poll(() => style('tw', 'backgroundColor')).not.toBe('rgb(23, 23, 23)'); // oklch() token
  // A rule that lost in the site's cascade still loses.
  expect(await style('label', 'color')).toBe('rgb(0, 200, 83)');
});

test('streaming sites show light themes as their dark counterpart', async ({ openSite, setSettings }) => {
  await setSettings({ themeId: 'paper' });
  const page = await openSite('stream.html', 'netflix');
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor))
    .not.toBe('rgb(20, 20, 20)');
  const lightness = await page.evaluate(() => {
    const m = /rgb\((\d+), (\d+), (\d+)\)/.exec(getComputedStyle(document.body).backgroundColor)!;
    return (Number(m[1]) + Number(m[2]) + Number(m[3])) / 3;
  });
  expect(lightness).toBeLessThan(60);
});
