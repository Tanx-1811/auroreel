import { resolve } from 'node:path';
import { test as base, chromium, expect, type BrowserContext, type Page, type Worker } from '@playwright/test';
import { startTestServer, type TestServer } from './test-server';

export type ExtensionOptions = {
  /** Build folder of the extension to load, relative to the project root. */
  extensionDir: string;
};

type Fixtures = {
  context: BrowserContext;
  worker: Worker;
  extensionId: string;
  /** Merges a patch into the stored settings (as the popup or studio would). */
  setSettings: (patch: Record<string, unknown>) => Promise<void>;
  getSettings: () => Promise<Record<string, unknown>>;
  /** Opens an extension page and waits until React has rendered. */
  openExtensionPage: (path: string) => Promise<Page>;
  /** Opens a test page that the content script treats as the given platform. */
  openSite: (file: string, platform?: string) => Promise<Page>;
};

type WorkerFixtures = ExtensionOptions & { server: TestServer };

export const test = base.extend<Fixtures, WorkerFixtures>({
  extensionDir: ['dist-e2e', { option: true, scope: 'worker' }],

  server: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, provide) => {
      const server = await startTestServer();
      await provide(server);
      await server.close();
    },
    { scope: 'worker' },
  ],

  context: async ({ extensionDir }, provide) => {
    const path = resolve(import.meta.dirname, '../..', extensionDir);
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      headless: !process.env.HEADED,
      viewport: { width: 1280, height: 800 },
      acceptDownloads: true,
      args: [
        `--disable-extensions-except=${path}`,
        `--load-extension=${path}`,
        '--autoplay-policy=no-user-gesture-required',
      ],
    });
    // The welcome tab opens on install; close it so tests start clean.
    context.on('page', (p) => {
      if (p.url().includes('welcome')) void p.close().catch(() => undefined);
    });
    await provide(context);
    await context.close();
  },

  worker: async ({ context }, provide) => {
    let [worker] = context.serviceWorkers();
    worker ??= await context.waitForEvent('serviceworker');
    await provide(worker);
  },

  extensionId: async ({ worker }, provide) => {
    await provide(new URL(worker.url()).host);
  },

  setSettings: async ({ worker }, provide) => {
    await provide(async (patch) => {
      await worker.evaluate(async (patch) => {
        const merge = (a: unknown, b: unknown): unknown => {
          if (!b || typeof b !== 'object' || Array.isArray(b)) return b;
          const o: Record<string, unknown> = { ...((a as Record<string, unknown>) ?? {}) };
          for (const [k, v] of Object.entries(b)) o[k] = merge(o[k], v);
          return o;
        };
        const got = await chrome.storage.local.get('rs:settings');
        await chrome.storage.local.set({ 'rs:settings': merge(got['rs:settings'] ?? {}, patch) });
      }, patch);
    });
  },

  getSettings: async ({ worker }, provide) => {
    await provide(async () =>
      worker.evaluate(
        async () => ((await chrome.storage.local.get('rs:settings'))['rs:settings'] ?? {}) as Record<string, unknown>,
      ),
    );
  },

  openExtensionPage: async ({ context, extensionId }, provide) => {
    await provide(async (path) => {
      const page = await context.newPage();
      await page.goto(`chrome-extension://${extensionId}/${path}`);
      await page.locator('html[data-ready]').waitFor({ state: 'attached' });
      return page;
    });
  },

  openSite: async ({ context, server }, provide) => {
    await provide(async (file, platform) => {
      const page = await context.newPage();
      await page.goto(server.url(platform ? `${file}?rs-platform=${platform}` : file));
      return page;
    });
  },
});

export { expect };

/** Plays the page's test video and waits until it really plays. */
export async function playVideo(page: Page) {
  await page.evaluate(async () => {
    const v = document.querySelector('video')!;
    v.muted = true;
    await v.play();
  });
  await expect.poll(() => page.evaluate(() => document.querySelector('video')!.currentTime)).toBeGreaterThan(0.2);
}
