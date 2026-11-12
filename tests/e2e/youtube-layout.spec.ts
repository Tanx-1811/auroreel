import { expect, test } from './fixtures';

test('a glass theme keeps the YouTube home chip bar under the top bar, above the videos', async ({
  openSite,
  setSettings,
}) => {
  // Midnight Velvet has a backdrop: the top bar, guide and chip bar turn to frosted glass.
  await setSettings({ themeId: 'midnight-velvet' });
  const page = await openSite('tube-home.html', 'youtube');
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.querySelector('#chips-wrapper')!).backdropFilter))
    .toContain('blur');
  const chips = await page.locator('#chips-wrapper').boundingBox();
  expect(chips!.y).toBe(56);
  // Nothing covers the chips: the topmost element at a chip is the chip.
  const box = (await page.locator('.chip').first().boundingBox())!;
  expect(
    await page.evaluate(
      ([x, y]) => document.elementFromPoint(x!, y!)?.className,
      [box.x + box.width / 2, box.y + box.height / 2],
    ),
  ).toBe('chip');
});
