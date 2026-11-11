import type { Page } from '@playwright/test';
import { expect, playVideo, test } from './fixtures';

const rate = (page: Page) => page.evaluate(() => document.querySelector('video')!.playbackRate);
const ui = (page: Page) => page.locator('reelskin-ui');

async function hoverVideo(page: Page) {
  const box = (await page.locator('video').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.move(box.x + box.width / 2 + 10, box.y + box.height / 2 + 5);
}

test('toolbar appears over the video and changes speed', async ({ openSite }) => {
  const page = await openSite('tube.html', 'youtube');
  await playVideo(page);
  await hoverVideo(page);
  const bar = ui(page).locator('.bar');
  await expect(bar).toHaveClass(/show/);
  await bar.locator('button[data-id="faster"]').click();
  expect(await rate(page)).toBe(1.25);
  await expect(bar.locator('button[data-id="speed"]')).toHaveText('1.25×');
  await bar.locator('button[data-id="speed"]').click();
  expect(await rate(page)).toBe(1);
});

test('keyboard shortcuts work, but not while typing', async ({ openSite }) => {
  const page = await openSite('tube.html', 'youtube');
  await playVideo(page);
  await page.locator('#title').click();
  await page.keyboard.press('KeyD');
  await page.keyboard.press('KeyD');
  expect(await rate(page)).toBe(1.5);
  await page.keyboard.press('KeyS');
  expect(await rate(page)).toBe(1.25);
  await page.keyboard.press('KeyR');
  expect(await rate(page)).toBe(1);
  await page.locator('#comment-box').click();
  await page.keyboard.type('dd');
  expect(await rate(page)).toBe(1);
  await expect(page.locator('#comment-box')).toHaveValue('dd');
});

test('cinema mode dims the page around the video and leaves with Esc', async ({ openSite }) => {
  const page = await openSite('tube.html', 'youtube');
  await playVideo(page);
  await page.locator('#title').click();
  await page.keyboard.press('Alt+KeyC');
  const overlay = page.locator('div[data-reelskin="cinema"]');
  await expect(overlay).toBeAttached();
  await expect.poll(() => overlay.evaluate((el) => getComputedStyle(el).opacity)).toBe('0.88');
  expect(await overlay.evaluate((el) => el.style.clipPath)).toContain('evenodd');
  // The hole lets clicks reach the video.
  const box = (await page.locator('video').boundingBox())!;
  const hit = await page.evaluate(([x, y]) => document.elementFromPoint(x!, y!)?.tagName, [box.x + 50, box.y + 50]);
  expect(hit).toBe('VIDEO');
  await page.keyboard.press('Escape');
  await expect(overlay).not.toBeAttached();
});

test('picture filters from the toolbar apply to the video and are saved', async ({ openSite, getSettings }) => {
  const page = await openSite('tube.html', 'youtube');
  await playVideo(page);
  await hoverVideo(page);
  await ui(page).locator('button[data-id="filters"]').click();
  const panel = ui(page).locator('.panel');
  await expect(panel).toHaveClass(/show/);
  await panel.getByRole('button', { name: 'Vivid' }).click();
  await expect
    .poll(() => page.evaluate(() => document.querySelector('video')!.style.filter))
    .toContain('saturate(135%)');
  await expect.poll(async () => ((await getSettings()).player as { filtersOn: boolean }).filtersOn).toBe(true);
  await panel.getByRole('button', { name: 'Reset' }).click();
  await expect.poll(() => page.evaluate(() => document.querySelector('video')!.style.filter)).toBe('');
});

test('saves the current frame as an image', async ({ openSite }) => {
  const page = await openSite('tube.html', 'youtube');
  await playVideo(page);
  await hoverVideo(page);
  const download = page.waitForEvent('download');
  await ui(page).locator('button[data-id="screenshot"]').click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^Fake Tube.*\.png$/);
});

test('loop and ambient light', async ({ openSite, setSettings }) => {
  const page = await openSite('tube.html', 'youtube');
  await playVideo(page);
  await page.locator('#title').click();
  await page.keyboard.press('Alt+KeyL');
  expect(await page.evaluate(() => document.querySelector('video')!.loop)).toBe(false);
  await setSettings({ player: { ambient: { enabled: true, intensity: 80 } } });
  const glow = page.locator('canvas[data-reelskin="ambient"]');
  await expect(glow).toBeAttached();
  await expect.poll(() => glow.evaluate((el) => getComputedStyle(el).opacity)).toBe('0.8');
  await expect.poll(() => glow.evaluate((el) => el.getBoundingClientRect().width)).toBeGreaterThan(800);
  await setSettings({ player: { ambient: { enabled: false } } });
  await expect(glow).not.toBeAttached();
});

test('new videos start at the chosen speed', async ({ openSite, setSettings }) => {
  await setSettings({ player: { speed: { default: 1.5 } } });
  const page = await openSite('tube.html', 'youtube');
  await playVideo(page);
  await expect.poll(() => rate(page)).toBe(1.5);
});

test('player tools can be switched off per site', async ({ openSite, setSettings }) => {
  await setSettings({ sites: { youtube: { player: false } } });
  const page = await openSite('tube.html', 'youtube');
  await playVideo(page);
  await page.locator('#title').click();
  await page.keyboard.press('KeyD');
  expect(await rate(page)).toBe(1);
  await expect(ui(page)).not.toBeAttached();
});
