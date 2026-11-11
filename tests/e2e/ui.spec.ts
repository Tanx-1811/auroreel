import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures';

const PAGES = ['themes', 'editor', 'sites', 'player', 'schedule', 'shortcuts', 'backup', 'about', 'welcome'];

test('popup lists the themes and switches the global theme', async ({
  openExtensionPage,
  getSettings,
  setSettings,
}) => {
  await setSettings({ language: 'en' });
  const page = await openExtensionPage('popup/popup.html');
  await expect(page.getByText('Open a video site to style it')).toBeVisible();
  await expect(page.locator('.theme-card')).toHaveCount(25);
  await page.getByRole('button', { name: 'Use the Aurora theme' }).click();
  await expect.poll(async () => (await getSettings()).themeId).toBe('aurora');
  await page.getByRole('tab', { name: 'Player' }).click();
  await page.getByRole('switch', { name: 'Ambient light' }).click();
  await expect
    .poll(async () => ((await getSettings()).player as { ambient: { enabled: boolean } }).ambient.enabled)
    .toBe(true);
});

for (const path of PAGES) {
  test(`studio page "${path}" renders without errors or serious accessibility issues`, async ({
    openExtensionPage,
  }) => {
    const errors: string[] = [];
    const page = await openExtensionPage(`options/options.html#/${path}`);
    page.on('pageerror', (e) => errors.push(e.message));
    await page.waitForTimeout(300);
    const results = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test('theme maker saves a new theme and puts it to use', async ({
  openExtensionPage,
  getSettings,
  setSettings,
  worker,
}) => {
  await setSettings({ language: 'en' });
  const page = await openExtensionPage('options/options.html#/editor');
  await page.getByRole('textbox', { name: 'Name' }).fill('Test Night');
  await page.getByRole('button', { name: 'Surprise me' }).click();
  await page.getByRole('radio', { name: 'Gradient' }).click();
  await page.getByRole('button', { name: 'Save & use' }).click();
  await expect(page.getByText('Theme saved and in use')).toBeVisible();
  const themes = await worker.evaluate(
    async () =>
      (await chrome.storage.local.get('rs:themes'))['rs:themes'] as {
        id: string;
        name: string;
        backdrop: { kind: string };
      }[],
  );
  expect(themes).toHaveLength(1);
  expect(themes[0]!.name).toBe('Test Night');
  expect(themes[0]!.backdrop.kind).toBe('gradient');
  expect((await getSettings()).themeId).toBe(themes[0]!.id);
  await page.goto(page.url().replace(/#.*/, '#/themes'));
  await page.getByRole('radio', { name: 'Mine' }).click();
  await expect(page.locator('.theme-card')).toHaveCount(1);
});

test('shortcut recorder stores a new key', async ({ openExtensionPage, getSettings, setSettings }) => {
  await setSettings({ language: 'en' });
  const page = await openExtensionPage('options/options.html#/shortcuts');
  await page.getByRole('button', { name: 'Change the shortcut for Cinema mode' }).click();
  await page.keyboard.press('Alt+KeyK');
  await expect.poll(async () => ((await getSettings()).shortcuts as Record<string, string>).cinema).toBe('Alt+KeyK');
});

test('backup exports a file', async ({ openExtensionPage, setSettings }) => {
  await setSettings({ language: 'en' });
  const page = await openExtensionPage('options/options.html#/backup');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/^reelskin-backup-\d{4}-\d{2}-\d{2}\.json$/);
});
