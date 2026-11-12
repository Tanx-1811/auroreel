import type { Page, Worker } from '@playwright/test';
import { expect, playVideo, test } from './fixtures';

const time = (page: Page) => page.evaluate(() => document.querySelector('video')!.currentTime);

async function tabIdFor(worker: Worker, page: Page): Promise<number> {
  const url = page.url();
  return worker.evaluate(async (url) => (await chrome.tabs.query({})).find((t) => t.url === url)!.id!, url);
}

test('A–B loop keeps playing the chosen stretch', async ({ openSite }) => {
  const page = await openSite('tube.html', 'youtube');
  await playVideo(page);
  await page.evaluate(() => (document.querySelector('video')!.currentTime = 1));
  await page.locator('#title').click();
  await page.keyboard.press('BracketLeft');
  await page.evaluate(() => (document.querySelector('video')!.currentTime = 2.2));
  await page.keyboard.press('BracketRight');
  await page.waitForTimeout(2500);
  const t = await time(page);
  expect(t).toBeGreaterThanOrEqual(0.9);
  expect(t).toBeLessThanOrEqual(2.6);
  await page.keyboard.press('Backslash');
  await page.waitForTimeout(1600);
  expect(await time(page)).toBeGreaterThan(2.2);
});

test('sleep timer pauses the video', async ({ openSite, worker }) => {
  const page = await openSite('tube.html', 'youtube');
  await playVideo(page);
  const tabId = await tabIdFor(worker, page);
  const status = await worker.evaluate(
    (tabId) => chrome.tabs.sendMessage(tabId, { type: 'rs:sleep', sleep: 0.02 }),
    tabId,
  );
  expect(typeof (status as { sleep: unknown }).sleep).toBe('number');
  await expect.poll(() => page.evaluate(() => document.querySelector('video')!.paused), { timeout: 5000 }).toBe(true);
  // Playback that starts right after (autoplay of the next video) is held too.
  await page.evaluate(() => void document.querySelector('video')!.play());
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => document.querySelector('video')!.paused)).toBe(true);
});

test('theme from the current video frame', async ({ openSite, worker, getSettings }) => {
  const page = await openSite('tube.html', 'youtube');
  await playVideo(page);
  await page.locator('#title').click();
  await page.keyboard.press('Alt+KeyV');
  await expect.poll(async () => String((await getSettings()).themeId)).toMatch(/^custom-/);
  const themes = await worker.evaluate(
    async () =>
      (await chrome.storage.local.get('rs:themes'))['rs:themes'] as { backdrop: { kind: string; image?: string } }[],
  );
  expect(themes[0]!.backdrop.kind).toBe('image');
  expect(themes[0]!.backdrop.image).toMatch(/^data:image\/webp;base64,/);
});

test('volume boost and wheel volume', async ({ openSite, setSettings }) => {
  await setSettings({ player: { boost: 200, wheelVolume: true } });
  const page = await openSite('tube.html', 'youtube');
  await playVideo(page);
  await page.locator('video').click(); // a gesture lets the boost start its audio
  await expect.poll(() => page.evaluate(() => document.querySelector('video')!.dataset.rsBoost)).toBe('200');
  await page.evaluate(() => (document.querySelector('video')!.volume = 0.5));
  const box = (await page.locator('video').boundingBox())!;
  await page.mouse.move(box.x + 100, box.y + 100);
  await page.mouse.wheel(0, 120);
  await expect.poll(() => page.evaluate(() => document.querySelector('video')!.volume)).toBeCloseTo(0.45, 2);
});

test('subtitle styling reaches the page', async ({ openSite, setSettings }) => {
  await setSettings({ subtitles: { on: true, size: 140, color: '#fde047', background: 30, bold: true } });
  const page = await openSite('tube.html', 'youtube');
  await expect
    .poll(() => page.evaluate(() => document.getElementById('auroreel-main')?.textContent ?? ''))
    .toContain('.ytp-caption-segment');
  await setSettings({ themeId: 'none' });
  // Still there with the site's own colours.
  await expect
    .poll(() => page.evaluate(() => document.getElementById('auroreel-main')?.textContent ?? ''))
    .toContain('video::cue');
});
