import { expect, test } from './fixtures';

test('Chrome Sync: pushes this computer’s settings and themes, takes changes from others', async ({
  worker,
  setSettings,
  getSettings,
}) => {
  await worker.evaluate(async () => {
    await chrome.storage.sync.clear();
    await chrome.storage.local.set({
      'rs:themes': [
        {
          id: 'custom-sync-1',
          name: 'Synced',
          mode: 'dark',
          colors: { bg: '#101010', surface: '#202020', text: '#f0f0f0', accent: '#ff8800' },
          backdrop: { kind: 'none' },
          glass: 0,
          radius: 10,
          font: 'site',
        },
      ],
    });
  });
  await setSettings({ sync: true, themeId: 'aurora' });
  const remote = () => worker.evaluate(() => chrome.storage.sync.get(null));
  await expect.poll(async () => Object.keys(await remote()).sort()).toContain('rs:sync:theme:custom-sync-1');
  await expect
    .poll(async () => ((await remote())['rs:sync:settings'] as { settings: { themeId: string } }).settings.themeId)
    .toBe('aurora');

  // Another computer changes the theme.
  await worker.evaluate(async () => {
    const got = await chrome.storage.sync.get('rs:sync:settings');
    const cur = got['rs:sync:settings'] as { settings: Record<string, unknown> };
    await chrome.storage.sync.set({
      'rs:sync:settings': { from: 'another-computer', at: Date.now(), settings: { ...cur.settings, themeId: 'ember' } },
    });
  });
  await expect.poll(async () => (await getSettings()).themeId).toBe('ember');
  expect((await getSettings()).sync).toBe(true);
});
