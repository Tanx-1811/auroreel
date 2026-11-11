import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ALL_MATCHES } from '../../src/core/platforms';
import { expect, test } from './fixtures';

test('the store build asks only for the streaming sites', () => {
  const manifest = JSON.parse(readFileSync(resolve(import.meta.dirname, '../../dist/manifest.json'), 'utf8'));
  expect(manifest.permissions).toEqual(['storage', 'scripting']);
  expect(manifest.host_permissions).toEqual(ALL_MATCHES);
  expect(manifest.content_scripts[0].matches).toEqual(ALL_MATCHES);
  expect(manifest.optional_host_permissions).toEqual(['https://*/*', 'http://*/*']);
  expect(JSON.stringify(manifest)).not.toContain('127.0.0.1');
});

test('the store build starts and shows the studio', async ({ openExtensionPage }) => {
  const page = await openExtensionPage('options/options.html#/themes');
  await expect(page.locator('.theme-card').first()).toBeVisible();
});
