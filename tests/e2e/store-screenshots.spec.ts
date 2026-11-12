/**
 * Chrome Web Store screenshots (1280 × 800, EN and VI): `npm run screenshots`.
 * Everything is local — the "Viewly" showcase site in tests/e2e/site is themed
 * by the real content script (?rs-platform=youtube) — so the images are
 * reproducible offline. Output: brand/store/screenshots/{en,vi}-N-<slug>.png.
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { BrowserContext, Page } from '@playwright/test';
import { frameHtml, PICTURE_HTML, type FrameInput } from './brand-frame';
import { expect, test } from './fixtures';

const OUT = join(import.meta.dirname, '../../brand/store/screenshots');
const VIEW = { width: 1440, height: 900 };

type Lang = 'en' | 'vi';
type Copy = Pick<FrameInput, 'title' | 'highlight' | 'subtitle'>;

const COPY: Record<Lang, Record<'themes' | 'ambient' | 'studio' | 'maker' | 'cinema', Copy>> = {
  en: {
    themes: {
      title: 'Beautiful themes for YouTube & more',
      highlight: 'Beautiful themes',
      subtitle: '24 hand-tuned looks, one click away — on YouTube, Twitch and your streaming sites.',
    },
    ambient: {
      title: 'Ambient light around every video',
      highlight: 'Ambient light',
      subtitle: 'The picture’s colours glow softly around it. Speed, loop, capture and PiP on hover.',
    },
    studio: {
      title: 'A whole studio of looks',
      highlight: 'studio',
      subtitle: 'Dark, light, aurora glows, gradients and glass — every theme previewed before you pick.',
    },
    maker: {
      title: 'Make a theme from any picture',
      highlight: 'any picture',
      subtitle: 'Auroreel picks a readable palette from your photo and previews it live.',
    },
    cinema: {
      title: 'Cinema mode & picture filters',
      highlight: 'Cinema mode',
      subtitle: 'Dim everything but the video, then tune brightness, contrast and warmth.',
    },
  },
  vi: {
    themes: {
      title: 'Giao diện đẹp cho YouTube và hơn thế',
      highlight: 'Giao diện đẹp',
      subtitle: '24 chủ đề tinh chỉnh kỹ, đổi chỉ với một cú bấm — trên YouTube, Twitch và các web xem phim.',
    },
    ambient: {
      title: 'Ánh sáng nền quanh mọi video',
      highlight: 'Ánh sáng nền',
      subtitle: 'Màu của khung hình toả sáng dịu nhẹ. Tốc độ, lặp, chụp hình và PiP ngay khi rê chuột.',
    },
    studio: {
      title: 'Cả một studio giao diện',
      highlight: 'studio',
      subtitle: 'Tối, sáng, cực quang, chuyển màu và hiệu ứng kính — xem trước từng chủ đề trước khi chọn.',
    },
    maker: {
      title: 'Tạo chủ đề từ bất kỳ bức ảnh nào',
      highlight: 'bất kỳ bức ảnh nào',
      subtitle: 'Auroreel chọn bảng màu dễ đọc từ ảnh của bạn và xem trước ngay lập tức.',
    },
    cinema: {
      title: 'Chế độ rạp & bộ lọc màu hình',
      highlight: 'Chế độ rạp',
      subtitle: 'Làm tối mọi thứ trừ video, rồi chỉnh độ sáng, tương phản và độ ấm.',
    },
  },
};

const b64 = async (p: Page | ReturnType<Page['locator']>) => (await p.screenshot({ type: 'png' })).toString('base64');

async function compose(context: BrowserContext, file: string, input: FrameInput) {
  const page = await context.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.setContent(frameHtml(input));
  await page.evaluate(async () => {
    await document.fonts.ready;
    // The window starts just below the caption, however many lines it takes.
    const cap = document.querySelector('.cap')!.getBoundingClientRect();
    (document.querySelector('.win') as HTMLElement).style.top = `${Math.max(184, Math.round(cap.bottom + 28))}px`;
  });
  await page.screenshot({ path: join(OUT, file), type: 'png' });
  await page.close();
}

/** Plays the showcase video, then holds it on a fixed frame. */
async function holdVideo(page: Page, at = 2.6) {
  await page.evaluate(async (t) => {
    const v = document.querySelector('video')!;
    v.muted = true;
    await v.play();
    await new Promise((r) => setTimeout(r, 400));
    v.pause();
    v.currentTime = t;
    await new Promise((r) => v.addEventListener('seeked', r, { once: true }));
  }, at);
}

async function hoverVideo(page: Page) {
  const box = (await page.locator('video').boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.55);
  await page.mouse.move(box.x + box.width * 0.52, box.y + box.height * 0.56);
  await expect(page.locator('auroreel-ui .bar')).toHaveClass(/show/);
  await page.waitForTimeout(250);
}

for (const lang of ['en', 'vi'] as const) {
  test(`store screenshots (${lang})`, async ({ context, server, setSettings, openExtensionPage, extensionId }) => {
    test.setTimeout(180_000);
    mkdirSync(OUT, { recursive: true });
    const copy = COPY[lang];
    const site = (view: string) => server.url(`showcase.html?rs-platform=youtube&view=${view}&lang=${lang}`);
    await setSettings({ language: lang, onboarded: true, themeId: 'midnight-velvet' });

    // The popup acts on "the active tab"; point it at the showcase tab (shown as YouTube).
    await context.addInitScript(() => {
      if (location.protocol !== 'chrome-extension:' || !location.pathname.includes('popup')) return;
      const query = chrome.tabs.query.bind(chrome.tabs);
      chrome.tabs.query = (async (info: chrome.tabs.QueryInfo) => {
        const tabs = await query({});
        const tab = tabs.find((t) => t.url?.includes('showcase.html'));
        return tab ? [{ ...tab, url: 'https://www.youtube.com/' }] : query(info);
      }) as typeof chrome.tabs.query;
    });

    // 1. Themes on the showcase home page, with the popup.
    const home = await context.newPage();
    await home.setViewportSize(VIEW);
    await home.goto(site('home'));
    await expect
      .poll(() => home.evaluate(() => document.getElementById('auroreel-engine')?.textContent?.length ?? 0))
      .toBeGreaterThan(100);
    await home.waitForTimeout(600);
    const homeShot = await b64(home);
    const popup = await context.newPage();
    await popup.emulateMedia({ colorScheme: 'dark' });
    await popup.setViewportSize({ width: 392, height: 600 });
    await popup.goto(`chrome-extension://${extensionId}/popup/popup.html`);
    await popup.locator('html[data-ready]').waitFor({ state: 'attached' });
    await expect(popup.locator('.site-card .badge')).toBeVisible();
    await popup.waitForTimeout(400);
    const popupShot = await b64(popup);
    await popup.close();
    await compose(context, `${lang}-1-themes.png`, {
      lang,
      ...copy.themes,
      address: 'viewly.example',
      shot: homeShot,
      overlay: { png: popupShot, width: 392, height: 600 },
    });
    await home.close();

    // 2. Ambient light and the floating toolbar on the watch page (Aurora).
    await setSettings({
      themeId: 'aurora',
      player: { ambient: { enabled: true, intensity: 90, blur: 80, spread: 16 } },
    });
    const watch = await context.newPage();
    await watch.setViewportSize(VIEW);
    await watch.goto(site('watch'));
    await holdVideo(watch);
    await expect(watch.locator('canvas[data-auroreel="ambient"]')).toBeAttached();
    await watch.waitForTimeout(1600);
    await hoverVideo(watch);
    await compose(context, `${lang}-2-ambient.png`, {
      lang,
      ...copy.ambient,
      address: 'viewly.example/watch',
      shot: await b64(watch),
    });
    await watch.close();

    // 3. The studio's theme gallery.
    await setSettings({ themeId: 'midnight-velvet', player: { ambient: { enabled: false } } });
    const studio = await openExtensionPage('options/options.html#/themes');
    await studio.emulateMedia({ colorScheme: 'dark' });
    await studio.setViewportSize(VIEW);
    await studio.waitForTimeout(500);
    await compose(context, `${lang}-3-studio.png`, {
      lang,
      ...copy.studio,
      address: 'Auroreel Studio',
      shot: await b64(studio),
    });
    await studio.close();

    // 4. The theme maker, building a theme from a picture.
    const picturePage = await context.newPage();
    await picturePage.setViewportSize({ width: 1600, height: 1000 });
    await picturePage.setContent(PICTURE_HTML);
    const picture = await picturePage.screenshot({ type: 'png' });
    await picturePage.close();
    const maker = await openExtensionPage('options/options.html#/editor');
    await maker.emulateMedia({ colorScheme: 'dark' });
    await maker.setViewportSize(VIEW);
    await maker.locator('.name-row input').fill(lang === 'vi' ? 'Hoàng hôn trên núi' : 'Mountain sunset');
    await maker
      .locator('input[type="file"][accept^="image"]')
      .setInputFiles({ name: 'sunset.png', mimeType: 'image/png', buffer: picture });
    await expect(maker.locator('.picture-row img')).toBeVisible();
    await maker.waitForTimeout(3000); // let the toast fade
    await compose(context, `${lang}-4-maker.png`, {
      lang,
      ...copy.maker,
      address: 'Auroreel Studio',
      shot: await b64(maker),
    });
    await maker.close();

    // 5. Cinema mode with the picture filters open (Crimson Theatre).
    await setSettings({ themeId: 'crimson-theatre' });
    const cinema = await context.newPage();
    await cinema.setViewportSize(VIEW);
    await cinema.goto(site('watch'));
    await holdVideo(cinema, 4.2);
    await cinema.locator('#title').click();
    await cinema.keyboard.press('Alt+KeyC');
    await expect(cinema.locator('div[data-auroreel="cinema"]')).toBeAttached();
    await cinema.waitForTimeout(1700);
    await hoverVideo(cinema);
    await cinema.locator('auroreel-ui button[data-id="filters"]').click();
    await cinema.locator('auroreel-ui .panel .chip').nth(2).click();
    await expect(cinema.locator('auroreel-ui .panel')).toHaveClass(/show/);
    await cinema.waitForTimeout(400);
    await compose(context, `${lang}-5-cinema.png`, {
      lang,
      ...copy.cinema,
      address: 'viewly.example/watch',
      shot: await b64(cinema),
    });
    await cinema.close();
  });
}
