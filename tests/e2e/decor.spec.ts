import type { Page } from '@playwright/test';
import { expect, playVideo, test } from './fixtures';

const knobBefore = (page: Page) =>
  page.evaluate(() => {
    const s = getComputedStyle(document.querySelector('.ytp-scrubber-button')!, '::before');
    return { content: s.content, image: s.backgroundImage, animation: s.animationName, width: s.width };
  });
const mini = (page: Page) => page.locator('auroreel-ui').locator('.mini');

test('draws the chosen knob on the progress bar and moves it only while playing', async ({ openSite, setSettings }) => {
  await setSettings({ progress: { knob: 'star', motion: 'spin', size: 30, fill: 'custom', color: '#00ff00' } });
  const page = await openSite('tube.html', 'youtube');
  await expect.poll(async () => (await knobBefore(page)).image).toContain('data:image/svg+xml');
  expect(await knobBefore(page)).toMatchObject({ width: '30px', animation: 'rs-knob-spin' });
  expect(
    await page.evaluate(() => getComputedStyle(document.querySelector('.ytp-play-progress')!).backgroundColor),
  ).toBe('rgb(0, 255, 0)');
  await expect(page.locator('.ytp-decorated-scrubber-button')).toBeHidden();
  await page.evaluate(() => document.querySelector('.html5-video-player')!.classList.remove('playing-mode'));
  expect((await knobBefore(page)).animation).toBe('none');

  // Back to the site's own knob.
  await setSettings({ progress: { knob: 'site' } });
  await expect.poll(async () => (await knobBefore(page)).image).toBe('none');
});

test('shows a thin progress bar while the site hides its controls', async ({ openSite, setSettings }) => {
  await setSettings({ progress: { mini: true } });
  const page = await openSite('tube.html', 'youtube');
  await playVideo(page);
  await expect(mini(page)).not.toHaveClass(/show/);
  await page.evaluate(() => document.querySelector('.html5-video-player')!.classList.add('ytp-autohide'));
  await expect(mini(page)).toHaveClass(/show/);
  const fill = mini(page).locator('i');
  await expect.poll(async () => fill.evaluate((e) => (e as HTMLElement).style.transform)).toMatch(/scaleX\(0\.\d+\)/);
  await page.evaluate(() => document.querySelector('.html5-video-player')!.classList.remove('ytp-autohide'));
  await expect(mini(page)).not.toHaveClass(/show/);

  await setSettings({ progress: { mini: false } });
  await page.evaluate(() => document.querySelector('.html5-video-player')!.classList.add('ytp-autohide'));
  await page.waitForTimeout(600);
  await expect(mini(page)).not.toHaveClass(/show/);
});

test('the toolbar shows only the chosen buttons, at the chosen size', async ({ openSite, setSettings }) => {
  await setSettings({ player: { toolbarButtons: ['speed', 'ab'], toolbarSize: 'lg' } });
  const page = await openSite('tube.html', 'youtube');
  await playVideo(page);
  const box = (await page.locator('video').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.move(box.x + box.width / 2 + 10, box.y + box.height / 2 + 5);
  const bar = page.locator('auroreel-ui').locator('.bar');
  await expect(bar).toHaveClass(/show/);
  await expect(bar.locator('button')).toHaveCount(4);
  await expect(bar.locator('button[data-id="pip"]')).toHaveCount(0);
  expect(await bar.locator('button[data-id="ab"]').evaluate((b) => b.getBoundingClientRect().height)).toBeCloseTo(
    38,
    0,
  );
  await bar.locator('button[data-id="ab"]').click();
  await expect(bar.locator('button[data-id="ab"]')).toHaveAttribute('aria-pressed', 'true');
});

test('scrollbars follow the chosen style', async ({ openSite, setSettings }) => {
  await setSettings({ scrollbar: 'hidden' });
  const page = await openSite('tube.html', 'youtube');
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).scrollbarWidth)).toBe('none');
});

test('decorations page picks a knob, an emoji and shows it in the preview', async ({
  openExtensionPage,
  getSettings,
  setSettings,
}) => {
  await setSettings({ language: 'en' });
  const page = await openExtensionPage('options/options.html#/decor');
  await page.getByRole('button', { name: 'Rocket' }).click();
  await expect.poll(async () => ((await getSettings()).progress as { knob: string }).knob).toBe('rocket');
  await expect(page.locator('.kn-preview .kn-knob.art img')).toBeVisible();
  await page.getByRole('radio', { name: 'Spin' }).click();
  await expect.poll(async () => ((await getSettings()).progress as { motion: string }).motion).toBe('spin');

  await page.getByRole('button', { name: 'Emoji' }).click();
  await page.getByRole('textbox', { name: 'Your emoji' }).fill('🦄');
  await expect.poll(async () => (await getSettings()).progress).toMatchObject({ knob: 'emoji', emoji: '🦄' });

  await page.getByRole('switch', { name: 'Always show progress' }).click();
  await expect.poll(async () => ((await getSettings()).progress as { mini: boolean }).mini).toBe(true);
});
