/**
 * Chrome Sync (opt-in, `settings.sync`). The service worker is the only code
 * that touches chrome.storage.sync: local changes are pushed (debounced),
 * changes from other computers are pulled into chrome.storage.local, where
 * every page and tab picks them up as usual. Each push carries this device's
 * id so its own echo is ignored. Pure merge rules: src/core/sync.ts.
 */
import { parseSettings } from '../core/settings.ts';
import {
  applySynced,
  mergeSyncedThemes,
  planThemePush,
  SYNC_DELETED,
  SYNC_SETTINGS,
  SYNC_THEME_PREFIX,
  toSynced,
  type SyncedSettings,
  type Tombstones,
} from '../core/sync.ts';
import { loadState, saveSettings, saveThemes, SETTINGS_KEY, SYNC_STATUS_KEY, THEMES_KEY } from '../shared/storage.ts';

const DEVICE_KEY = 'rs:device';

export interface SyncStatus {
  at: number;
  ok: boolean;
  error?: string;
}

async function deviceId(): Promise<string> {
  const got = await chrome.storage.local.get(DEVICE_KEY);
  const existing = got[DEVICE_KEY];
  if (typeof existing === 'string') return existing;
  const id = crypto.randomUUID();
  await chrome.storage.local.set({ [DEVICE_KEY]: id });
  return id;
}

async function status(ok: boolean, error?: unknown) {
  const value: SyncStatus = {
    at: Date.now(),
    ok,
    ...(error ? { error: String((error as Error)?.message ?? error) } : {}),
  };
  await chrome.storage.local.set({ [SYNC_STATUS_KEY]: value });
}

function remoteThemes(all: Record<string, unknown>) {
  return Object.entries(all).filter(([k]) => k.startsWith(SYNC_THEME_PREFIX));
}

async function push() {
  const { settings, themes } = await loadState();
  if (!settings.sync) return;
  const id = await deviceId();
  const all = await chrome.storage.sync.get(null);
  const now = Date.now();
  const synced = toSynced(settings, id, now);
  const remote = all[SYNC_SETTINGS] as SyncedSettings | undefined;
  if (JSON.stringify(remote?.settings) !== JSON.stringify(synced.settings)) {
    await chrome.storage.sync.set({ [SYNC_SETTINGS]: synced });
  }
  const remoteJson = Object.fromEntries(remoteThemes(all).map(([k, v]) => [k, JSON.stringify(v)]));
  const deleted = (all[SYNC_DELETED] as Tombstones | undefined) ?? {};
  const plan = planThemePush(themes, remoteJson, deleted, now);
  if (Object.keys(plan.set).length) await chrome.storage.sync.set(plan.set);
  if (plan.remove.length) await chrome.storage.sync.remove(plan.remove);
  if (JSON.stringify(plan.deleted) !== JSON.stringify(deleted))
    await chrome.storage.sync.set({ [SYNC_DELETED]: plan.deleted });
}

async function pull() {
  const { settings, themes } = await loadState();
  if (!settings.sync) return;
  const id = await deviceId();
  const all = await chrome.storage.sync.get(null);
  const remote = all[SYNC_SETTINGS] as SyncedSettings | undefined;
  if (remote && remote.from !== id) {
    const next = applySynced(settings, remote);
    if (JSON.stringify(next) !== JSON.stringify(settings)) await saveSettings(next);
  }
  const merged = mergeSyncedThemes(
    themes,
    remoteThemes(all).map(([, v]) => v),
    (all[SYNC_DELETED] as Tombstones | undefined) ?? {},
  );
  if (JSON.stringify(merged) !== JSON.stringify(themes)) await saveThemes(merged);
}

let pushTimer: ReturnType<typeof setTimeout> | undefined;
let chain: Promise<void> = Promise.resolve();

/** Runs sync steps one at a time and records the outcome for the studio. */
function run(step: () => Promise<void>) {
  chain = chain.then(async () => {
    try {
      await step();
      await status(true);
    } catch (e) {
      await status(false, e);
    }
  });
  return chain;
}

export function initSync() {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync') {
      void run(pull);
      return;
    }
    if (area !== 'local' || (!changes[SETTINGS_KEY] && !changes[THEMES_KEY])) return;
    const s = changes[SETTINGS_KEY];
    if (s && !parseSettings(s.oldValue).sync && parseSettings(s.newValue).sync) {
      // Just switched on: take what other computers have, then add this one's.
      void run(async () => {
        await pull();
        await push();
      });
      return;
    }
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => void run(push), 1500);
  });
  chrome.runtime.onStartup.addListener(() => void run(pull));
}
