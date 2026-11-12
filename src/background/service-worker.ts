/**
 * Service worker: first-run welcome page, keyboard commands, and the
 * run-time content script for "player tools on every site" (registered only
 * while the user has granted the optional all-sites permission).
 */
import { ALL_MATCHES, isCssHost } from '../core/platforms.ts';
import { allThemes, NO_THEME } from '../core/themes.ts';
import { sendToTab, type PageAction } from '../shared/messages.ts';
import { ANY_SITE_ORIGINS } from '../shared/anySite.ts';
import { loadState, SETTINGS_KEY, updateSettings } from '../shared/storage.ts';
import { initSync } from './sync.ts';

const ANY_SITE_ID = 'auroreel-any-site';

initSync();

async function syncAnySite(): Promise<void> {
  const { settings } = await loadState();
  const granted = await chrome.permissions.contains({ origins: ANY_SITE_ORIGINS });
  const want = settings.enabled && settings.anySite && granted;
  const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [ANY_SITE_ID] });
  if (want && !existing.length) {
    await chrome.scripting.registerContentScripts([
      {
        id: ANY_SITE_ID,
        js: ['content.js'],
        matches: ANY_SITE_ORIGINS,
        excludeMatches: ALL_MATCHES,
        runAt: 'document_idle',
        allFrames: true,
        persistAcrossSessions: true,
      },
    ]);
  } else if (!want && existing.length) {
    await chrome.scripting.unregisterContentScripts({ ids: [ANY_SITE_ID] });
  }
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    void chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html#/welcome') });
  }
  void syncAnySite().catch(() => undefined);
});

chrome.runtime.onStartup.addListener(() => void syncAnySite().catch(() => undefined));
chrome.permissions.onAdded.addListener((added) => {
  void (async () => {
    // Granted from the popup or the studio: the popup may close before it hears back.
    if (added.origins?.some((o) => ANY_SITE_ORIGINS.includes(o))) {
      await updateSettings((s) => (s.anySite ? s : { ...s, anySite: true }));
    }
    await syncAnySite();
  })().catch(() => undefined);
});
chrome.permissions.onRemoved.addListener(() => {
  void (async () => {
    const granted = await chrome.permissions.contains({ origins: ANY_SITE_ORIGINS });
    if (!granted) await updateSettings((s) => (s.anySite ? { ...s, anySite: false } : s));
    await syncAnySite();
  })().catch(() => undefined);
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[SETTINGS_KEY]) void syncAnySite().catch(() => undefined);
});

async function activeTabId(): Promise<number | null> {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return tab?.id ?? null;
}

/** Cycles the global theme through the collection (custom themes first). */
async function nextTheme(): Promise<void> {
  const { themes } = await loadState();
  const ids = allThemes(themes).map((t) => t.id);
  await updateSettings((s) => {
    const i = ids.indexOf(s.themeId);
    const next = s.themeId === NO_THEME ? ids[0]! : ids[(i + 1) % ids.length]!;
    return { ...s, themeId: next };
  });
}

chrome.commands.onCommand.addListener((command) => {
  void (async () => {
    if (command === 'next-theme') return nextTheme();
    const map: Record<string, PageAction> = { 'toggle-cinema': 'cinema', 'toggle-skin': 'toggleSkin' };
    const action = map[command];
    const tabId = await activeTabId();
    if (action && tabId !== null) await sendToTab(tabId, { type: 'rs:action', action });
  })().catch(() => undefined);
});

/**
 * Stylesheets on a site's CDN that refuses cross-origin reads (VieON): the
 * content script can't read their colours, so the worker fetches them — only
 * for its own content scripts and only from the hosts listed in CSS_HOSTS.
 */
chrome.runtime.onMessage.addListener((msg: { type?: string; url?: string }, sender, reply) => {
  if (msg?.type !== 'rs:fetch-css' || sender.id !== chrome.runtime.id || !sender.tab) return false;
  const url = msg.url ?? '';
  if (!isCssHost(url)) {
    reply(null);
    return false;
  }
  void (async () => {
    try {
      const res = await fetch(url, { credentials: 'omit' });
      const type = res.headers.get('content-type') ?? '';
      if (!res.ok || !/css/.test(type)) return reply(null);
      const text = await res.text();
      reply(text.length <= 4_000_000 ? { text } : null);
    } catch {
      reply(null);
    }
  })();
  return true;
});
